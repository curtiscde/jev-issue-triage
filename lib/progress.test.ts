import assert from 'node:assert/strict';
import { test } from 'node:test';
import { printable } from './progress.ts';

test('printable: control characters in untrusted titles never reach the terminal', () => {
  assert.equal(printable('clear\x1b[2Jscreen'), 'clear [2Jscreen');
  assert.equal(printable('bell\x07 and\ttab'), 'bell  and tab');
  assert.equal(printable('C1 control\x9bhere'), 'C1 control here');
});

test('printable: ordinary text, emoji and accents pass through', () => {
  assert.equal(printable('grilling: ask fewer questions'), 'grilling: ask fewer questions');
  assert.equal(printable('Café ☕ — 🐛 bug'), 'Café ☕ — 🐛 bug');
});
