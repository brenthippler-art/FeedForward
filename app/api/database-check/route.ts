import type { RowDataPacket } from 'mysql2';
import { pool } from '@/lib/db';

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  if (['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].some((key) => !process.env[key])) {
    return Response.json({ ok: false, error: 'Database configuration is missing on the application server.' }, { status: 503, headers });
  }

  try {
    // Fixed table names: no user input is interpolated into SQL.
    const [tables] = await pool.query<RowDataPacket[]>(`
      SELECT 'Organization' AS name, COUNT(*) AS rowCount FROM Organization
      UNION ALL SELECT 'Donor', COUNT(*) FROM Donor
      UNION ALL SELECT 'Recipient', COUNT(*) FROM Recipient
      UNION ALL SELECT 'Category', COUNT(*) FROM Category
      UNION ALL SELECT 'Item', COUNT(*) FROM Item
    `);
    const [categories] = await pool.query<RowDataPacket[]>(
      'SELECT category_id AS id, category_name AS name FROM Category ORDER BY category_id',
    );
    return Response.json({ ok: true, tables, categories }, { headers });
  } catch (error) {
    console.error('Database table check failed:', error);
    return Response.json({ ok: false, error: 'Unable to read the five tables. Check the server logs for connection, table, or permission errors.' }, { status: 503, headers });
  }
}
