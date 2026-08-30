// Deterministic heuristic analysis over a real PR diff.
//
// This mirrors the risk rules in packages/pr-ingestion (secret patterns, large
// diffs, deleted tests, missing tests, config/dependency changes, migrations)
// but produces full Finding/AgentReport/FinalVerdict shapes from a PRContext so
// the investigation page always reflects the actual chosen PR — never a canned
// demo fixture. It runs without any external credentials.
import type {
  AgentId,
  AgentReport,
  BlastRadius,
  Decision,
  Finding,
  FinalVerdict,
  PRContext,
  Severity,
} from './types';
import { getGraphifyContext } from './graphify';

const SECRET_RE =
  /(password|passwd|secret|token|api_?key|private_?key|auth_?key|access_?key|secret_?key)\s*[:=]\s*\S+/i;

const CONFIG_RE = /\.(env|cfg|ini|yaml|yml|toml|json)$/;
const DEP_RE = /(requirements.*\.txt|pyproject\.toml|package\.json|go\.sum|Gemfile\.lock)$/;
const TEST_RE = /(test_|_test\.|spec\.)/;

interface RuleHit {
  rule: string;
  severity: Severity;
  title: string;
  file: string;
  line: number;
  evidence: string;
  inference: string;
  remediation: string;
  agent: AgentId;
  confidence: number;
}

const AGENT_DISPLAY: Record<AgentId, { displayName: string; mode: 'Code' | 'Advanced' | 'Ask' | 'Orchestrator' }> = {
  'code-analyst':    { displayName: 'Code Analyst',       mode: 'Code' },
  'test-security':   { displayName: 'Test & Security',    mode: 'Advanced' },
  'docs-compliance': { displayName: 'Documentation & Compliance', mode: 'Ask' },
  'orchestrator':    { displayName: 'PR Orchestrator',    mode: 'Orchestrator' },
};

/** Pull a line number out of a diff hunk header (`@@ -a +b @@` → hunk head). */
function firstLineNumber(diff: string): number {
  const m = /^@@[^@]*\+(\d+)/m.exec(diff ?? '');
  return m ? Number(m[1]) : 1;
}

/** Grab the first added line (`+`) verbatim as evidence, else a context line. */
function firstAddedLine(diff: string): string {
  const line = (diff ?? '').split('\n').find(l => l.startsWith('+') && !l.startsWith('+++'));
  if (line) return line.slice(1).trim();
  const ctx = (diff ?? '').split('\n').find(l => l.startsWith('-') && !l.startsWith('---'));
  return ctx ? ctx.slice(1).trim() : '';
}

function detectOnFile(f: PRContext['filesChanged'][number]): RuleHit[] {
  const hits: RuleHit[] = [];
  const name = f.path.toLowerCase();
  const patch = f.diff ?? '';

  if (patch && SECRET_RE.test(patch)) {
    const matched = SECRET_RE.exec(patch)?.[0] ?? '';
    hits.push({
      rule: 'secret_pattern',
      severity: 'critical',
      title: 'Possible secret or credential in the diff',
      file: f.path,
      line: firstLineNumber(patch),
      evidence: firstAddedLine(patch) || matched,
      inference:
        'A value that looks like a secret (password/token/api key) appears in the changed code. If committed, it can be harvested by scanners and exploited.',
      remediation:
        'Revoke the exposed value and move it to a secret store or environment variable. Never hardcode credentials; rotate if it already reached a remote.',
      agent: 'test-security',
      confidence: 0.9,
    });
  }

  if (f.additions + f.deletions > 500) {
    hits.push({
      rule: 'large_diff',
      severity: 'high',
      title: `Very large change — ${f.additions + f.deletions} lines`,
      file: f.path,
      line: 1,
      evidence: `${f.additions} additions / ${f.deletions} deletions in one file`,
      inference:
        'A single file changing this much is hard to review as one unit and often bundles unrelated behaviour, raising the chance a bug slips through.',
      remediation:
        'Split the change into smaller, reviewable PRs and add targeted tests for each behaviour shift.',
      agent: 'code-analyst',
      confidence: 0.8,
    });
  }

  if (/migrat/.test(name)) {
    hits.push({
      rule: 'migration_file',
      severity: 'high',
      title: 'Database migration modified',
      file: f.path,
      line: 1,
      evidence: `${f.path} is a migration file, ${f.additions}+/${f.deletions}-`,
      inference:
        'Changing a migration can alter schema or existing data. Past migrations are usually immutable once shipped — rewriting them can diverge deployed databases from fresh ones.',
      remediation:
        'Add a new forward migration instead of editing one that has shipped, and cover it with an up/down test.',
      agent: 'code-analyst',
      confidence: 0.85,
    });
  }

  if (CONFIG_RE.test(name)) {
    hits.push({
      rule: 'config_change',
      severity: 'medium',
      title: 'Configuration file changed',
      file: f.path,
      line: 1,
      evidence: `${f.path} modified (${f.additions}+ / ${f.deletions}-)`,
      inference:
        'Editing config can change runtime behaviour across environments. A value that is correct locally may not be for prod.',
      remediation:
        'Confirm the new value is intended for all environments, is not a secret, and is reflected in any checked-in example config.',
      agent: 'docs-compliance',
      confidence: 0.7,
    });
  }

  if (DEP_RE.test(name)) {
    hits.push({
      rule: 'dependency_change',
      severity: 'medium',
      title: 'Dependency manifest changed',
      file: f.path,
      line: 1,
      evidence: `${f.path} touched`,
      inference:
        'New or removed dependencies can introduce supply-chain risk, breaking builds, or behavioural changes at runtime.',
      remediation:
        'Pin exact versions, run a lockfile update, and verify the dependency is trusted and compatible across supported platforms.',
      agent: 'test-security',
      confidence: 0.75,
    });
  }

  if (TEST_RE.test(name) && f.deletions > 0 && f.additions === 0) {
    hits.push({
      rule: 'test_deletion',
      severity: 'medium',
      title: 'Test coverage removed',
      file: f.path,
      line: 1,
      evidence: `${f.path} lost ${f.deletions} lines of test coverage`,
      inference:
        'Removing test lines without replacing them shrinks coverage for the behaviour under change, making regressions easier to ship.',
      remediation:
        'Replace removed coverage with an equivalent test for the new behaviour before deleting old tests.',
      agent: 'test-security',
      confidence: 0.8,
    });
  }

  return hits;
}

/** `no_tests` — PR touches source but no test files anywhere in the diff. */
function noTestsFinding(ctx: PRContext): RuleHit | null {
  const touchedSource = ctx.filesChanged.some(f => f.additions > 0);
  const hasTest = ctx.filesChanged.some(f => TEST_RE.test(f.path.toLowerCase()));
  if (touchedSource && !hasTest) {
    return {
      rule: 'no_tests',
      severity: 'low',
      title: 'Source code changed with no tests in the PR',
      file: ctx.filesChanged[0]?.path ?? '',
      line: 1,
      evidence: `${ctx.filesChanged.length} file(s) changed, none a test file`,
      inference:
        'Behaviour changes without accompanying tests are not verified, so regressions can pass review unnoticed.',
      remediation:
        'Add at least one test exercising the changed path so the behaviour is pinned.',
      agent: 'test-security',
      confidence: 0.6,
    };
  }
  return null;
}

function toFinding(h: RuleHit, index: number): Finding {
  return {
    id: `${h.rule}_${index + 1}`,
    severity: h.severity,
    title: h.title,
    file: h.file,
    line: h.line,
    agent: h.agent,
    evidence: h.evidence || 'no direct diff line matched',
    inference: h.inference,
    remediation: h.remediation,
    confidence: h.confidence,
    reaches: [],
  };
}

const SEV_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/** Build the full verdict from the real PR context using heuristic rules. */
export function analyzeRealPR(jobId: string, context: PRContext): FinalVerdict {
  const startedAtMs = Date.now();

  const hits: RuleHit[] = [];
  context.filesChanged.forEach(f => hits.push(...detectOnFile(f)));
  const noTests = noTestsFinding(context);
  if (noTests) hits.push(noTests);

  // If the diff is genuinely clean, still surface a low-severity signal so the
  // investigation always has something real to show and never the demo.
  if (hits.length === 0) {
    hits.push({
      rule: 'no_op',
      severity: 'low',
      title: 'No risk signals detected in the diff',
      file: context.filesChanged[0]?.path ?? '',
      line: 1,
      evidence: `${context.filesChanged.length} file(s) changed with no heuristics triggered`,
      inference:
        'The heuristic scan found no secrets, huge diffs, deleted tests, missing tests, config or dependency changes.',
      remediation: 'Confirm a human review still reads the diff before merging.',
      agent: 'code-analyst',
      confidence: 0.5,
    });
  }

  const findings: Finding[] = hits.map(toFinding);

  // Partition findings by specialist agent.
  const byAgent = (id: AgentId) =>
    findings
      .filter(f => f.agent === id)
      .sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);

  const mkReport = (id: AgentId): AgentReport => ({
    agent: id,
    displayName: AGENT_DISPLAY[id].displayName,
    mode: AGENT_DISPLAY[id].mode,
    status: 'complete',
    startedAtMs,
    durationMs: Date.now() - startedAtMs,
    summary: `${AGENT_DISPLAY[id].displayName} reviewed the diff of ${context.repo} #${context.number}`,
    findings: byAgent(id),
  });

  const reports: AgentReport[] = [
    mkReport('code-analyst'),
    mkReport('test-security'),
    mkReport('docs-compliance'),
  ].filter(r => r.findings.length > 0);

  // Orchestrate the verdict from the worst finding.
  const worstKey = Math.min(...findings.map(f => SEV_RANK[f.severity]), SEV_RANK.low);
  const decision: Decision = worstKey <= SEV_RANK.critical ? 'BLOCK'
    : worstKey <= SEV_RANK.high ? 'BLOCK'
    : worstKey <= SEV_RANK.medium ? 'NEEDS_WORK'
    : 'MERGE';

  const driving = findings.filter(f => SEV_RANK[f.severity] <= SEV_RANK.medium);

  const rationale =
    driving.length > 0
      ? `${driving[0].title} in ${driving[0].file} drives the ${decision} decision. ` +
        `${driving.length} ${driving.length === 1 ? 'signal' : 'signals'} across ${reports.length} specialist area(s).`
      : 'No significant risk signals found; this change is low risk.';

  const changedPaths = context.filesChanged.map(f => f.path);
  const graphCtx = getGraphifyContext(changedPaths);
  const blastRadius: BlastRadius = {
    changedNode: changedPaths[0] ?? '',
    affected: graphCtx.neighbours.map((n, i) => ({
      path: n.file || `${n.id}${i}`,
      reason: `${n.relation} (${n.direction === 'out' ? 'calls' : 'called by'} changed symbol)`,
      hasTests: false,
      distance: 1,
      isTrustBoundary: false,
    })),
    edges: graphCtx.neighbours.map(n => ({ from: changedPaths[0] ?? '', to: n.file })),
    confidence: graphCtx.graphStats.totalNodes > 0 ? 0.85 : 0.5,
  };

  return {
    jobId,
    decision,
    confidence: decision === 'MERGE' ? 0.9 : 0.8,
    rationale,
    drivingFindings: driving.map(f => f.id),
    disagreements: [],
    context,
    reports,
    blastRadius,
    decidedAt: new Date().toISOString(),
    simulated: false,
  };
}
