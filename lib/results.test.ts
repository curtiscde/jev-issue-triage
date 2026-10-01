// results/ isn't committed, but it should still hold only our own outputs: GitHub's text (titles,
// bodies) belongs in data/, so either folder can be shared or deleted without thinking about the other.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CATEGORIES } from './jev.ts';

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>[];
const ANSWER_FIELDS = ['type', 'choice', 'probabilities', 'probability', 'score'];

for (const file of ['results/classifications.json', 'results/blind.json']) {
  test(`${file} holds only numbers and Jev answers`, { skip: !existsSync(file) }, () => {
    for (const record of read(file)) {
      assert.deepEqual(Object.keys(record).sort(), ['answers', 'inputTokens', 'latencyMs', 'number']);
      for (const answer of Object.values(record.answers as Record<string, object>)) {
        for (const field of Object.keys(answer)) assert.ok(ANSWER_FIELDS.includes(field), `unexpected field ${field}`);
      }
    }
  });
}

test('hand labels hold only numbers and categories', { skip: !existsSync('results/labels.json') }, () => {
  for (const record of read('results/labels.json')) {
    assert.deepEqual(Object.keys(record).sort(), ['category', 'number']);
    assert.ok((record.category as string) in CATEGORIES);
  }
});
