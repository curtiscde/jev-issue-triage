import assert from 'node:assert/strict';
import { test } from 'node:test';
import { accuracy, meanBy, topK } from './scoring.ts';

test('accuracy: share of predictions matching the key', () => {
  assert.deepEqual(accuracy([{ predicted: 'a', actual: 'a' }, { predicted: 'b', actual: 'a' }]), { correct: 1, total: 2 });
  assert.deepEqual(accuracy([]), { correct: 0, total: 0 });
});

test('topK: hits among the k highest-scored items', () => {
  const items = [
    { score: 0.9, actual: true },
    { score: 0.1, actual: true },
    { score: 0.8, actual: false },
    { score: 0.7, actual: true },
  ];
  assert.deepEqual(topK(items, 2), { hits: 1, k: 2 });
  assert.deepEqual(topK(items, 3), { hits: 2, k: 3 });
  assert.deepEqual(topK(items, 10), { hits: 3, k: 4 });
});

test('meanBy: average value per group, groups sorted', () => {
  const rows = [
    { level: 1, value: 2 },
    { level: 0, value: 1 },
    { level: 1, value: 4 },
  ];
  assert.deepEqual(meanBy(rows, (r) => r.level, (r) => r.value), [
    { group: 0, n: 1, mean: 1 },
    { group: 1, n: 2, mean: 3 },
  ]);
});
