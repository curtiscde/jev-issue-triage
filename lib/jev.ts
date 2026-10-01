// The Jev questions, and how an issue becomes Jev "state". Shared by the pipeline and the live page.

import {
  experimental_evaluate as evaluate,
  type Experimental_EvaluationModel as EvaluationModel,
  type Experimental_EvaluationResult as EvaluationResult,
} from 'ai';
import type { Classification, Issue, Skill } from './store.ts';

export const MODEL = 'typesafe-ai/jev';

export const CATEGORIES = {
  bug: 'Something in a skill is broken or behaves wrongly',
  enhancement: 'A request for a new skill, feature or improvement',
  question: 'Asking for help, clarification or how to use something',
  'not-an-issue': 'Opened by mistake, a test, or not about the project',
} as const;

export type Category = keyof typeof CATEGORIES;

// Score levels come back as a fractional position from 0 to 3.
export const IMPACT_LEVELS = ['Narrow or niche use case', 'A few users', 'Many users', 'Nearly everyone who uses this skill'];

export function buildQuestions(skills: Skill[]) {
  return {
    category: {
      type: 'choice',
      instructions: 'What kind of issue is this?',
      criteria: CATEGORIES,
    },
    skill: {
      type: 'choice',
      instructions: 'Which skill in the repository is this issue about?',
      criteria: {
        ...Object.fromEntries(skills.map((s) => [s.name, s.description.slice(0, 300)])),
        general: 'The repository as a whole, several skills at once, or a skill that does not exist yet',
      },
    },
    nextStep: {
      type: 'choice',
      instructions: 'What should happen next with this issue?',
      criteria: {
        'needs-info': 'The maintainer needs more information from the author before anyone can act',
        'ready-for-agent': 'Clear and well scoped enough for an AI coding agent to implement',
        'ready-for-human': 'Needs human judgement, design decisions or discussion',
      },
    },
    notPlanned: {
      type: 'boolean',
      instructions:
        'Will the maintainer close this issue without acting on it (out of scope, a duplicate, or a deliberate no)?',
    },
    impact: {
      type: 'score',
      instructions: 'How many users of the repository does this issue affect?',
      criteria: IMPACT_LEVELS,
    },
  } as const;
}

export type Questions = ReturnType<typeof buildQuestions>;
export type Answers = EvaluationResult<Questions>['answers'];

// Jev sees what a triage bot sees the moment an issue is opened: title and body, no comments.
export function toState(issue: Issue) {
  return {
    repository: 'mattpocock/skills: a collection of skills (reusable instructions) for AI coding agents',
    title: issue.title,
    body: issue.body?.slice(0, 4000) ?? null,
  };
}

export async function classifyIssue(
  issue: Issue,
  questions: Questions,
  model: EvaluationModel = MODEL,
): Promise<Classification> {
  const started = performance.now();
  // No SDK retries: a retry's backoff would count towards latency. Re-running classify retries failures instead.
  const { answers, usage } = await evaluate({ model, state: toState(issue), questions, maxRetries: 0 });
  return {
    number: issue.number,
    answers,
    inputTokens: usage.inputTokens ?? 0,
    latencyMs: Math.round(performance.now() - started),
  };
}
