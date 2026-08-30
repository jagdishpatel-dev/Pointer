import { NextResponse } from 'next/server';
import {
  fetchIngestedPrs,
  ingestOpen,
  isIngestionUp,
  recordToItem,
  type GithubPrItemShape,
} from '@/lib/ingestion';

export interface GithubPRItem extends GithubPrItemShape {}

export async function GET() {
  // The pr-ingestion service is the single source of truth for PR data: it
  // fetches from GitHub with server-side credentials and stores records in a
  // local TinyDB. Listing reads straight from that store — it does not re-fetch
  // from GitHub on every request (that would block for tens of seconds).
  // To refresh the store, hit /api/github/ingest (triggered from /connect).
  if (!(await isIngestionUp())) {
    return NextResponse.json(
      {
        error: 'pr-ingestion service unavailable',
        detail:
          'Start the ingestion service with `pnpm run api:serve` (FastAPI on http://localhost:8000), configured with GITHUB_TOKEN and GITHUB_REPO.',
        needsToken: false,
      },
      { status: 503 },
    );
  }

  try {
    const records = await fetchIngestedPrs();
    const prs: GithubPRItem[] = records.map(recordToItem);
    return NextResponse.json(prs);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load PRs from pr-ingestion';
    return NextResponse.json({ error: message, detail: message, needsToken: false }, { status: 502 });
  }
}

/** Explicitly refresh the store by asking pr-ingestion to fetch open PRs. */
export async function POST() {
  if (!(await isIngestionUp())) {
    return NextResponse.json(
      { error: 'pr-ingestion service unavailable', detail: 'Run `pnpm run api:serve` first.', needsToken: false },
      { status: 503 },
    );
  }
  try {
    await ingestOpen(50);
    const records = await fetchIngestedPrs();
    const prs: GithubPRItem[] = records.map(recordToItem);
    return NextResponse.json(prs);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to ingest open PRs';
    return NextResponse.json({ error: message, detail: message, needsToken: false }, { status: 502 });
  }
}
