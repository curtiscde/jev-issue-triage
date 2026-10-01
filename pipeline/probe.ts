// One real Jev call with the real questions, to see the response shape before trusting it.
// Prints the raw answers and saves the full result to data/probe.json.
//
//   pnpm probe [issue number]   # needs `pnpm fetch-issues` first

import { writeFileSync } from 'node:fs';
import { experimental_evaluate as evaluate } from 'ai';
import '../lib/env.ts';
import { buildQuestions, MODEL, toState } from '../lib/jev.ts';
import { loadIssues, loadSkills } from '../lib/store.ts';

const number = Number(process.argv[2] ?? 1);
const issue = loadIssues().find((i) => i.number === number);
if (!issue) throw new Error(`Issue #${number} not cached. Run \`pnpm fetch-issues\` first.`);

const started = performance.now();
const result = await evaluate({
  model: MODEL,
  state: toState(issue),
  questions: buildQuestions(loadSkills()),
  maxRetries: 6, // the Gateway has been refusing some Jev requests with a 429
});
const latencyMs = Math.round(performance.now() - started);

const { answers, usage, warnings, rounding, providerMetadata } = result;
writeFileSync('data/probe.json', JSON.stringify({ number, latencyMs, answers, usage, warnings, rounding, providerMetadata }, null, 2));

console.log(`#${number}: ${issue.title} (state_reason: ${issue.stateReason})`);
console.log(`${latencyMs}ms, ${usage.inputTokens} input tokens`);
console.dir({ answers, warnings, rounding }, { depth: null });
