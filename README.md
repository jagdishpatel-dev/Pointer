# Pointer — PR Doctor Monorepo

AI-powered pull-request reviewer built on **IBM BOB 2.0** for IBM TechXchange 2026.  
Four BOB specialists investigate a PR in parallel and return a **MERGE / NEEDS_WORK / BLOCK** verdict with a full evidence chain.

---

## Repository layout

```
Pointer/
├── apps/
│   └── web/                  # Next.js 15 front-end (PR Doctor UI)
├── packages/
│   ├── pr-ingestion/         # Python FastAPI service — fetches PRs from GitHub
│   └── graphify-out/         # Committed graph snapshot (nodes + edges)
├── package.json              # Root — pnpm workspace scripts
└── pnpm-workspace.yaml       # Declares apps/* as workspaces
```

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 20 | https://nodejs.org |
| pnpm | ≥ 11 | `npm i -g pnpm` |
| Python | ≥ 3.13 | https://python.org |
| uv | latest | `pip install uv` or https://github.com/astral-sh/uv |

---

## Quick start (demo mode — no GitHub token needed)

```bash
# 1. Install all JS dependencies from the repo root
pnpm install

# 2. Start the web app in demo/fixture mode
DEMO_MODE=fixture pnpm dev
```

Open http://localhost:3000.  
The landing page shows a pre-loaded BLOCK verdict.  
`/investigation` runs the full agent animation against the fixture.

---

## Full setup (live GitHub ingestion)

### 1. Configure the Python ingestion service

```bash
cp packages/pr-ingestion/env.example packages/pr-ingestion/.env
# Edit .env — set GITHUB_TOKEN and GITHUB_REPO
```

### 2. Install Python dependencies

```bash
pnpm run install:python
# Equivalent to: cd packages/pr-ingestion && uv sync
```

### 3. Ingest a PR

```bash
# Ingest a specific PR number
pnpm run api:ingest -- 42

# Or start the REST API server (http://localhost:8000/docs)
pnpm run api:serve
```

### 4. Start the web app

```bash
pnpm dev
```

---

## Root scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Start Next.js dev server (`apps/web`) |
| `pnpm build` | Production build of the web app |
| `pnpm start` | Start the production Next.js server |
| `pnpm lint` | Run ESLint on the web app |
| `pnpm validate` | Validate the fixture file against internal consistency rules |
| `pnpm run setup` | Install both JS (pnpm) and Python (uv) dependencies in one step |
| `pnpm run install:python` | Install Python dependencies via `uv sync` |
| `pnpm run api:serve` | Start the FastAPI ingestion server on port 8000 |
| `pnpm run api:ingest -- <PR#>` | Ingest a single PR from GitHub |

---

## Architecture

```
Browser
  │
  ▼
apps/web (Next.js)
  ├── /api/analyze        POST → creates a job
  ├── /api/job/[id]       GET  → live agent progress (polled every 800ms)
  ├── /api/verdict/[id]   GET  → FinalVerdict (calls IBM BOB or serves fixture)
  └── /api/graphify       GET  → subgraph context for changed files
        │
        ├── lib/bob-adapter.ts   — only file that calls `bob run`
        └── lib/graphify.ts      — reads packages/graphify-out/graph.json

packages/pr-ingestion (FastAPI + TinyDB)
  ├── POST /ingest/{pr}   Fetch PR from GitHub, analyse, store
  ├── GET  /prs           List stored PRs
  └── GET  /prs/{pr}      Get a single stored PR
```

---

## Environment variables (web app)

| Variable | Default | Description |
|---|---|---|
| `DEMO_MODE` | *(unset)* | Set to `fixture` to skip live BOB calls and serve the demo fixture |

---

## Validate the fixture

```bash
pnpm validate
```

Runs [`apps/web/scripts/validate-fixture.mjs`](apps/web/scripts/validate-fixture.mjs) — checks that the demo JSON is internally consistent (finding ids, severity/decision rules, blast radius edges). Run this after any change to `fixtures/demo-pr.json`.
