// A fairer test than the easy cases. Issues whose title names the answer ("grilling: …", "bug: …")
// are asked again with that prefix removed, so Jev has to work it out from the rest.
//
//   pnpm blind
//   JEV_FAKE=1 pnpm blind

import '../lib/env.ts';
import { categoryFromTitle, skillFromTitle, withoutPrefix } from '../lib/answer-key.ts';
import { fakeJev } from '../lib/fake-jev.ts';
import { buildQuestions, classifyIssue, MODEL } from '../lib/jev.ts';
import { forEachConcurrently } from '../lib/pool.ts';
import { BLIND, loadBlind, loadIssues, loadSkills, saveBlind } from '../lib/store.ts';

const skills = loadSkills();
const skillNames = skills.map((s) => s.name);
const questions = buildQuestions(skills);
const model = process.env.JEV_FAKE ? fakeJev() : MODEL;

const done = new Map(loadBlind().map((c) => [c.number, c]));
const queue = loadIssues().filter(
  (i) => !done.has(i.number) && (skillFromTitle(i.title, skillNames) || categoryFromTitle(i.title)),
);
console.log(`${queue.length} prefixed issues to re-ask without the prefix (${done.size} already done) → ${BLIND}`);

const failures = await forEachConcurrently(queue, { concurrency: 10 }, async (issue) => {
  done.set(issue.number, await classifyIssue({ ...issue, title: withoutPrefix(issue.title) }, questions, model));
});

saveBlind([...done.values()]);
console.log(`Done: ${done.size} issues.${failures.length ? ` ${failures.length} failed (re-run to retry).` : ''}`);
if (failures.length) process.exitCode = 1;
