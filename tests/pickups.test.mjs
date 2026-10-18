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
    exports, Response, Date, Intl, Number, Math, String,
    console: { error() {} },
    require(name) { assert.ok(name in dependencies, `Unexpected dependency ${name}`); return dependencies[name]; },
  });
  return exports;
}
const policy = load('../lib/pickup-policy.ts');
const claimPolicy = load('../lib/claim-policy.ts');
const input = { claimId: 7, actualLbs: 10.125 };
for (const [name, body, status] of [
  ['missing body', null, 400], ['array', [], 400],
  ['string ID', { ...input, claimId: '7' }, 400], ['zero ID', { ...input, claimId: 0 }, 400],
  ['fractional ID', { ...input, claimId: 1.5 }, 400], ['oversized ID', { ...input, claimId: 2147483648 }, 400],
  ['string weight', { ...input, actualLbs: '10' }, 400], ['missing weight', { claimId: 7 }, 400],
  ['subprecision weight', { ...input, actualLbs: 0.0000000001 }, 400], ['zero weight', { ...input, actualLbs: 0 }, 400], ['negative weight', { ...input, actualLbs: -1 }, 400],
  ['infinite weight', { ...input, actualLbs: Infinity }, 400], ['NaN weight', { ...input, actualLbs: NaN }, 400],
  ['excess precision', { ...input, actualLbs: 1.0001 }, 400], ['oversized weight', { ...input, actualLbs: 10000000 }, 400],
  ['spoofed recipient', { ...input, recipientId: 12 }, 403], ['partial quantity', { ...input, quantity: 1 }, 400],
]) test(`pickup input rejects ${name}`, () => assert.throws(() => policy.parsePickupInput(body, 11), e => e.status === status));
for (const actualLbs of [0.001, 1.001, 10.125, 9999999.999]) {
  test(`pickup weight accepts ${actualLbs}`, () => assert.equal(policy.parsePickupInput({ claimId: 7, actualLbs }, 11).actualLbs, actualLbs));
}
const now = '2026-10-18T16:00:00.000Z';
const item = { quantity: 2, category_id: 1, tier: 1, ready_at: '2026-10-18T14:00:00.000Z', safe_until: '2026-10-18T18:00:00.000Z' };
const claim = { item_id: 3, recipient_id: 11, pickup_time: '2026-10-18T15:00:00.000Z' };
for (const [name, changes, booked, time] of [
  ['early pickup', {}, '2026-10-18T17:00:00.000Z', now],
  ['not ready', { ready_at: '2026-10-18T17:00:00.000Z' }, claim.pickup_time, now],
  ['deadline boundary', {}, claim.pickup_time, item.safe_until],
  ['missing people deadline', { safe_until: null }, claim.pickup_time, now],
  ['invalid clock', {}, claim.pickup_time, 'invalid'],
  ['missing ready time', { ready_at: null }, claim.pickup_time, now],
]) test(`completion rejects ${name}`, () => assert.throws(() => policy.validatePickupTime({ ...item, ...changes }, booked, time), e => e.status === 409));

function database(options = {}) {
  const calls = [];
  let inserted;
  const connection = {
    async beginTransaction() { calls.push('begin'); },
    async commit() { calls.push('commit'); },
    async rollback() { calls.push('rollback'); },
    release() { calls.push('release'); },
    async query() { calls.push('clock'); return [[{ now }]]; },
    async execute(sql, params) {
      const text = sql.replace(/\s+/g, ' ').trim(); calls.push(text);
      if (text.startsWith('SELECT item_id, recipient_id FROM Claim')) return [options.missing ? [] : [{ ...claim, recipient_id: options.owner ?? 11 }]];
      if (text.includes('FROM Item')) return [[{ ...item, ...options.item }]];
      if (text.includes('FROM Claim')) return [[{ ...claim, recipient_id: options.owner ?? 11 }]];
      if (text.includes('FROM Pickup')) return [options.duplicate ? [{ pickup_id: 99 }] : []];
      if (text.includes('FROM AcceptedTier')) return [options.noTier ? [] : [{ tier: 1 }]];
      if (text.includes('FROM RefusedCategory')) return [options.refused ? [{ category_id: 1 }] : []];
      if (text.includes('FROM AcceptanceRule')) return [options.closed ? [] : [{ day_of_week: 'Sun', pickup_start: '00:00:00', pickup_end: '00:00:00' }]];
      if (text.startsWith('INSERT INTO Pickup')) {
        if (options.insertError) throw Object.assign(new Error('DB failure'), { code: options.insertError });
        inserted = params; return [{ insertId: 42 }];
      }
      throw new Error(`Unexpected SQL ${text}`);
    },
  };
  const service = load('../lib/pickups.ts', { '@/lib/db': { pool: { async getConnection() { return connection; } } }, '@/lib/claim-policy': claimPolicy, '@/lib/pickup-policy': policy });
  return { ...service, calls, inserted: () => inserted };
}
test('completion saves measured weight and full server quantity, with item-first locking and no manual inventory update', async () => {
  const db = database(); const pickup = await db.completePickup(11, input);
  assert.equal(pickup.id, 42); assert.equal(pickup.pickedUpAt, now);
  assert.equal(JSON.stringify(db.inserted()), JSON.stringify([7, 2, '10.125', '2026-10-18 16:00:00']));
  const itemLock = db.calls.findIndex(s => s.includes('FROM Item') && s.includes('FOR UPDATE'));
  const claimLock = db.calls.findIndex(s => s.includes('FROM Claim') && s.includes('FOR UPDATE'));
  assert.ok(itemLock > 0 && claimLock > itemLock);
  assert.ok(db.calls.indexOf('clock') > claimLock);
  assert.ok(!db.calls.some(s => s.startsWith('UPDATE')));
  assert.deepEqual(db.calls.slice(-2), ['commit', 'release']);
});
for (const [name, options, status] of [
  ['missing claim', { missing: true }, 404], ['another recipient', { owner: 12 }, 403],
  ['duplicate completion', { duplicate: true }, 409], ['empty inventory', { item: { quantity: 0 } }, 409],
  ['expired food', { item: { safe_until: now } }, 409], ['changed tier', { noTier: true }, 403],
  ['refused category', { refused: true }, 403], ['closed pickup window', { closed: true }, 409],
  ['unique constraint race', { insertError: 'ER_DUP_ENTRY' }, 409], ['trigger guard', { insertError: 'ER_SIGNAL_EXCEPTION' }, 409],
]) test(`completion rolls back ${name}`, async () => {
  const db = database(options);
  await assert.rejects(db.completePickup(11, input), e => e.status === status);
  assert.ok(!db.calls.includes('commit')); assert.deepEqual(db.calls.slice(-2), ['rollback', 'release']);
  assert.equal(db.inserted(), undefined);
});
test('retry after a successful completion cannot insert a second pickup', async () => {
  const options = {};
  const db = database(options);
  await db.completePickup(11, input);
  options.duplicate = true;
  await assert.rejects(db.completePickup(11, input), e => e.status === 409);
  assert.equal(db.calls.filter(s => s.startsWith('INSERT INTO Pickup')).length, 1);
  assert.equal(db.calls.filter(s => s === 'commit').length, 1);
});
test('unexpected database failure releases connection and propagates', async () => {
  const db = database({ insertError: 'ER_CONNECTION_LOST' });
  await assert.rejects(db.completePickup(11, input), e => e.code === 'ER_CONNECTION_LOST');
  assert.deepEqual(db.calls.slice(-2), ['rollback', 'release']);
});
function route(user, complete = async () => ({ id: 42, ...input, pickedUpAt: now })) {
  return load('../app/api/pickups/route.ts', { '@/lib/session': { async getCurrentUser() { return user; } }, '@/lib/pickups': { completePickup: complete }, '@/lib/pickup-policy': policy });
}
const request = (body = input) => new Request('http://localhost/api/pickups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
for (const [name, user, status] of [['signed out', undefined, 401], ['donor', { orgId: 1, role: 'donor' }, 403]]) {
  test(`route rejects ${name}`, async () => {
    const response = await route(user, async () => assert.fail('must not write')).POST(request());
    assert.equal(response.status, status); assert.equal(response.headers.get('Cache-Control'), 'no-store');
  });
}
test('route uses session identity and returns created pickup', async () => {
  let recipient;
  const response = await route({ orgId: 11, role: 'recipient' }, async (id) => { recipient = id; return { id: 42 }; }).POST(request());
  assert.equal(recipient, 11); assert.equal(response.status, 201); assert.equal((await response.json()).id, 42);
});
test('route rejects malformed JSON without writing', async () => {
  const response = await route({ orgId: 11, role: 'recipient' }, async () => assert.fail()).POST(new Request('http://localhost/api/pickups', { method: 'POST', body: '{' }));
  assert.equal(response.status, 400);
});
test('route rejects invalid input without writing', async () => {
  const response = await route({ orgId: 11, role: 'recipient' }, async () => assert.fail()).POST(request({ ...input, actualLbs: 0 }));
  assert.equal(response.status, 400);
});
test('route preserves domain errors and hides unexpected database errors', async () => {
  for (const [error, status] of [[new policy.PickupError(409, 'Already picked up'), 409], [new Error('private SQL details'), 503]]) {
    const response = await route({ orgId: 11, role: 'recipient' }, async () => { throw error; }).POST(request());
    assert.equal(response.status, status); assert.ok(!(await response.text()).includes('private SQL'));
  }
});
