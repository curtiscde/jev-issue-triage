// Small, plain maths for the results tables.

export function accuracy<T>(pairs: { predicted: T; actual: T }[]) {
  return { correct: pairs.filter((p) => p.predicted === p.actual).length, total: pairs.length };
}

// Of the k items Jev rated most likely, how many were actually true?
export function topK(items: { score: number; actual: boolean }[], k: number) {
  const top = [...items].sort((a, b) => b.score - a.score).slice(0, k);
  return { hits: top.filter((i) => i.actual).length, k: top.length };
}

export function meanBy<T, G extends string | number>(rows: T[], group: (row: T) => G, value: (row: T) => number) {
  const groups = new Map<G, number[]>();
  for (const row of rows) groups.set(group(row), [...(groups.get(group(row)) ?? []), value(row)]);
  return [...groups]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([g, values]) => ({ group: g, n: values.length, mean: values.reduce((s, v) => s + v, 0) / values.length }));
}

export const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : 'n/a');
