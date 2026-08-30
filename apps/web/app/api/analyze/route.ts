import { NextResponse } from 'next/server';
import { createJob, setJobRunning, setJobComplete, setJobFailed, setJobAnalysisError, TOTAL_ANIM_MS } from '@/lib/job-store';
import { analyzePR, getDemoContext } from '@/lib/bob-adapter';
import type { PRContext } from '@/lib/types';

export async function POST(request: Request) {
  let prUrl: string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prContext: any | undefined;
  try {
    const body = await request.json();

    prUrl = typeof body?.prUrl === 'string' ? body.prUrl : undefined;
    prContext = body?.prContext ?? undefined;

  } catch {
    // No body is fine — the demo CTA sends none.
  }

  const job = createJob(prUrl, prContext);
  const context: PRContext = prContext ?? getDemoContext();

  // Kick off analysis immediately in the background — do NOT await.
  // The poll endpoint (/api/job/[jobId]) and verdict endpoint (/api/verdict/[jobId])
  // read from the job store once it completes.
  setJobRunning(job.jobId);
  analyzePR(job.jobId, context)
    .then(verdict => {
  console.log('🔥 BOB VERDICT:', {
    simulated: verdict.simulated,
    context: verdict.context,
    findings: verdict.reports?.flatMap(r => r.findings ?? []).length,
  });

  setJobComplete(job.jobId, verdict);

  if (verdict.simulated && !process.env.DEMO_MODE) {
    setJobAnalysisError(
      job.jobId,
      'Live IBM BOB analysis failed (timeout or unusable output). Showing fallback data — this verdict is simulated.',
    );
  }
})
    .catch(err => setJobFailed(job.jobId, String(err)));

  return NextResponse.json({ jobId: job.jobId, estimatedMs: TOTAL_ANIM_MS });
}
