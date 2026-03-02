import { Router } from 'express';
import pool from '../db/database';
import type { Item, CreateItemBody, UpdateItemBody } from '../types';

const router = Router();

const ITEM_SELECT = `
  SELECT i.*, c.name AS category_name
  FROM items i
  JOIN categories c ON c.id = i.category_id
`;

const VALID_ITEM_TYPES = ['consumable', 'reusable', 'bulk'];

/** After any quantity change, auto-flag items at or below 25% of their minimum. */
async function checkLowStock(itemId: number): Promise<void> {
  await pool.query(
    `UPDATE items
     SET needs_order = true
     WHERE id = $1
       AND NOT needs_order
       AND quantity_min > 0
       AND quantity_on_hand <= quantity_min * 0.25`,
    [itemId]
  );
}

// ─── GET /shopping-list — MUST come before /:id ─────────────────────────────
router.get('/shopping-list', async (req, res) => {
  const { rows } = await pool.query<Item>(
    `${ITEM_SELECT} WHERE i.needs_order = true ORDER BY c.name, i.name`
  );

  if (req.query.format === 'csv') {
    const header = 'Item Name,Category,Type,Quantity On Hand,Min Quantity,Notes\n';
    const csvRows = rows
      .map((i) =>
        [i.name, i.category_name, i.item_type, i.quantity_on_hand, i.quantity_min, i.notes ?? '']
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="shopping-list.csv"');
    res.send(header + csvRows);
    return;
  }

  res.json(rows);
});

// ─── GET / ───────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { search, category_id, needs_order } = req.query;
  let sql = `${ITEM_SELECT} WHERE 1=1`;
  const params: (string | number)[] = [];
  let p = 1;

  if (search) {
    sql += ` AND i.name ILIKE $${p++}`;
    params.push(`%${search}%`);
  }
  if (category_id) {
    sql += ` AND i.category_id = $${p++}`;
    params.push(Number(category_id));
  }
  if (needs_order === 'true') {
    sql += ' AND i.needs_order = true';
  }
  sql += ' ORDER BY c.name, i.name';

  const { rows } = await pool.query<Item>(sql, params);
  res.json(rows);
});

// ─── GET /:id ────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { rows } = await pool.query<Item>(
    `${ITEM_SELECT} WHERE i.id = $1`,
    [Number(req.params.id)]
  );
  if (!rows[0]) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  res.json(rows[0]);
});

// ─── POST / ──────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const body = req.body as CreateItemBody;
  if (!body.name?.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  if (!body.category_id) {
    res.status(400).json({ error: 'Category is required' });
    return;
  }
  const itemType = body.item_type ?? 'consumable';
  if (!VALID_ITEM_TYPES.includes(itemType)) {
    res.status(400).json({ error: 'item_type must be consumable, reusable, or bulk' });
    return;
  }
  const { rows: cat } = await pool.query('SELECT id FROM categories WHERE id = $1', [body.category_id]);
  if (!cat[0]) {
    res.status(400).json({ error: 'Category not found' });
    return;
  }
  try {
    const { rows: inserted } = await pool.query<{ id: number }>(
      `INSERT INTO items (name, category_id, quantity_on_hand, quantity_min, needs_order, item_type, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        body.name.trim(),
        body.category_id,
        body.quantity_on_hand ?? 0,
        body.quantity_min ?? 0,
        body.needs_order ?? false,
        itemType,
        body.notes ?? null,
      ]
    );
    const newId = inserted[0].id;
    await checkLowStock(newId);
    const { rows } = await pool.query<Item>(`${ITEM_SELECT} WHERE i.id = $1`, [newId]);
    res.status(201).json(rows[0]);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'An item with that name already exists in this category' });
      return;
    }
    throw err;
  }
});

// ─── PUT /:id ────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { rows: existingRows } = await pool.query<Item>(
    `${ITEM_SELECT} WHERE i.id = $1`,
    [id]
  );
  if (!existingRows[0]) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  const existing = existingRows[0];

  const body = req.body as UpdateItemBody;
  const name = body.name?.trim() ?? existing.name;
  const category_id = body.category_id ?? existing.category_id;
  const quantity_on_hand = body.quantity_on_hand ?? existing.quantity_on_hand;
  const quantity_min = body.quantity_min ?? existing.quantity_min;
  const needs_order = body.needs_order !== undefined ? body.needs_order : existing.needs_order;
  const item_type = body.item_type ?? existing.item_type;
  const notes = body.notes !== undefined ? (body.notes ?? null) : existing.notes;

  if (!VALID_ITEM_TYPES.includes(item_type)) {
    res.status(400).json({ error: 'item_type must be consumable, reusable, or bulk' });
    return;
  }

  try {
    await pool.query(
      `UPDATE items
       SET name = $1, category_id = $2, quantity_on_hand = $3, quantity_min = $4,
           needs_order = $5, item_type = $6, notes = $7, updated_at = NOW()
       WHERE id = $8`,
      [name, category_id, quantity_on_hand, quantity_min, needs_order, item_type, notes, id]
    );
    await checkLowStock(id);
    const { rows } = await pool.query<Item>(`${ITEM_SELECT} WHERE i.id = $1`, [id]);
    res.json(rows[0]);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'An item with that name already exists in this category' });
      return;
    }
    throw err;
  }
});

// ─── DELETE /:id ─────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { rows: existing } = await pool.query('SELECT id FROM items WHERE id = $1', [id]);
  if (!existing[0]) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  await pool.query('DELETE FROM items WHERE id = $1', [id]);
  res.status(204).send();
});

export default router;
