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

const { assignTier } = load('../lib/tiers.ts');

test('cooked food with unknown hoursOut is a tentative tier 1 pending confirmation', () => {
  const result = assignTier({ category: 'cooked', containsMeat: false, hoursOut: null, condition: 'unknown' });
  assert.equal(result.tier, 1);
  assert.match(result.tierReason, /confirm/i);
});

test('cooked food within the 2-hour window is tier 1', () => {
  const result = assignTier({ category: 'cooked', containsMeat: false, hoursOut: 1, condition: 'Still warm' });
  assert.equal(result.tier, 1);
});

test('cooked meat within the window is tier 1', () => {
  const result = assignTier({ category: 'cooked', containsMeat: true, hoursOut: 1, condition: 'Still warm' });
  assert.equal(result.tier, 1);
});

test('cooked meat past the 2-hour window goes to compost, never animals', () => {
  const result = assignTier({ category: 'cooked', containsMeat: true, hoursOut: 3, condition: 'Sitting out' });
  assert.equal(result.tier, 3);
});

test('cooked plant-based food past the 2-hour window is animal feed', () => {
  const result = assignTier({ category: 'cooked', containsMeat: false, hoursOut: 3, condition: 'Sitting out' });
  assert.equal(result.tier, 2);
});

test('cooked plant-based scraps within the window still go to animal feed', () => {
  const result = assignTier({ category: 'cooked', containsMeat: false, hoursOut: 1, condition: 'Vegetable scraps' });
  assert.equal(result.tier, 2);
});

test('spoilage keywords override everything, regardless of category', () => {
  const result = assignTier({ category: 'bakery', containsMeat: false, hoursOut: null, condition: 'Moldy on one side' });
  assert.equal(result.tier, 3);
});

test('raw meat never goes to tier 2', () => {
  const result = assignTier({ category: 'meat', containsMeat: true, hoursOut: null, condition: 'Fresh, refrigerated' });
  assert.equal(result.tier, 1);
});

test('produce peels/trim are compost, not people food', () => {
  const result = assignTier({ category: 'produce', containsMeat: false, hoursOut: null, condition: 'Potato peels' });
  assert.equal(result.tier, 3);
});

test('produce with no special condition defaults to tier 1 (no sourced threshold)', () => {
  const result = assignTier({ category: 'produce', containsMeat: false, hoursOut: null, condition: 'Fresh, unblemished' });
  assert.equal(result.tier, 1);
});

test('dairy and other categories default to tier 1 absent a sourced rule', () => {
  assert.equal(assignTier({ category: 'dairy', containsMeat: false, hoursOut: null, condition: 'unknown' }).tier, 1);
  assert.equal(assignTier({ category: 'other', containsMeat: false, hoursOut: null, condition: 'Unopened cans' }).tier, 1);
});

test('keyword matching does not trip on substrings inside unrelated words', () => {
  assert.equal(assignTier({ category: 'bakery', containsMeat: false, hoursOut: null, condition: 'Sourdough loaves, baked this morning' }).tier, 1);
  assert.equal(assignTier({ category: 'produce', containsMeat: false, hoursOut: null, condition: 'Trimmed green beans' }).tier, 1);
  assert.equal(assignTier({ category: 'produce', containsMeat: false, hoursOut: null, condition: 'Fresh-scored melons' }).tier, 1);
});

test('keyword matching does not trip on legitimate food names that contain a keyword as a whole word', () => {
  assert.equal(assignTier({ category: 'dairy', containsMeat: false, hoursOut: null, condition: 'Sour cream, sealed tubs' }).tier, 1);
  assert.equal(assignTier({ category: 'produce', containsMeat: false, hoursOut: null, condition: 'Potatoes with skin on' }).tier, 1);
});

test('keyword matching still catches real spoilage and trim described as whole words', () => {
  assert.equal(assignTier({ category: 'dairy', containsMeat: false, hoursOut: null, condition: 'Milk has gone sour' }).tier, 3);
  assert.equal(assignTier({ category: 'produce', containsMeat: false, hoursOut: null, condition: 'Banana skins only' }).tier, 3);
  assert.equal(assignTier({ category: 'produce', containsMeat: false, hoursOut: null, condition: 'Apple cores and peels' }).tier, 3);
});
