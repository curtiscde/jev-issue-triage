// Run every cached issue through Jev. Resumable: already-classified issues are skipped.
//
//   pnpm classify              # every issue
//   pnpm classify --limit 20   # a small batch first
//   pnpm classify --concurrency 3
//   JEV_FAKE=1 pnpm classify   # the fake model: no Gateway, no cost, writes to data/
//   JEV_DEMO=1 pnpm classify   # real Jev into a scratch file in data/, for the recording

import '../lib/env.ts';
import { fakeJev } from '../lib/fake-jev.ts';
import { buildQuestions, classifyIssue, MODEL } from '../lib/jev.ts';
import { forEachConcurrently } from '../lib/pool.ts';
import { createProgress } from '../lib/progress.ts';
import { CLASSIFICATIONS, loadClassifications, loadIssues, loadSkills, saveClassifications } from '../lib/store.ts';

const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? Number(process.argv[i + 1]) : fallback;
};
const limit = arg('limit', Infinity);
const concurrency = arg('concurrency', 20);

const issues = loadIssues();
if (issues.length === 0) throw new Error('No issues cached. Run `pnpm fetch-issues` first.');
const questions = buildQuestions(loadSkills());
const model = process.env.JEV_FAKE ? fakeJev({ latencyMs: 330 }) : MODEL;

const done = new Map(loadClassifications().map((c) => [c.number, c]));
const queue = issues.filter((i) => !done.has(i.number)).slice(0, limit);
console.log(`${queue.length} issues to classify (${done.size} already done) → ${CLASSIFICATIONS}`);

const wallStart = performance.now();
const progress = createProgress(queue.length, { fake: Boolean(process.env.JEV_FAKE) });
let classified = 0;

const failures = await forEachConcurrently(queue, { concurrency, onFailure: () => progress.fail() }, async (issue) => {
  const classification = await classifyIssue(issue, questions, model);
  done.set(issue.number, classification);
  progress.add(issue, classification);
  if (++classified % 100 === 0) saveClassifications([...done.values()]);
});

progress.finish();
saveClassifications([...done.values()]);
const seconds = (performance.now() - wallStart) / 1000;
console.log(`Classified ${classified} issues in ${seconds.toFixed(1)}s.`);
if (failures.length) {
  console.log(`${failures.length} failed (re-run to retry):`);
  for (const { item, error } of failures.slice(0, 10)) console.log(`  #${item.number}: ${error.message}`);
  process.exitCode = 1;
}
