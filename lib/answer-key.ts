// What GitHub already knows about an issue, used to check Jev's answers.

import type { Category } from './jev.ts';
import type { Issue } from './store.ts';

// Closed without the maintainer acting on it? Unknown (null) while the issue is open.
export function declined(stateReason: Issue['stateReason']): boolean | null {
  if (stateReason === 'not_planned' || stateReason === 'duplicate') return true;
  if (stateReason === 'completed') return false;
  return null;
}

// "grilling: ask fewer questions" → "grilling"
const PREFIX = /^([^:]{1,40}):\s*/;
const prefixOf = (title: string) => title.match(PREFIX)?.[1]?.trim().toLowerCase() ?? null;

// "grilling: ask fewer questions" → "ask fewer questions", for a test where the title doesn't give the answer away.
export const withoutPrefix = (title: string) => title.replace(PREFIX, '');

// Authors often name the skill in the title. Prefixes for skills that no longer exist are ignored.
export function skillFromTitle(title: string, skills: string[]): string | null {
  const name = prefixOf(title)?.replace(/ skill$/, '');
  return name && skills.includes(name) ? name : null;
}

const CATEGORY_PREFIXES: Record<string, Category> = {
  bug: 'bug',
  'feature request': 'enhancement',
  feature: 'enhancement',
  feat: 'enhancement',
  enhancement: 'enhancement',
  idea: 'enhancement',
  'skill idea': 'enhancement',
  proposal: 'enhancement',
  'new skill proposal': 'enhancement',
  suggestion: 'enhancement',
  question: 'question',
};

export function categoryFromTitle(title: string): Category | null {
  const prefix = prefixOf(title);
  return (prefix && CATEGORY_PREFIXES[prefix]) || null;
}
