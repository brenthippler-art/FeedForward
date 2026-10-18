import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real TypeScript modules with isolated DB/session dependencies.
function loadModule(path, dependencies) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, URL, Response,
    console: { error() {} },
    require(name) {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

const row = {
  item_id: 1, donor_id: 2, donor_name: 'Kitchen', category_name: 'produce',
  quantity: 3, total_weight: '12.50', tier: 1, item_name: 'Lettuce', unit: 'boxes',
  condition: null, contains_meat: null, hours_out: null, tier_reason: null,
  ready_at: '2026-10-18T12:00:00.000Z', safe_until: '2026-10-18T18:00:00.000Z',
};

test('listing mapping preserves unknown safety facts and converts MySQL decimals', () => {
  const { mapListing } = loadModule('../lib/listings.ts', { '@/lib/db': {} });
  const listing = mapListing(row);
  assert.equal(listing.estimatedLbs, 12.5);
  assert.equal(listing.condition, 'unknown');
  assert.equal(listing.containsMeat, null);
  assert.equal(listing.hoursOut, null);
  assert.equal(listing.distanceMiles, null);
  assert.equal(listing.readyAt, row.ready_at);
  const known = mapListing({ ...row, contains_meat: 0, hours_out: '1.50' });
  assert.equal(known.containsMeat, false);
  assert.equal(known.hoursOut, 1.5);
});

test('listing reads bind recipient and optional tier parameters', async () => {
  const calls = [];
  const { getRecipientListings } = loadModule('../lib/listings.ts', {
    '@/lib/db': { pool: { execute: async (sql, values) => { calls.push({ sql, values: Array.from(values) }); return [[row]]; } } },
  });
  assert.equal((await getRecipientListings(11)).length, 1);
  await getRecipientListings(11, 2);
  assert.deepEqual(calls.map((call) => call.values), [[11, 11], [11, 11, 2]]);
  assert.match(calls[0].sql, /FROM AcceptedTier/);
  assert.match(calls[0].sql, /FROM RefusedCategory/);
  assert.match(calls[0].sql, /FROM Claim/);
  assert.match(calls[0].sql, /UTC_TIMESTAMP\(\)/);
});

// Loaded once and reused everywhere: each loadModule() call creates a fresh vm
// sandbox, so a ListingError thrown from a separately-loaded instance would fail
// `instanceof` checks against the route module's own internally-loaded class.
const listingPolicy = loadModule('../lib/listing-policy.ts', {});

function route(user, read = async () => []) {
  return loadModule('../app/api/listings/route.ts', {
    '@/lib/session': { getCurrentUser: async () => user },
    '@/lib/listings': { getRecipientListings: read },
    '@/lib/create-listing': { createListings: async () => { throw new Error('Must not write'); } },
    '@/lib/listing-policy': listingPolicy,
  }).GET;
}

function postRoute(user, write = async () => []) {
  return loadModule('../app/api/listings/route.ts', {
    '@/lib/session': { getCurrentUser: async () => user },
    '@/lib/listings': { getRecipientListings: async () => { throw new Error('Must not read'); } },
    '@/lib/create-listing': { createListings: write },
    '@/lib/listing-policy': listingPolicy,
  }).POST;
}

function postRequest(body) {
  return { json: async () => body };
}

function invalidJsonRequest() {
  return { json: async () => { throw new SyntaxError('Unexpected token'); } };
}

for (const [name, user, query, status] of [
  ['signed out', null, '', 401],
  ['donor identity', { role: 'donor', orgId: 1 }, '', 403],
  ['another recipient', { role: 'recipient', orgId: 11 }, '?recipientId=12', 403],
  ['invalid tier', { role: 'recipient', orgId: 11 }, '?tier=4', 400],
  ['empty tier', { role: 'recipient', orgId: 11 }, '?tier=', 400],
]) {
  test(`listings API rejects ${name} before reading the database`, async () => {
    const response = await route(user, () => { throw new Error('Must not query'); })({ url: `http://localhost/api/listings${query}` });
    assert.equal(response.status, status);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  });
}

test('listings API returns an array and passes session identity to the read', async () => {
  const response = await route({ role: 'recipient', orgId: 11 }, async (id, tier) => {
    assert.equal(id, 11); assert.equal(tier, 1); return [{ id: 42 }];
  })({ url: 'http://localhost/api/listings?tier=1&recipientId=11' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [{ id: 42 }]);
});

test('database errors return 503 rather than empty or mock listings', async () => {
  const response = await route({ role: 'recipient', orgId: 11 }, async () => { throw new Error('private SQL details'); })({ url: 'http://localhost/api/listings' });
  assert.equal(response.status, 503);
  assert.doesNotMatch(JSON.stringify(await response.json()), /private SQL/);
});

const sampleDraft = { item: 'Carrots', quantity: 1, unit: 'box', estimatedLbs: 1, category: 'produce', containsMeat: false };

for (const [name, user, status] of [
  ['signed out', null, 401],
  ['recipient role', { role: 'recipient', orgId: 11 }, 403],
]) {
  test(`listings POST rejects ${name} before reading the database`, async () => {
    const response = await postRoute(user, () => { throw new Error('Must not write'); })(postRequest({ listings: [sampleDraft] }));
    assert.equal(response.status, status);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  });
}

test('listings POST rejects an invalid JSON body', async () => {
  const response = await postRoute({ role: 'donor', orgId: 1 }, () => { throw new Error('Must not write'); })(invalidJsonRequest());
  assert.equal(response.status, 400);
});

test('listings POST maps a ListingError to its status', async () => {
  const response = await postRoute({ role: 'donor', orgId: 1 }, () => { throw new listingPolicy.ListingError(409, 'nope'); })(
    postRequest({ listings: [sampleDraft] }),
  );
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, 'nope');
});

test('listings POST returns 201 and the saved listings on success', async () => {
  const saved = [{ id: 1 }];
  const response = await postRoute({ role: 'donor', orgId: 1 }, async (donorId, drafts) => {
    assert.equal(donorId, 1);
    assert.equal(drafts.length, 1);
    return saved;
  })(postRequest({ listings: [sampleDraft] }));
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), saved);
});

test('listings POST database errors return 503 without leaking details', async () => {
  const response = await postRoute({ role: 'donor', orgId: 1 }, async () => { throw new Error('private SQL details'); })(
    postRequest({ listings: [sampleDraft] }),
  );
  assert.equal(response.status, 503);
  assert.doesNotMatch(JSON.stringify(await response.json()), /private SQL/);
});
