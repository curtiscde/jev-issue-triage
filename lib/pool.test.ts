import assert from 'node:assert/strict';
import { test } from 'node:test';
import { forEachConcurrently } from './pool.ts';

const tick = () => new Promise((r) => setTimeout(r, 1));

test('runs every item, never more than `concurrency` at once', async () => {
  let running = 0;
  let peak = 0;
  const seen: number[] = [];
  await forEachConcurrently([1, 2, 3, 4, 5, 6, 7], { concurrency: 3 }, async (n) => {
    peak = Math.max(peak, ++running);
    await tick();
    seen.push(n);
    running--;
  });
  assert.deepEqual(seen.sort(), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(peak, 3);
});

test('retries a failed item once, at the back of the queue', async () => {
  const calls: string[] = [];
  const failures = await forEachConcurrently(['a', 'b'], { concurrency: 1 }, async (item) => {
    calls.push(item);
    if (item === 'a' && calls.filter((c) => c === 'a').length === 1) throw new Error('near-tie');
  });
  assert.deepEqual(calls, ['a', 'b', 'a']);
  assert.deepEqual(failures, []);
});

test('reports an item that fails twice, once, via onFailure and the result', async () => {
  const reported: string[] = [];
  const failures = await forEachConcurrently(
    ['ok', 'bad'],
    { concurrency: 2, onFailure: (item, error) => reported.push(`${item}: ${error.message}`) },
    async (item) => {
      if (item === 'bad') throw new Error('nope');
    },
  );
  assert.deepEqual(reported, ['bad: nope']);
  assert.deepEqual(
    failures.map((f) => f.item),
    ['bad'],
  );
});

test('stops taking new items once the signal is aborted', async () => {
  const controller = new AbortController();
  const seen: number[] = [];
  await forEachConcurrently([1, 2, 3, 4], { concurrency: 1, signal: controller.signal }, async (n) => {
    seen.push(n);
    if (n === 2) controller.abort();
  });
  assert.deepEqual(seen, [1, 2]);
});

test('an empty list is fine', async () => {
  assert.deepEqual(await forEachConcurrently([], { concurrency: 5 }, async () => {}), []);
});
