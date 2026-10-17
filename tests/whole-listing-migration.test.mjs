import assert from 'node:assert/strict';
import test from 'node:test';
import { applyWholeListingMigration } from '../scripts/migrate-whole-listings.mjs';

function database({ duplicateClaims = [], duplicatePickups = [], invalidPickups = [], missingTrigger = false, failDdl = false } = {}) {
  const calls = [];
  return { calls, async query(sql) {
    calls.push(sql);
    if (sql.includes('GROUP BY item_id')) return [duplicateClaims];
    if (sql.includes('GROUP BY claim_id')) return [duplicatePickups];
    if (sql.includes('WHERE quantity <= 0')) return [invalidPickups];
    if (sql.includes('information_schema.TRIGGERS')) return [missingTrigger ? [] : [{ name: 'before_pickup_insert' }]];
    if (failDdl) throw new Error('DDL failed');
    return [{}];
  } };
}

for (const [label, records] of [
  ['duplicate item reservations', { duplicateClaims: [{ item_id: 1, count: 2 }] }],
  ['duplicate claim completions', { duplicatePickups: [{ claim_id: 1, count: 2 }] }],
  ['nonpositive historical pickups', { invalidPickups: [{ pickup_id: 1 }] }],
  ['a missing stock trigger', { missingTrigger: true }],
]) {
  test(`migration refuses ${label} without executing DDL`, async () => {
    const db = database(records);
    await assert.rejects(applyWholeListingMigration(db, true));
    assert.equal(db.calls.some((sql) => /ALTER TABLE|CREATE TRIGGER/.test(sql)), false);
  });
}

test('default preflight does not modify the database', async () => {
  const db = database();
  await applyWholeListingMigration(db);
  assert.equal(db.calls.length, 4);
  assert.equal(db.calls.every((sql) => sql.trim().startsWith('SELECT')), true);
});

test('apply preserves trigger body and runs it after both constraints', async () => {
  const db = database();
  await applyWholeListingMigration(db, true);
  assert.equal(db.calls.length, 7);
  assert.match(db.calls[4], /UNIQUE \(item_id\)/);
  assert.match(db.calls[5], /UNIQUE \(claim_id\)/);
  assert.match(db.calls[6], /FOR EACH ROW PRECEDES before_pickup_insert/);
  assert.match(db.calls[6], /FOR UPDATE/);
  assert.match(db.calls[6], /NEW.quantity <> v_available/);
  assert.doesNotMatch(db.calls[6], /UPDATE Item SET/);
});

test('failed DDL stops the migration immediately', async () => {
  const db = database({ failDdl: true });
  await assert.rejects(applyWholeListingMigration(db, true), /DDL failed/);
  assert.equal(db.calls.length, 5);
});
