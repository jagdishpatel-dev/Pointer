"""PyGithub-backed ingestion functions."""

from __future__ import annotations

import re
from typing import cast

from github import Auth, Github
from github.PullRequest import PullRequest as GHPullRequest

from integration.models import FileDiff, PRRecord, RiskHeuristic, RiskLevel
from integration.settings import Settings

_SECRET_RE = re.compile(
    r'(?i)(password|passwd|secret|token|api_?key|private_?key|auth_?key|access_?key|secret_?key)\s*[:=]\s*\S+'
)


def _detect_heuristics(files: list[FileDiff]) -> list[RiskHeuristic]:
    heuristics: list[RiskHeuristic] = []
    has_src = False
    has_test = False

    for f in files:
        name = f.filename.lower()

        if f.patch and _SECRET_RE.search(f.patch):
            heuristics.append(RiskHeuristic(
                rule="secret_pattern",
                description="Possible secret/token in diff",
                level=RiskLevel.CRITICAL,
                file=f.filename,
            ))

        if (f.additions + f.deletions) > 500:
            heuristics.append(RiskHeuristic(
                rule="large_diff",
                description=f"File has {f.additions + f.deletions} changed lines (>500)",
                level=RiskLevel.HIGH,
                file=f.filename,
            ))

        if re.search(r'migrat', name):
            heuristics.append(RiskHeuristic(
                rule="migration_file",
                description="Database migration file modified",
                level=RiskLevel.HIGH,
                file=f.filename,
            ))

        if re.search(r'\.(env|cfg|ini|yaml|yml|toml|json)$', name) and f.status != "added":
            heuristics.append(RiskHeuristic(
                rule="config_change",
                description="Configuration file modified",
                level=RiskLevel.MEDIUM,
                file=f.filename,
            ))

        if re.search(r'(requirements.*\.txt|pyproject\.toml|package\.json|go\.sum|Gemfile\.lock)$', name):
            heuristics.append(RiskHeuristic(
                rule="dependency_change",
                description="Dependency manifest modified",
                level=RiskLevel.MEDIUM,
                file=f.filename,
            ))

        if re.search(r'(test_|_test\.|spec\.)', name) and f.status == "removed":
            heuristics.append(RiskHeuristic(
                rule="test_deletion",
                description="Test file deleted",
                level=RiskLevel.MEDIUM,
                file=f.filename,
            ))

        if re.search(r'(test_|_test\.|spec\.)', name):
            has_test = True
        elif f.status in ("added", "modified") and f.additions > 0:
            has_src = True

    if has_src and not has_test:
        heuristics.append(RiskHeuristic(
            rule="no_tests",
            description="PR modifies/adds source code but no test files found",
            level=RiskLevel.LOW,
        ))

    return heuristics


def _overall_risk(heuristics: list[RiskHeuristic]) -> RiskLevel:
    if not heuristics:
        return RiskLevel.LOW
    order = [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL]
    levels = {h.level for h in heuristics}
    for lvl in reversed(order):
        if lvl in levels:
            return lvl
    return RiskLevel.LOW


def _parse_files(gh_pr: GHPullRequest) -> list[FileDiff]:
    return [
        FileDiff(
            filename=f.filename,
            status=f.status,
            additions=f.additions,
            deletions=f.deletions,
            patch=f.patch,
        )
        for f in gh_pr.get_files()
    ]


def ingest_pr(pr_number: int, settings: Settings) -> PRRecord:
    """Fetch a single PR from GitHub and return a fully parsed PRRecord."""
    auth = Auth.Token(settings.github_token)
    gh = Github(auth=auth)
    repo = gh.get_repo(settings.github_repo)
    gh_pr = repo.get_pull(pr_number)

    files = _parse_files(gh_pr)
    heuristics = _detect_heuristics(files)
    risk = _overall_risk(heuristics)

    return PRRecord(
        id=gh_pr.number,
        repo=settings.github_repo,
        title=gh_pr.title,
        body=gh_pr.body,
        author=gh_pr.user.login,
        state=gh_pr.state,
        base_branch=gh_pr.base.ref,
        head_branch=gh_pr.head.ref,
        created_at=gh_pr.created_at,
        updated_at=gh_pr.updated_at or gh_pr.created_at,
        merged_at=gh_pr.merged_at,
        files=files,
        risk_heuristics=heuristics,
        overall_risk=risk,
        labels=[lbl.name for lbl in gh_pr.labels],
        review_comments=gh_pr.review_comments,
        commits=gh_pr.commits,
    )


def list_open_prs(settings: Settings, limit: int = 50) -> list[PRRecord]:
    """Fetch all open PRs (up to *limit*) and return parsed records."""
    auth = Auth.Token(settings.github_token)
    gh = Github(auth=auth)
    repo = gh.get_repo(settings.github_repo)
    records: list[PRRecord] = []
    for gh_pr in repo.get_pulls(state="open", sort="updated", direction="desc")[:limit]:
        records.append(ingest_pr(cast(GHPullRequest, gh_pr).number, settings))
    return records
