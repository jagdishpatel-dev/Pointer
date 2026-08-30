# `packages/pr-ingestion` — PR Doctor Ingestion Service

Python service that connects to GitHub, fetches pull request data, runs a static risk analysis over every changed file, stores results in a local JSON database, and exposes them through both a REST API and a CLI.

This is the **data-ingestion backbone** of PR Doctor. The web app (`apps/web`) calls IBM BOB 2.0 directly via the GitHub GraphQL API for its live PR listing — this service is used for deep offline ingestion, bulk analysis, and as the FastAPI bridge when running the full stack locally.

---

## Quick start

### 1. Prerequisites

| Tool | Version |
|---|---|
| Python | ≥ 3.13 |
| [`uv`](https://github.com/astral-sh/uv) | latest |
| GitHub PAT | `repo` read scope |

### 2. Install dependencies

```bash
cd packages/pr-ingestion
uv sync
```

### 3. Configure environment

```bash
cp env.example .env
# Edit .env — set GITHUB_TOKEN and GITHUB_REPO
```

`.env` contents:

```dotenv
# Required
GITHUB_TOKEN=ghp_yourPersonalAccessTokenHere
GITHUB_REPO=owner/repo-name

# Optional — defaults shown
API_HOST=localhost
API_PORT=8000
DB_PATH=./data/pr_doctor.json
```

> **Never commit `.env`.** It is in `.gitignore`.

### 4. Run

**CLI — ingest a single PR:**
```bash
uv run python -m integration.cli ingest 42
```

**REST API server:**
```bash
uv run python -m integration.cli serve
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
```

**Or use the root monorepo scripts:**
```bash
# From the repo root:
pnpm run install:python   # uv sync
pnpm run api:serve        # start FastAPI on :8000
pnpm run api:ingest -- 42 # ingest PR #42
```

---

## Project layout

```
packages/pr-ingestion/
├── pyproject.toml                    # Package metadata, dependencies
├── .python-version                   # Pins Python 3.13
├── env.example                       # Copy to .env and fill in
├── data/
│   └── pr_doctor.json                # TinyDB database (auto-created)
└── src/
    ├── main.py                       # Entry point → delegates to cli.py
    └── integration/
        ├── __init__.py
        ├── settings.py               # pydantic-settings — env var loading
        ├── models.py                 # Pydantic v2 data models
        ├── storage.py                # TinyDB read/write layer
        ├── api.py                    # FastAPI REST application
        ├── cli.py                    # Typer CLI application
        └── ingestion/
            ├── __init__.py           # Public: ingest_pr, list_open_prs
            └── _legacy.py            # PyGithub fetching + risk heuristics
```

---

## Data models

### `RiskLevel`
`str` enum: `low` · `medium` · `high` · `critical`

### `FileDiff`
One changed file inside a PR.

| Field | Type | Description |
|---|---|---|
| `filename` | `str` | Full path |
| `status` | `str` | `added` \| `modified` \| `removed` \| `renamed` |
| `additions` | `int` | Lines added |
| `deletions` | `int` | Lines deleted |
| `patch` | `str \| None` | Raw unified diff; `None` for binary files |

### `RiskHeuristic`
A single risk signal detected in the diff.

| Field | Type | Description |
|---|---|---|
| `rule` | `str` | Rule identifier |
| `description` | `str` | Human-readable explanation |
| `level` | `RiskLevel` | Severity of this signal |
| `file` | `str \| None` | File that triggered the rule |

### `PRRecord`
Full ingested representation of a GitHub pull request.

| Field | Type | Description |
|---|---|---|
| `id` | `int` | GitHub PR number |
| `repo` | `str` | `owner/repo` |
| `title` | `str` | PR title |
| `body` | `str \| None` | PR description |
| `author` | `str` | GitHub login |
| `state` | `str` | `open` \| `closed` \| `merged` |
| `base_branch` | `str` | Target branch |
| `head_branch` | `str` | Source branch |
| `created_at` | `datetime` | |
| `updated_at` | `datetime` | |
| `merged_at` | `datetime \| None` | |
| `files` | `list[FileDiff]` | All changed files |
| `risk_heuristics` | `list[RiskHeuristic]` | All triggered risk signals |
| `overall_risk` | `RiskLevel` | Worst-case across all heuristics |
| `labels` | `list[str]` | GitHub labels |
| `review_comments` | `int` | |
| `commits` | `int` | |

---

## Risk heuristics

Seven rules run over every file diff. Multiple rules can fire on the same file.

| Rule | Level | Trigger |
|---|---|---|
| `secret_pattern` | **CRITICAL** | Patch matches a regex for passwords, tokens, api keys, etc. |
| `large_diff` | **HIGH** | A single file has > 500 added + deleted lines |
| `migration_file` | **HIGH** | Filename contains `migrat` |
| `config_change` | **MEDIUM** | `.env`, `.cfg`, `.yaml`, `.toml`, `.json` etc. was **modified** (not added) |
| `dependency_change` | **MEDIUM** | `requirements*.txt`, `pyproject.toml`, `package.json`, `go.sum`, or `Gemfile.lock` was touched |
| `test_deletion` | **MEDIUM** | A `test_*` / `*_test.*` / `spec.*` file was **removed** |
| `no_tests` | **LOW** | Source files were added/modified but no test files appear anywhere in the diff |

The secret pattern regex (case-insensitive):
```
(password|passwd|secret|token|api_?key|private_?key|auth_?key|access_?key|secret_?key)\s*[:=]\s*\S+
```

`overall_risk` is the worst-case level across all fired heuristics: `CRITICAL > HIGH > MEDIUM > LOW`.

---

## CLI commands

```bash
uv run python -m integration.cli --help
```

| Command | Description |
|---|---|
| `ingest <N>` | Fetch PR #N, run analysis, store it, print risk summary |
| `ingest-open [--limit N]` | Fetch all open PRs (default 20), store each |
| `list [--risk LEVEL]` | List all stored PRs, optionally filtered by risk level |
| `show <N>` | Print a single stored PR as pretty-printed JSON |
| `serve [--host H] [--port P]` | Start the FastAPI REST server |

**Examples:**
```bash
# Ingest a specific PR
uv run python -m integration.cli ingest 42

# Ingest-open with a higher limit
uv run python -m integration.cli ingest-open --limit 50

# List only high-risk PRs
uv run python -m integration.cli list --risk high

# Start API server on a different port
uv run python -m integration.cli serve --port 9000
```

---

## REST API

Start with `uv run python -m integration.cli serve`, then visit **http://localhost:8000/docs** for the interactive Swagger UI.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness probe — returns `{"status": "ok"}` |
| `POST` | `/ingest/{pr_number}` | Fetch, analyse, store a single PR. Returns `PRRecord`. |
| `POST` | `/ingest/bulk/open` | Fetch all open PRs (up to `?limit=50`), store all. Returns `list[PRRecord]`. |
| `GET` | `/prs` | List all stored PRs. Optional `?risk=high` filter. |
| `GET` | `/prs/{pr_number}` | Retrieve one stored PR by number. |
| `DELETE` | `/prs/{pr_number}` | Delete a stored PR record. |

---

## Storage

TinyDB JSON file at `DB_PATH` (default `./data/pr_doctor.json`). Records are keyed by `(repo, id)` — the same PR number from two different repos never collides. The file is created automatically on first write.

| Function | Description |
|---|---|
| `upsert_pr(record, settings)` | Insert or update by `(repo, id)` |
| `get_pr(pr_number, repo, settings)` | Retrieve one record. Returns `None` if not found. |
| `list_prs(settings, risk_filter)` | Return all records, optionally filtered by risk level string |
| `delete_pr(pr_number, repo, settings)` | Remove a record. Returns `True` if deleted. |

---

## Data flow

```
CLI / HTTP client
      │
      ▼
cli.py  ──or──  api.py
      │
      ▼
ingestion.ingest_pr(pr_number, settings)
      │
      ├─ PyGithub → GitHub REST API
      │     └─ PR metadata + changed file list + patches
      │
      ├─ _parse_files()        → list[FileDiff]
      ├─ _detect_heuristics()  → list[RiskHeuristic]
      └─ _overall_risk()       → RiskLevel
            │
            ▼
       PRRecord
            │
            ▼
     storage.upsert_pr()
            │
            ▼
   data/pr_doctor.json  (TinyDB)
```

---

## Dependencies

| Package | Role |
|---|---|
| `PyGithub ≥ 2.3.0` | GitHub REST API client |
| `pydantic ≥ 2.7.0` | Data model validation |
| `pydantic-settings ≥ 2.3.0` | `.env` / environment config loading |
| `fastapi ≥ 0.111.0` | REST API framework |
| `uvicorn[standard] ≥ 0.30.0` | ASGI server |
| `tinydb ≥ 4.8.0` | Lightweight JSON file database |
| `typer ≥ 0.12.0` | CLI framework |
| `python-dotenv ≥ 1.0.0` | `.env` file loading |

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GITHUB_TOKEN` | ✅ | — | GitHub PAT with `repo` read scope |
| `GITHUB_REPO` | ✅ | — | Target repo in `owner/repo` format |
| `API_HOST` | ❌ | `localhost` | Host the REST server binds to |
| `API_PORT` | ❌ | `8000` | Port the REST server listens on |
| `DB_PATH` | ❌ | `./data/pr_doctor.json` | Path to the TinyDB JSON file |
