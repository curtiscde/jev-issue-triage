import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fakeJev } from './fake-jev.ts';
import { buildQuestions, classifyIssue, IMPACT_LEVELS } from './jev.ts';
import type { Issue } from './store.ts';

const skills = [
  { name: 'grilling', group: 'productivity', description: 'Grill the user about a plan' },
  { name: 'tdd', group: 'engineering', description: 'Test-driven development' },
];

const issue: Issue = {
  number: 1,
  title: 'grilling: asks too many questions',
  body: 'It asked me 40 questions.',
  state: 'open',
  stateReason: null,
  createdAt: '2026-09-01T00:00:00Z',
  closedAt: null,
  thumbsUp: 0,
  comments: 0,
};

// Runs through the real evaluate(), so the SDK checks the fake's answers are well formed.
test('the fake passes the SDK validation for every question', async () => {
  const questions = buildQuestions(skills);
  const { answers, inputTokens } = await classifyIssue(issue, questions, fakeJev());

  assert.ok(answers.category.choice in questions.category.criteria);
  assert.ok(['grilling', 'tdd', 'general'].includes(answers.skill.choice));
  assert.ok(answers.notPlanned.probability >= 0 && answers.notPlanned.probability <= 1);
  assert.ok(answers.impact.score >= 0 && answers.impact.score <= IMPACT_LEVELS.length - 1);
  assert.ok(inputTokens > 0);
});

test('the fake is repeatable', async () => {
  const questions = buildQuestions(skills);
  const [a, b] = await Promise.all([1, 2].map(() => classifyIssue(issue, questions, fakeJev())));
  assert.deepEqual(a!.answers, b!.answers);
});

test('the fake gives valid distributions across many inputs', async () => {
  const questions = buildQuestions(skills);
  for (let n = 0; n < 500; n++) {
    await classifyIssue({ ...issue, body: 'x'.repeat(n) }, questions, fakeJev());
  }
});
