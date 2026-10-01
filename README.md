# jev-issue-triage

Triage every open issue in [mattpocock/skills](https://github.com/mattpocock/skills) with [Jev](https://vercel.com/kb/guide/typesafe-jev-and-ai-sdk), TypeSafe's decision-only model, then check its answers against the issues that are already closed.

For each issue, Jev answers five questions in one request:

| Question | Type | Answer |
|---|---|---|
| `category` | choice | `bug`, `enhancement`, `question` or `not-an-issue` |
| `skill` | choice | which of the repo's skills it's about, or `general` |
| `nextStep` | choice | `needs-info`, `ready-for-agent` or `ready-for-human` |
| `notPlanned` | boolean | will the maintainer close it without acting on it? |
| `impact` | score | from "narrow or niche use case" to "nearly everyone who uses this skill" |

Open issues are the triage. Closed issues are the test: their outcome is already known, so they measure accuracy.

## Setup

You need Node 24 and an [AI Gateway](https://vercel.com/ai-gateway) API key with paid credits (free-tier credits don't cover Jev).

```sh
corepack enable pnpm
pnpm install
cp .env.example .env.local   # then add your AI_GATEWAY_API_KEY
```

## Run it

```sh
GITHUB_TOKEN=$(gh auth token) pnpm fetch-issues   # issues and skills → data/
pnpm classify                                     # Jev over every issue → results/
pnpm score                                        # accuracy, cost and speed tables
```

### Watch it live

```sh
pnpm dev   # then open http://localhost:3000
```

A local page that triages every open issue while you watch: tags appear in a table as Jev answers, with live counters and charts. Tick **Fake model** for a free rehearsal; a real run costs about $0.06. The API key stays on the server.

Other commands:

- `pnpm probe <issue>`: one Jev call, printing the raw response
- `pnpm blind`: re-ask issues whose title gives the answer away (`grilling: …`) with that prefix removed
- `pnpm label-sample`: pick a seeded random sample of issues to label by hand
- `pnpm test` and `pnpm typecheck`

Add `JEV_FAKE=1` to `classify`, `blind` or `score` to use a local fake model instead: random answers, no API key, no cost.

## What's in the repo

Nothing generated is committed. `data/` holds GitHub's text (issue titles and bodies) and `results/` holds Jev's answers; both are created locally: `pnpm fetch-issues` fills `data/`, and `pnpm classify` and `pnpm blind` fill `results/`.
