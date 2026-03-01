import dns from 'node:dns';
import { Pool, types } from 'pg';
import fs from 'node:fs';
import path from 'node:path';

// Railway's network can't reach Supabase over IPv6 — prefer IPv4.
dns.setDefaultResultOrder('ipv4first');

// Return TIMESTAMPTZ as ISO strings and DATE as plain strings
// so they match the existing string-typed fields in our domain types.
types.setTypeParser(1184, (val: string) => new Date(val).toISOString()); // TIMESTAMPTZ
types.setTypeParser(1082, (val: string) => val);                         // DATE

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function initDb(): Promise<void> {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);

  const { rows } = await pool.query<{ c: string }>('SELECT COUNT(*) AS c FROM grade_levels');
  if (Number(rows[0].c) === 0) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const levels: [string, number][] = [
        ['PreK', 1],
        ['K', 2],
        ['1st', 3],
        ['2nd/3rd', 4],
        ['4th/5th', 5],
        ['6th', 6],
        ['7th/8th', 7],
      ];
      for (const [name, sort_order] of levels) {
        await client.query(
          'INSERT INTO grade_levels (name, sort_order) VALUES ($1, $2)',
          [name, sort_order]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

export default pool;
