// Client for the pr-ingestion FastAPI service (packages/pr-ingestion).
//
// The web app no longer talks to GitHub directly for PR data. Instead it proxies
// through this service, which is configured server-side with GITHUB_TOKEN and
// GITHUB_REPO, ingests PRs (POST /ingest, /ingest/bulk/open) and stores them in
// TinyDB, then serves them back (GET /prs, GET /prs/{n}).

export interface IngestionFileDiff {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string | null;
}

export interface IngestionRecord {
  id: number;
  repo: string;
  title: string;
  body: string | null;
  author: string;
  state: string;
  base_branch: string;
  head_branch: string;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  files: IngestionFileDiff[];
  risk_heuristics: { rule: string; description: string; level: string; file: string | null; line: number | null }[];
  overall_risk: string;
  labels: string[];
  review_comments: number;
  commits: number;
}

/** Base URL of the pr-ingestion service. Override with PR_INGEST_URL. */
export function ingestionBaseUrl(): string {
  return process.env.PR_INGEST_URL ?? 'http://localhost:8000';
}

/** Whether we should fall back to the service (proxy). The service is the source of truth. */
export async function isIngestionUp(): Promise<boolean> {
  try {
    const res = await fetch(`${ingestionBaseUrl()}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Ingest all open PRs (or a single one) so they appear in GET /prs. */
export async function ingestOpen(limit = 50): Promise<void> {
  const res = await fetch(`${ingestionBaseUrl()}/ingest/bulk/open?limit=${limit}`, { method: 'POST' });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Failed to ingest open PRs (${res.status}): ${detail}`);
  }
}

export async function ingestPr(number: number): Promise<void> {
  const res = await fetch(`${ingestionBaseUrl()}/ingest/${number}`, { method: 'POST' });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`pr-ingestion /ingest/${number} ${res.status}: ${detail}`);
  }
}

export async function fetchIngestedPrs(): Promise<IngestionRecord[]> {
  const res = await fetch(`${ingestionBaseUrl()}/prs`);
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`pr-ingestion /prs ${res.status}: ${detail}`);
  }
  return res.json();
}

export async function fetchIngestedPr(number: number): Promise<IngestionRecord> {
  const res = await fetch(`${ingestionBaseUrl()}/prs/${number}`);
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`pr-ingestion /prs/${number} ${res.status}: ${detail}`);
  }
  return res.json();
}

function sumAdditions(rec: IngestionRecord): number {
  return rec.files.reduce((s, f) => s + (f.additions || 0), 0);
}

function sumDeletions(rec: IngestionRecord): number {
  return rec.files.reduce((s, f) => s + (f.deletions || 0), 0);
}

export interface GithubPrItemShape {
  number: number;
  repo: string;
  title: string;
  author: string;
  authorAvatar: string;
  state: string;
  draft: boolean;
  branch: string;
  baseBranch: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  createdAt: string;
  updatedAt: string;
  body: string | null;
  labels: string[];
  reviewComments: number;
  commits: number;
  url: string;
}

export interface GithubPrDetailShape extends GithubPrItemShape {
  mergedAt: string | null;
  files: IngestionFileDiff[];
}

export function recordToItem(rec: IngestionRecord): GithubPrItemShape {
  return {
    number: rec.id,
    repo: rec.repo,
    title: rec.title,
    author: rec.author,
    authorAvatar: '',
    state: rec.state,
    draft: rec.state === 'open' && rec.title.toLowerCase().startsWith('draft'),
    branch: rec.head_branch,
    baseBranch: rec.base_branch,
    additions: sumAdditions(rec),
    deletions: sumDeletions(rec),
    changedFiles: rec.files.length,
    createdAt: rec.created_at,
    updatedAt: rec.updated_at,
    body: rec.body,
    labels: rec.labels ?? [],
    reviewComments: rec.review_comments ?? 0,
    commits: rec.commits ?? 0,
    url: `https://github.com/${rec.repo}/pull/${rec.id}`,
  };
}

export function recordToDetail(rec: IngestionRecord): GithubPrDetailShape {
  return {
    ...recordToItem(rec),
    mergedAt: rec.merged_at,
    files: rec.files ?? [],
  };
}
