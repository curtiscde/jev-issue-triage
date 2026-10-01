# Spec: jev-issue-triage

## Objective

The worked example for a curtiscode.dev post about TypeSafe's **Jev**. Jev triages the issues in `mattpocock/skills` (862 issues on 2026-09-29, almost all unlabelled). The post reports real numbers: count, time, cost and accuracy.

**Two sets of issues, classified identically:**

- **Open issues (530): the product.** This is the actual triage, and the only issues shown individually (on the live page and in the terminal feed).
- **Closed issues (332): the test.** Their outcome is already known, so they measure accuracy (a backtest). They appear only as aggregate numbers, never individually.

The argument is "code acts on the answer": Jev is the instant, near-free first pass on each new issue, not a replacement for Matt's LLM-driven `triage` skill.

**Audience:** readers of the post (TypeScript developers), who see a recording and tables, and who can clone the repo and run it themselves.

**What's built:**

- **Pipeline:** fetch → classify → score, printed with `console.table`, with a live terminal display while classifying.
- **Live triage page:** a **local-only** Next.js page for the recording. "Run" streams real (or fake) Jev answers for every open issue into a scrollable table, live stats and charts. Jev is called from a server route, so the API key never reaches the browser. Not deployed.

## The questions (one Jev request per issue)

| Id | Type | Question | Answer key |
|---|---|---|---|
| `category` | choice | `bug` / `enhancement` / `question` / `not-an-issue` (opened by mistake, a test, or not about the project) | title prefixes (`bug:`, `proposal:`, `question:` …, 82 issues) and ~50 hand-labelled issues (random, seeded) |
| `skill` | choice | which of the repo's `SKILL.md` folders, or `general` | title prefixes (`pr skill:`, `setup-matt-pocock-skills:` …, 148 issues) |
| `nextStep` | choice | `needs-info` / `ready-for-agent` / `ready-for-human` | none, reported as a distribution |
| `notPlanned` | boolean | will the maintainer close this without acting on it? | closed issues' `state_reason`: `not_planned` / `duplicate` = true (37), `completed` = false (295) |
| `impact` | score | Narrow or niche use case → A few users → Many users → Nearly everyone who uses this skill | weak: 👍 reactions and comments; reported as a correlation, not accuracy |

**State:** title and body only (body capped at 4,000 characters), no comments: what a bot sees when an issue opens. Issues only; PRs are filtered out (items with a `pull_request` key).

**Title prefixes give the answer away.** Jev sees `grilling: …` in the title, so the prefixed issues are easy cases. `pnpm blind` re-asks them with the prefix removed, and the post reports both: skill 98.6% as written, 86.5% blind; category 98.8% as written, 92.7% blind. Prefixes for skills that no longer exist (like `prd:`) are excluded.

**Scoring `notPlanned`:** with only 11% positives, raw accuracy is meaningless (always answering "no" scores 89%). Report ranking precision instead: of the 37 closed issues Jev rated most likely to be declined, how many were, compared with about 4 by chance. Caveat: GitHub's default close reason is "completed", so some declined issues are recorded as completed, and the key undercounts.

**Tone:** the post frames `notPlanned` as "can Jev predict the maintainer's decision from the issue alone?", never as a statistic about Matt. No per-issue `notPlanned` score is shown or published anywhere: not on the page, not in the terminal feed, and `results/` is not committed.

## Confirmed by the probe and the full run

- Score: fractional position from 0 to levels − 1; `probabilities` keyed `"0"`…`"3"`; the score is their weighted mean.
- `probabilities` returned for every choice and score question, rounded to 2 decimals (`rounding.probabilityDecimals: 2`).
- `providerMetadata.typesafe.confidence`: a per-question confidence (not in the SDK types).
- **Not deterministic:** the same issue can get different answers on different calls (#115: `enhancement` 0.60 once, `not-an-issue` 0.52–0.62 four times). On near-ties a call occasionally fails the SDK's "highest-probability option" check (1 in 862), so every batch retries a failed issue once. Re-running gives slightly different numbers.
- Full run (2026-10-01): 862 issues, 2.3M input tokens (about 2,670 per issue), $0.097; median 330 ms, p95 about 1 s per issue; 838 issues in 25.8 s at concurrency 20. Output tokens are free.
- AI Gateway: free-tier credits don't cover Jev. After buying credits, the Gateway kept refusing about 98% of requests with a free-tier 429 for roughly two days before the paid tier applied (Vercel quotes up to 15 minutes).

## Tech Stack

- TypeScript (strict, ESM), Node 24, pnpm (via corepack), `tsx` with no build step for the pipeline.
- `ai` ≥ 7.0.105: `experimental_evaluate`, model `typesafe-ai/jev` via Vercel AI Gateway (paid credits required).
- Auth: `AI_GATEWAY_API_KEY` (Vercel → AI Gateway → API Keys) in `.env.local`.
- Live page: Next.js 16, React 19, Tailwind CSS 4 + DaisyUI 5. Charts are hand-built SVG (no chart library).

## Commands

```
pnpm fetch-issues    # issues + skill list → data/ (needs GITHUB_TOKEN=$(gh auth token))
pnpm classify        # Jev over every cached issue → results/classifications.json (resumable)
pnpm blind           # re-ask the prefixed issues with the prefix removed → results/blind.json
pnpm score           # accuracy, distributions, cost and latency tables
pnpm dev             # the live triage page on http://localhost:3000 (this machine only)
pnpm probe [issue]   # one real Jev call, prints the raw response
pnpm label-sample    # seeded random 50 unprefixed issues to hand-label → data/label-sample.md
pnpm test            # tsx --test (node:test, no extra dependency)
pnpm typecheck       # tsc --noEmit
```

`JEV_FAKE=1` swaps in a local fake model (random answers in Jev's format, no key, no cost) for `classify`, `blind` and `score`; the page has a "Fake model" switch.

## Project Structure

```
lib/jev.ts          → questions, toState(issue), classifyIssue(): shared by the pipeline and the live page
lib/answer-key.ts   → pure functions: what GitHub already knows (title prefixes, close reasons)
lib/scoring.ts      → accuracy, top-k precision, mean by group
lib/pool.ts         → run a batch N at a time, retry each failure once, stop on cancel
lib/fake-jev.ts     → the fake model
lib/progress.ts     → the live terminal display
lib/store.ts, cost.ts, lines.ts, env.ts → JSON files, price, stream line splitting, .env loading
pipeline/           → one script per step (see Commands)
app/                → the live triage page (Next.js); app/api/run/route.ts streams the answers
data/               → gitignored: GitHub's text (issues, skill descriptions)
results/            → gitignored: our outputs only (Jev's answers, hand labels)
```

## Code Style

Kept small because the post quotes it:

```ts
const { answers, usage } = await evaluate({
  model: 'typesafe-ai/jev',
  state: toState(issue),
  questions,
});
```

Short header comment per file explaining what it does and how to run it. No abstraction the post would have to explain. Relative imports use `.ts` extensions. British English in output and docs.

## Testing Strategy

- `node:test` via `tsx --test`, tests next to the code (`*.test.ts`).
- Unit tests for the pure logic, where silent mistakes would skew the post's numbers: answer keys, scoring maths, the batch pool, stream line splitting, terminal-safe titles, and the fake model (run through the real `evaluate()`, so the SDK validates its answers).
- A test asserting that `results/` holds only our outputs (no titles, bodies or other GitHub text).
- No tests call Jev or GitHub. The probe and a small-batch run (about 20 issues) are the integration check before a full run.

## Boundaries

- **Always:** typecheck and test before calling a task done; cache everything fetched in `data/`; British English.
- **No `zeroDataRetention`:** the Gateway only offers it on Pro and Enterprise plans (confirmed by a 403 on Hobby). It isn't needed, because every input is a public GitHub issue, and leaving it out lets readers on free accounts run the repo.
- **The run endpoint spends money:** `POST /api/run` only accepts same-origin requests on localhost, and `pnpm dev` binds to 127.0.0.1.
- **Never:** commit issue titles, bodies or skill descriptions; commit per-issue results; commit API keys; write anything to `mattpocock/skills` (labels, comments).

## Success Criteria

1. The probe has confirmed the real response shape (score level numbering, `probabilities` presence, latency, tokens per issue).
2. `pnpm fetch-issues` caches every issue (PRs excluded) and the current skill list.
3. `pnpm classify` classifies every cached issue; an interrupted run resumes; failures are listed, not swallowed.
4. `pnpm score` prints tables for: `notPlanned` against `state_reason`; `skill` and `category` against title prefixes, as written and blind; `category` against the hand-labelled sample; `impact` against 👍 and comments; the open backlog's distributions; total cost, and median and p95 latency per issue.
5. `results/` contains only issue numbers, our answers and probabilities, and the hand labels (enforced by a test), and is not committed.
6. `pnpm classify` on a terminal shows the live display (bar, last 8 answers, tokens, cost, median latency) without the `notPlanned` score; piped output falls back to plain lines.
7. `pnpm dev` serves the live page: a real or fake run streams into the table, stats and charts; errors are shown with a way to retry; leaving the page cancels the run.
