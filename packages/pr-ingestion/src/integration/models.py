"""Pydantic models for PR Doctor data layer."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class FileDiff(BaseModel):
    """Parsed diff for a single file inside a PR."""

    filename: str
    status: str  # added | modified | removed | renamed
    additions: int = 0
    deletions: int = 0
    patch: str | None = None  # raw unified diff text


class RiskHeuristic(BaseModel):
    """A single risk signal detected in the PR."""

    rule: str
    description: str
    level: RiskLevel
    file: str | None = None
    line: int | None = None


class PRRecord(BaseModel):
    """Full ingested representation of a GitHub Pull Request."""

    model_config = ConfigDict(use_enum_values=True)

    id: int = Field(..., description="GitHub PR number")
    repo: str
    title: str
    body: str | None = None
    author: str
    state: str  # open | closed | merged
    base_branch: str
    head_branch: str
    created_at: datetime
    updated_at: datetime
    merged_at: datetime | None = None
    files: list[FileDiff] = Field(default_factory=list)
    risk_heuristics: list[RiskHeuristic] = Field(default_factory=list)
    overall_risk: RiskLevel = RiskLevel.LOW
    labels: list[str] = Field(default_factory=list)
    review_comments: int = 0
    commits: int = 0
