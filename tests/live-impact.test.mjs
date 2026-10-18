import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, dependencies) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, { exports, Response, URL, Number, console: { error() {} },
    require(name) { assert.ok(name in dependencies, name); return dependencies[name]; } });
  return exports;
}
for (const [name, user, query, expected, status] of [
  ['recipient defaults to own totals', { orgId: 11, role: 'recipient' }, '', 11, 200],
  ['recipient explicitly selects self', { orgId: 11, role: 'recipient' }, '?orgId=11', 11, 200],
  ['donor sees platform totals', { orgId: 1, role: 'donor' }, '', undefined, 200],
  ['anonymous sees platform totals', undefined, '', undefined, 200],
  ['recipient cannot select another organization', { orgId: 11, role: 'recipient' }, '?orgId=12', undefined, 403],
  ['donor cannot select recipient', { orgId: 1, role: 'donor' }, '?orgId=11', undefined, 403],
  ['anonymous cannot select recipient', undefined, '?orgId=11', undefined, 403],
  ['invalid organization', undefined, '?orgId=no', undefined, 400],
]) test(`impact: ${name}`, async () => {
  const scopes = [];
  const route = load('../app/api/impact/route.ts', {
    '@/lib/session': { async getCurrentUser() { return user; } },
    '@/lib/impact': { async getImpact(scope) { scopes.push(scope); return { totalLbs: 0 }; } },
  });
  const response = await route.GET(new Request(`http://localhost/api/impact${query}`));
  assert.equal(response.status, status);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(scopes, status === 200 ? [expected] : []);
});
test('impact database failure is not presented as zero saved pickups', async () => {
  const route = load('../app/api/impact/route.ts', {
    '@/lib/session': { async getCurrentUser() { return undefined; } },
    '@/lib/impact': { async getImpact() { throw Error('private DB error'); } },
  });
  const response = await route.GET(new Request('http://localhost/api/impact'));
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes('private DB'));
});
test('impact scopes both totals and history, and bases unmeasured pickups on collected rather than remaining quantity', async () => {
  const calls = [];
  const service = load('../lib/impact.ts', { '@/lib/db': { pool: { async execute(sql, params) {
    calls.push({ sql, params });
    if (sql.includes('COUNT(*)')) return [[{ total_lbs: '10.125', pickups: 1, tier1: '10.125', tier2: '0', tier3: '0' }]];
    return [[{ pickup_id: 7, date: '2026-10-18', item: 'Carrots', donor_name: 'Kitchen', recipient_name: 'Pantry', tier: 1, lbs: '10.125' }]];
  } } } });
  const impact = await service.getImpact(11);
  assert.equal(impact.totalLbs, 10.125); assert.equal(impact.recent[0].lbs, 10.125); assert.equal(impact.pickups, 1);
  assert.equal(calls.length, 2);
  for (const { sql, params } of calls) {
    assert.equal(JSON.stringify(params), '[11]');
    assert.match(sql, /WHERE c.recipient_id = \?/);
    assert.match(sql, /COALESCE\(p.actual_lbs, p.quantity \* i.unit_weight\)/);
    assert.ok(!sql.includes('i.total_weight'));
  }
});
