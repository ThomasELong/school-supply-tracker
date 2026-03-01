import { Router } from 'express';
import pool from '../db/database';
import type { Subject, CreateSubjectBody } from '../types';

const router = Router();

router.get('/', async (_req, res) => {
  const { rows } = await pool.query<Subject>('SELECT * FROM subjects ORDER BY name');
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query<Subject>(
    'SELECT * FROM subjects WHERE id = $1',
    [Number(req.params.id)]
  );
  if (!rows[0]) {
    res.status(404).json({ error: 'Subject not found' });
    return;
  }
  res.json(rows[0]);
});

router.post('/', async (req, res) => {
  const { name } = req.body as CreateSubjectBody;
  if (!name?.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  try {
    const { rows } = await pool.query<Subject>(
      'INSERT INTO subjects (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'A subject with that name already exists' });
      return;
    }
    throw err;
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body as CreateSubjectBody;
  if (!name?.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  const { rows: existing } = await pool.query('SELECT id FROM subjects WHERE id = $1', [id]);
  if (!existing[0]) {
    res.status(404).json({ error: 'Subject not found' });
    return;
  }
  try {
    const { rows } = await pool.query<Subject>(
      'UPDATE subjects SET name = $1 WHERE id = $2 RETURNING *',
      [name.trim(), id]
    );
    res.json(rows[0]);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'A subject with that name already exists' });
      return;
    }
    throw err;
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { rows: existing } = await pool.query('SELECT id FROM subjects WHERE id = $1', [id]);
  if (!existing[0]) {
    res.status(404).json({ error: 'Subject not found' });
    return;
  }
  const { rows: countRows } = await pool.query<{ c: string }>(
    'SELECT COUNT(*) AS c FROM projects WHERE subject_id = $1',
    [id]
  );
  const count = Number(countRows[0].c);
  if (count > 0) {
    res.status(409).json({
      error: `Cannot delete: ${count} project(s) reference this subject`,
    });
    return;
  }
  await pool.query('DELETE FROM subjects WHERE id = $1', [id]);
  res.status(204).send();
});

export default router;
