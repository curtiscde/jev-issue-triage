// Streams Jev's answers for every open issue, one JSON line per issue, as they arrive.
// The API key stays here on the server; the page only ever sees the answers.
//
//   POST /api/run         real Jev (about $0.06 for the open issues)
//   POST /api/run?fake    the fake model: free, random answers

import { fakeJev } from '../../../lib/fake-jev.ts';
import { buildQuestions, classifyIssue, MODEL, type Answers } from '../../../lib/jev.ts';
import { forEachConcurrently } from '../../../lib/pool.ts';
import { loadIssues, loadSkills } from '../../../lib/store.ts';

export type RunEvent =
  | { type: 'start'; total: number }
  | {
      type: 'answer';
      number: number;
      title: string;
      category: Answers['category']['choice'];
      skill: Answers['skill']['choice'];
      nextStep: Answers['nextStep']['choice'];
      latencyMs: number;
      inputTokens: number;
    }
  | { type: 'error'; number: number; message: string };

// A run spends real money, so only this page, on this machine, may start one. Browsers mark
// requests from other sites (Sec-Fetch-Site), and checking the host also stops another site
// pointing its own domain at this machine (DNS rebinding).
function isFromThisPage(request: Request) {
  const site = request.headers.get('sec-fetch-site');
  // The Host header the browser sent (request.url is rebuilt by Next.js, so it can't be used here).
  const hostname = request.headers.get('host')?.replace(/:\d+$/, '');
  return (site === null || site === 'same-origin') && ['localhost', '127.0.0.1', '[::1]'].includes(hostname ?? '');
}

export async function POST(request: Request) {
  if (!isFromThisPage(request)) return new Response('Forbidden', { status: 403 });

  const fake = new URL(request.url).searchParams.has('fake');
  const issues = loadIssues().filter((i) => i.state === 'open');
  if (issues.length === 0) return new Response('No issues cached. Run `pnpm fetch-issues` first.', { status: 500 });

  const questions = buildQuestions(loadSkills());
  const model = fake ? fakeJev({ latencyMs: 330 }) : MODEL;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // If the page goes away mid-run, stop: no more Jev calls, and nothing written to a closed stream.
      const send = (event: RunEvent) => {
        if (!request.signal.aborted) controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      };
      send({ type: 'start', total: issues.length });

      await forEachConcurrently(
        issues,
        {
          concurrency: 20,
          signal: request.signal,
          onFailure: (issue, error) => send({ type: 'error', number: issue.number, message: error.message }),
        },
        async (issue) => {
          const { answers, latencyMs, inputTokens } = await classifyIssue(issue, questions, model);
          send({
            type: 'answer',
            number: issue.number,
            title: issue.title,
            category: answers.category.choice,
            skill: answers.skill.choice,
            nextStep: answers.nextStep.choice,
            latencyMs,
            inputTokens,
          });
        },
      );
      if (!request.signal.aborted) controller.close();
    },
  });

  return new Response(stream, { headers: { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store' } });
}
