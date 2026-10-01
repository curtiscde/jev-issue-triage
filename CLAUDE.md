# jev-issue-triage

Triages every open issue in `mattpocock/skills` with TypeSafe's **Jev** (a decision-only model: typed questions in, answers with probabilities out) and backtests it on the closed issues. The worked example for a curtiscode.dev post. `SPEC.md` is the source of truth for what's built and why; `README.md` covers setup.

## Commands

```sh
pnpm fetch-issues   # issues + skills → data/ (GITHUB_TOKEN=$(gh auth token))
pnpm classify       # Jev over every issue → results/ (resumable; JEV_FAKE=1 for the free fake model)
pnpm blind          # re-ask title-prefixed issues with the prefix removed
pnpm score          # accuracy, cost and speed tables
pnpm dev            # the live triage page on http://localhost:3000
pnpm test           # node:test via tsx
pnpm typecheck
```

## Rules

- **Jev calls cost money** (about $0.10 for every issue). Prefer `JEV_FAKE=1` or the page's "Fake model" switch when testing; ask before a full real run.
- **Never commit per-issue results or GitHub's text.** `data/` (titles, bodies) and `results/` (Jev's answers) are gitignored; no per-issue "likely to be declined" score is shown or published anywhere.
- **Never write to `mattpocock/skills`** (labels, comments): this project only reads it.
- `POST /api/run` must stay same-origin and localhost-only, and `pnpm dev` bound to 127.0.0.1: the route spends money.
- Every batch of Jev calls goes through `forEachConcurrently` in `lib/pool.ts` (concurrency, one retry, cancellation).

## Conventions

- TypeScript, ESM, strict. The pipeline runs with `tsx`, no build step.
- Relative imports use `.ts` extensions, not `.js` (`allowImportingTsExtensions` is on).
- `lib/` code used by the page must not import `ai` indirectly (e.g. prices live in `lib/cost.ts`, not `lib/jev.ts`).
- British English in docs and user-facing output.
- Keep code small and readable: it is quoted in the post.
- Pure logic gets a test next to it (`*.test.ts`); tests never call Jev or GitHub.
