import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function load(path) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  vm.runInNewContext(outputText, { exports, require() { throw new Error('Unexpected dependency'); } });
  return exports;
}

const { parseListingsInput, ListingError } = load('../lib/listing-policy.ts');

const validDraft = { item: 'Carrots', quantity: 2, unit: 'boxes', estimatedLbs: 10, category: 'produce', containsMeat: false };

test('accepts a valid batch and fills in defaults', () => {
  const [draft] = parseListingsInput({ listings: [validDraft] }, 1);
  assert.equal(draft.item, 'Carrots');
  assert.equal(draft.condition, 'unknown');
  assert.equal(draft.hoursOut, null);
  assert.equal(draft.safeUntil, null);
});

test('rejects a donorId that does not match the session', () => {
  assert.throws(() => parseListingsInput({ donorId: 2, listings: [validDraft] }, 1), (error) => error instanceof ListingError && error.status === 403);
});

test('accepts a matching donorId', () => {
  const [draft] = parseListingsInput({ donorId: 1, listings: [validDraft] }, 1);
  assert.equal(draft.item, 'Carrots');
});

test('rejects a missing or empty listings array', () => {
  assert.throws(() => parseListingsInput({ listings: [] }, 1), (error) => error instanceof ListingError && error.status === 400);
  assert.throws(() => parseListingsInput({}, 1), (error) => error instanceof ListingError && error.status === 400);
});

test('rejects more than 20 listings in one request', () => {
  const listings = Array.from({ length: 21 }, () => validDraft);
  assert.throws(() => parseListingsInput({ listings }, 1), (error) => error instanceof ListingError && error.status === 400);
});

test('rejects a non-integer quantity', () => {
  assert.throws(
    () => parseListingsInput({ listings: [{ ...validDraft, quantity: 1.5 }] }, 1),
    (error) => error instanceof ListingError && error.status === 400,
  );
});

test('rejects a missing estimatedLbs rather than defaulting to a fabricated weight', () => {
  const withoutWeight = { item: 'Carrots', quantity: 2, unit: 'boxes', category: 'produce', containsMeat: false };
  assert.throws(
    () => parseListingsInput({ listings: [withoutWeight] }, 1),
    (error) => error instanceof ListingError && error.status === 400,
  );
});

test('rejects an unknown category', () => {
  assert.throws(
    () => parseListingsInput({ listings: [{ ...validDraft, category: 'frozen' }] }, 1),
    (error) => error instanceof ListingError && error.status === 400,
  );
});

test('requires hoursOut for cooked food', () => {
  assert.throws(
    () => parseListingsInput({ listings: [{ ...validDraft, category: 'cooked', hoursOut: null }] }, 1),
    (error) => error instanceof ListingError && error.status === 400,
  );
  const [draft] = parseListingsInput({ listings: [{ ...validDraft, category: 'cooked', hoursOut: 1 }] }, 1);
  assert.equal(draft.hoursOut, 1);
});

test('rejects an invalid safeUntil but accepts a valid one', () => {
  assert.throws(
    () => parseListingsInput({ listings: [{ ...validDraft, safeUntil: 'not a date' }] }, 1),
    (error) => error instanceof ListingError && error.status === 400,
  );
  const [draft] = parseListingsInput({ listings: [{ ...validDraft, safeUntil: '2026-10-19T00:00:00.000Z' }] }, 1);
  assert.equal(draft.safeUntil, '2026-10-19T00:00:00.000Z');
});
