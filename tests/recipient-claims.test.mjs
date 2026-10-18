import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, Response, URL, Date, Intl, Number, console: { error() {} },
    require(name) { if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`); return dependencies[name]; },
  });
  return exports;
}
const policy = load('../lib/claim-policy.ts');
const slotModule = load('../lib/pickup-slots.ts', { '@/lib/claim-policy': policy });
const windows = [{ day_of_week: 'Sun', pickup_start: '09:00:00', pickup_end: '17:00:00' }];
const now = Date.parse('2026-10-18T14:10:00Z');
const ready = '2026-10-18T14:00:00Z';
const deadline = '2026-10-18T16:00:00Z';

test('booking options start in the future on half hours, stop before expiry, and satisfy the POST policy', () => {
  const slots = slotModule.bookablePickupSlots(ready, deadline, 1, windows, now);
  assert.deepEqual(Array.from(slots), ['2026-10-18T14:30:00.000Z', '2026-10-18T15:00:00.000Z', '2026-10-18T15:30:00.000Z']);
  for (const slot of slots) {
    assert.equal(policy.fitsPickupWindow(slot, windows), true);
    policy.validateAvailability({ quantity: 2, tier: 1, item_name: 'Carrots', unit: 'boxes', ready_at: ready, safe_until: deadline, now: new Date(now).toISOString() }, slot);
  }
});

test('future readiness and recipient windows restrict offered dates', () => {
  const slots = slotModule.bookablePickupSlots('2026-10-19T14:00:00Z', '2026-10-20T00:00:00Z', 1, windows, now);
  assert.equal(slots.length, 0);
});

for (const [name, readyAt, safeUntil, tier, rules, clock] of [
  ['expired', ready, '2026-10-18T14:00:00Z', 1, windows, now],
  ['unknown people deadline', ready, null, 1, windows, now],
  ['missing windows', ready, deadline, 1, [], now],
  ['invalid readiness', 'bad', deadline, 1, windows, now],
  ['invalid clock', ready, deadline, 1, windows, NaN],
]) test(`no slots for ${name}`, () => assert.equal(slotModule.bookablePickupSlots(readyAt, safeUntil, tier, rules, clock).length, 0));

test('no-expiry options are bounded and exclude times at or before the server clock', () => {
  const allDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => ({ day_of_week: day, pickup_start: '00:00:00', pickup_end: '00:00:00' }));
  const slots = slotModule.bookablePickupSlots(ready, null, 3, allDays, now);
  assert.equal(slots.length, 48);
  assert.ok(slots.every((slot) => Date.parse(slot) > now && Date.parse(slot) < now + 7 * 86400000));
});

test('bookable listings use the requested recipient rules and database clock', async () => {
  const calls = [];
  const { getBookableListings } = load('../lib/bookable-listings.ts', {
    '@/lib/db': { pool: {
      execute: async (sql, values) => { calls.push(Array.from(values)); return [windows]; },
      query: async () => [[{ now: new Date(now).toISOString() }]],
    } },
    '@/lib/listings': { getRecipientListings: async (id, tier) => { assert.equal(id, 11); assert.equal(tier, 1); return [{ id: 1, readyAt: ready, safeUntil: deadline, tier: 1 }]; } },
    '@/lib/pickup-slots': slotModule,
  });
  const result = await getBookableListings(11, 1);
  assert.deepEqual(calls, [[11]]);
  assert.equal(result[0].id, 1);
  assert.equal(result[0].pickupSlots.length, 3);
});

const baseRow = {
  claim_id: 42, item_id: 1, item_name: 'Carrots', donor_name: 'Kitchen', quantity: 2,
  unit: 'boxes', estimated_lbs: '10.00', tier: 1, pickup_time: '2026-10-18T15:00:00.000Z', pickup_id: null, actual_lbs: null,
};
test('saved claims query scopes to recipient and maps pending and completed records', async () => {
  let query;
  const { getRecipientClaims } = load('../lib/recipient-claims.ts', {
    '@/lib/db': { pool: { execute: async (sql, values) => { query = sql; assert.deepEqual(Array.from(values), [11]); return [[baseRow, { ...baseRow, claim_id: 43, pickup_id: 8, actual_lbs: '9.750' }]]; } } },
  });
  const rows = await getRecipientClaims(11);
  assert.equal(rows[0].status, 'claimed');
  assert.equal(rows[0].actualLbs, null);
  assert.equal(rows[0].listing.estimatedLbs, 10);
  assert.equal(rows[1].status, 'picked_up');
  assert.equal(rows[1].actualLbs, 9.75);
  assert.match(query, /WHERE c.recipient_id = \?/);
  assert.match(query, /COALESCE\(p.quantity, i.quantity\)/);
  assert.doesNotMatch(query, /i.total_weight/);
});

test('completed pickups with unknown weight remain completed and historical nullable names do not crash', async () => {
  const { getRecipientClaims } = load('../lib/recipient-claims.ts', {
    '@/lib/db': { pool: { execute: async () => [[{ ...baseRow, pickup_id: 8, item_name: null, unit: null }]] } },
  });
  const [row] = await getRecipientClaims(11);
  assert.equal(row.status, 'picked_up');
  assert.equal(row.actualLbs, null);
  assert.equal(row.listing.item, 'Listing #1');
});

function getRoute(user, read = async () => []) {
  return load('../app/api/claims/route.ts', {
    '@/lib/session': { getCurrentUser: async () => user },
    '@/lib/recipient-claims': { getRecipientClaims: read },
    '@/lib/claims': { createClaim() { throw new Error('GET cannot write'); } },
    '@/lib/claim-policy': policy,
  }).GET;
}
for (const [name, user, query, status] of [
  ['signed out', null, '', 401],
  ['donor', { role: 'donor', orgId: 1 }, '', 403],
  ['other recipient', { role: 'recipient', orgId: 11 }, '?recipientId=12', 403],
]) test(`GET claims rejects ${name} before a DB read`, async () => {
  let read = false;
  const response = await getRoute(user, async () => { read = true; return []; })({ url: `http://localhost/api/claims${query}` });
  assert.equal(response.status, status);
  assert.equal(read, false);
});
test('GET claims uses session identity and disables caching', async () => {
  const response = await getRoute({ role: 'recipient', orgId: 11 }, async (id) => { assert.equal(id, 11); return [{ claimId: 42 }]; })({ url: 'http://localhost/api/claims?recipientId=11' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await response.json(), [{ claimId: 42 }]);
});
test('GET claims reports DB failure rather than an empty successful response', async () => {
  const response = await getRoute({ role: 'recipient', orgId: 11 }, async () => { throw new Error('private SQL'); })({ url: 'http://localhost/api/claims' });
  assert.equal(response.status, 503);
  assert.doesNotMatch(JSON.stringify(await response.json()), /private SQL/);
});
