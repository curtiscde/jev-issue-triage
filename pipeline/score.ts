// How did Jev do? Closed issues test it against what actually happened;
// open issues are the triage itself. Then what it all cost.
//
//   pnpm score

import '../lib/env.ts';
import { categoryFromTitle, declined, skillFromTitle } from '../lib/answer-key.ts';
import { costOf } from '../lib/cost.ts';
import { IMPACT_LEVELS } from '../lib/jev.ts';
import { accuracy, meanBy, pct, topK } from '../lib/scoring.ts';
import { loadBlind, loadClassifications, loadIssues, loadLabels, loadSkills } from '../lib/store.ts';

const issues = new Map(loadIssues().map((i) => [i.number, i]));
const skillNames = loadSkills().map((s) => s.name);
const results = loadClassifications()
  .filter((c) => issues.has(c.number))
  .map((c) => ({ ...c, issue: issues.get(c.number)! }));
if (results.length === 0) throw new Error('Nothing classified yet. Run `pnpm classify` first.');

const closed = results.filter((r) => r.issue.state === 'closed');
const open = results.filter((r) => r.issue.state === 'open');
console.log(`\n${results.length} issues classified: ${open.length} open (the triage), ${closed.length} closed (the test)`);

// 1. Could Jev predict the maintainer's decision from the opening post alone?
const decided = closed.map((r) => ({ score: r.answers.notPlanned.probability, actual: declined(r.issue.stateReason) }));
const known = decided.filter((d): d is { score: number; actual: boolean } => d.actual !== null);
const declinedCount = known.filter((d) => d.actual).length;
const baseRate = declinedCount / known.length;
console.log(`\n=== Predicting "closed without action" (${known.length} closed issues, ${declinedCount} declined) ===`);
console.table(
  Object.fromEntries(
    [declinedCount, 20].map((k) => {
      const { hits } = topK(known, k);
      return [`Jev's top ${k}`, { declined: hits, 'by chance': (k * baseRate).toFixed(1), precision: pct(hits, k) }];
    }),
  ),
);

// Accuracy tables: one row per answer key.
type Pair = { predicted: string; actual: string };
const checkTable = (rows: Record<string, Pair[]>) =>
  console.table(
    Object.fromEntries(
      Object.entries(rows).map(([key, pairs]) => {
        const { correct, total } = accuracy(pairs);
        return [key, { issues: total, correct, accuracy: pct(correct, total) }];
      }),
    ),
  );

// The prefixed issues again, asked with the prefix removed (pnpm blind).
const blind = loadBlind()
  .filter((c) => issues.has(c.number))
  .map((c) => ({ ...c, issue: issues.get(c.number)! }));

const skillPairs = (rows: typeof results) =>
  rows.flatMap((r) => {
    const actual = skillFromTitle(r.issue.title, skillNames);
    return actual ? [{ predicted: r.answers.skill.choice, actual }] : [];
  });
const prefixPairs = (rows: typeof results) =>
  rows.flatMap((r) => {
    const actual = categoryFromTitle(r.issue.title);
    return actual ? [{ predicted: r.answers.category.choice, actual }] : [];
  });

// 2. Which skill? Checked where the author named a current skill in the title.
// "As written" is the easy case (Jev sees the name); "prefix removed" is the fair one.
console.log('\n=== Which skill (issues naming a skill in the title) ===');
checkTable({ 'title as written': skillPairs(results), 'prefix removed': skillPairs(blind) });

// 3. What kind of issue? Checked against title prefixes ("bug:", "proposal:" …) and hand labels.
const labels = new Map(loadLabels().map((l) => [l.number, l.category]));
console.log('\n=== What kind of issue ===');
checkTable({
  'title prefix, as written': prefixPairs(results),
  'title prefix, removed': prefixPairs(blind),
  'hand labels': results.flatMap((r) => {
    const actual = labels.get(r.number);
    return actual ? [{ predicted: r.answers.category.choice, actual }] : [];
  }),
});

// 4. Impact: a soft check. Do issues Jev rates higher-impact attract more 👍 and comments?
console.log('\n=== Impact vs reactions (all issues) ===');
const byLevel = (value: (r: (typeof results)[number]) => number) =>
  meanBy(results, (r) => Math.round(r.answers.impact.score), value);
const thumbs = byLevel((r) => r.issue.thumbsUp);
const comments = byLevel((r) => r.issue.comments);
console.table(
  Object.fromEntries(
    thumbs.map((t, i) => [
      IMPACT_LEVELS[t.group],
      { issues: t.n, 'mean 👍': t.mean.toFixed(2), 'mean comments': comments[i]!.mean.toFixed(2) },
    ]),
  ),
);

// 5. The triage itself: what's in the open backlog?
const tally = (values: string[]) =>
  Object.fromEntries(
    Object.entries(Object.groupBy(values, (v) => v))
      .map(([k, v]) => [k, v!.length] as const)
      .sort((a, b) => b[1] - a[1]),
  );
console.log(`\n=== The open backlog, triaged (${open.length} issues) ===`);
console.table({ category: tally(open.map((r) => r.answers.category.choice)) });
console.table({ 'next step': tally(open.map((r) => r.answers.nextStep.choice)) });
console.table({ 'top skills': Object.fromEntries(Object.entries(tally(open.map((r) => r.answers.skill.choice))).slice(0, 6)) });
const likelyDeclined = open.filter((r) => r.answers.notPlanned.probability >= 0.5).length;
console.log(`Flagged as likely to be declined: ${likelyDeclined}`);

// 6. Cost and speed.
const tokens = results.reduce((sum, r) => sum + r.inputTokens, 0);
const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
const at = (q: number) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * q))];
console.log('\n=== Cost and speed ===');
console.table({
  total: {
    'input tokens': tokens.toLocaleString(),
    'per issue': Math.round(tokens / results.length),
    cost: `$${costOf(tokens).toFixed(4)}`,
    'median ms': at(0.5),
    'p95 ms': at(0.95),
  },
});
