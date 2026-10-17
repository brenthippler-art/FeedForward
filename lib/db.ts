import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from '@/drizzle/schema';
import * as relations from '@/drizzle/relations';

// A pool keeps a few connections open and reuses them,
// instead of opening a new connection for every request
export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
});

export const db = drizzle(pool, { schema: { ...schema, ...relations }, mode: 'default' });
