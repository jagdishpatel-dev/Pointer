# PR Doctor

PR Doctor is a hackathon project built for the IBM BOB 2.0 Hackathon. It fetches
GitHub pull requests, runs automated risk analysis over every changed file, stores
the results locally, and exposes them through a REST API and a CLI — giving
reviewers a structured risk report before they open a single diff.

---

## Repository Layout

```
/
├── README.md           ← you are here
├── SECURITY.MD         # Credential hygiene rules for the hackathon
├── .gitignore          # Prevents committing .env, sessions, secrets
├── .bobignore          # Prevents Bob (AI assistant) from logging credentials
└── apps/
    └── integration/    # PR Doctor service (Python)
```

The repository currently contains one application: [`apps/integration`](apps/integration/).
All PR fetching, analysis, storage, API, and CLI logic lives there.

---

## `apps/integration` — PR Doctor Service

The integration service is a self-contained Python 3.13 package. It connects to
the GitHub REST API, pulls pull-request metadata and file diffs, scores each PR
with a set of risk heuristics, persists the results in a local JSON database, and
serves them over a FastAPI REST API.

→ **Full documentation:** [`apps/integration/README.md`](apps/integration/README.md)

### What it does

1. **Fetches** a PR (or all open PRs) from any GitHub repository using a personal access token.
2. **Analyses** every changed file against six risk rules (secrets, large diffs, migrations, config changes, dependency changes, test deletions).
3. **Scores** the PR with an overall risk level: `low` · `medium` · `high` · `critical`.
4. **Stores** the full result in a local TinyDB JSON file.
5. **Serves** the stored data through a FastAPI REST API with Swagger docs.
6. **Exposes** everything through a Typer CLI for direct terminal use.

### Quick start

```bash
cd apps/integration

# Install dependencies
uv sync

# Configure credentials
echo "GITHUB_TOKEN=ghp_yourtoken" >> .env
echo "GITHUB_REPO=owner/repo"     >> .env

# Ingest PR #42 and print its risk report
uv run python -m integration.cli ingest 42

# Start the REST API server
uv run python -m integration.cli serve
# → http://localhost:8000/docs
```

### CLI commands

| Command | Description |
|---|---|
| `ingest <N>` | Fetch PR #N, analyse it, store it, print risk summary |
| `ingest-open [--limit N]` | Fetch all open PRs (default 20), store each |
| `list [--risk LEVEL]` | List all stored PRs, optionally filtered by risk level |
| `show <N>` | Print a stored PR as JSON |
| `serve [--host H] [--port P]` | Start the FastAPI REST server |

### REST API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness probe |
| `POST` | `/ingest/{pr_number}` | Fetch, analyse, store a single PR |
| `POST` | `/ingest/bulk/open` | Fetch all open PRs (up to `?limit=50`) |
| `GET` | `/prs` | List stored PRs (`?risk=high` to filter) |
| `GET` | `/prs/{pr_number}` | Get one stored PR |
| `DELETE` | `/prs/{pr_number}` | Delete one stored PR |

---

## `apps/integration/src/integration/ingestion` — Fetching Engine

The `ingestion` sub-package is the innermost layer of the service. It owns the
PyGithub client, the file-level diff parsing, and all six risk heuristic rules.
It is imported by both the CLI and the API — neither of those layers talk to GitHub
directly.

→ **Full documentation:** [`apps/integration/src/integration/ingestion/README.md`](apps/integration/src/integration/ingestion/README.md)

### Risk rules at a glance

| Rule | Severity | What triggers it |
|---|---|---|
| `secret_pattern` | CRITICAL | Patch matches a regex for passwords, tokens, api keys |
| `large_diff` | HIGH | A file has > 500 added + deleted lines |
| `migration_file` | HIGH | Filename contains `migrat` |
| `config_change` | MEDIUM | A config file (`.env`, `.yaml`, `.toml`, etc.) was modified |
| `dependency_change` | MEDIUM | A dependency manifest was touched |
| `test_deletion` | MEDIUM | A test file was deleted |
| `no_tests` | LOW | Source files changed but no test files in the diff |

---

## Running the Project

The project has two runnable components that can be started independently.

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Python | ≥ 3.13 | Integration service |
| [uv](https://docs.astral.sh/uv/) | any recent | Python package manager |
| Node.js | ≥ 18 | PR Doctor frontend |
| npm | ≥ 9 | Frontend dependency management |

---

### 1 — Integration service (Python backend)

```bash
cd apps/integration
```

**Install dependencies**

```bash
uv sync
```

**Create `.env`**

```bash
cp .env.example .env  # if it exists, otherwise create it manually
```

Add the following to `apps/integration/.env`:

```dotenv
GITHUB_TOKEN=ghp_yourPersonalAccessToken   # required — repo read scope
GITHUB_REPO=owner/repo                     # required — e.g. octocat/Hello-World
# optional overrides
API_HOST=localhost
API_PORT=8000
DB_PATH=./data/pr_doctor.json
```

**Run the CLI**

```bash
# Ingest a single PR by number
uv run python -m integration.cli ingest 42

# Ingest all open PRs (default limit: 20)
uv run python -m integration.cli ingest-open

# List stored PRs (optionally filtered by risk level)
uv run python -m integration.cli list --risk high

# Print a stored PR as JSON
uv run python -m integration.cli show 42
```

Alternatively, if `uv` added the script entry-point to PATH after `uv sync`:

```bash
pr-doctor ingest 42
```

**Start the REST API server**

```bash
uv run python -m integration.cli serve
```

The API is now live at `http://localhost:8000`. Interactive Swagger docs are at
`http://localhost:8000/docs`.

---

### 2 — PR Doctor frontend (Next.js)

```bash
cd pr-doctor
```

**Install dependencies**

```bash
npm install
```

**Run the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Other frontend commands**

```bash
npm run build   # production build
npm run start   # serve the production build locally
npm run lint    # run ESLint
```

---

### Running both together

Open two terminal windows:

```bash
# Terminal 1 — backend
cd apps/integration && uv run python -m integration.cli serve

# Terminal 2 — frontend
cd pr-doctor && npm run dev
```

The frontend at `http://localhost:3000` expects the backend at `http://localhost:8000`.

---

## Environment Variables

All configuration is read from a `.env` file in `apps/integration/` or from the
shell environment directly.

| Variable | Required | Default | Description |
|---|---|---|---|
| `GITHUB_TOKEN` | ✅ | — | GitHub personal access token (`repo` read scope) |
| `GITHUB_REPO` | ✅ | — | Target repository in `owner/repo` format |
| `API_HOST` | ❌ | `localhost` | Host the REST server binds to |
| `API_PORT` | ❌ | `8000` | Port the REST server listens on |
| `DB_PATH` | ❌ | `./data/pr_doctor.json` | Path to the local TinyDB JSON file |

> **Security:** Never commit `.env`. See [`SECURITY.MD`](SECURITY.MD) for the full
> credential hygiene checklist required for this hackathon.

---

## Security

This repository is configured to prevent accidental credential exposure:

- **`.gitignore`** — excludes `.env`, session files, and common secret file patterns
- **`.bobignore`** — prevents the Bob AI assistant from reading or logging credential files
- **`SECURITY.MD`** — full guidelines on safe credential handling, what to do if a secret is accidentally committed, and how to use AI assistants safely

Always run `git diff --staged` before every commit to verify no secrets are staged.

---

## Dependencies (integration service)

| Package | Role |
|---|---|
| `PyGithub ≥ 2.3.0` | GitHub REST API client |
| `pydantic ≥ 2.7.0` | Data validation and serialisation |
| `pydantic-settings ≥ 2.3.0` | `.env` / environment config loading |
| `fastapi ≥ 0.111.0` | REST API framework |
| `uvicorn[standard] ≥ 0.30.0` | ASGI server |
| `tinydb ≥ 4.8.0` | Lightweight JSON file database |
| `typer ≥ 0.12.0` | CLI framework |
| `python-dotenv ≥ 1.0.0` | `.env` file loading |
