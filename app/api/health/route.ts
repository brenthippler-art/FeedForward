import { pool } from '@/lib/db';

export async function GET() {
  try {
    const [rows] = await pool.query('SELECT NOW() AS time');
    return Response.json({ ok: true, db: rows });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}