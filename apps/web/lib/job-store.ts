// In-memory job store.
import type { AgentId, AgentStatus, FinalVerdict } from './types';

export interface JobProgress {
  agent: AgentId;
  status: AgentStatus;
  durationMs: number;
}

export type AnalysisStatus = 'pending' | 'running' | 'complete' | 'failed';

export interface Job {
  jobId: string;
  startedAt: number;
  prUrl?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prContext?: any;
  /** Real BOB analysis lifecycle */
  analysisStatus: AnalysisStatus;
  analysisStartedAt?: number;
  verdict?: FinalVerdict;
  analysisError?: string;
}

const jobs = new Map<string, Job>();

/** Staggered UI animation schedule — visual only, not tied to real BOB timing. */
export const AGENT_SCHEDULE: { agent: AgentId; startMs: number; endMs: number }[] = [
  { agent: 'docs-compliance', startMs: 400, endMs: 2740 },
  { agent: 'code-analyst', startMs: 400, endMs: 3520 },
  { agent: 'test-security', startMs: 400, endMs: 5270 },
  { agent: 'orchestrator', startMs: 5270, endMs: 6600 },
];

/** Visual animation total — kept for the progress bar animation only. */
export const TOTAL_ANIM_MS = 6600;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createJob(prUrl?: string, prContext?: any): Job {
  const job: Job = {
    jobId: `job_${Date.now().toString(36)}`,
    startedAt: Date.now(),
    prUrl,
    prContext,
    analysisStatus: 'pending',
  };
  jobs.set(job.jobId, job);
  return job;
}

export function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId);
}

export function setJobRunning(jobId: string): void {
  const job = jobs.get(jobId);
  if (job) { job.analysisStatus = 'running'; job.analysisStartedAt = Date.now(); }
}

export function setJobComplete(jobId: string, verdict: FinalVerdict): void {
  const job = jobs.get(jobId);
  if (job) { job.analysisStatus = 'complete'; job.verdict = verdict; }
}

export function setJobFailed(jobId: string, error: string): void {
  const job = jobs.get(jobId);
  if (job) { job.analysisStatus = 'failed'; job.analysisError = error; }
}

/** Record a non-fatal note (e.g. live analysis fell back to fixture) for the UI. */
export function setJobAnalysisError(jobId: string, error: string): void {
  const job = jobs.get(jobId);
  if (job) { job.analysisError = error; }
}

/** UI progress bars — animated against wall-clock time from job start. */
export function progressFor(job: Job, now = Date.now()): JobProgress[] {
  // If real analysis is complete, show all agents done
  if (job.analysisStatus === 'complete' || job.analysisStatus === 'failed') {
    return AGENT_SCHEDULE.map(({ agent, startMs, endMs }) => ({
      agent,
      status: 'complete' as AgentStatus,
      durationMs: endMs - startMs,
    }));
  }
  // Otherwise animate against time
  const elapsed = now - job.startedAt;
  return AGENT_SCHEDULE.map(({ agent, startMs, endMs }) => ({
    agent,
    status: (elapsed < startMs ? 'pending' : elapsed < endMs ? 'running' : 'complete') as AgentStatus,
    durationMs: endMs - startMs,
  }));
}

/** Job is done when real analysis finished (not the fake timer). */
export function isComplete(job: Job): boolean {
  return job.analysisStatus === 'complete' || job.analysisStatus === 'failed';
}
