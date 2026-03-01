import { Router } from 'express';
import pool from '../db/database';
import type { GradeLevel, CreateGradeLevelBody } from '../types';

const router = Router();

router.get('/', async (_req, res) => {
  const { rows } = await pool.query<GradeLevel>(
    'SELECT * FROM grade_levels ORDER BY sort_order, name'
  );
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query<GradeLevel>(
    'SELECT * FROM grade_levels WHERE id = $1',
    [Number(req.params.id)]
  );
  if (!rows[0]) {
    res.status(404).json({ error: 'Grade level not found' });
    return;
  }
  res.json(rows[0]);
});

router.post('/', async (req, res) => {
  const { name, sort_order } = req.body as CreateGradeLevelBody;
  if (!name?.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  try {
    const { rows } = await pool.query<GradeLevel>(
      'INSERT INTO grade_levels (name, sort_order) VALUES ($1, $2) RETURNING *',
      [name.trim(), sort_order ?? 0]
    );
    res.status(201).json(rows[0]);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'A grade level with that name already exists' });
      return;
    }
    throw err;
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, sort_order } = req.body as Partial<CreateGradeLevelBody>;
  const { rows: existing } = await pool.query<GradeLevel>(
    'SELECT * FROM grade_levels WHERE id = $1',
    [id]
  );
  if (!existing[0]) {
    res.status(404).json({ error: 'Grade level not found' });
    return;
  }
  const newName = name?.trim() ?? existing[0].name;
  const newOrder = sort_order ?? existing[0].sort_order;
  try {
    const { rows } = await pool.query<GradeLevel>(
      'UPDATE grade_levels SET name = $1, sort_order = $2 WHERE id = $3 RETURNING *',
      [newName, newOrder, id]
    );
    res.json(rows[0]);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'A grade level with that name already exists' });
      return;
    }
    throw err;
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { rows: existing } = await pool.query('SELECT id FROM grade_levels WHERE id = $1', [id]);
  if (!existing[0]) {
    res.status(404).json({ error: 'Grade level not found' });
    return;
  }
  const { rows: countRows } = await pool.query<{ c: string }>(
    'SELECT COUNT(*) AS c FROM projects WHERE grade_level_id = $1',
    [id]
  );
  const count = Number(countRows[0].c);
  if (count > 0) {
    res.status(409).json({
      error: `Cannot delete: ${count} project(s) reference this grade level`,
    });
    return;
  }
  await pool.query('DELETE FROM grade_levels WHERE id = $1', [id]);
  res.status(204).send();
});

export default router;
