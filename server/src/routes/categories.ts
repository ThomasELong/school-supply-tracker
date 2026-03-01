import { Router } from 'express';
import pool from '../db/database';
import type { Category, CreateCategoryBody } from '../types';

const router = Router();

router.get('/', async (_req, res) => {
  const { rows } = await pool.query<Category>('SELECT * FROM categories ORDER BY name');
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query<Category>(
    'SELECT * FROM categories WHERE id = $1',
    [Number(req.params.id)]
  );
  if (!rows[0]) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }
  res.json(rows[0]);
});

router.post('/', async (req, res) => {
  const { name } = req.body as CreateCategoryBody;
  if (!name?.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  try {
    const { rows } = await pool.query<Category>(
      'INSERT INTO categories (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'A category with that name already exists' });
      return;
    }
    throw err;
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body as CreateCategoryBody;
  if (!name?.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  const { rows: existing } = await pool.query('SELECT id FROM categories WHERE id = $1', [id]);
  if (!existing[0]) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }
  try {
    const { rows } = await pool.query<Category>(
      'UPDATE categories SET name = $1 WHERE id = $2 RETURNING *',
      [name.trim(), id]
    );
    res.json(rows[0]);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'A category with that name already exists' });
      return;
    }
    throw err;
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { rows: existing } = await pool.query('SELECT id FROM categories WHERE id = $1', [id]);
  if (!existing[0]) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }
  const { rows: countRows } = await pool.query<{ c: string }>(
    'SELECT COUNT(*) AS c FROM items WHERE category_id = $1',
    [id]
  );
  const itemCount = Number(countRows[0].c);
  if (itemCount > 0) {
    res.status(409).json({ error: `Cannot delete: ${itemCount} item(s) are in this category` });
    return;
  }
  await pool.query('DELETE FROM categories WHERE id = $1', [id]);
  res.status(204).send();
});

export default router;
