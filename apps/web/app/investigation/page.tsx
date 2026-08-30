'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { AgentId, AgentStatus, BlastRadius, FinalVerdict, Finding, PRContext, Severity } from '@/lib/types';
import { allFindings } from '@/lib/types';
import type { GraphifyContext } from '@/lib/graphify';

interface JobProgress {
  agent: AgentId;
  status: AgentStatus;
  durationMs: number;
}

interface PollResponse {
  jobId: string;
  complete: boolean;
  analysisStatus: string;
  analysisError: string | null;
  progress: JobProgress[];
}

interface CachedInvestigation {
  jobId: string;
  progress: JobProgress[];
  verdict: FinalVerdict;
  // Raw snapshot of sessionStorage['pr-doctor:pr-context'] at the time this
  // investigation was cached. Used to detect "a new PR context has since
  // been set" without deleting the cache on every render.
  prContextRaw: string | null;
}

const AGENT_META: Record<AgentId, { displayName: string; mode: string }> = {
  'code-analyst':      { displayName: 'Code Analyst',                mode: 'Code' },
  'test-security':     { displayName: 'Test & Security',             mode: 'Advanced' },
  'docs-compliance':   { displayName: 'Documentation & Compliance',  mode: 'Ask' },
  'orchestrator':      { displayName: 'PR Orchestrator',             mode: 'Orchestrator' },
};

// Specialists only — orchestrator is not shown as a lane
const LANE_AGENTS: AgentId[] = ['code-analyst', 'test-security', 'docs-compliance'];

const DECISION_COLOR: Record<string, string> = {
  BLOCK:      '#B3261E',
  NEEDS_WORK: '#8A5A00',
  MERGE:      '#1F6B45',
};

const SEV_STYLE: Record<Severity, { color: string; borderColor: string; background: string }> = {
  critical: { color: '#B3261E', borderColor: '#B3261E', background: '#FBEDEC' },
  high:     { color: '#B3261E', borderColor: '#B3261E', background: 'transparent' },
  medium:   { color: '#8A5A00', borderColor: '#8A5A00', background: 'transparent' },
  low:      { color: '#68757F', borderColor: '#AEB8C0', background: 'transparent' },
};

function SeverityPill({ sev }: { sev: Severity }) {
  const s = SEV_STYLE[sev];
  return (
    <div style={{
      fontFamily: '"IBM Plex Mono", monospace',
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      padding: '3px 0',
      textAlign: 'center',
      border: '1px solid',
      color: s.color,
      borderColor: s.borderColor,
      background: s.background,
    }}>
      {sev}
    </div>
  );
}

function FindingRow({ f, agentLabel, jobId }: { f: Finding; agentLabel: string; jobId?: string | null }) {
  const href = jobId ? `/finding/${f.id}?job=${encodeURIComponent(jobId)}` : `/finding/${f.id}`;
  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '78px 1fr auto',
        gap: 16,
        alignItems: 'start',
        padding: '13px 0',
        borderTop: '1px solid #D2D8DD',
        cursor: 'pointer',
      }}>
        <SeverityPill sev={f.severity} />
        <div>
          <div style={{ fontWeight: 500, fontSize: 14, color: '#14181C' }}>{f.title}</div>
          <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12.5, color: '#68757F', marginTop: 2 }}>
            {f.file}:{f.line}
          </div>
        </div>
        <div style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 10.5,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#24408E',
          background: '#EDF0F8',
          padding: '3px 7px',
          whiteSpace: 'nowrap',
          alignSelf: 'start',
        }}>
          {agentLabel}
        </div>
      </div>
    </Link>
  );
}

// ── Graphify Panel ────────────────────────────────────────────────────────────

// The demo PR is acme/ledger-api (a TypeScript codebase). The committed graph
// snapshot was built on the apps/integration Python service — a different
// workspace intentionally included to show how Graphify works on a real repo.
// In a live deployment, Graphify would run on the target repo before analysis.
// We surface the graph stats and community map to explain the mechanism.
const DEMO_GRAPH_COMMUNITIES = [
  { name: 'PR Ingestion Pipeline', nodes: 22, description: 'ingest_pr → _parse_files → _detect_heuristics → PRRecord' },
  { name: 'CLI Command Layer', nodes: 18, description: 'ingest / ingest_open / list / serve commands' },
  { name: 'FastAPI REST Endpoints', nodes: 9, description: 'GET /prs · POST /ingest · DELETE /prs/{n}' },
  { name: 'Settings and Storage', nodes: 10, description: 'TinyDB-backed local store + BaseSettings' },
  { name: 'PRRecord Data Models', nodes: 6, description: 'PRRecord · FileDiff · RiskHeuristic · RiskLevel' },
  { name: 'PR Doctor Agent Subagents', nodes: 6, description: 'Code-Change · Tester · Security · Documentation' },
];

function GraphifyPanel() {
  const [ctx, setCtx] = useState<GraphifyContext | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/graphify')
      .then(r => r.json())
      .then(data => {
        if (!cancelled) setCtx(data);
      })
      .catch(() => { /* ignore — panel just won't render */ });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ctx) return null;

  return (
    <div style={{ padding: '20px 26px', borderTop: '1px solid #D2D8DD' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#68757F' }}>
          Graphify — dependency context fed to agents
        </div>
        <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: '#8A5A00', border: '1px dashed #8A5A00', padding: '2px 7px', background: '#FCF8EF' }}>
          Built on apps/integration workspace
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 32, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Graph nodes', value: ctx.graphStats.totalNodes },
          { label: 'Graph edges', value: ctx.graphStats.totalEdges },
          { label: 'Communities', value: DEMO_GRAPH_COMMUNITIES.length },
          { label: 'Extraction accuracy', value: '89%' },
          { label: 'Inferred edges', value: '23' },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#68757F', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontFamily: '"IBM Plex Sans Condensed", sans-serif', fontWeight: 700, fontSize: 26, lineHeight: 1, color: '#24408E' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* How it connects to the agents — the key demo talking point */}
      <div style={{ background: '#EDF0F8', border: '1px solid #AEB8C0', borderLeft: '4px solid #24408E', padding: '12px 16px', marginBottom: 20 }}>
        <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#24408E', marginBottom: 6 }}>
          How Graphify powers the agents
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#14181C' }}>
          Before each BOB agent runs, PR Doctor queries this graph for every changed file and extracts the 1-hop
          neighbour subgraph. That subgraph — symbols, call edges, and communities — is injected directly into
          the agent prompt. This is why Test &amp; Security could pinpoint <code style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, background: '#F6F8F9', border: '1px solid #D2D8DD', padding: '1px 4px' }}>billing/refund.ts:88</code> as
          the downstream blast radius: the graph told it to look there, not the diff.
        </div>
      </div>

      {/* Communities grid */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#68757F', marginBottom: 10 }}>
          Detected communities — structural map of the codebase
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 1, background: '#AEB8C0', border: '1px solid #AEB8C0' }}>
          {DEMO_GRAPH_COMMUNITIES.map(c => (
            <div key={c.name} style={{ background: '#FFFFFF', padding: '10px 14px' }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{c.name}</div>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10.5, color: '#68757F', marginBottom: 4 }}>{c.description}</div>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: '#24408E' }}>{c.nodes} nodes</div>
            </div>
          ))}
        </div>
      </div>

      {/* God nodes */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#68757F', marginBottom: 8 }}>
          God nodes — most connected (highest blast radius potential)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            { label: 'PRRecord', edges: 16 },
            { label: 'Settings', edges: 14 },
            { label: 'ingest_pr()', edges: 13 },
            { label: 'upsert_pr()', edges: 12 },
            { label: 'list_open_prs()', edges: 10 },
          ].map(n => (
            <div key={n.label} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F6F8F9', border: '1px solid #D2D8DD', padding: '4px 10px' }}>
              <code style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: '#14181C' }}>{n.label}</code>
              <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: '#B3261E' }}>{n.edges} edges</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14, fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#68757F', borderTop: '1px solid #D2D8DD', paddingTop: 10 }}>
        In production, Graphify runs on the target repo before analysis begins. The context packet is then injected
        into every agent prompt — no agent needs to grep the codebase; the graph does that work upfront.
      </div>
    </div>
  );
}

// ── Risk Graph ────────────────────────────────────────────────────────────────

const NODE_W = 180;
const NODE_H = 44;
const CHANGED_X = 20;
const COL1_X = 280;   // distance-1 nodes
const COL2_X = 520;   // distance-2 nodes
const ROW_SPACING = 70;
const SVG_H = 300;

function RiskGraph({ br }: { br: BlastRadius }) {
  // Assign Y positions: distance-1 nodes evenly spaced, distance-2 nodes beside their parent
  const d1 = br.affected.filter(n => n.distance === 1);
  const d2 = br.affected.filter(n => n.distance === 2);

  // Centre the distance-1 column vertically
  const totalD1Height = d1.length > 0 ? (d1.length - 1) * ROW_SPACING : 0;
  const d1StartY = (SVG_H - NODE_H - totalD1Height) / 2;

  const nodePos: Record<string, { x: number; y: number }> = {};

  // Changed node: vertically centred
  const changedCY = SVG_H / 2;
  nodePos[br.changedNode] = { x: CHANGED_X, y: changedCY - NODE_H / 2 };

  d1.forEach((n, i) => {
    nodePos[n.path] = { x: COL1_X, y: d1StartY + i * ROW_SPACING };
  });

  // d2 nodes: each sits beside its d1 parent via edges. Stack siblings of the
  // SAME parent below one another — the offset counter must be per-parent,
  // not global, or every distance-2 node past the first collapses onto the
  // same Y coordinate regardless of which parent it belongs to.
  const d2SiblingIndex: Record<string, number> = {};
  d2.forEach(n => {
    const parentEdge = br.edges.find(e => e.to === n.path && nodePos[e.from] && nodePos[e.from].x === COL1_X);
    const parentKey = parentEdge?.from ?? '__unparented__';
    const parentY = parentEdge ? nodePos[parentEdge.from].y : d1StartY;
    const siblingIdx = d2SiblingIndex[parentKey] ?? 0;
    nodePos[n.path] = { x: COL2_X, y: parentY + siblingIdx * ROW_SPACING * 0.6 };
    d2SiblingIndex[parentKey] = siblingIdx + 1;
  });

  // Caption values
  const noCoverage = br.affected.filter(n => !n.hasTests).length;
  const confPct = Math.round(br.confidence * 100);

  // Shorten a path for display: last two segments
  function shortName(path: string) {
    const parts = path.split('/');
    return parts.slice(-2).join('/');
  }

  const SVG_W = d2.length > 0 ? COL2_X + NODE_W + 20 : COL1_X + NODE_W + 20;

  return (
    <div>
      <svg
        width="100%"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img"
        aria-label={`Dependency graph: ${br.affected.length} files affected by change to ${shortName(br.changedNode)}`}
      >
        {/* Edges — drawn first so nodes sit on top */}
        {br.edges.map((e, i) => {
          const from = nodePos[e.from];
          const to = nodePos[e.to];
          if (!from || !to) return null;
          const x1 = from.x + NODE_W;
          const y1 = from.y + NODE_H / 2;
          const x2 = to.x;
          const y2 = to.y + NODE_H / 2;
          // dashed if destination has no tests
          const dest = br.affected.find(n => n.path === e.to);
          const dashed = dest && !dest.hasTests;
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#AEB8C0"
              strokeWidth="1.5"
              strokeDasharray={dashed ? '3 3' : undefined}
            />
          );
        })}

        {/* Changed node */}
        {(() => {
          const pos = nodePos[br.changedNode];
          const label = shortName(br.changedNode);
          return (
            <g key="changed">
              <rect x={pos.x} y={pos.y} width={NODE_W} height={NODE_H}
                fill="#FBEDEC" stroke="#B3261E" strokeWidth="2" />
              <text x={pos.x + NODE_W / 2} y={pos.y + 16}
                textAnchor="middle" fontFamily="IBM Plex Mono, monospace"
                fontSize="12" fontWeight="600" fill="#B3261E">{label}</text>
              <text x={pos.x + NODE_W / 2} y={pos.y + 30}
                textAnchor="middle" fontFamily="IBM Plex Mono, monospace"
                fontSize="10" fill="#8C1D18">changed</text>
            </g>
          );
        })()}

        {/* Affected nodes */}
        {br.affected.map(n => {
          const pos = nodePos[n.path];
          if (!pos) return null;
          const label = shortName(n.path);
          const noTests = !n.hasTests;
          const trustBorder = n.isTrustBoundary;
          const strokeW = trustBorder ? 2.5 : 1;

          if (noTests) {
            // dashed red outline, red fill wash
            return (
              <g key={n.path}>
                <rect x={pos.x} y={pos.y} width={NODE_W} height={NODE_H}
                  fill="#FBEDEC" stroke="#B3261E" strokeWidth={strokeW} strokeDasharray="5 3" />
                <text x={pos.x + NODE_W / 2} y={pos.y + 16}
                  textAnchor="middle" fontFamily="IBM Plex Mono, monospace"
                  fontSize="12" fontWeight="600" fill="#B3261E">{label}</text>
                <text x={pos.x + NODE_W / 2} y={pos.y + 30}
                  textAnchor="middle" fontFamily="IBM Plex Mono, monospace"
                  fontSize="10" fill="#8C1D18">no coverage</text>
              </g>
            );
          }

          return (
            <g key={n.path}>
              <rect x={pos.x} y={pos.y} width={NODE_W} height={NODE_H}
                fill="#FFFFFF" stroke="#AEB8C0" strokeWidth={strokeW} />
              <text x={pos.x + NODE_W / 2} y={pos.y + 16}
                textAnchor="middle" fontFamily="IBM Plex Mono, monospace"
                fontSize="12" fill="#14181C">{label}</text>
              <text x={pos.x + NODE_W / 2} y={pos.y + 30}
                textAnchor="middle" fontFamily="IBM Plex Mono, monospace"
                fontSize="10" fill="#68757F">tested</text>
            </g>
          );
        })}

        {/* Caption */}
        <text x="0" y={SVG_H - 8}
          fontFamily="IBM Plex Mono, monospace" fontSize="10.5" fill="#68757F">
          {br.affected.length} files reached · {noCoverage} without coverage · graph confidence {confPct}%
        </text>
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 12, fontSize: 12.5, color: '#68757F' }}>
        <span><strong style={{ fontWeight: 500, color: '#14181C' }}>Solid red</strong> — changed</span>
        <span><strong style={{ fontWeight: 500, color: '#14181C' }}>Dashed red</strong> — reached, no tests</span>
        <span><strong style={{ fontWeight: 500, color: '#14181C' }}>Grey</strong> — reached, covered</span>
      </div>
    </div>
  );
}

const SESSION_KEY = 'pr-doctor:investigation';
const PR_CONTEXT_KEY = 'pr-doctor:pr-context';

/**
 * Reads sessionStorage exactly once (called from a lazy useState initializer,
 * so it never re-runs on re-render and never runs as a render-time side
 * effect). Returns the current raw pr-context string plus a validated cached
 * investigation, if any — invalidating the cache only when the pr-context has
 * genuinely changed since it was cached, not merely because it exists.
 */
function readInitialState(): { prContextRaw: string | null; cached: CachedInvestigation | null } {
  if (typeof window === 'undefined') {
    return { prContextRaw: null, cached: null };
  }

  const prContextRaw = sessionStorage.getItem(PR_CONTEXT_KEY);

  let cached: CachedInvestigation | null = null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CachedInvestigation;
      // Only trust the cache if it was written for the same pr-context that's
      // currently staged. If a new PR context has been set since, the cached
      // investigation belongs to a different PR and must be discarded.
      if (parsed.prContextRaw === prContextRaw) {
        cached = parsed;
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
  } catch {
    // Corrupted cache — ignore it, don't crash the page.
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  }

  return { prContextRaw, cached };
}

export default function InvestigationPage() {
  // Computed once, on mount, via lazy initializer — not on every render.
  const initialRef = useRef<{ prContextRaw: string | null; cached: CachedInvestigation | null } | null>(null);
  if (initialRef.current === null) {
    initialRef.current = readInitialState();
  }
  const { prContextRaw: initialPrContextRaw, cached } = initialRef.current;

  const [prContext, setPrContext] = useState<PRContext | null>(() => {
    if (!initialPrContextRaw) return null;
    try {
      return JSON.parse(initialPrContextRaw) as PRContext;
    } catch {
      return null;
    }
  });

  const [jobId, setJobId] = useState<string | null>(cached?.jobId ?? null);
  const [progress, setProgress] = useState<JobProgress[]>(cached?.progress ?? []);
  const [verdict, setVerdict] = useState<FinalVerdict | null>(cached?.verdict ?? null);
  const [error, setError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Guards against React 18 StrictMode's dev-only double-invoke of effects.
  // A `cancelled` flag in the effect closure only stops the *state update*
  // after the fact — it does not stop the fetch() from firing a second time
  // and creating a second job server-side. This ref persists across the
  // mount → cleanup → mount replay (same component instance), so only the
  // very first invocation is ever allowed to call start().
  const hasStartedAnalysisRef = useRef(false);

  const allComplete = cached?.verdict != null;
  const [barWidths, setBarWidths] = useState<Record<AgentId, number>>({
    'code-analyst': allComplete ? 100 : 0,
    'test-security': allComplete ? 100 : 0,
    'docs-compliance': allComplete ? 100 : 0,
    'orchestrator': allComplete ? 100 : 0,
  });

  // Animate running bars
  useEffect(() => {
    const tick = setInterval(() => {
      setBarWidths(prev => {
        const next = { ...prev };
        progress.forEach(p => {
          if (p.status === 'running') {
            next[p.agent] = Math.min((next[p.agent] ?? 0) + 2, 92);
          } else if (p.status === 'complete') {
            next[p.agent] = 100;
          }
        });
        return next;
      });
    }, 80);
    return () => clearInterval(tick);
  }, [progress]);

  // Start analysis on mount — skip if we already have a valid cached verdict.
  useEffect(() => {
    if (cached?.verdict) return;

    if (!prContext) {
      setError('No PR context found. Go back and start a new investigation.');
      return;
    }

    // Block the replayed invocation from StrictMode's dev double-mount.
    // Without this, both invocations pass the checks above and both call
    // start(), posting to /api/analyze twice and creating two jobs.
    if (hasStartedAnalysisRef.current) return;
    hasStartedAnalysisRef.current = true;

    async function start() {
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prContext }),
        });

        if (!res.ok) {
          throw new Error(`Failed to start analysis: ${res.status}`);
        }

        const data = await res.json();
        setJobId(data.jobId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error starting analysis');
        // Allow a retry (e.g. user navigates back and returns) since this
        // attempt failed before ever getting a jobId.
        hasStartedAnalysisRef.current = false;
      }
    }

    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll once we have a jobId — skip if verdict already cached.
  useEffect(() => {
    if (!jobId || verdict) return;
    const currentJobId = jobId;

    async function poll() {
      try {
        const res = await fetch(`/api/job/${encodeURIComponent(currentJobId)}`);
        if (!res.ok) return;
        const data: PollResponse = await res.json();
        setProgress(data.progress);
        setAnalysisError(data.analysisError);

        if (data.complete) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;

          const vRes = await fetch(`/api/verdict/${currentJobId}`);
          if (!vRes.ok) return;
          const v: FinalVerdict = await vRes.json();
          setVerdict(v);

          // Persist so back-navigation restores the completed state — tagged
          // with the pr-context it was computed from, so a later, different
          // pr-context correctly invalidates this cache instead of the cache
          // invalidating itself on the next render.
          try {
            const cachePayload: CachedInvestigation = {
              jobId: currentJobId,
              progress: data.progress,
              verdict: v,
              prContextRaw: initialPrContextRaw,
            };
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(cachePayload));
          } catch { /* storage full — ignore */ }
        }
      } catch {
        // silently retry
      }
    }

    poll(); // immediate first tick
    intervalRef.current = setInterval(poll, 800);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId, verdict, initialPrContextRaw]);

  const visibleFindings: Finding[] = verdict ? allFindings(verdict) : [];
  const isRunning = !verdict && !error && progress.length > 0;
  const decisionColor = verdict ? (DECISION_COLOR[verdict.decision] ?? '#14181C') : '#14181C';

  return (
    <div style={{ background: '#E9ECEF', minHeight: '100vh', fontFamily: '"IBM Plex Sans", system-ui, sans-serif', color: '#14181C', padding: '28px 20px 80px' }}>
      <div style={{ maxWidth: 1060, margin: '0 auto' }}>

        {/* Analysis mode chip */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          marginBottom: 18,
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          ...(verdict?.simulated === false
            ? { color: '#1F6B45', border: '1px solid #1F6B45', padding: '5px 10px', background: '#E9F2EC' }
            : { color: '#8A5A00', border: '1px dashed #8A5A00', padding: '5px 10px', background: '#FCF8EF' }
          ),
        }}>
          {verdict?.simulated === false
            ? 'Live IBM BOB 2.0 analysis'
            : analysisError
              ? 'Live analysis unavailable — showing fallback data'
              : verdict
                ? 'Demo mode — fixture data (BOB not available)'
                : 'Analyzing…'}
        </div>

        {/* Live-run fallback note — only when a real analysis degraded to fixture */}
        {analysisError && verdict && (
          <div style={{ background: '#FCF8EF', border: '1px solid #8A5A00', padding: '12px 20px', marginBottom: 20, fontFamily: '"IBM Plex Mono", monospace', fontSize: 12.5, color: '#8A5A00' }}>
            {analysisError}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{ background: '#FBEDEC', border: '1px solid #B3261E', padding: '14px 20px', marginBottom: 20, fontFamily: '"IBM Plex Mono", monospace', fontSize: 13, color: '#B3261E' }}>
            {error}
          </div>
        )}

        {/* Verdict triage tag — shown only after verdict arrives */}
        {verdict && (
          <div style={{
            position: 'relative',
            background: '#FFFFFF',
            border: '1px solid #AEB8C0',
            borderLeft: `8px solid ${decisionColor}`,
            padding: '22px 26px 22px 30px',
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            gap: 26,
            alignItems: 'center',
            marginBottom: 0,
          }}>
            <div style={{
              fontFamily: '"IBM Plex Sans Condensed", sans-serif',
              fontWeight: 700,
              fontSize: 52,
              lineHeight: 0.9,
              letterSpacing: '-0.01em',
              color: decisionColor,
              border: `3px solid ${decisionColor}`,
              padding: '8px 16px 10px',
              transform: 'rotate(-1.5deg)',
            }}>
              {verdict.decision}
            </div>
            <div>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#68757F', marginBottom: 6 }}>
                Orchestrator verdict · IBM BOB 2.0
              </div>
              <div style={{ fontSize: 14.5, maxWidth: '48ch' }}>{verdict.rationale}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#68757F' }}>Confidence</div>
              <div style={{ fontFamily: '"IBM Plex Sans Condensed", sans-serif', fontWeight: 700, fontSize: 34, lineHeight: 1 }}>
                {Math.round(verdict.confidence * 100)}%
              </div>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#68757F' }}>not evidence</div>
            </div>
          </div>
        )}

        {/* Chart body */}
        <div style={{ background: '#FFFFFF', border: '1px solid #AEB8C0', borderTop: verdict ? 0 : '1px solid #AEB8C0' }}>

          {/* PR identity */}
          {verdict && (
            <div style={{ padding: '14px 26px', borderBottom: '1px solid #D2D8DD' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 22px', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 600, fontSize: 17 }}>{verdict.context.title}</span>
                <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 13, color: '#68757F' }}>
                  {verdict.context.repo} · PR #{verdict.context.number} · {verdict.context.author}
                </span>
              </div>
            </div>
          )}

          {/* Agent lanes */}
          <div style={{ padding: '20px 26px', borderBottom: '1px solid #D2D8DD' }}>
            <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#68757F', marginBottom: 14 }}>
              Specialists — parallel investigation
            </div>

            {LANE_AGENTS.map(agentId => {
              const meta = AGENT_META[agentId];
              const prog = progress.find(p => p.agent === agentId);
              const status: AgentStatus = prog?.status ?? 'pending';
              const width = barWidths[agentId] ?? 0;

              const findingCount = verdict
                ? verdict.reports.find(r => r.agent === agentId)?.findings.length ?? 0
                : 0;

              return (
                <div key={agentId} style={{ display: 'grid', gridTemplateColumns: '190px 1fr 78px', gap: 14, alignItems: 'center', padding: '7px 0' }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>
                    {meta.displayName}
                    <span style={{ display: 'block', fontFamily: '"IBM Plex Mono", monospace', fontSize: 10.5, color: '#24408E', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {meta.mode}
                    </span>
                  </div>
                  <div style={{ position: 'relative', height: 12, background: '#F1F3F5', border: '1px solid #D2D8DD' }}>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      background: '#24408E',
                      opacity: 0.85,
                      width: `${width}%`,
                      transition: status === 'running' ? 'none' : 'width 0.9s cubic-bezier(.2,.7,.3,1)',
                    }} />
                  </div>
                  <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: '#68757F', textAlign: 'right' }}>
                    {status === 'pending' && '—'}
                    {status === 'running' && (
                      <span style={{ color: '#24408E' }}>running</span>
                    )}
                    {status === 'complete' && prog && (
                      <span>
                        {(prog.durationMs / 1000).toFixed(1)}s
                        {findingCount > 0 && <span style={{ display: 'block', color: '#B3261E' }}>{findingCount} findings</span>}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Orchestrator row */}
            {(() => {
              const orchMeta = AGENT_META['orchestrator'];
              const orchProg = progress.find(p => p.agent === 'orchestrator');
              const orchStatus: AgentStatus = orchProg?.status ?? 'pending';
              const orchWidth = barWidths['orchestrator'] ?? 0;
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr 78px', gap: 14, alignItems: 'center', padding: '7px 0', borderTop: '1px solid #D2D8DD', marginTop: 6 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>
                    {orchMeta.displayName}
                    <span style={{ display: 'block', fontFamily: '"IBM Plex Mono", monospace', fontSize: 10.5, color: '#24408E', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {orchMeta.mode}
                    </span>
                  </div>
                  <div style={{ position: 'relative', height: 12, background: '#F1F3F5', border: '1px solid #D2D8DD' }}>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      background: '#14181C',
                      opacity: 0.85,
                      width: `${orchWidth}%`,
                      transition: orchStatus === 'running' ? 'none' : 'width 0.9s cubic-bezier(.2,.7,.3,1)',
                    }} />
                  </div>
                  <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: '#68757F', textAlign: 'right' }}>
                    {orchStatus === 'pending' && '—'}
                    {orchStatus === 'running' && <span style={{ color: '#24408E' }}>running</span>}
                    {orchStatus === 'complete' && orchProg && `${(orchProg.durationMs / 1000).toFixed(1)}s`}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Findings — only ever populated once the full verdict lands; the
              backend has no per-agent findings endpoint, so we don't pretend
              to show a progressive reveal that doesn't exist. */}
          {(verdict || isRunning) && (
            <div style={{ padding: '20px 26px' }}>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#68757F', marginBottom: 4 }}>
                {verdict
                  ? `Findings — ${visibleFindings.length} total, highest severity first`
                  : 'Findings — investigating…'}
              </div>
              {visibleFindings.map((f, i) => {
                const agentLabel = verdict?.reports.find(r => r.findings.some(ff => ff.id === f.id))?.displayName ?? f.agent;
                return (
                  <div key={f.id} style={{ borderTop: i === 0 ? 'none' : undefined }}>
                    <FindingRow f={f} agentLabel={agentLabel} jobId={jobId} />
                  </div>
                );
              })}
              {!verdict && (
                <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: '#68757F', padding: '10px 0' }}>
                  Findings will appear once every specialist and the orchestrator have finished.
                </div>
              )}
            </div>
          )}

          {/* Loading state — no data yet */}
          {!verdict && progress.length === 0 && !error && (
            <div style={{ padding: '32px 26px', fontFamily: '"IBM Plex Mono", monospace', fontSize: 13, color: '#68757F' }}>
              Starting investigation…
            </div>
          )}

          {/* Blast radius — shown after verdict */}
          {verdict && (
            <div style={{ padding: '20px 26px', borderTop: '1px solid #D2D8DD' }}>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#68757F', marginBottom: 14 }}>
                Blast radius — Graphify
              </div>
              <RiskGraph br={verdict.blastRadius} />
            </div>
          )}

          {/* Graphify context panel — shown after verdict */}
          {verdict && <GraphifyPanel />}
        </div>

        {/* Back link */}
        <div style={{ marginTop: 20 }}>
          <Link href="/" style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: '#68757F', textDecoration: 'none', letterSpacing: '0.04em' }}>
            &larr; Back
          </Link>
        </div>

      </div>
    </div>
  );
}