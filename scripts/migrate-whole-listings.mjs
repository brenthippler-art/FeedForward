import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export async function checkWholeListingMigration(connection) {
  const [duplicateClaims] = await connection.query(
    'SELECT item_id, COUNT(*) AS count FROM Claim GROUP BY item_id HAVING COUNT(*) > 1',
  );
  const [duplicatePickups] = await connection.query(
    'SELECT claim_id, COUNT(*) AS count FROM Pickup GROUP BY claim_id HAVING COUNT(*) > 1',
  );
  const [invalidPickups] = await connection.query(
    'SELECT pickup_id FROM Pickup WHERE quantity <= 0',
  );
  if (duplicateClaims.length || duplicatePickups.length || invalidPickups.length) {
    throw new Error(`Resolve existing records before migration; no records were changed. Duplicate claims: ${JSON.stringify(duplicateClaims)}; duplicate completions: ${JSON.stringify(duplicatePickups)}; nonpositive pickups: ${JSON.stringify(invalidPickups)}`);
  }
  const [triggers] = await connection.query(`
    SELECT TRIGGER_NAME AS name FROM information_schema.TRIGGERS
    WHERE TRIGGER_SCHEMA = DATABASE() AND EVENT_OBJECT_TABLE = 'Pickup'
      AND ACTION_TIMING = 'BEFORE' AND EVENT_MANIPULATION = 'INSERT'
  `);
  if (!triggers.some((trigger) => trigger.name === 'before_pickup_insert')) {
    throw new Error('Required stock trigger before_pickup_insert is missing. Have the schema owner install/verify it before applying this migration.');
  }
}

export async function applyWholeListingMigration(connection, apply = false) {
  await checkWholeListingMigration(connection);
  if (!apply) return;
  const migration = readFileSync(new URL('../database/migrations/002_whole_listing_reservations.sql', import.meta.url), 'utf8');
  // Each segment is one statement. Trigger body semicolons must stay together.
  for (const statement of migration.split('--> statement-breakpoint')) {
    await connection.query(statement);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && !['--check', '--apply'].includes(args[0]))) {
    throw new Error('Usage: node scripts/migrate-whole-listings.mjs [--check|--apply]');
  }
  const { config } = await import('dotenv');
  config({ path: '.env.local', quiet: true });
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  if (required.some((key) => !process.env[key])) throw new Error('Set DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME before connecting.');
  const { default: mysql } = await import('mysql2/promise');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  });
  try {
    await applyWholeListingMigration(connection, args[0] === '--apply');
    console.log(args[0] === '--apply' ? 'Whole-listing constraints and guard installed.' : 'Preflight passed. No schema or data changes made.');
  } finally {
    await connection.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
