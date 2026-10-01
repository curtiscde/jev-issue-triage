import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lineSplitter } from './lines.ts';

test('whole lines in one chunk come out at once', () => {
  const split = lineSplitter();
  assert.deepEqual(split('{"a":1}\n{"b":2}\n'), ['{"a":1}', '{"b":2}']);
});

test('a line cut across chunks waits for its end', () => {
  const split = lineSplitter();
  assert.deepEqual(split('{"type":"ans'), []);
  assert.deepEqual(split('wer"}\n{"next'), ['{"type":"answer"}']);
  assert.deepEqual(split('":true}\n'), ['{"next":true}']);
});

test('blank lines are skipped', () => {
  const split = lineSplitter();
  assert.deepEqual(split('\n\n{"a":1}\n\n'), ['{"a":1}']);
});
