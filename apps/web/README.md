# PR Doctor — Web App (`apps/web`)

AI-powered pull-request reviewer built on **IBM BOB 2.0**. Four specialist agents investigate a GitHub PR in parallel and return a **BLOCK / NEEDS_WORK / MERGE** verdict with a full, traceable evidence chain.

Built for IBM TechXchange 2026 Pre-conference Dev Day Hackathon.

---

## Quick start

```bash
# From the monorepo root — demo mode, no GitHub token needed
DEMO_MODE=fixture pnpm dev
```

Open **http://localhost:3000**.

To connect a real GitHub repository instead, go to **http://localhost:3000/connect**.

---

## Stack

| | |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 + inline IBM Plex design tokens |
| Fonts | IBM Plex Sans · IBM Plex Sans Condensed · IBM Plex Mono |
| AI | IBM BOB 2.0 (`bob run` CLI) |
| Graph | IBM Graphify snapshot (`fixtures/graphify-graph.json`) |

---

## Project layout

```
apps/web/
├── app/
│   ├── page.tsx                      # Landing page — hero, verdict preview, agent cards
│   ├── connect/page.tsx              # GitHub token + repo connection form
│   ├── pulls/
│   │   ├── page.tsx                  # PR list for the connected repo
│   │   └── [number]/page.tsx         # PR detail — files, diffs, analyze button
│   ├── investigation/page.tsx        # Live agent run → verdict + findings
│   ├── finding/[id]/page.tsx         # Single finding detail — OBSERVED / CONCLUDED split
│   ├── how-it-works/page.tsx         # Architecture explainer
│   └── api/
│       ├── analyze/route.ts          # POST → { jobId, estimatedMs }
│       ├── job/[jobId]/route.ts      # GET → live agent progress
│       ├── verdict/[jobId]/route.ts  # GET → FinalVerdict
│       ├── graphify/route.ts         # GET → subgraph context for demo PR
│       ├── github/prs/route.ts       # GET → open PRs via GitHub GraphQL
│       └── github/prs/[number]/      # GET → single PR detail + file patches
├── lib/
│   ├── types.ts                      # Shared contracts — never fork these
│   ├── bob-adapter.ts                # Only file that calls `bob run`
│   ├── graphify.ts                   # Reads fixture graph, returns subgraph
│   └── job-store.ts                  # In-memory job tracker + agent schedule
├── fixtures/
│   ├── demo-pr.json                  # Full demo verdict — BLOCK @ 91%, 8 findings
│   ├── graphify-graph.json           # Committed Graphify snapshot (111 nodes)
│   └── graphify-report.md            # Human-readable graph report
├── prompts/
│   ├── 00-shared-preamble.md         # Prepended to all four role prompts
│   ├── 01-code-analyst.md
│   ├── 02-test-security.md
│   ├── 03-docs-compliance.md
│   └── 04-orchestrator.md
└── scripts/
    └── validate-fixture.mjs          # Checks demo-pr.json is internally consistent
```

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `DEMO_MODE` | *(unset)* | Set to `fixture` to bypass live BOB calls and serve `fixtures/demo-pr.json` |

No `.env` file is needed for demo mode. For live BOB calls, ensure `bob` is on your `PATH` and authenticated.

---

## Pages

### `/` — Landing

Hero section with the demo verdict preview card. Links to `/investigation` (demo run) and `/connect` (real GitHub repo).

### `/connect` — GitHub connection

Paste a **GitHub Personal Access Token** and a repo in `owner/name` format. The token is stored only in `sessionStorage` — it is never written to any server or database. Token is **required**; unauthenticated GitHub API calls are capped at 60 requests/hour.

**Required token scopes:** `repo` read (classic token) **or** Contents + Pull requests read (fine-grained token).

### `/pulls` — PR list

Lists all open PRs for the connected repo, sorted by last updated. Each row shows:
- PR number, title, author, branch → base branch
- Labels and Draft badge
- `+additions` / `−deletions` / files changed
- Last updated timestamp

Click any row to go to the PR detail page.

### `/pulls/[number]` — PR detail

Full PR metadata: status badge, diff stats, description, labels, commits, review comments, link to GitHub. All changed files are listed with collapsible unified diffs (colour-coded add/del/hunk).

The **Analyze this PR →** button serialises the PR context into `sessionStorage` and navigates to `/investigation`, where BOB picks it up automatically.

### `/investigation` — Live analysis

Posts to `/api/analyze`, polls `/api/job/[jobId]` every 800 ms, then fetches `/api/verdict/[jobId]`. Shows:
- Three agent lanes with live progress bars (Code Analyst, Test & Security, Docs & Compliance)
- Orchestrator lane that starts after the specialists
- Final verdict stamp (BLOCK / NEEDS_WORK / MERGE) with confidence and rationale
- All findings sorted critical → high → medium → low
- Each finding row links to `/finding/[id]`

### `/finding/[id]` — Finding detail

- Severity badge + title + `file:line`
- Agent name and BOB mode
- **OBSERVED / CONCLUDED** two-column split — the product's core differentiator
- Unified diff with the offending hunk highlighted
- Files this finding propagates to (blast radius)
- Remediation in a green-bordered box

---

## API routes

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/analyze` | Creates a job. Body: `{ prContext? }`. Returns `{ jobId, estimatedMs }` |
| `GET` | `/api/job/[jobId]` | Returns `{ complete, progress[] }` — poll every 800 ms |
| `GET` | `/api/verdict/[jobId]` | Returns `FinalVerdict`. Calls BOB or serves fixture |
| `GET` | `/api/graphify` | Returns `GraphifyContext` for the demo PR's changed files |
| `GET` | `/api/github/prs?repo=owner/name` | Lists open PRs via GitHub GraphQL (1 request, returns full stats) |
| `GET` | `/api/github/prs/[number]?repo=owner/name` | Single PR detail + all file patches |

All GitHub routes require an `x-github-token` header (forwarded from `sessionStorage` by the client).

---

## GitHub integration — rate limits

The PR list uses **GitHub's GraphQL API** (`https://api.github.com/graphql`) instead of the REST list endpoint. This matters because:

- The REST list endpoint does **not** include `additions`, `deletions`, or `changedFiles`
- Fetching them individually would require 1 + N REST calls (exhausts the 60 req/hour unauthenticated limit immediately)
- One GraphQL query returns all fields for up to 50 PRs in a single request
- With a token: **5,000 requests/hour** — effectively unlimited for normal use

---

## Demo scenario

**PR #4821 · `acme/ledger-api` · "fix: simplify permission check in auth helper"**

One line in `src/lib/auth.ts:42` changes from:
```ts
user.role === 'admin' && user.verified
```
to:
```ts
user.role === 'admin'
```
The two tests covering that behavior are also deleted. Three files call the helper; one is `billing/refund.ts`, which moves money and has no test coverage. Verdict is always **BLOCK**.

---

## Validate the fixture

```bash
pnpm validate
# or from the monorepo root:
# pnpm validate
```

Checks `fixtures/demo-pr.json` for: unique finding IDs, valid severities, finding/decision consistency, blast radius edge integrity, and more. Run this after any change to the fixture.

---

## Design tokens

| Token | Value | Used for |
|---|---|---|
| `--block` | `#B3261E` | BLOCK verdict, critical/high severity |
| `--caution` | `#8A5A00` | Medium severity |
| `--clear` | `#1F6B45` | MERGE verdict, additions |
| `--plex` | `#24408E` | IBM BOB blue — primary accent |
| `--ink` | `#14181C` | Body text |
| `--muted` | `#68757F` | Secondary text, timestamps |
| `--chart` | `#FFFFFF` | Card backgrounds |
| `--ground` | `#E9ECEF` | Page background |
