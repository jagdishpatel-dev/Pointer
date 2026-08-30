// The only place that talks to IBM BOB. Everything else imports runAnalysis().
//
// DEMO_MODE=fixture short-circuits to committed data. Keep that path working:
// it is the fallback if a live call fails on stage.
import fixture from '../fixtures/demo-pr.json';
import type { AgentReport, FinalVerdict, PRContext } from './types';
import { analyzeRealPR } from './heuristic-analysis';
import { getGraphifyContext, graphifyContextToPrompt } from './graphify';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const execFile = promisify(execFileCb);

const demoVerdict = fixture as unknown as FinalVerdict;

export function getFixtureVerdict(jobId: string): FinalVerdict {
  return { ...demoVerdict, jobId };
}

export function getDemoContext(): PRContext {
  return demoVerdict.context;
}

// ── BOB invocation ──────────────────────────────────────────────────────────

interface BobRunOptions {
  mode: string;
  maxCost?: number;
  maxTurns?: number;
  timeoutMs?: number;
}

async function runBob(prompt: string, opts: BobRunOptions): Promise<string> {
  const { stdout } = await execFile(
    'bob',
    [
      'run',
      '--trust',
      '--accept-license',
      '--format', 'json',
      '--mode', opts.mode,
      '--max-cost', String(opts.maxCost ?? 3),
      '--max-turns', String(opts.maxTurns ?? 10),
      prompt,
    ],
    {
      timeout: opts.timeoutMs ?? 120_000,
      maxBuffer: 10 * 1024 * 1024,
      cwd: process.cwd(),
      env: process.env,
    },
  );

  const envelope = JSON.parse(stdout.trim());
  if (envelope.status !== 'success') {
    throw new Error(`bob run status=${envelope.status}`);
  }

  console.log('[bob-adapter] mode=%s duration_ms=%d costs=%s',
    opts.mode,
    envelope.stats?.duration_ms,
    JSON.stringify(envelope.stats?.session_costs));

  // Strip possible ``` fences that some models add
  return (envelope.last_message as string)
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

function readPrompt(filename: string): string {
  return readFileSync(join(process.cwd(), 'prompts', filename), 'utf8');
}

// ── Agent runners ───────────────────────────────────────────────────────────

async function runSpecialist(
  role: 'code-analyst' | 'test-security' | 'docs-compliance',
  context: PRContext,
  graphPrompt: string,
): Promise<AgentReport> {
  const promptFiles: Record<string, { file: string; mode: string; name: string }> = {
    'code-analyst':   { file: '01-code-analyst.md',   mode: 'code',     name: 'Code Analyst' },
    'test-security':  { file: '02-test-security.md',  mode: 'advanced', name: 'Test & Security' },
    'docs-compliance':{ file: '03-docs-compliance.md', mode: 'ask',      name: 'Docs & Compliance' },
  };

  const { file, mode, name } = promptFiles[role];
  const preamble = readPrompt('00-shared-preamble.md');
  const rolePrompt = readPrompt(file);

  const prompt =
    preamble + '\n\n' +
    rolePrompt + '\n\n' +
    graphPrompt + '\n\n' +
    'PR CONTEXT:\n' + JSON.stringify(context, null, 2) + '\n\n' +
    'Return ONLY valid JSON matching AgentReport. No prose. No markdown fences.';

  const startedAtMs = Date.now();
  const raw = await runBob(prompt, { mode, maxCost: 3, maxTurns: 10 });
  const durationMs = Date.now() - startedAtMs;

  const report: AgentReport = JSON.parse(raw);

  // Validate shape
  if (!report.agent || !report.findings || !Array.isArray(report.findings)) {
    throw new Error(`[${role}] response failed shape validation`);
  }

  return {
    ...report,
    agent: role,
    displayName: name,
    status: 'complete',
    startedAtMs,
    durationMs,
  };
}

async function runOrchestrator(
  reports: AgentReport[],
  context: PRContext,
): Promise<Omit<FinalVerdict, 'jobId' | 'context' | 'reports' | 'blastRadius' | 'decidedAt' | 'simulated'>> {
  const orchestratorPrompt = readPrompt('04-orchestrator.md');

  const prompt =
    orchestratorPrompt + '\n\n' +
    'SPECIALIST REPORTS:\n' + JSON.stringify(reports, null, 2) + '\n\n' +
    'PR TITLE: ' + context.title + '\n' +
    'PR REPO: ' + context.repo + '\n\n' +
    'Return ONLY valid JSON with keys: decision, confidence, rationale, drivingFindings, disagreements. ' +
    'No prose. No markdown fences.';

  const raw = await runBob(prompt, { mode: 'orchestrator', maxCost: 2, maxTurns: 6 });
  return JSON.parse(raw);
}

// ── Main entry point ────────────────────────────────────────────────────────

/**
 * Run the full 4-agent analysis pipeline against a real PR context.
 * Returns a FinalVerdict. Never throws — on failure returns the fixture verdict
 * with simulated:true so the caller always gets a usable result.
 */
export async function analyzePR(jobId: string, context: PRContext): Promise<FinalVerdict> {
  // A real PR was chosen → analyze its actual data deterministically. This never
  // shows the canned demo fixture, runs without credentials, and is fast.
  if (context && context.id !== getDemoContext().id) {
    return analyzeRealPR(jobId, context);
  }

  if (process.env.DEMO_MODE === 'fixture') {
    // No PR chosen (demo CTA) → serve the fixture verbatim.
    return getFixtureVerdict(jobId);
  }

  const startMs = Date.now();

  try {
    // Build graphify context once — shared across all three specialists
    const changedPaths = context.filesChanged.map(f => f.path);
    const graphCtx = getGraphifyContext(changedPaths);
    const graphPrompt = graphifyContextToPrompt(graphCtx);

    // Run three specialists in parallel
    console.log('[bob-adapter] starting 3 specialists in parallel for job=%s pr=%s', jobId, context.repo);
    const [codeAnalyst, testSecurity, docsCompliance] = await Promise.all([
      runSpecialist('code-analyst',    context, graphPrompt),
      runSpecialist('test-security',   context, graphPrompt),
      runSpecialist('docs-compliance', context, graphPrompt),
    ]);

    const specialistReports = [codeAnalyst, testSecurity, docsCompliance];

    // Orchestrator weighs all three and issues the verdict
    console.log('[bob-adapter] running orchestrator for job=%s', jobId);
    const orchestration = await runOrchestrator(specialistReports, context);

    // Build blast radius from graphify context
    const blastRadius = {
      changedNode: changedPaths[0] ?? '',
      affected: graphCtx.neighbours.map(n => ({
        path: n.file,
        reason: `${n.relation} (${n.direction === 'out' ? 'calls' : 'called by'} changed symbol)`,
        hasTests: false,
        distance: 1,
        isTrustBoundary: false,
      })),
      edges: graphCtx.neighbours.map(n => ({
        from: changedPaths[0] ?? '',
        to: n.file,
      })),
      confidence: graphCtx.graphStats.totalNodes > 0 ? 0.85 : 0.5,
    };

    const verdict: FinalVerdict = {
      jobId,
      decision: orchestration.decision ?? 'NEEDS_WORK',
      confidence: orchestration.confidence ?? 0.7,
      rationale: orchestration.rationale ?? '',
      drivingFindings: orchestration.drivingFindings ?? [],
      disagreements: orchestration.disagreements ?? [],
      context,
      reports: specialistReports,
      blastRadius,
      decidedAt: new Date().toISOString(),
      simulated: false,
    };

    console.log('[bob-adapter] analysis complete job=%s decision=%s elapsed_ms=%d',
      jobId, verdict.decision, Date.now() - startMs);

    return verdict;

  } catch (err) {
    console.error('[bob-adapter] live analysis failed for job=%s — falling back to fixture:', jobId, err);
    // Return fixture but keep the real PR context so the UI shows the PR the
    // user picked, not the demo one. Flagged so the UI labels it as a fallback.
    return {
      ...getFixtureVerdict(jobId),
      context,
      simulated: true,
    };
  }
}
