import { NextResponse } from 'next/server';
import {
  fetchIngestedPr,
  ingestPr,
  isIngestionUp,
  recordToDetail,
  type GithubPrDetailShape,
  type IngestionFileDiff,
} from '@/lib/ingestion';

export interface GithubFileDiff extends IngestionFileDiff {}

export interface GithubPRDetail extends GithubPrDetailShape {}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params;
  const prNumber = Number(number);
  if (!Number.isInteger(prNumber)) {
    return NextResponse.json({ error: 'Invalid PR number' }, { status: 400 });
  }

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
    let rec;
    try {
      rec = await fetchIngestedPr(prNumber);
    } catch (err) {
      // Not yet ingested — ask the service to fetch this specific PR, then retry.
      const message = err instanceof Error ? err.message : '';
      if (!message.includes('404')) throw err;
      await ingestPr(prNumber);
      rec = await fetchIngestedPr(prNumber);
    }
    return NextResponse.json(recordToDetail(rec));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load PR detail';
    return NextResponse.json({ error: message, detail: message, needsToken: false }, { status: 502 });
  }
}
