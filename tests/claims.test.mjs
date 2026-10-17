import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, Response, Date, Intl, Number,
    console: { error() {} },
    require(name) { if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`); return dependencies[name]; },
  });
  return exports;
}
const policy = load('../lib/claim-policy.ts');
const input = { listingId: 1, pickupTime: '2026-10-18T15:00:00.000Z' };
const item = { item_id: 1, category_id: 1, quantity: 2, tier: 1, item_name: 'Carrots', unit: 'boxes', ready_at: '2026-10-18T14:00:00.000Z', safe_until: '2026-10-18T20:00:00.000Z', now: '2026-10-18T14:00:00.000Z' };
const window = (day, start, end) => ({ day_of_week: day, pickup_start: start, pickup_end: end });

for (const [label, body, status] of [
  ['missing body', null, 400], ['array', [], 400],
  ['string ID', { ...input, listingId: '1' }, 400],
  ['zero ID', { ...input, listingId: 0 }, 400],
  ['oversized ID', { ...input, listingId: 2147483648 }, 400],
  ['fractional ID', { ...input, listingId: 1.5 }, 400],
  ['spoofed recipient', { ...input, recipientId: 12 }, 403],
  ['missing timezone', { ...input, pickupTime: '2026-10-18T15:00:00' }, 400],
  ['rollover date', { ...input, pickupTime: '2026-02-30T15:00:00Z' }, 400],
  ['fractional seconds', { ...input, pickupTime: '2026-10-18T15:00:00.001Z' }, 400],
]) test(`input rejects ${label}`, () => assert.throws(() => policy.parseClaimInput(body, 11), (error) => error.status === status));

test('UTC timestamps normalize without trusting body identity', () => {
  const result = policy.parseClaimInput({ ...input, pickupTime: '2026-10-18T15:00:00Z', recipientId: 11 }, 11);
  assert.equal(result.pickupTime, input.pickupTime);
  assert.equal(result.listingId, 1);
});

for (const [label, time, windows, expected] of [
  ['summer Central start inclusive', '2026-10-18T14:00:00Z', [window('Sun', '09:00:00', '17:00:00')], true],
  ['end exclusive', '2026-10-18T22:00:00Z', [window('Sun', '09:00:00', '17:00:00')], false],
  ['winter offset', '2026-12-20T15:00:00Z', [window('Sun', '09:00:00', '17:00:00')], true],
  ['overnight next day', '2026-10-19T06:00:00Z', [window('Sun', '22:00:00', '02:00:00')], true],
  ['overnight end', '2026-10-19T07:00:00Z', [window('Sun', '22:00:00', '02:00:00')], false],
  ['overnight previous day', '2026-10-18T06:00:00Z', [window('Sun', '22:00:00', '02:00:00')], false],
  ['24 hour next day', '2026-10-19T13:00:00Z', [window('Sun', '09:00:00', '09:00:00')], true],
  ['24 hour before opening', '2026-10-18T13:00:00Z', [window('Sun', '09:00:00', '09:00:00')], false],
  ['Sunday wrap', '2026-10-18T06:00:00Z', [window('Sat', '22:00:00', '02:00:00')], true],
  ['DST repeated first hour', '2026-11-01T06:30:00Z', [window('Sun', '01:00:00', '02:00:00')], true],
  ['DST repeated second hour', '2026-11-01T07:30:00Z', [window('Sun', '01:00:00', '02:00:00')], true],
  ['missing rules', input.pickupTime, [], false],
  ['invalid SQL time', input.pickupTime, [window('Sun', '25:00:00', '99:00:00')], false],
  ['multiple windows', input.pickupTime, [window('Sun', '01:00:00', '02:00:00'), window('Sun', '09:00:00', '17:00:00')], true],
]) test(`pickup windows: ${label}`, () => assert.equal(policy.fitsPickupWindow(time, windows), expected));

for (const [label, changes, time, status] of [
  ['empty stock', { quantity: 0 }, input.pickupTime, 409],
  ['incomplete listing', { item_name: null }, input.pickupTime, 409],
  ['missing ready time', { ready_at: null }, input.pickupTime, 409],
  ['past time', {}, '2026-10-18T13:00:00Z', 400],
  ['current time', {}, item.now, 400],
  ['before ready', { ready_at: '2026-10-18T16:00:00Z' }, input.pickupTime, 400],
  ['deadline reached', {}, item.safe_until, 400],
  ['missing people deadline', { safe_until: null }, input.pickupTime, 409],
  ['invalid stored date', { ready_at: '0000-00-00T00:00:00Z' }, input.pickupTime, 409],
]) test(`availability rejects ${label}`, () => assert.throws(() => policy.validateAvailability({ ...item, ...changes }, time), (error) => error.status === status));

test('non-people listings may have no deadline; ready time is inclusive', () => {
  policy.validateAvailability({ ...item, tier: 3, safe_until: null }, input.pickupTime);
  policy.validateAvailability({ ...item, ready_at: input.pickupTime }, input.pickupTime);
});

function fixture(options = {}) {
  const events = [];
  const connection = {
    beginTransaction: async () => events.push('begin'),
    commit: async () => events.push('commit'),
    rollback: async () => events.push('rollback'),
    release: () => events.push('release'),
    query: async () => [[{ now: options.now || item.now }]],
    execute: async (sql, values) => {
      events.push({ sql, values: Array.from(values) });
      if (sql.includes('FROM Item')) return [options.noItem ? [] : [{ ...item }]];
      if (sql.includes('SELECT claim_id')) return [options.claimed ? [{ claim_id: 8 }] : []];
      if (sql.includes('FROM Recipient')) return [options.noRecipient ? [] : [{ org_id: 11 }]];
      if (sql.includes('FROM AcceptedTier')) return [options.noTier ? [] : [{ tier: 1 }]];
      if (sql.includes('FROM RefusedCategory')) return [options.refused ? [{ category_id: 1 }] : []];
      if (sql.includes('FROM AcceptanceRule')) return [options.noWindows ? [] : [window('Sun', '09:00:00', '17:00:00')]];
      if (sql.includes('INSERT INTO Claim')) {
        if (options.insertError) throw options.insertError;
        return [{ insertId: 42 }];
      }
      throw new Error(`Unexpected SQL ${sql}`);
    },
  };
  const service = load('../lib/claims.ts', { '@/lib/db': { pool: { getConnection: async () => connection } }, '@/lib/claim-policy': policy });
  return { ...service, events };
}

test('successful claim locks item first, binds session ID, commits, and never decrements stock', async () => {
  const f = fixture();
  const claim = await f.createClaim(11, input);
  assert.equal(claim.id, 42);
  assert.equal(claim.recipientId, 11);
  const sql = f.events.filter((event) => typeof event === 'object');
  assert.match(sql[0].sql, /FROM Item WHERE item_id = \? FOR UPDATE/);
  assert.match(sql[1].sql, /FROM Claim WHERE item_id = \? FOR UPDATE/);
  assert.deepEqual(sql.at(-1).values, [1, 11, '2026-10-18 15:00:00']);
  assert.deepEqual(f.events.slice(-2), ['commit', 'release']);
  assert.equal(sql.some((event) => /UPDATE Item|INSERT INTO Pickup/.test(event.sql)), false);
});

for (const [label, options, status] of [
  ['missing listing', { noItem: true }, 404],
  ['existing reservation', { claimed: true }, 409],
  ['unregistered recipient', { noRecipient: true }, 403],
  ['unaccepted tier', { noTier: true }, 403],
  ['refused category', { refused: true }, 403],
  ['no pickup windows', { noWindows: true }, 400],
  ['time passed while waiting for locks', { now: '2026-10-18T15:30:00Z' }, 400],
  ['unique constraint conflict', { insertError: { code: 'ER_DUP_ENTRY' } }, 409],
]) test(`claim rolls back and releases on ${label}`, async () => {
  const f = fixture(options);
  await assert.rejects(f.createClaim(11, input), (error) => error.status === status);
  assert.deepEqual(f.events.slice(-2), ['rollback', 'release']);
  assert.equal(f.events.includes('commit'), false);
});

test('unexpected SQL failure rolls back and releases', async () => {
  const f = fixture({ insertError: new Error('SQL unavailable') });
  await assert.rejects(f.createClaim(11, input), /SQL unavailable/);
  assert.deepEqual(f.events.slice(-2), ['rollback', 'release']);
});

function route(user, create = async () => ({ id: 42 })) {
  return load('../app/api/claims/route.ts', {
    '@/lib/session': { getCurrentUser: async () => user },
    '@/lib/claims': { createClaim: create }, '@/lib/claim-policy': policy,
  }).POST;
}
for (const [label, user, status] of [['signed out', null, 401], ['donor', { role: 'donor', orgId: 1 }, 403]]) {
  test(`POST rejects ${label} before parsing or querying`, async () => {
    const response = await route(user)({ json: () => { throw new Error('Must not parse'); } });
    assert.equal(response.status, status);
  });
}
test('POST rejects malformed JSON', async () => {
  const response = await route({ role: 'recipient', orgId: 11 })({ json: async () => { throw new SyntaxError('bad JSON'); } });
  assert.equal(response.status, 400);
});
test('POST returns 201 and uses session identity', async () => {
  const response = await route({ role: 'recipient', orgId: 11 }, async (id, data) => {
    assert.equal(id, 11); assert.equal(data.listingId, 1); return { id: 42, recipientId: id };
  })({ json: async () => input });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal((await response.json()).recipientId, 11);
});
test('POST maps domain conflicts to 409', async () => {
  const response = await route({ role: 'recipient', orgId: 11 }, async () => { throw new policy.ClaimError(409, 'Already claimed'); })({ json: async () => input });
  assert.equal(response.status, 409);
});
test('POST hides unexpected database details and reports unconfirmed booking', async () => {
  const response = await route({ role: 'recipient', orgId: 11 }, async () => { throw new Error('secret DB host'); })({ json: async () => input });
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.doesNotMatch(body.error, /secret DB/);
  assert.match(body.error, /could not be confirmed/);
});

test('two concurrent attempts serialize on the listing; only one claim commits', async () => {
  let lock = Promise.resolve();
  let saved = null;
  let writes = 0;
  const pool = {
    async getConnection() {
      let unlock;
      let pending;
      let held = false;
      function releaseLock() { if (held) { held = false; unlock(); } }
      return {
        beginTransaction: async () => {},
        commit: async () => { saved = pending; releaseLock(); },
        rollback: async () => { pending = null; releaseLock(); },
        release: releaseLock,
        query: async () => [[{ now: item.now }]],
        async execute(sql) {
          if (sql.includes('FROM Item')) {
            assert.match(sql, /FOR UPDATE/);
            const previous = lock;
            lock = new Promise((resolve) => { unlock = resolve; });
            await previous;
            held = true;
            return [[{ ...item }]];
          }
          if (sql.includes('SELECT claim_id')) return [saved ? [{ claim_id: saved.id }] : []];
          if (sql.includes('FROM Recipient')) return [[{ org_id: 11 }]];
          if (sql.includes('FROM AcceptedTier')) return [[{ tier: 1 }]];
          if (sql.includes('FROM RefusedCategory')) return [[]];
          if (sql.includes('FROM AcceptanceRule')) return [[window('Sun', '09:00:00', '17:00:00')]];
          if (sql.includes('INSERT INTO Claim')) { writes++; pending = { id: writes }; return [{ insertId: writes }]; }
          throw new Error(`Unexpected SQL ${sql}`);
        },
      };
    },
  };
  const { createClaim } = load('../lib/claims.ts', { '@/lib/db': { pool }, '@/lib/claim-policy': policy });
  const results = await Promise.allSettled([createClaim(11, input), createClaim(12, input)]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const rejected = results.find((result) => result.status === 'rejected');
  assert.equal(rejected.reason.status, 409);
  assert.equal(writes, 1);
});
