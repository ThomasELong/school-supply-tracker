import { Router } from 'express';
import pool from '../db/database';
import type { Project, ProjectItem, CreateProjectBody } from '../types';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface ProjectRow {
  id: number;
  grade_level_id: number;
  grade_level_name: string;
  subject_id: number;
  subject_name: string;
  scheduled_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectItemRow {
  id: number;
  project_id: number;
  item_id: number;
  item_name: string;
  category_name: string;
  quantity_needed: number;
  quantity_on_hand: number;
  quantity_min: number;
  needs_order: boolean;
  notes: string | null;
}

const PROJECT_SELECT = `
  SELECT
    p.id, p.grade_level_id, p.subject_id, p.scheduled_date, p.notes, p.created_at, p.updated_at,
    g.name AS grade_level_name,
    s.name AS subject_name
  FROM projects p
  JOIN grade_levels g ON g.id = p.grade_level_id
  JOIN subjects     s ON s.id = p.subject_id
`;

const PROJECT_ITEMS_SELECT = `
  SELECT
    pi.id, pi.project_id, pi.item_id, pi.quantity_needed, pi.notes,
    i.name  AS item_name,
    c.name  AS category_name,
    i.quantity_on_hand,
    i.quantity_min,
    i.needs_order
  FROM project_items pi
  JOIN items      i ON i.id = pi.item_id
  JOIN categories c ON c.id = i.category_id
`;

async function attachItems(projects: ProjectRow[], projectIds: number[]): Promise<Project[]> {
  if (projectIds.length === 0) return projects.map((p) => ({ ...p, items: [] }));

  const placeholders = projectIds.map((_, i) => `$${i + 1}`).join(', ');
  const { rows: itemRows } = await pool.query<ProjectItemRow>(
    `${PROJECT_ITEMS_SELECT} WHERE pi.project_id IN (${placeholders}) ORDER BY pi.id`,
    projectIds
  );

  const byProject: Record<number, ProjectItem[]> = {};
  for (const row of itemRows) {
    if (!byProject[row.project_id]) byProject[row.project_id] = [];
    byProject[row.project_id].push({
      id: row.id,
      item_id: row.item_id,
      item_name: row.item_name,
      category_name: row.category_name,
      quantity_needed: row.quantity_needed,
      quantity_on_hand: row.quantity_on_hand,
      quantity_min: row.quantity_min,
      needs_order: row.needs_order,
      notes: row.notes,
    });
  }

  return projects.map((p) => ({ ...p, items: byProject[p.id] ?? [] }));
}

function validateDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

// ─── GET / ───────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const { grade_level_id, subject_id, date_from, date_to } = req.query;
  let sql = `${PROJECT_SELECT} WHERE 1=1`;
  const params: (string | number)[] = [];
  let p = 1;

  if (grade_level_id) {
    sql += ` AND p.grade_level_id = $${p++}`;
    params.push(Number(grade_level_id));
  }
  if (subject_id) {
    sql += ` AND p.subject_id = $${p++}`;
    params.push(Number(subject_id));
  }
  if (date_from) {
    sql += ` AND p.scheduled_date >= $${p++}`;
    params.push(String(date_from));
  }
  if (date_to) {
    sql += ` AND p.scheduled_date <= $${p++}`;
    params.push(String(date_to));
  }
  sql += ' ORDER BY p.scheduled_date ASC, g.sort_order';

  const { rows } = await pool.query<ProjectRow>(sql, params);
  const ids = rows.map((r) => r.id);
  res.json(await attachItems(rows, ids));
});

// ─── GET /:id ────────────────────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await pool.query<ProjectRow>(
    `${PROJECT_SELECT} WHERE p.id = $1`,
    [id]
  );
  if (!rows[0]) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json((await attachItems([rows[0]], [id]))[0]);
});

// ─── POST / ──────────────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const body = req.body as CreateProjectBody;

  if (!body.grade_level_id || !body.subject_id || !body.scheduled_date) {
    res.status(400).json({ error: 'grade_level_id, subject_id, and scheduled_date are required' });
    return;
  }
  if (!validateDate(body.scheduled_date)) {
    res.status(400).json({ error: 'scheduled_date must be in YYYY-MM-DD format' });
    return;
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    res.status(400).json({ error: 'At least one item is required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: projectRows } = await client.query<{ id: number }>(
      `INSERT INTO projects (grade_level_id, subject_id, scheduled_date, notes)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [body.grade_level_id, body.subject_id, body.scheduled_date, body.notes ?? null]
    );
    const projectId = projectRows[0].id;

    for (const item of body.items) {
      if (!item.item_id || !item.quantity_needed) {
        throw Object.assign(new Error('Each item must have item_id and quantity_needed'), {
          status: 400,
        });
      }
      await client.query(
        `INSERT INTO project_items (project_id, item_id, quantity_needed, notes)
         VALUES ($1, $2, $3, $4)`,
        [projectId, item.item_id, item.quantity_needed, item.notes ?? null]
      );
    }

    await client.query('COMMIT');

    const { rows } = await pool.query<ProjectRow>(`${PROJECT_SELECT} WHERE p.id = $1`, [projectId]);
    res.status(201).json((await attachItems([rows[0]], [projectId]))[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

// ─── PUT /:id ────────────────────────────────────────────────────────────────

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { rows: existingRows } = await pool.query<ProjectRow>(
    `${PROJECT_SELECT} WHERE p.id = $1`,
    [id]
  );
  if (!existingRows[0]) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  const existing = existingRows[0];

  const body = req.body as Partial<CreateProjectBody>;
  const scheduled_date = body.scheduled_date ?? existing.scheduled_date;
  if (!validateDate(scheduled_date)) {
    res.status(400).json({ error: 'scheduled_date must be in YYYY-MM-DD format' });
    return;
  }
  if (body.items !== undefined && body.items.length === 0) {
    res.status(400).json({ error: 'At least one item is required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE projects
       SET grade_level_id = $1, subject_id = $2, scheduled_date = $3, notes = $4,
           updated_at = NOW()
       WHERE id = $5`,
      [
        body.grade_level_id ?? existing.grade_level_id,
        body.subject_id ?? existing.subject_id,
        scheduled_date,
        body.notes !== undefined ? (body.notes ?? null) : existing.notes,
        id,
      ]
    );

    if (body.items !== undefined) {
      await client.query('DELETE FROM project_items WHERE project_id = $1', [id]);
      for (const item of body.items) {
        await client.query(
          `INSERT INTO project_items (project_id, item_id, quantity_needed, notes)
           VALUES ($1, $2, $3, $4)`,
          [id, item.item_id, item.quantity_needed, item.notes ?? null]
        );
      }
    }

    await client.query('COMMIT');

    const { rows } = await pool.query<ProjectRow>(`${PROJECT_SELECT} WHERE p.id = $1`, [id]);
    res.json((await attachItems([rows[0]], [id]))[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

// ─── DELETE /:id ─────────────────────────────────────────────────────────────

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { rows: existing } = await pool.query('SELECT id FROM projects WHERE id = $1', [id]);
  if (!existing[0]) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  await pool.query('DELETE FROM projects WHERE id = $1', [id]);
  res.status(204).send();
});

export default router;
