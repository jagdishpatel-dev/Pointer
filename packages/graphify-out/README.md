# `packages/graphify-out` — Graphify Graph Snapshot

Committed output of **IBM Graphify** run over the PR Doctor codebase. This snapshot is consumed by the web app (`apps/web`) to give IBM BOB 2.0 agents a dependency graph context when they analyse a pull request — letting them trace blast radius through real call relationships instead of guessing.

---

## What is Graphify?

IBM Graphify is a static analysis tool that reads a codebase, extracts symbols and their relationships (calls, imports, implements, references), and produces a weighted graph. The graph is then used to:

1. Find which symbols live in the files changed by a PR
2. Identify their 1-hop neighbours (callers, callees, related modules)
3. Group related symbols into semantic communities
4. Give agents a compact context packet so they can reason about **blast radius** without searching the entire codebase

---

## Snapshot stats (built 2026-08-29)

| Metric | Value |
|---|---|
| Nodes | 111 |
| Edges | 217 |
| Communities | 13 |
| Extraction quality | 89% extracted · 11% inferred · 0% ambiguous |
| Inferred edges (avg confidence) | 23 edges · 0.94 |
| Files indexed | 16 |

---

## Files in this package

| File | Description |
|---|---|
| `graph.json` | Full graph — nodes and edges. Consumed by `apps/web/lib/graphify.ts` |
| `GRAPH_REPORT.md` | Human-readable analysis: community hubs, god nodes, surprising connections, knowledge gaps |
| `manifest.json` | Per-file hashes used by Graphify to detect changes and avoid re-processing |
| `.graphify_labels.json` | Community ID → community name mapping |
| `.graphify_root` | Absolute path of the workspace root when the graph was built |
| `.graphify_python` | Python version used during the run |
| `cost.json` | Token usage for the Graphify run (0 for this offline snapshot) |

The `graph.json` file is also copied to `apps/web/fixtures/graphify-graph.json` — that copy is what the web app actually reads at runtime.

---

## Graph schema

### `graph.json`

```jsonc
{
  "nodes": [
    {
      "id": "string",              // stable unique identifier
      "label": "string",           // human-readable symbol name
      "source_file": "string",     // relative path of the file containing this symbol
      "source_location": "string", // line reference within the file
      "community_name": "string",  // semantic cluster this node belongs to
      "_callable": true            // true if this symbol is a function/method
    }
  ],
  "links": [
    {
      "source": "string",          // source node id
      "target": "string",          // target node id
      "relation": "string",        // e.g. "calls", "imports", "uses", "implements"
      "confidence": "string",      // "EXTRACTED" | "INFERRED" | "AMBIGUOUS"
      "confidence_score": 0.95,    // 0..1
      "context": "string",         // short description of why this edge exists
      "source_file": "string"      // file where this relationship was observed
    }
  ]
}
```

---

## Communities

The graph is partitioned into 13 semantic communities (4 thin ones omitted from the report). Each community groups symbols that are tightly related:

| ID | Name | Nodes |
|---|---|---|
| 0 | Integration Service Documentation | 23 |
| 1 | PR Ingestion Pipeline | 19 |
| 2 | CLI Command Layer | 15 |
| 3 | Settings and Storage | 9 |
| 4 | FastAPI REST Endpoints | 8 |
| 5 | PRRecord Data Models | 6 |
| 6 | PR Doctor Agent Subagents | 6 |
| 7 | API Ingest Endpoints | 5 |
| 8 | API Delete Endpoint | 4 |

---

## God nodes (most connected)

These are the core abstractions with the highest number of edges — modifying them has the widest blast radius:

| Symbol | Edges | Role |
|---|---|---|
| `PRRecord` | 16 | Central data model |
| `Settings` | 14 | Cross-community configuration bridge |
| `ingest_pr()` | 13 | Top-level ingestion entry point |
| `upsert_pr()` | 12 | Storage write operation |
| `list_open_prs()` | 10 | Bulk ingestion entry point |
| `get_settings()` | 9 | Singleton config accessor |
| `get_pr()` | 9 | Storage read operation |
| `list_prs()` | 9 | Storage list operation |
| `RiskLevel` | 8 | Risk classification enum |

---

## How the web app uses this graph

[`apps/web/lib/graphify.ts`](../apps/web/lib/graphify.ts) exposes two functions:

### `getGraphifyContext(changedFilePaths)`

Given the list of files changed in a PR, returns a `GraphifyContext` object:

```ts
{
  changedNodes:       // symbols that live in the changed files
  neighbours:         // 1-hop connections to/from those symbols
  touchedCommunities: // community names affected by the change
  graphStats:         // total nodes and edges in the graph
}
```

### `graphifyContextToPrompt(ctx)`

Serialises the context into a compact markdown block injected into every BOB prompt:

```
## Graphify Context Packet
Graph: 111 nodes · 217 edges

### Symbols in changed files
- `ingest_pr` at apps/integration/src/integration/ingestion/_legacy.py [PR Ingestion Pipeline]

### Direct connections (1 hop)
- changed --> `upsert_pr` (calls) in apps/integration/src/integration/storage.py
- changed --> `PRRecord` (uses) in apps/integration/src/integration/models.py

### Touched communities
- PR Ingestion Pipeline
- Settings and Storage
```

This context packet tells the agent exactly which symbols changed and what depends on them — without requiring the agent to read the entire codebase.

---

## Regenerating the snapshot

If you change the codebase significantly, regenerate the graph with IBM Graphify:

```bash
# From the repo root — requires the Graphify CLI to be installed and authenticated
graphify run --output packages/graphify-out

# After regenerating, sync the graph to the web app fixtures
cp packages/graphify-out/graph.json apps/web/fixtures/graphify-graph.json
```

Then validate that the web app still builds:

```bash
pnpm build
pnpm validate
```

---

## Key relationships (from `GRAPH_REPORT.md`)

**`Settings` is the cross-community bridge** — it connects the Settings and Storage community to PR Ingestion Pipeline, CLI Command Layer, FastAPI REST Endpoints, PRRecord Data Models, and Settings Configuration. Any change to `Settings` should be treated as high blast radius.

**`PRRecord` is the data contract** — it connects PRRecord Data Models to PR Ingestion Pipeline, CLI Command Layer, Settings and Storage, FastAPI REST Endpoints, and API Ingest Endpoints. It is the single most-referenced model in the codebase.

**No import cycles detected.**
