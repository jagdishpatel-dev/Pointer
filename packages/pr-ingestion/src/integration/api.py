"""FastAPI REST API exposing ingested PR data and on-demand ingestion."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from github import Auth, Github

from integration.ingestion import ingest_pr, list_open_prs
from integration.models import PRRecord, RiskLevel
from integration.settings import Settings, get_settings
from integration.storage import delete_pr, get_pr, list_prs, upsert_pr

app = FastAPI(
    title="PR Doctor – Ingestion API",
    description="Fetch, analyse, and store GitHub PRs for pre-merge review.",
    version="0.1.0",
)


SettingsDep = Annotated[Settings, Depends(get_settings)]


# ── Health ───────────────────────────────────────────────────────────────────

@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}


# ── PR ingestion ─────────────────────────────────────────────────────────────

@app.post("/ingest/{pr_number}", response_model=PRRecord, tags=["ingestion"])
def ingest_single(pr_number: int, settings: SettingsDep) -> PRRecord:
    """Fetch PR *pr_number* from GitHub, analyse it, and store it locally."""
    record = ingest_pr(pr_number, settings)
    upsert_pr(record, settings)
    return record


@app.post("/ingest/bulk/open", response_model=list[PRRecord], tags=["ingestion"])
def ingest_open(
    settings: SettingsDep,
    limit: int = Query(default=50, ge=1, le=200),
) -> list[PRRecord]:
    """Fetch all open PRs (up to *limit*), analyse, and store them."""
    records = list_open_prs(settings, limit=limit)
    for r in records:
        upsert_pr(r, settings)
    return records


# ── PR queries ───────────────────────────────────────────────────────────────

@app.get("/prs", response_model=list[PRRecord], tags=["query"])
def get_prs(
    settings: SettingsDep,
    risk: RiskLevel | None = Query(default=None, description="Filter by risk level"),
) -> list[PRRecord]:
    """List all stored PRs, optionally filtered by risk level."""
    return list_prs(settings, risk_filter=risk.value if risk else None)


@app.get("/prs/{pr_number}", response_model=PRRecord, tags=["query"])
def get_single_pr(pr_number: int, settings: SettingsDep) -> PRRecord:
    """Retrieve a single stored PR by number."""
    record = get_pr(pr_number, settings.github_repo, settings)
    if record is None:
        raise HTTPException(status_code=404, detail=f"PR #{pr_number} not found in local store")
    return record


@app.delete("/prs/{pr_number}", tags=["query"])
def remove_pr(pr_number: int, settings: SettingsDep) -> JSONResponse:
    """Delete a stored PR record."""
    removed = delete_pr(pr_number, settings.github_repo, settings)
    if not removed:
        raise HTTPException(status_code=404, detail=f"PR #{pr_number} not found")
    return JSONResponse({"deleted": pr_number})
