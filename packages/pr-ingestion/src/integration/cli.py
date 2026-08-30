from __future__ import annotations

from typing import Optional

import typer
import uvicorn

from integration.ingestion import ingest_pr, list_open_prs
from integration.settings import get_settings
from integration.storage import get_pr, list_prs, upsert_pr

app = typer.Typer(help="PR Doctor – ingestion & analysis CLI")


@app.command()
def ingest(
    pr_number: int = typer.Argument(..., help="GitHub PR number to ingest"),
) -> None:
    """Fetch and analyse a single PR, storing the result locally."""
    settings = get_settings()
    typer.echo(f"Ingesting PR #{pr_number} from {settings.github_repo} …")
    record = ingest_pr(pr_number, settings)
    typer.echo(f"PR number: {pr_number}")
    upsert_pr(record, settings)
    typer.echo(f"✓  Risk: {record.overall_risk}  |  Heuristics: {len(record.risk_heuristics)}")
    if record.risk_heuristics:
        for h in record.risk_heuristics:
            typer.echo(f"   [{h.level}] {h.rule}: {h.description}")


@app.command("ingest-open")
def ingest_open(
    limit: int = typer.Option(20, help="Max number of open PRs to fetch"),
) -> None:
    """Fetch and analyse all open PRs (up to limit)."""
    settings = get_settings()
    typer.echo(f"Fetching up to {limit} open PRs from {settings.github_repo} …")
    records = list_open_prs(settings, limit=limit)
    for r in records:
        upsert_pr(r, settings)
        typer.echo(f"  PR #{r.id:4d} [{r.overall_risk:8s}] {r.title[:60]}")
    typer.echo(f"\n✓  Ingested {len(records)} PRs.")


@app.command()
def show(
    pr_number: int = typer.Argument(..., help="PR number to display"),
) -> None:
    """Display a stored PR record as JSON."""
    settings = get_settings()
    record = get_pr(pr_number, settings.github_repo, settings)
    if record is None:
        typer.echo(f"PR #{pr_number} not found. Run `ingest {pr_number}` first.", err=True)
        raise typer.Exit(1)
    typer.echo(record.model_dump_json(indent=2))


@app.command("list")
def list_cmd(
    risk: Optional[str] = typer.Option(None, help="Filter by risk level (low/medium/high/critical)"),
) -> None:
    """List all stored PRs."""
    settings = get_settings()
    records = list_prs(settings, risk_filter=risk)
    if not records:
        typer.echo("No PRs stored yet.")
        return
    for r in records:
        typer.echo(f"  #{r.id:4d} [{r.overall_risk:8s}] {r.author:20s}  {r.title[:55]}")


@app.command()
def serve(
    host: Optional[str] = typer.Option(None, help="Override API_HOST"),
    port: Optional[int] = typer.Option(None, help="Override API_PORT"),
) -> None:
    """Start the FastAPI REST server."""
    settings = get_settings()
    uvicorn.run(
        "integration.api:app",
        host=host or settings.api_host,
        port=port or settings.api_port,
        reload=True,
    )


if __name__ == "__main__":
    app()
