// A stand-in for Jev that answers randomly (but repeatably) in the real response format.
// Lets the whole pipeline run with no Gateway access or cost: JEV_FAKE=1 pnpm classify

import type { Experimental_EvaluationModel as EvaluationModel } from 'ai';

type Model = Exclude<EvaluationModel, string>;
type Answer = Awaited<ReturnType<Model['doEvaluate']>>['answers'][string];

// Seeded random numbers (mulberry32), so a fake run is the same every time.
export function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A random distribution over keys, rounded to 4 decimal places.
function distribution(keys: string[], next: () => number) {
  const weights = keys.map(() => next() ** 3); // cubed, so one option usually dominates
  const total = weights.reduce((s, w) => s + w, 0);
  const rounded = weights.map((w) => Math.round((w / total) * 1e4) / 1e4);
  const largest = rounded.indexOf(Math.max(...rounded));
  rounded[largest]! += Math.round((1 - rounded.reduce((s, p) => s + p, 0)) * 1e4) / 1e4; // sum to exactly 1
  return Object.fromEntries(keys.map((k, i) => [k, rounded[i]!]));
}

// latencyMs adds a realistic random delay (half to double it), for rehearsing the progress display.
export function fakeJev({ latencyMs = 0 } = {}): Model {
  return {
    specificationVersion: 'v4',
    provider: 'fake',
    modelId: 'fake-jev',
    supportedQuestionTypes: ['choice', 'score', 'boolean'],
    async doEvaluate({ state, questions }) {
      const next = random(JSON.stringify(state).length);
      if (latencyMs) await new Promise((r) => setTimeout(r, latencyMs * (0.5 + next() * 1.5)));
      const answers: Record<string, Answer> = {};
      for (const [id, q] of Object.entries(questions)) {
        if (q.type === 'boolean') {
          answers[id] = { type: 'boolean', probability: Math.round(next() * 1e4) / 1e4 };
        } else if (q.type === 'choice') {
          const probabilities = distribution(Object.keys(q.criteria), next);
          const choice = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0]![0];
          answers[id] = { type: 'choice', choice, probabilities };
        } else {
          const probabilities = distribution(q.criteria.map((_, i) => String(i)), next);
          const score = Object.entries(probabilities).reduce((s, [level, p]) => s + Number(level) * p, 0);
          answers[id] = { type: 'score', score, probabilities };
        }
      }
      return {
        answers,
        rounding: { probabilityDecimals: 4 },
        usage: { inputTokens: Math.ceil(JSON.stringify({ state, questions }).length / 4), outputTokens: 0 },
        warnings: [],
      };
    },
  };
}
