# Graph Report - Pointer-1  (2026-08-29)

## Corpus Check
- Corpus is ~30,522 words - fits in a single context window. You may not need a graph.

## Summary
- 111 nodes · 217 edges · 13 communities (9 shown, 4 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Integration Service Documentation
- PR Ingestion Pipeline
- CLI Command Layer
- Settings and Storage
- FastAPI REST Endpoints
- PRRecord Data Models
- PR Doctor Agent Subagents
- API Ingest Endpoints
- API Delete Endpoint
- Settings Configuration
- Integration Package Init
- Security and Credential Safety
- Package Metadata

## God Nodes (most connected - your core abstractions)
1. `PRRecord` - 16 edges
2. `Settings` - 14 edges
3. `ingest_pr()` - 13 edges
4. `upsert_pr()` - 12 edges
5. `list_open_prs()` - 10 edges
6. `get_settings()` - 9 edges
7. `get_pr()` - 9 edges
8. `list_prs()` - 9 edges
9. `RiskLevel` - 8 edges
10. `Integration Service (PR Doctor)` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Secret Pattern Regex` --semantically_similar_to--> `Security Subagent`  [INFERRED] [semantically similar]
  apps/integration/src/integration/ingestion/README.md → README.md
- `Credential Management Guidelines` --semantically_similar_to--> `Secret Pattern Regex`  [INFERRED] [semantically similar]
  SECURITY.MD → apps/integration/src/integration/ingestion/README.md
- `ingest_single()` --uses--> `PRRecord`  [INFERRED]
  apps/integration/src/integration/api.py → apps/integration/src/integration/models.py
- `ingest_open()` --uses--> `PRRecord`  [INFERRED]
  apps/integration/src/integration/api.py → apps/integration/src/integration/models.py
- `get_prs()` --uses--> `PRRecord`  [INFERRED]
  apps/integration/src/integration/api.py → apps/integration/src/integration/models.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **PR Ingestion Pipeline (ingest_pr → _parse_files → _detect_heuristics → _overall_risk → PRRecord)** — apps_integration_src_integration_ingestion_readme_ingest_pr, apps_integration_src_integration_ingestion_readme_parse_files, apps_integration_src_integration_ingestion_readme_detect_heuristics, apps_integration_src_integration_ingestion_readme_overall_risk, apps_integration_readme_prrecord [EXTRACTED 1.00]
- **PR Doctor Subagent Orchestration (Code-Change, Tester, Security, Documentation)** — readme_pr_doctor_agent, readme_code_change_subagent, readme_tester_subagent, readme_security_subagent, readme_documentation_subagent [EXTRACTED 1.00]
- **API and CLI Both Delegate to Ingestion Layer** — apps_integration_readme_api, apps_integration_readme_cli, apps_integration_readme_ingestion_package [INFERRED 0.95]

## Communities (13 total, 4 thin omitted)

### Community 0 - "Integration Service Documentation"
Cohesion: 0.14
Nodes (23): FastAPI REST API Module, Typer CLI Module, FileDiff Model, Ingestion Sub-package, Integration Service (PR Doctor), Data Models (Pydantic v2), PRRecord Model, RiskHeuristic Model (+15 more)

### Community 1 - "PR Ingestion Pipeline"
Cohesion: 0.16
Nodes (19): integration.ingestion package — public API., _detect_heuristics(), ingest_pr(), list_open_prs(), _overall_risk(), _parse_files(), PyGithub-backed ingestion functions., Fetch a single PR from GitHub and return a fully parsed PRRecord. (+11 more)

### Community 2 - "CLI Command Layer"
Cohesion: 0.19
Nodes (15): ingest(), ingest_open(), list_cmd(), Fetch and analyse a single PR, storing the result locally., Fetch and analyse all open PRs (up to limit)., Display a stored PR record as JSON., Start the FastAPI REST server., serve() (+7 more)

### Community 3 - "Settings and Storage"
Cohesion: 0.33
Nodes (9): Settings, _db(), delete_pr(), get_pr(), TinyDB-backed local storage for PRRecord objects., Retrieve a single PRRecord from local storage., Remove a PRRecord from storage. Returns True if removed., BaseSettings (+1 more)

### Community 4 - "FastAPI REST Endpoints"
Cohesion: 0.31
Nodes (8): get_prs(), get_single_pr(), health(), FastAPI REST API exposing ingested PR data and on-demand ingestion., List all stored PRs, optionally filtered by risk level., Retrieve a single stored PR by number., get, SettingsDep

### Community 5 - "PRRecord Data Models"
Cohesion: 0.33
Nodes (6): Any, PRRecord, Full ingested representation of a GitHub Pull Request., list_prs(), List all stored PRRecords, optionally filtered by risk level., _serialize()

### Community 6 - "PR Doctor Agent Subagents"
Cohesion: 0.33
Nodes (6): Code-Change Subagent, Documentation Subagent, Feature Graph (Graphify), PR Doctor Pull Request Agent, Security Subagent, Tester Subagent

### Community 7 - "API Ingest Endpoints"
Cohesion: 0.40
Nodes (5): ingest_open(), ingest_single(), Fetch PR *pr_number* from GitHub, analyse it, and store it locally., Fetch all open PRs (up to *limit*), analyse, and store them., post

### Community 8 - "API Delete Endpoint"
Cohesion: 0.50
Nodes (4): Delete a stored PR record., remove_pr(), delete, JSONResponse

## Knowledge Gaps
- **9 isolated node(s):** `pr-doctor-integration`, `Code-Change Subagent`, `Tester Subagent`, `Documentation Subagent`, `Feature Graph (Graphify)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Settings` connect `Settings and Storage` to `PR Ingestion Pipeline`, `CLI Command Layer`, `FastAPI REST Endpoints`, `PRRecord Data Models`, `Settings Configuration`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `PRRecord` connect `PRRecord Data Models` to `PR Ingestion Pipeline`, `CLI Command Layer`, `Settings and Storage`, `FastAPI REST Endpoints`, `API Ingest Endpoints`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `ingest_pr()` connect `PR Ingestion Pipeline` to `CLI Command Layer`, `Settings and Storage`, `FastAPI REST Endpoints`, `PRRecord Data Models`, `API Ingest Endpoints`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `PRRecord` (e.g. with `get_prs()` and `get_single_pr()`) actually correct?**
  _`PRRecord` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 7 inferred relationships involving `Settings` (e.g. with `ingest_pr()` and `list_open_prs()`) actually correct?**
  _`Settings` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `upsert_pr()` (e.g. with `PRRecord` and `Settings`) actually correct?**
  _`upsert_pr()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `list_open_prs()` (e.g. with `PRRecord` and `Settings`) actually correct?**
  _`list_open_prs()` has 2 INFERRED edges - model-reasoned connections that need verification._