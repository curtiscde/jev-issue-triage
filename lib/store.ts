// Local JSON files, both gitignored. data/ holds GitHub's text; results/ holds only our own
// outputs (Jev's answers, hand labels). Fake runs (JEV_FAKE=1) never touch results/.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Answers, Category } from './jev.ts';

export type Issue = {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  stateReason: 'completed' | 'not_planned' | 'duplicate' | 'reopened' | null;
  createdAt: string;
  closedAt: string | null;
  thumbsUp: number;
  comments: number;
};

export type Skill = {
  name: string; // folder name, e.g. "grilling"
  group: string; // engineering, productivity, misc or in-progress
  description: string;
};

export type Classification = {
  number: number;
  answers: Answers;
  inputTokens: number;
  latencyMs: number;
};

function read<T>(path: string, fallback: T): T {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : fallback;
}

function write(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

export const CLASSIFICATIONS = process.env.JEV_FAKE
  ? 'data/classifications.fake.json'
  : process.env.JEV_DEMO
    ? 'data/classifications.demo.json' // recording takes: real Jev, never touches results/
    : 'results/classifications.json';
export const BLIND = process.env.JEV_FAKE ? 'data/blind.fake.json' : 'results/blind.json';

export const loadIssues = () => read<Issue[]>('data/issues.json', []);
export const saveIssues = (issues: Issue[]) => write('data/issues.json', issues);
export const loadSkills = () => read<Skill[]>('data/skills.json', []);
export const saveSkills = (skills: Skill[]) => write('data/skills.json', skills);
export const loadClassifications = () => read<Classification[]>(CLASSIFICATIONS, []);
export const saveClassifications = (c: Classification[]) =>
  write(CLASSIFICATIONS, [...c].sort((a, b) => a.number - b.number));

// The same issues re-asked with the title prefix removed (pnpm blind).
export const loadBlind = () => read<Classification[]>(BLIND, []);
export const saveBlind = (c: Classification[]) => write(BLIND, [...c].sort((a, b) => a.number - b.number));

// Hand-labelled categories for a random sample.
export type Label = { number: number; category: Category };
export const loadLabels = () => read<Label[]>('results/labels.json', []);
