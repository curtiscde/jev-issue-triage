'use client';

// Live triage: run Jev over every open issue in mattpocock/skills and watch the answers arrive.

import { useState } from 'react';
import { costOf } from '../lib/cost.ts';
import { Donut, RankedBars, type Slice } from './charts.tsx';
import { useTriageRun, type Answer } from './useTriageRun.ts';

// Colour follows the answer, never its rank: each option keeps its colour all run long.
const CATEGORY_COLOURS: Record<Answer['category'], string> = {
  enhancement: 'var(--series-1)',
  bug: 'var(--series-2)',
  question: 'var(--series-3)',
  'not-an-issue': 'var(--series-neutral)',
};
const NEXT_STEP_COLOURS: Record<Answer['nextStep'], string> = {
  'ready-for-agent': 'var(--series-1)',
  'ready-for-human': 'var(--series-2)',
  'needs-info': 'var(--series-3)',
};

function countBy<K extends string>(answers: Answer[], key: (a: Answer) => K) {
  const counts = new Map<K, number>();
  for (const a of answers) counts.set(key(a), (counts.get(key(a)) ?? 0) + 1);
  return counts;
}

const slices = <K extends string>(colours: Record<K, string>, counts: Map<K, number>): Slice[] =>
  (Object.keys(colours) as K[]).map((key) => ({ key, count: counts.get(key) ?? 0, colour: colours[key] }));

function Tag({ label, colour }: { label: string; colour?: string }) {
  return (
    <span className="badge badge-ghost gap-1.5 whitespace-nowrap">
      {colour && <span className="size-2 rounded-full" style={{ background: colour }} />}
      {label}
    </span>
  );
}

function Stat({ title, value, note }: { title: string; value: string; note?: string }) {
  return (
    <div className="stat py-3">
      <div className="stat-title">{title}</div>
      <div className="stat-value text-3xl tabular-nums">{value}</div>
      {note && <div className="stat-desc">{note}</div>}
    </div>
  );
}

export default function Page() {
  const [fake, setFake] = useState(false);
  const { status, error, total, answers, errors, elapsedMs, fakeRun, run } = useTriageRun();

  const seconds = elapsedMs / 1000;
  const tokens = answers.reduce((s, a) => s + a.inputTokens, 0);
  const latencies = answers.map((a) => a.latencyMs).sort((a, b) => a - b);
  const median = latencies[Math.floor(latencies.length / 2)] ?? 0;
  const newestFirst = [...answers].reverse();

  return (
    <main className="viz mx-auto max-w-6xl space-y-4 px-8 py-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Triaging mattpocock/skills with Jev</h1>
          <p className="text-base-content/70">
            Every open issue, five questions each, answered by <code>typesafe-ai/jev</code> via Vercel AI Gateway
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="label cursor-pointer gap-2">
            <input type="checkbox" className="toggle toggle-sm" checked={fake} onChange={(e) => setFake(e.target.checked)} />
            Fake model (free)
          </label>
          <button className="btn btn-primary" disabled={status === 'running'} onClick={() => run(fake)}>
            {status === 'running' ? <span className="loading loading-spinner loading-sm" /> : <span aria-hidden>▶</span>}
            {status === 'idle' || status === 'running' ? 'Run' : 'Run again'}
          </button>
        </div>
      </header>

      <section className="space-y-2">
        <progress className="progress progress-primary h-3 w-full" value={answers.length} max={total || 1} />
        <p className="text-base-content/70 text-sm tabular-nums">
          {status === 'idle' && 'Ready.'}
          {status === 'running' && `${answers.length} / ${total || '…'} open issues`}
          {status === 'done' && `Triaged ${answers.length} issues in ${seconds.toFixed(1)}s`}
          {status === 'error' && <span className="text-error">Run stopped: {error}</span>}
          {errors > 0 && <span className="text-error"> · {errors} failed</span>}
        </p>
      </section>

      <section className="stats bg-base-100 w-full shadow-sm">
        <Stat title="Triaged" value={String(answers.length)} />
        <Stat title="Speed" value={`${seconds > 0.5 ? Math.round(answers.length / seconds) : 0} / sec`} />
        <Stat title="Median per issue" value={`${median} ms`} />
        {/* The fake model's token counts are made up, so a fake run shows no cost rather than a misleading one. */}
        <Stat title="Cost" value={`$${(fakeRun ? 0 : costOf(tokens)).toFixed(3)}`} note={fakeRun ? 'Fake model: no cost' : undefined} />
      </section>

      {/* Every answered issue, newest first; about 10 rows show at once and the rest scroll. */}
      <section className="card bg-base-100 max-h-[26rem] overflow-y-auto shadow-sm">
        <table className="table table-sm table-fixed table-pin-rows">
          <thead>
            <tr>
              <th className="w-16">#</th>
              <th>Issue</th>
              <th className="w-36">Category</th>
              <th className="w-56">Skill</th>
              <th className="w-40">Next step</th>
              <th className="w-24 text-right">Time</th>
            </tr>
          </thead>
          <tbody>
            {newestFirst.map((a) => (
              <tr key={a.number}>
                <td className="text-base-content/60 tabular-nums">{a.number}</td>
                <td className="truncate">
                  <a
                    className="link link-hover"
                    href={`https://github.com/mattpocock/skills/issues/${a.number}`}
                    target="_blank"
                    rel="noreferrer"
                    title={a.title}
                  >
                    {a.title}
                  </a>
                </td>
                <td>
                  <Tag label={a.category} colour={CATEGORY_COLOURS[a.category]} />
                </td>
                <td>
                  <Tag label={a.skill} />
                </td>
                <td>
                  <Tag label={a.nextStep} colour={NEXT_STEP_COLOURS[a.nextStep]} />
                </td>
                <td className="text-base-content/70 text-right tabular-nums">{a.latencyMs} ms</td>
              </tr>
            ))}
            {answers.length === 0 && (
              <tr>
                <td colSpan={6} className="text-base-content/50 py-10 text-center">
                  Press Run to triage every open issue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Donut title="Category" slices={slices(CATEGORY_COLOURS, countBy(answers, (a) => a.category))} />
        <Donut title="Next step" slices={slices(NEXT_STEP_COLOURS, countBy(answers, (a) => a.nextStep))} />
        <RankedBars
          title="Top skills"
          rows={[...countBy(answers, (a) => a.skill)].map(([key, count]) => ({ key, count }))}
        />
      </section>
    </main>
  );
}
