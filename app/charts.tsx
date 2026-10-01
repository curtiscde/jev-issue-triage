'use client';

// Two small hand-built SVG charts: a donut for part-to-whole (<= 4 segments here), and a ranked
// bar list for skills (too many classes, and a shifting ranking, for a donut).

import { useState } from 'react';

export type Slice = { key: string; count: number; colour: string };

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

// Point on a circle, angle in turns (0 = 12 o'clock, clockwise).
const at = (r: number, turns: number) => [50 + r * Math.sin(turns * 2 * Math.PI), 50 - r * Math.cos(turns * 2 * Math.PI)];

function arc(start: number, end: number, outer = 46, inner = 30) {
  const large = end - start > 0.5 ? 1 : 0;
  const [x1, y1] = at(outer, start);
  const [x2, y2] = at(outer, end);
  const [x3, y3] = at(inner, end);
  const [x4, y4] = at(inner, start);
  return `M${x1} ${y1}A${outer} ${outer} 0 ${large} 1 ${x2} ${y2}L${x3} ${y3}A${inner} ${inner} 0 ${large} 0 ${x4} ${y4}Z`;
}

export function Donut({ title, slices }: { title: string; slices: Slice[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = slices.reduce((s, x) => s + x.count, 0);
  let start = 0;

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body gap-3 p-5">
        <h2 className="card-title text-base">{title}</h2>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <svg viewBox="0 0 100 100" className="w-24 shrink-0" role="img" aria-label={title}>
            {total === 0 ? (
              <circle cx="50" cy="50" r="38" fill="none" className="stroke-base-300" strokeWidth="16" />
            ) : (
              slices
                .filter((s) => s.count > 0)
                .map((s) => {
                  const end = start + s.count / total;
                  // A single slice can't be drawn as one arc; nudge it just short of a full turn.
                  const d = arc(start, Math.min(end, start + 0.9999));
                  start = end;
                  return (
                    <path
                      key={s.key}
                      d={d}
                      fill={s.colour}
                      stroke="var(--chart-gap)"
                      strokeWidth="1.6"
                      opacity={hovered && hovered !== s.key ? 0.35 : 1}
                      onMouseEnter={() => setHovered(s.key)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      <title>{`${s.key}: ${s.count} (${pct(s.count, total)}%)`}</title>
                    </path>
                  );
                })
            )}
            <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="fill-base-content text-[14px] font-semibold">
              {total}
            </text>
          </svg>
          <ul className="min-w-48 grow space-y-1.5 text-sm">
            {slices.map((s) => (
              <li
                key={s.key}
                className={`flex items-center gap-2 ${hovered && hovered !== s.key ? 'opacity-40' : ''}`}
                onMouseEnter={() => setHovered(s.key)}
                onMouseLeave={() => setHovered(null)}
              >
                <span className="size-2.5 rounded-full" style={{ background: s.colour }} />
                <span className="grow whitespace-nowrap">{s.key}</span>
                <span className="tabular-nums font-medium">{s.count}</span>
                <span className="text-base-content/60 w-10 text-right tabular-nums">{pct(s.count, total)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function RankedBars({ title, rows, max = 6 }: { title: string; rows: { key: string; count: number }[]; max?: number }) {
  const top = [...rows].sort((a, b) => b.count - a.count).slice(0, max);
  const biggest = top[0]?.count ?? 0;
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body gap-3 p-5">
        <h2 className="card-title text-base">{title}</h2>
        <ul className="space-y-2 text-sm">
          {top.map((r) => (
            <li key={r.key} className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3" title={`${r.key}: ${r.count}`}>
              <span className="truncate">{r.key}</span>
              <span className="bg-base-200 h-3 rounded-r">
                <span
                  className="block h-3 rounded-r transition-[width] duration-300"
                  style={{ width: `${biggest ? (r.count / biggest) * 100 : 0}%`, background: 'var(--series-1)' }}
                />
              </span>
              <span className="text-right tabular-nums font-medium">{r.count}</span>
            </li>
          ))}
          {top.length === 0 && <li className="text-base-content/50">Waiting for answers…</li>}
        </ul>
      </div>
    </div>
  );
}
