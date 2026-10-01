// Run `fn` over every item, `concurrency` at a time. Used for every batch of Jev calls.
//
// A failed item is retried once, at the back of the queue: Jev isn't deterministic, so a
// near-tie the SDK rejects ("did not select a highest-probability option") usually passes
// next time. Items that fail twice are reported via `onFailure` and returned.

export async function forEachConcurrently<T>(
  items: T[],
  options: { concurrency: number; signal?: AbortSignal; onFailure?: (item: T, error: Error) => void },
  fn: (item: T) => Promise<void>,
): Promise<{ item: T; error: Error }[]> {
  const queue = [...items];
  const retried = new Set<T>();
  const failures: { item: T; error: Error }[] = [];

  async function worker() {
    for (let item = queue.shift(); item !== undefined && !options.signal?.aborted; item = queue.shift()) {
      try {
        await fn(item);
      } catch (err) {
        if (!retried.has(item)) {
          retried.add(item);
          queue.push(item);
          continue;
        }
        const error = err instanceof Error ? err : new Error(String(err));
        failures.push({ item, error });
        options.onFailure?.(item, error);
      }
    }
  }

  await Promise.all(Array.from({ length: options.concurrency }, worker));
  return failures;
}
