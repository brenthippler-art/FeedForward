import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  vm.runInNewContext(outputText, { exports, URL, Response, Date, Number, console: { error() {} }, require(name) {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`);
    return dependencies[name];
  } });
  return exports;
}
const policy = load('../lib/listing-input.ts');
const now = Date.parse('2026-10-18T14:00:00Z');
const item = { item: 'Fresh carrots', quantity: 2, unit: 'boxes', unitWeight: 5.25, condition: 'Chilled, whole', category: 'produce', containsMeat: false, hoursOut: null, tier: 1, readyAt: '2026-10-18T13:00:00Z', safeUntil: '2026-10-19T20:00:00Z' };
const request = (changes = {}) => ({ confirmed: true, listings: [{ ...item, ...changes }] });
for (const [name, changes, field] of [
  ['blank name', { item: ' ' }, 'item'], ['overlong name', { item: 'x'.repeat(201) }, 'item'],
  ['fractional quantity', { quantity: 1.5 }, 'quantity'], ['zero quantity', { quantity: 0 }, 'quantity'],
  ['string quantity', { quantity: '2' }, 'quantity'], ['negative weight', { unitWeight: -1 }, 'unitWeight'],
  ['nonfinite weight', { unitWeight: Infinity }, 'unitWeight'], ['fractional-cent weight', { unitWeight: 1.001 }, 'unitWeight'],
  ['total overflow', { quantity: 100000000, unitWeight: 0.01 }, 'unitWeight'],
  ['missing unit', { unit: '' }, 'unit'], ['unknown condition', { condition: ' UNKNOWN ' }, 'condition'],
  ['unknown category', { category: 'fake' }, 'category'], ['invalid tier', { tier: 4 }, 'tier'],
  ['unknown meat content', { containsMeat: null }, 'containsMeat'],
  ['meat incorrectly marked', { category: 'meat', containsMeat: false }, 'containsMeat'],
  ['meat animal feed', { containsMeat: true, tier: 2 }, 'tier'],
  ['cooked exposure unknown', { category: 'cooked', hoursOut: null }, 'hoursOut'],
  ['cooked exposure negative', { category: 'cooked', hoursOut: -1 }, 'hoursOut'],
  ['cooked food too long for people', { category: 'cooked', hoursOut: 3 }, 'tier'],
  ['missing ready time', { readyAt: null }, 'readyAt'], ['non-UTC timestamp', { readyAt: '2026-10-18T13:00:00' }, 'readyAt'],
  ['rollover date', { readyAt: '2026-02-30T13:00:00Z' }, 'readyAt'],
  ['fractional seconds', { readyAt: '2026-10-18T13:00:00.001Z' }, 'readyAt'],
  ['missing people deadline', { safeUntil: null }, 'safeUntil'],
  ['past deadline', { safeUntil: '2026-10-18T14:00:00Z' }, 'safeUntil'],
  ['deadline before ready', { readyAt: '2026-10-20T14:00:00Z' }, 'safeUntil'],
  ['false deadline', { tier: 3, safeUntil: false }, 'safeUntil'],
]) test(`posting rejects ${name}`, () => {
  assert.throws(() => policy.parseListingRequest(request(changes), 1, now), (error) => error.status === 400 && Boolean(error.fields[`listings.0.${field}`]));
});
for (const [name, body, status] of [
  ['missing JSON', null, 400], ['empty batch', { confirmed: true, listings: [] }, 400],
  ['oversized batch', { confirmed: true, listings: Array(21).fill(item) }, 400],
  ['missing confirmation', { listings: [item] }, 400],
  ['spoofed donor', { ...request(), donorId: 2 }, 403],
]) test(`posting rejects ${name}`, () => assert.throws(() => policy.parseListingRequest(body, 1, now), (error) => error.status === status));

test('posting trims fields, normalizes UTC, and accepts a no-deadline compost item', () => {
  const [result] = policy.parseListingRequest(request({ item: ' Carrots ', tier: 3, safeUntil: null }), 1, now);
  assert.equal(result.item, 'Carrots');
  assert.equal(result.readyAt, '2026-10-18T13:00:00.000Z');
  assert.equal(result.safeUntil, null);
  assert.equal(result.unitWeight, 5.25);
});

const row = { item_id: 50, donor_id: 1, category_name: 'produce', quantity: 2, unit_weight: '5.25', total_weight: '10.50', tier: 1, item_name: 'Fresh carrots', unit: 'boxes', condition: 'Chilled', contains_meat: 0, hours_out: null, tier_reason: 'Donor confirmed tier 1.', ready_at: '2026-10-18T13:00:00.000Z', safe_until: '2026-10-19T20:00:00.000Z', status: 'available' };
function fixture({ noDonor = false, noCategory = false, insertFailureAt = 0, clock = now } = {}) {
  const events = [];
  let inserts = 0;
  const connection = {
    beginTransaction: async () => events.push('begin'), commit: async () => events.push('commit'),
    rollback: async () => events.push('rollback'), release: () => events.push('release'),
    query: async () => [[{ now: new Date(clock).toISOString() }]],
    execute: async (sql, values) => {
      events.push({ sql, values: Array.from(values) });
      if (sql.includes('FROM Donor')) return [noDonor ? [] : [{ org_id: 1 }]];
      if (sql.includes('FROM Category WHERE')) return [noCategory ? [] : [{ category_id: 7, category_name: 'produce' }]];
      if (sql.includes('INSERT INTO Item')) { if (++inserts === insertFailureAt) throw new Error('Insert failed'); return [{ insertId: 49 + inserts }]; }
      if (sql.includes('FROM Item i')) return [[row]];
      throw new Error(`Unexpected SQL ${sql}`);
    },
  };
  return { ...load('../lib/donor-listings.ts', { '@/lib/db': { pool: { getConnection: async () => connection, execute: connection.execute } }, '@/lib/listing-input': policy }), events };
}
test('posting binds donor identity and category ID, omits generated weight, returns actual decimal values', async () => {
  const f = fixture();
  const result = await f.createListings(1, policy.parseListingRequest(request(), 1, now));
  const insert = f.events.find((event) => event.sql?.includes('INSERT INTO Item'));
  assert.deepEqual(insert.values.slice(0, 4), [1, 7, 2, '5.25']);
  assert.doesNotMatch(insert.sql, /total_weight/);
  assert.equal(result[0].estimatedLbs, 10.5);
  assert.equal(result[0].unitWeight, 5.25);
  assert.deepEqual(f.events.slice(-2), ['commit', 'release']);
});
for (const [name, options] of [['unregistered donor', { noDonor: true }], ['missing category', { noCategory: true }], ['deadline passed during a lock wait', { clock: Date.parse('2026-10-20T00:00:00Z') }]]) {
  test(`posting rolls back ${name} before any insert`, async () => {
    const f = fixture(options);
    await assert.rejects(f.createListings(1, policy.parseListingRequest(request(), 1, now)));
    assert.equal(f.events.some((event) => event.sql?.includes('INSERT INTO Item')), false);
    assert.deepEqual(f.events.slice(-2), ['rollback', 'release']);
  });
}
test('failure on the second item rolls back the batch and never commits', async () => {
  const f = fixture({ insertFailureAt: 2 });
  await assert.rejects(f.createListings(1, policy.parseListingRequest({ confirmed: true, listings: [item, item] }, 1, now)), /Insert failed/);
  assert.deepEqual(f.events.slice(-2), ['rollback', 'release']);
  assert.equal(f.events.includes('commit'), false);
});
test('donor listing reads bind the owner and optional tier and map status', async () => {
  const f = fixture();
  const [result] = await f.getDonorListings(1, 3);
  assert.deepEqual(f.events[0].values, [1, 3]);
  assert.match(f.events[0].sql, /WHERE i.donor_id = \?/);
  assert.equal(result.status, 'available');
});

function route(user, { create = async () => [row], read = async () => [] } = {}) {
  return load('../app/api/listings/route.ts', {
    '@/lib/session': { getCurrentUser: async () => user },
    '@/lib/bookable-listings': { getBookableListings: async () => [] },
    '@/lib/donor-listings': { createListings: create, getDonorListings: read },
    '@/lib/listing-input': policy,
  });
}
// Dates for actual route tests must stay in the future relative to the test clock.
const future = { ...item, safeUntil: '2099-10-19T20:00:00Z' };
for (const [name, user, status] of [['signed out', null, 401], ['recipient', { role: 'recipient', orgId: 11 }, 403]]) {
  test(`POST listings rejects ${name} before parsing`, async () => {
    const response = await route(user).POST({ json: () => { throw new Error('Must not parse'); } });
    assert.equal(response.status, status);
  });
}
test('POST listings rejects malformed JSON', async () => {
  assert.equal((await route({ role: 'donor', orgId: 1 }).POST({ json: async () => { throw new SyntaxError(); } })).status, 400);
});
test('POST listings uses session donor and returns 201', async () => {
  const response = await route({ role: 'donor', orgId: 1 }, { create: async (id, items) => { assert.equal(id, 1); assert.equal(items[0].item, item.item); return [{ id: 50 }]; } }).POST({ json: async () => ({ confirmed: true, listings: [future] }) });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), [{ id: 50 }]);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});
test('POST listings returns field errors before attempting writes', async () => {
  const response = await route({ role: 'donor', orgId: 1 }, { create: async () => { throw new Error('Must not write'); } }).POST({ json: async () => request({ quantity: 0 }) });
  assert.equal(response.status, 400);
  assert.ok((await response.json()).fields['listings.0.quantity']);
});
test('POST listings maps domain errors and hides unexpected SQL details', async () => {
  for (const error of [new policy.ListingError(403, 'Not registered'), new Error('private DB info')]) {
    const response = await route({ role: 'donor', orgId: 1 }, { create: async () => { throw error; } }).POST({ json: async () => ({ confirmed: true, listings: [future] }) });
    assert.equal(response.status, error.status || 503);
    assert.doesNotMatch(JSON.stringify(await response.json()), /private DB info/);
  }
});
test('GET listings scopes donor history to the session identity', async () => {
  const response = await route({ role: 'donor', orgId: 2 }, { read: async (id) => { assert.equal(id, 2); return [{ id: 50 }]; } }).GET({ url: 'http://localhost/api/listings' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [{ id: 50 }]);
});
test('a donor cannot use recipientId to retrieve another organization', async () => {
  const response = await route({ role: 'donor', orgId: 1 }).GET({ url: 'http://localhost/api/listings?recipientId=11' });
  assert.equal(response.status, 403);
});
