import { NextResponse } from 'next/server';
import { getJob } from '@/lib/job-store';
import { getFixtureVerdict } from '@/lib/bob-adapter';

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = getJob(jobId);

  // Unknown job (e.g. page reload) — serve fixture so the UI doesn't dead-end
  if (!job) {
    return NextResponse.json(getFixtureVerdict(jobId));
  }

  // Analysis still running — client should keep polling /api/job/[jobId]
  if (job.analysisStatus === 'pending' || job.analysisStatus === 'running') {
    return NextResponse.json({ error: 'Analysis still running', status: job.analysisStatus }, { status: 202 });
  }

  // Complete (success or failed with fixture fallback) — return stored verdict
  if (job.verdict) {
    return NextResponse.json(job.verdict);
  }

  // Should not reach here, but guard anyway
  return NextResponse.json(getFixtureVerdict(jobId));
}
