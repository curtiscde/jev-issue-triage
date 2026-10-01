// Pick a random (seeded, so repeatable) sample of issues to label by hand for category.
// Skips issues whose title already gives the category away ("bug:", "proposal:" …).
// Writes data/label-sample.md, without Jev's answers, so the labelling isn't biased.
//
//   pnpm label-sample

import { writeFileSync } from 'node:fs';
import { categoryFromTitle } from '../lib/answer-key.ts';
import { random } from '../lib/fake-jev.ts';
import { loadIssues } from '../lib/store.ts';

const SIZE = 50;
const next = random(42);

const pool = loadIssues().filter((i) => !categoryFromTitle(i.title));
const sample = pool
  .map((issue) => ({ issue, key: next() }))
  .sort((a, b) => a.key - b.key)
  .slice(0, SIZE)
  .map(({ issue }) => issue)
  .sort((a, b) => a.number - b.number);

const excerpt = (body: string | null) => (body ?? '(no body)').replace(/\s+/g, ' ').slice(0, 400);
writeFileSync(
  'data/label-sample.md',
  sample.map((i) => `## #${i.number}: ${i.title}\n\n${excerpt(i.body)}\n\ncategory: \n`).join('\n'),
);
console.log(`${SIZE} of ${pool.length} unprefixed issues → data/label-sample.md`);
