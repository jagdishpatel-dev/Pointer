"""TinyDB-backed local storage for PRRecord objects."""

from __future__ import annotations

import os
from datetime import datetime
from typing import Any

from tinydb import Query, TinyDB
from tinydb.storages import JSONStorage
from tinydb.middlewares import CachingMiddleware

from integration.models import PRRecord
from integration.settings import Settings


def _db(settings: Settings) -> TinyDB:
    os.makedirs(os.path.dirname(os.path.abspath(settings.db_path)), exist_ok=True)
    return TinyDB(settings.db_path, storage=CachingMiddleware(JSONStorage))


def _serialize(record: PRRecord) -> dict[str, Any]:
    return record.model_dump(mode="json")


def upsert_pr(record: PRRecord, settings: Settings) -> None:
    """Insert or update a PRRecord keyed by (repo, id)."""
    db = _db(settings)
    PR = Query()
    db.upsert(
        _serialize(record),
        (PR.repo == record.repo) & (PR.id == record.id),
    )
    assert isinstance(db.storage, CachingMiddleware)
    db.storage.flush()


def get_pr(pr_number: int, repo: str, settings: Settings) -> PRRecord | None:
    """Retrieve a single PRRecord from local storage."""
    db = _db(settings)
    PR = Query()
    result = db.get((PR.repo == repo) & (PR.id == pr_number))
    if result is None:
        return None
    return PRRecord(**result)


def list_prs(settings: Settings, risk_filter: str | None = None) -> list[PRRecord]:
    """List all stored PRRecords, optionally filtered by risk level."""
    db = _db(settings)
    if risk_filter:
        PR = Query()
        rows = db.search(PR.overall_risk == risk_filter)
    else:
        rows = db.all()
    return [PRRecord(**row) for row in rows]


def delete_pr(pr_number: int, repo: str, settings: Settings) -> bool:
    """Remove a PRRecord from storage. Returns True if removed."""
    db = _db(settings)
    PR = Query()
    removed = db.remove((PR.repo == repo) & (PR.id == pr_number))
    assert isinstance(db.storage, CachingMiddleware)
    db.storage.flush()
    return bool(removed)
