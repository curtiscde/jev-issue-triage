// Pull every issue in mattpocock/skills, and the list of skills, into data/.
//
//   GITHUB_TOKEN=$(gh auth token) pnpm fetch-issues

import '../lib/env.ts';
import { saveIssues, saveSkills, type Issue, type Skill } from '../lib/store.ts';

const REPO = 'mattpocock/skills';

async function github<T>(path: string): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`${res.status} ${path}${token ? '' : ' (no GITHUB_TOKEN set)'}`);
  return res.json() as Promise<T>;
}

type ApiIssue = {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  state_reason: Issue['stateReason'];
  created_at: string;
  closed_at: string | null;
  comments: number;
  reactions: { '+1': number };
  pull_request?: unknown; // the issues endpoint returns pull requests too
};

const issues: Issue[] = [];
for (let page = 1; ; page++) {
  const batch = await github<ApiIssue[]>(`issues?state=all&per_page=100&page=${page}`);
  for (const i of batch.filter((i) => !i.pull_request)) {
    issues.push({
      number: i.number,
      title: i.title,
      body: i.body,
      state: i.state,
      stateReason: i.state_reason,
      createdAt: i.created_at,
      closedAt: i.closed_at,
      thumbsUp: i.reactions['+1'],
      comments: i.comments,
    });
  }
  if (batch.length < 100) break;
}
saveIssues(issues);

// Every skills/<group>/<name>/SKILL.md, with the description from its frontmatter.
const { tree } = await github<{ tree: { path: string }[] }>('git/trees/main?recursive=1');
const skills: Skill[] = [];
for (const { path } of tree) {
  const match = path.match(/^skills\/([^/]+)\/([^/]+)\/SKILL\.md$/);
  if (!match) continue;
  const text = await (await fetch(`https://raw.githubusercontent.com/${REPO}/main/${path}`)).text();
  const description = text.match(/^description:\s*(.+)$/m)?.[1]?.replace(/^["']|["']$/g, '') ?? '';
  skills.push({ group: match[1]!, name: match[2]!, description });
}
saveSkills(skills);

const open = issues.filter((i) => i.state === 'open').length;
console.log(`${issues.length} issues (${open} open, ${issues.length - open} closed), ${skills.length} skills`);
