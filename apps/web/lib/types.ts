// PR Doctor — shared contracts.
// Every layer (API, BOB adapter, UI) speaks these types. Do not fork them.

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Decision = 'MERGE' | 'NEEDS_WORK' | 'BLOCK';
export type AgentId = 'code-analyst' | 'test-security' | 'docs-compliance' | 'orchestrator';
export type BobMode = 'Code' | 'Advanced' | 'Ask' | 'Orchestrator';
export type AgentStatus = 'pending' | 'running' | 'complete' | 'failed';

export interface FileChange {
  path: string;
  additions: number;
  deletions: number;
  /** Unified diff hunk. Shown verbatim as evidence — never paraphrase it. */
  diff: string;
}

export interface PRContext {
  id: string;
  number: number;
  title: string;
  author: string;
  branch: string;
  baseBranch: string;
  repo: string;
  description: string;
  filesChanged: FileChange[];
  createdAt: string;
}

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  file: string;
  line: number;
  agent: AgentId;
  /** Literally present in the diff or tool output. Quotable. */
  evidence: string;
  /** What the agent concluded. Explicitly NOT evidence. */
  inference: string;
  remediation: string;
  /** 0..1 — never used as proof, only as a hint about how hard to look. */
  confidence: number;
  /** Files this finding propagates to, via the dependency graph. */
  reaches: string[];
}

export interface AgentReport {
  agent: AgentId;
  displayName: string;
  mode: BobMode;
  status: AgentStatus;
  startedAtMs: number;
  durationMs: number;
  summary: string;
  findings: Finding[];
}

export interface AffectedNode {
  path: string;
  reason: string;
  hasTests: boolean;
  /** Hops from the changed file. 1 = direct caller. */
  distance: number;
  isTrustBoundary: boolean;
}

export interface BlastRadius {
  changedNode: string;
  affected: AffectedNode[];
  edges: { from: string; to: string }[];
  /** Graphify's own confidence in the graph, distinct from any agent's. */
  confidence: number;
}

export interface FinalVerdict {
  jobId: string;
  decision: Decision;
  confidence: number;
  rationale: string;
  /** Finding ids that actually drove the decision. */
  drivingFindings: string[];
  /** Recorded when specialists disagree. Empty array is fine. */
  disagreements: string[];
  context: PRContext;
  reports: AgentReport[];
  blastRadius: BlastRadius;
  decidedAt: string;
  /** True when served from fixtures rather than a live BOB run. */
  simulated: boolean;
}

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function allFindings(v: FinalVerdict): Finding[] {
  return v.reports
    .flatMap((r) => r.findings)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

export function findingById(v: FinalVerdict, id: string): Finding | undefined {
  return allFindings(v).find((f) => f.id === id);
}
