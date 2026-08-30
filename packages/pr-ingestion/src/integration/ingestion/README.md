# `integration.ingestion` — PR Fetching & Risk Analysis

The `ingestion` sub-package is the core engine of PR Doctor. It is responsible for
connecting to the GitHub API, pulling full pull-request data, running risk heuristics
over every changed file, and returning a structured `PRRecord` that the rest of the
application can store and serve.

---

## Package Structure

```
ingestion/
├── __init__.py      # Public API — exposes ingest_pr and list_open_prs
└── _legacy.py       # PyGithub-backed implementation of all ingestion logic
```

---

## Public API

The package exposes exactly two functions via [`__init__.py`](./__init__.py):

| Function | Signature | Description |
|---|---|---|
| `ingest_pr` | `(pr_number: int, settings: Settings) → PRRecord` | Fetch a single PR by number, run risk analysis, return a `PRRecord`. |
| `list_open_prs` | `(settings: Settings, limit: int = 50) → list[PRRecord]` | Fetch up to `limit` open PRs, run analysis on each, return all as a list. |

Both functions are synchronous and use **PyGithub** under the hood.

---

## `_legacy.py` — Implementation Detail

All logic lives in [`_legacy.py`](./_legacy.py). It is not imported directly anywhere
outside this package — always go through the `__init__.py` exports.

### Entry Points

#### `ingest_pr(pr_number, settings) → PRRecord`

End-to-end pipeline for a single PR:

```
GitHub API (PyGithub)
    └─ get_pull(pr_number)
         ├─ _parse_files()       → list[FileDiff]
         ├─ _detect_heuristics() → list[RiskHeuristic]
         ├─ _overall_risk()      → RiskLevel
         └─ PRRecord(...)        → returned to caller
```

1. Authenticates with `settings.github_token` via `Auth.Token`.
2. Opens the repo at `settings.github_repo` (`owner/repo` format).
3. Calls `repo.get_pull(pr_number)` to fetch the full PR object.
4. Passes it through the three internal helpers described below.
5. Returns a fully populated `PRRecord`.

#### `list_open_prs(settings, limit) → list[PRRecord]`

Calls `repo.get_pulls(state="open", sort="updated", direction="desc")`, slices to
`limit`, and calls `ingest_pr` on each PR number. Returns the list of all resulting
`PRRecord` objects.

---

### Internal Helpers

#### `_parse_files(gh_pr) → list[FileDiff]`

Iterates over `gh_pr.get_files()` (the GitHub API file list for the PR) and maps each
entry to a `FileDiff` model:

| Field | Source |
|---|---|
| `filename` | `f.filename` |
| `status` | `f.status` — one of `added`, `modified`, `removed`, `renamed` |
| `additions` | `f.additions` |
| `deletions` | `f.deletions` |
| `patch` | `f.patch` — raw unified diff text, may be `None` for binary files |

---

#### `_detect_heuristics(files) → list[RiskHeuristic]`

Scans every `FileDiff` and produces `RiskHeuristic` entries for any rule that fires.
Rules are evaluated in order; multiple rules can fire on the same file.

| Rule | Level | Trigger |
|---|---|---|
| `secret_pattern` | `CRITICAL` | Patch text matches a regex for common secret/credential patterns (password, token, api_key, etc.) |
| `large_diff` | `HIGH` | A single file has more than 500 added + deleted lines |
| `migration_file` | `HIGH` | Filename contains `migrat` (e.g. `0001_migrate_users.py`) |
| `config_change` | `MEDIUM` | A `.env`, `.cfg`, `.ini`, `.yaml`, `.yml`, `.toml`, or `.json` file was **modified** (not newly added) |
| `dependency_change` | `MEDIUM` | A dependency manifest was touched: `requirements*.txt`, `pyproject.toml`, `package.json`, `go.sum`, `Gemfile.lock` |
| `test_deletion` | `MEDIUM` | A test file (`test_*`, `*_test.*`, `spec.*`) was **removed** |
| `no_tests` | `LOW` | PR adds/modifies source files but no test files are present anywhere in the diff |

The secret-pattern regex (case-insensitive):
```
(password|passwd|secret|token|api_?key|private_?key|auth_?key|access_?key|secret_?key)\s*[:=]\s*\S+
```

---

#### `_overall_risk(heuristics) → RiskLevel`

Reduces the list of heuristics to a single worst-case `RiskLevel`:

```
CRITICAL  >  HIGH  >  MEDIUM  >  LOW
```

If no heuristics fired, returns `LOW`.

---

## Data Flow (end to end)

```
caller
  │
  ▼
ingest_pr(pr_number, settings)
  │
  ├─ Auth.Token(settings.github_token)
  ├─ Github(auth).get_repo(settings.github_repo)
  ├─ repo.get_pull(pr_number)          ← GitHub REST API
  │
  ├─ _parse_files(gh_pr)               ← list[FileDiff]
  ├─ _detect_heuristics(files)         ← list[RiskHeuristic]
  ├─ _overall_risk(heuristics)         ← RiskLevel
  │
  └─ PRRecord(id, repo, title, body, author, state,
              base_branch, head_branch,
              created_at, updated_at, merged_at,
              files, risk_heuristics, overall_risk,
              labels, review_comments, commits)
```

---

## Dependencies

| Package | Why |
|---|---|
| `PyGithub` | GitHub REST API client — authentication, repo/PR objects, file listing |
| `pydantic` | `FileDiff`, `RiskHeuristic`, `PRRecord` model validation |
| `re` (stdlib) | Secret pattern regex and filename rule matching |
