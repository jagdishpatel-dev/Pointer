"""integration.ingestion package — public API."""

from integration.ingestion._legacy import ingest_pr, list_open_prs

__all__ = [
    "ingest_pr",
    "list_open_prs",
]
