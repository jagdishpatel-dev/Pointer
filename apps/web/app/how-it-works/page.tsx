import Link from 'next/link';

// ── Shared style tokens ───────────────────────────────────────────────────────
const C = {
  ground:    '#E9ECEF',
  chart:     '#FFFFFF',
  ink:       '#14181C',
  muted:     '#68757F',
  rule:      '#D2D8DD',
  strong:    '#AEB8C0',
  block:     '#B3261E',
  blockWash: '#FBEDEC',
  caution:   '#8A5A00',
  clear:     '#1F6B45',
  clearWash: '#F2F8F4',
  plex:      '#24408E',
  plexWash:  '#EDF0F8',
};

const mono: React.CSSProperties = { fontFamily: '"IBM Plex Mono", monospace' };
const condensed: React.CSSProperties = { fontFamily: '"IBM Plex Sans Condensed", sans-serif' };

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, marginBottom: 12 }}>
      {children}
    </div>
  );
}

function SectionHeader({ step, title, sub }: { step: string; title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 6 }}>
        <span style={{ ...condensed, fontWeight: 700, fontSize: 42, lineHeight: 1, color: C.strong }}>{step}</span>
        <h2 style={{ ...condensed, fontWeight: 700, fontSize: 28, lineHeight: 1.1, color: C.ink, margin: 0 }}>{title}</h2>
      </div>
      <p style={{ fontSize: 15, color: C.muted, margin: 0, maxWidth: '64ch' }}>{sub}</p>
    </div>
  );
}

// ── Step 1 diagram: PR ingestion pipeline ────────────────────────────────────
function IngestionDiagram() {
  const boxes = [
    { label: 'GitHub PR', sub: '#4821 · acme/ledger-api', fill: C.plexWash, stroke: C.plex, textColor: C.plex },
    { label: 'Integration Service', sub: 'PyGithub · _parse_files()', fill: C.chart, stroke: C.strong, textColor: C.ink },
    { label: 'PRRecord', sub: 'FileDiff · RiskHeuristic · overall_risk', fill: C.chart, stroke: C.strong, textColor: C.ink },
    { label: 'PR Doctor', sub: 'BOB agents receive context', fill: C.plexWash, stroke: C.plex, textColor: C.plex },
  ];
  const W = 800, H = 120, BW = 156, BH = 56, gap = (W - BW * 4) / 5;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="PR ingestion pipeline">
      {boxes.map((b, i) => {
        const x = gap + i * (BW + gap);
        const cy = H / 2;
        // Arrow
        if (i < boxes.length - 1) {
          const ax = x + BW + 4;
          const nextX = x + BW + gap - 4;
          const my = cy;
          return (
            <g key={i}>
              <rect x={x} y={cy - BH / 2} width={BW} height={BH} fill={b.fill} stroke={b.stroke} strokeWidth="1.5" rx="0" />
              <text x={x + BW / 2} y={cy - 6} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="11" fontWeight="600" fill={b.textColor}>{b.label}</text>
              <text x={x + BW / 2} y={cy + 11} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill={C.muted}>{b.sub}</text>
              <line x1={ax} y1={my} x2={nextX} y2={my} stroke={C.strong} strokeWidth="1.5" markerEnd="url(#arr)" />
            </g>
          );
        }
        return (
          <g key={i}>
            <rect x={x} y={cy - BH / 2} width={BW} height={BH} fill={b.fill} stroke={b.stroke} strokeWidth="1.5" />
            <text x={x + BW / 2} y={cy - 6} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="11" fontWeight="600" fill={b.textColor}>{b.label}</text>
            <text x={x + BW / 2} y={cy + 11} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill={C.muted}>{b.sub}</text>
          </g>
        );
      })}
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill={C.strong} />
        </marker>
      </defs>
    </svg>
  );
}

// ── Step 2 diagram: Graphify graph ───────────────────────────────────────────
function GraphifyDiagram() {
  const W = 800, H = 260;
  // Nodes: hub + spokes in two rings
  const hub = { id: 'hub', x: 160, y: 130, label: 'ingest_pr()', sub: '13 edges', fill: C.blockWash, stroke: C.block, tw: 600 };
  const ring1 = [
    { id: 'r1a', x: 340, y: 50,  label: 'PRRecord',    sub: '16 edges', fill: C.plexWash, stroke: C.plex },
    { id: 'r1b', x: 360, y: 130, label: '_parse_files()', sub: 'called by',  fill: C.chart, stroke: C.strong },
    { id: 'r1c', x: 340, y: 210, label: 'Settings',    sub: '14 edges', fill: C.plexWash, stroke: C.plex },
  ];
  const ring2 = [
    { id: 'r2a', x: 530, y: 50,  label: 'FileDiff',     sub: 'model', fill: C.chart, stroke: C.strong },
    { id: 'r2b', x: 560, y: 130, label: 'upsert_pr()',  sub: '12 edges', fill: C.chart, stroke: C.strong },
    { id: 'r2c', x: 530, y: 210, label: 'get_settings()', sub: '9 edges', fill: C.chart, stroke: C.strong },
    { id: 'r2d', x: 690, y: 90,  label: 'list_prs()',   sub: 'storage', fill: C.chart, stroke: C.strong },
    { id: 'r2e', x: 690, y: 170, label: 'RiskLevel',   sub: '8 edges', fill: C.chart, stroke: C.strong },
  ];
  const edges1 = ring1.map(n => ({ from: hub, to: n }));
  const edges2 = [
    { from: ring1[0], to: ring2[0] },
    { from: ring1[1], to: ring2[1] },
    { from: ring1[2], to: ring2[2] },
    { from: ring2[1], to: ring2[3] },
    { from: ring2[2], to: ring2[4] },
  ];
  const BW = 116, BH = 38;
  const allNodes = [hub, ...ring1, ...ring2];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Graphify dependency graph">
      <defs>
        <marker id="arr2" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill={C.strong} />
        </marker>
      </defs>
      {/* Edges */}
      {[...edges1, ...edges2].map((e, i) => (
        <line key={i}
          x1={e.from.x + BW / 2} y1={e.from.y + BH / 2}
          x2={e.to.x}            y2={e.to.y + BH / 2}
          stroke={C.strong} strokeWidth="1.2" markerEnd="url(#arr2)" />
      ))}
      {/* Nodes */}
      {allNodes.map(n => (
        <g key={n.id}>
          <rect x={n.x} y={n.y} width={BW} height={BH}
            fill={'fill' in n ? n.fill : C.chart}
            stroke={'stroke' in n ? n.stroke : C.strong}
            strokeWidth={n.id === 'hub' ? 2 : 1.2} />
          <text x={n.x + BW / 2} y={n.y + 14} textAnchor="middle"
            fontFamily="IBM Plex Mono, monospace" fontSize="10"
            fontWeight={n.id === 'hub' ? '600' : '400'}
            fill={'tw' in n ? C.block : C.ink}>{n.label}</text>
          <text x={n.x + BW / 2} y={n.y + 28} textAnchor="middle"
            fontFamily="IBM Plex Mono, monospace" fontSize="8.5" fill={C.muted}>{n.sub}</text>
        </g>
      ))}
      {/* Community label */}
      <rect x={8} y={8} width={130} height={22} fill={C.plexWash} stroke={C.plex} strokeWidth="1" />
      <text x={73} y={22} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fontWeight="600" fill={C.plex}>PR INGESTION PIPELINE</text>
    </svg>
  );
}

// ── Step 3 diagram: Parallel agent lanes ────────────────────────────────────
function AgentLanesDiagram() {
  const W = 800, H = 200;
  const agents = [
    { name: 'Code Analyst',              mode: 'Code',         start: 40,  end: 352, color: C.plex,  findings: 3 },
    { name: 'Test & Security',           mode: 'Advanced',     start: 40,  end: 527, color: C.block, findings: 3 },
    { name: 'Documentation & Compliance',mode: 'Ask',          start: 40,  end: 274, color: C.caution,findings: 2 },
  ];
  const trackW = 520, trackX = 220, rowH = 52, startY = 20;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Parallel agent investigation lanes">
      <defs>
        <marker id="arr3" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill={C.strong} />
        </marker>
      </defs>
      {agents.map((a, i) => {
        const y = startY + i * rowH;
        const barW = Math.round((a.end / 660) * trackW);
        return (
          <g key={i}>
            {/* Name */}
            <text x={0} y={y + 13} fontFamily="IBM Plex Mono, monospace" fontSize="11" fontWeight="600" fill={C.ink}>{a.name}</text>
            <text x={0} y={y + 27} fontFamily="IBM Plex Mono, monospace" fontSize="9" fill={C.plex} letterSpacing="0.06em">{a.mode.toUpperCase()}</text>
            {/* Track */}
            <rect x={trackX} y={y + 2} width={trackW} height={18} fill="#F1F3F5" stroke={C.rule} strokeWidth="1" />
            {/* Bar */}
            <rect x={trackX} y={y + 2} width={barW} height={18} fill={a.color} opacity="0.85" />
            {/* Duration + findings */}
            <text x={trackX + trackW + 10} y={y + 15} fontFamily="IBM Plex Mono, monospace" fontSize="10" fill={C.muted}>{(a.end / 1000).toFixed(1)}s</text>
            <text x={trackX + trackW + 52} y={y + 15} fontFamily="IBM Plex Mono, monospace" fontSize="10" fill={a.color} fontWeight="600">{a.findings} findings</text>
          </g>
        );
      })}
      {/* Orchestrator row */}
      {(() => {
        const y = startY + 3 * rowH + 8;
        return (
          <g>
            <line x1={trackX} y1={y - 4} x2={trackX + trackW + 100} y2={y - 4} stroke={C.rule} strokeWidth="1" strokeDasharray="4 3" />
            <text x={0} y={y + 13} fontFamily="IBM Plex Mono, monospace" fontSize="11" fontWeight="600" fill={C.ink}>PR Orchestrator</text>
            <text x={0} y={y + 27} fontFamily="IBM Plex Mono, monospace" fontSize="9" fill={C.plex} letterSpacing="0.06em">ORCHESTRATOR</text>
            <rect x={trackX} y={y + 2} width={Math.round((1330 / 6600) * trackW)} height={18} fill="#F1F3F5" stroke={C.rule} strokeWidth="1" />
            <rect x={trackX + Math.round((5270 / 6600) * trackW)} y={y + 2} width={Math.round((1330 / 6600) * trackW)} height={18} fill={C.ink} opacity="0.85" />
            <text x={trackX + trackW + 10} y={y + 15} fontFamily="IBM Plex Mono, monospace" fontSize="10" fill={C.muted}>1.3s</text>
            <text x={trackX + trackW + 52} y={y + 15} fontFamily="IBM Plex Mono, monospace" fontSize="10" fill={C.ink} fontWeight="600">BLOCK</text>
          </g>
        );
      })()}
    </svg>
  );
}

// ── Step 4 diagram: Evidence / Inference split ───────────────────────────────
function EvidenceSplitDiagram() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', border: `1px solid ${C.strong}` }}>
      <div style={{ padding: '18px 20px', background: '#FAFBFC' }}>
        <div style={{ ...mono, fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.ink, marginBottom: 10 }}>
          Observed
        </div>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: C.ink }}>
          Line 42 changed from{' '}
          <code style={{ ...mono, fontSize: 12, background: '#F6F8F9', border: `1px solid ${C.rule}`, padding: '1px 4px' }}>
            return user.role === &apos;admin&apos; &amp;&amp; user.verified;
          </code>{' '}
          to{' '}
          <code style={{ ...mono, fontSize: 12, background: C.blockWash, border: `1px solid ${C.block}`, padding: '1px 4px', color: C.block }}>
            return user.role === &apos;admin&apos;;
          </code>
          . No compensating check was added elsewhere in the diff.
        </p>
        <div style={{ marginTop: 14, ...mono, fontSize: 10, color: C.muted }}>
          Source: unified diff · line 42 · quotable verbatim
        </div>
      </div>
      <div style={{ background: C.strong }} />
      <div style={{ padding: '18px 20px' }}>
        <div style={{ ...mono, fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.plex, marginBottom: 10 }}>
          Concluded
        </div>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: C.ink }}>
          <code style={{ ...mono, fontSize: 12, background: '#F6F8F9', border: `1px solid ${C.rule}`, padding: '1px 4px' }}>canAdminister()</code>{' '}
          now returns <code style={{ ...mono, fontSize: 12 }}>true</code> for accounts holding the admin role
          that have not completed verification. Since this function is the only gate used by administrative
          call sites, verification is no longer enforced anywhere on that path.
        </p>
        <div style={{ marginTop: 14, ...mono, fontSize: 10, color: C.muted }}>
          Agent inference · explicitly defeasible · not a quote
        </div>
      </div>
    </div>
  );
}

// ── Step 5 diagram: blast radius mini graph ──────────────────────────────────
function BlastMiniDiagram() {
  const W = 720, H = 200;
  const BW = 150, BH = 42;
  const changed = { x: 20,  y: 80,  label: 'auth.ts',           sub: 'changed · line 42',       fill: C.blockWash, stroke: C.block, sw: 2 };
  const nodes = [
    { x: 260, y: 20,  label: 'billing/refund.ts', sub: 'no coverage · moves money', fill: C.blockWash, stroke: C.block,  sw: 2,   dash: '5 3' },
    { x: 260, y: 80,  label: 'session.ts',         sub: 'step-up flag',              fill: C.chart,     stroke: C.strong, sw: 1.5, dash: '' },
    { x: 260, y: 140, label: 'admin/users',         sub: 'tested',                   fill: C.chart,     stroke: C.strong, sw: 1.5, dash: '' },
    { x: 500, y: 80,  label: 'admin/layout.tsx',   sub: 'distance 2',               fill: C.chart,     stroke: C.rule,   sw: 1,   dash: '3 3' },
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Blast radius dependency graph">
      {/* Edges */}
      {nodes.slice(0, 3).map((n, i) => (
        <line key={i}
          x1={changed.x + BW} y1={changed.y + BH / 2}
          x2={n.x}            y2={n.y + BH / 2}
          stroke={C.strong} strokeWidth="1.5" />
      ))}
      <line x1={nodes[1].x + BW} y1={nodes[1].y + BH / 2}
            x2={nodes[3].x}      y2={nodes[3].y + BH / 2}
            stroke={C.strong} strokeWidth="1.5" strokeDasharray="3 3" />
      {/* Changed node */}
      <rect x={changed.x} y={changed.y} width={BW} height={BH} fill={changed.fill} stroke={changed.stroke} strokeWidth={changed.sw} />
      <text x={changed.x + BW / 2} y={changed.y + 15} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="11" fontWeight="600" fill={C.block}>{changed.label}</text>
      <text x={changed.x + BW / 2} y={changed.y + 30} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9"  fill="#8C1D18">{changed.sub}</text>
      {/* Affected nodes */}
      {nodes.map((n, i) => (
        <g key={i}>
          <rect x={n.x} y={n.y} width={BW} height={BH} fill={n.fill} stroke={n.stroke} strokeWidth={n.sw} strokeDasharray={n.dash || undefined} />
          <text x={n.x + BW / 2} y={n.y + 15} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="11" fill={n.stroke === C.block ? C.block : C.ink}>{n.label}</text>
          <text x={n.x + BW / 2} y={n.y + 30} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9"  fill={C.muted}>{n.sub}</text>
        </g>
      ))}
      {/* Legend */}
      <text x="0" y={H - 4} fontFamily="IBM Plex Mono, monospace" fontSize="9.5" fill={C.muted}>
        4 files reached · 1 trust boundary without coverage · graph confidence 89%
      </text>
    </svg>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HowItWorksPage() {
  return (
    <div style={{ background: C.ground, minHeight: '100vh', fontFamily: '"IBM Plex Sans", system-ui, sans-serif', color: C.ink }}>

      {/* Nav */}
      <header style={{ background: C.chart, borderBottom: `1px solid ${C.strong}`, padding: '0 24px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ ...mono, fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', color: C.plex, textDecoration: 'none' }}>
            PR Doctor
          </Link>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <Link href="/investigation" style={{ ...mono, fontSize: 11, color: C.muted, textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Run Demo</Link>
            <Link href="/" style={{ ...mono, fontSize: 11, color: C.muted, textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Home</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: C.ink, padding: '56px 24px 48px', borderBottom: `4px solid ${C.plex}` }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div style={{ ...mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
            Technical walkthrough
          </div>
          <h1 style={{ ...condensed, fontWeight: 700, fontSize: 'clamp(28px,5vw,50px)', lineHeight: 1.05, color: '#FFFFFF', margin: '0 0 18px', maxWidth: '20ch' }}>
            How PR Doctor works, from diff to verdict.
          </h1>
          <p style={{ fontSize: 15.5, lineHeight: 1.7, color: 'rgba(255,255,255,0.72)', maxWidth: '66ch', margin: 0 }}>
            Five stages. Four IBM BOB 2.0 agents. One Graphify context graph. Every finding
            separates what was observed from what was concluded — those two things never merge.
          </p>
        </div>
      </section>

      {/* Stage index strip */}
      <section style={{ background: C.chart, borderBottom: `1px solid ${C.strong}` }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', display: 'flex', overflow: 'auto' }}>
          {[
            ['01', 'Ingestion'],
            ['02', 'Graphify'],
            ['03', 'Parallel agents'],
            ['04', 'Evidence split'],
            ['05', 'Blast radius'],
            ['06', 'Orchestrator'],
          ].map(([n, label]) => (
            <div key={n} style={{ padding: '14px 24px', borderRight: `1px solid ${C.rule}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
              <span style={{ ...mono, fontSize: 10, color: C.muted, marginRight: 8 }}>{n}</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* ── Stage 01: Ingestion ── */}
        <section style={{ marginTop: 48, paddingBottom: 48, borderBottom: `1px solid ${C.rule}` }}>
          <SectionHeader
            step="01"
            title="PR Ingestion"
            sub="The Integration Service fetches the PR from GitHub, parses every file diff into a typed PRRecord, and runs a set of heuristic risk checks before the agents ever see the data."
          />
          <div style={{ background: C.chart, border: `1px solid ${C.strong}`, padding: '28px 28px 24px', marginBottom: 20 }}>
            <Eyebrow>Pipeline — GitHub → Integration Service → PRRecord → Agents</Eyebrow>
            <IngestionDiagram />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1, background: C.strong, border: `1px solid ${C.strong}` }}>
            {[
              { label: 'FileDiff', desc: 'filename · status (added/modified/removed) · additions · deletions · raw unified diff patch' },
              { label: 'RiskHeuristic', desc: 'rule · description · level · file · line — detects secrets, large diffs, test deletion, config changes' },
              { label: 'PRRecord', desc: 'id · repo · title · author · base/head branch · files[] · risk_heuristics[] · overall_risk' },
            ].map(item => (
              <div key={item.label} style={{ background: C.chart, padding: '16px 18px' }}>
                <code style={{ ...mono, fontSize: 12.5, fontWeight: 600, color: C.plex, display: 'block', marginBottom: 6 }}>{item.label}</code>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.55 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Stage 02: Graphify ── */}
        <section style={{ marginTop: 48, paddingBottom: 48, borderBottom: `1px solid ${C.rule}` }}>
          <SectionHeader
            step="02"
            title="Graphify builds the dependency graph"
            sub="IBM Graphify analyses the codebase statically — AST extraction plus semantic inference — and produces a 111-node, 217-edge graph. Before any agent runs, PR Doctor queries this graph for every changed file and injects the 1-hop neighbour subgraph into the agent prompt."
          />
          <div style={{ background: C.chart, border: `1px solid ${C.strong}`, padding: '28px 28px 24px', marginBottom: 20 }}>
            <Eyebrow>Dependency graph — 111 nodes · 217 edges · 13 communities · 89% extracted</Eyebrow>
            <GraphifyDiagram />
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 1, background: C.strong, border: `1px solid ${C.strong}`, marginBottom: 20 }}>
            {[
              { n: '111', label: 'Nodes' },
              { n: '217', label: 'Edges' },
              { n: '13',  label: 'Communities' },
              { n: '89%', label: 'AST-extracted' },
              { n: '23',  label: 'Inferred edges' },
              { n: '0.94',label: 'Avg confidence' },
            ].map(s => (
              <div key={s.label} style={{ background: C.chart, padding: '16px 18px' }}>
                <div style={{ ...condensed, fontWeight: 700, fontSize: 30, lineHeight: 1, color: C.plex, marginBottom: 4 }}>{s.n}</div>
                <div style={{ ...mono, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Why this matters */}
          <div style={{ background: C.plexWash, border: `1px solid ${C.strong}`, borderLeft: `4px solid ${C.plex}`, padding: '16px 20px' }}>
            <div style={{ ...mono, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.plex, marginBottom: 8 }}>
              Why the graph matters — the key differentiator
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65 }}>
              Without Graphify, an agent reviewing a 2-line diff would only know about those 2 lines.
              With the graph, it knows that <code style={{ ...mono, fontSize: 12, background: '#F6F8F9', border: `1px solid ${C.rule}`, padding: '1px 4px' }}>canAdminister()</code> is called by{' '}
              <code style={{ ...mono, fontSize: 12, background: C.blockWash, border: `1px solid ${C.block}`, padding: '1px 4px', color: C.block }}>billing/refund.ts:88</code>,
              which moves money and has zero test coverage. The graph gives the agents pre-computed
              blast radius — they don&apos;t guess, they traverse.
            </p>
          </div>
        </section>

        {/* ── Stage 03: Parallel agents ── */}
        <section style={{ marginTop: 48, paddingBottom: 48, borderBottom: `1px solid ${C.rule}` }}>
          <SectionHeader
            step="03"
            title="Three specialists run in parallel"
            sub="Code Analyst, Test & Security, and Documentation & Compliance investigate simultaneously using different IBM BOB 2.0 modes. Each sees the same PRContext and Graphify packet but focuses on a different lens."
          />
          <div style={{ background: C.chart, border: `1px solid ${C.strong}`, padding: '28px 28px 24px', marginBottom: 20 }}>
            <Eyebrow>Parallel investigation — 6.6s total · staggered completion</Eyebrow>
            <AgentLanesDiagram />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1, background: C.strong, border: `1px solid ${C.strong}` }}>
            {[
              { name: 'Code Analyst', mode: 'Code', color: C.plex, desc: 'Reads the diff line by line. Maps call sites. Checks whether the PR description is supported by the code. Finding prefix: CA-' },
              { name: 'Test & Security', mode: 'Advanced', color: C.block, desc: 'Traces reachability through the Graphify graph. Checks authorization paths. Verifies test coverage. Finding prefix: TS-' },
              { name: 'Docs & Compliance', mode: 'Ask', color: C.caution, desc: 'Compares code behavior against documentation, changelogs, and stated policies to find contradictions. Finding prefix: DC-' },
            ].map(a => (
              <div key={a.name} style={{ background: C.chart, padding: '18px 18px 20px', borderTop: `3px solid ${a.color}` }}>
                <div style={{ ...mono, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: a.color, background: a.color === C.plex ? C.plexWash : a.color === C.block ? C.blockWash : '#FCF8EF', display: 'inline-block', padding: '2px 6px', marginBottom: 10 }}>
                  {a.mode} mode
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{a.name}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.55 }}>{a.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Stage 04: Evidence split ── */}
        <section style={{ marginTop: 48, paddingBottom: 48, borderBottom: `1px solid ${C.rule}` }}>
          <SectionHeader
            step="04"
            title="Every finding separates evidence from inference"
            sub="This is the product thesis. Observed is what is literally in the diff — quotable verbatim. Concluded is what the agent inferred — explicitly defeasible. They are kept in two separate columns and never merged."
          />
          <div style={{ background: C.chart, border: `1px solid ${C.strong}`, padding: '28px 28px 24px', marginBottom: 20 }}>
            <Eyebrow>Finding CA-01 — Verification requirement removed from the sole admin gate</Eyebrow>
            <EvidenceSplitDiagram />

            {/* Diff */}
            <div style={{ marginTop: 20, background: '#F6F8F9', border: `1px solid ${C.rule}`, padding: '12px 14px', ...mono, fontSize: 12.5, lineHeight: 1.65, overflowX: 'auto', whiteSpace: 'pre' }}>
              <span style={{ color: C.muted, display: 'block' }}>{'@@ -39,7 +39,7 @@ export function canAdminister(user: User): boolean {'}</span>
              <span style={{ color: C.muted, display: 'block' }}>{'  if (!user) return false;'}</span>
              <span style={{ color: C.muted, display: 'block' }}>{'  if (user.suspended) return false;'}</span>
              <span style={{ background: C.blockWash, color: '#8C1D18', display: 'block' }}>{"- return user.role === 'admin' && user.verified;"}</span>
              <span style={{ background: '#E9F2EC', color: '#14512F', display: 'block' }}>{"+ return user.role === 'admin';"}</span>
              <span style={{ color: C.muted, display: 'block' }}>{'}'}</span>
            </div>
          </div>

          <div style={{ background: C.plexWash, border: `1px solid ${C.strong}`, borderLeft: `4px solid ${C.plex}`, padding: '14px 20px' }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65 }}>
              An agent that collapses evidence and inference produces findings that are impossible to
              audit. You can&apos;t tell whether the claim is a direct quote from the diff or a conclusion
              the model drew. Keeping them separate makes every finding falsifiable.
            </p>
          </div>
        </section>

        {/* ── Stage 05: Blast radius ── */}
        <section style={{ marginTop: 48, paddingBottom: 48, borderBottom: `1px solid ${C.rule}` }}>
          <SectionHeader
            step="05"
            title="Blast radius — what the change actually reaches"
            sub="Graphify's graph tells PR Doctor which files the change propagates to, whether they have test coverage, and whether they cross a trust boundary. This is shown as a dependency graph, not a list."
          />
          <div style={{ background: C.chart, border: `1px solid ${C.strong}`, padding: '28px 28px 24px', marginBottom: 20 }}>
            <Eyebrow>auth.ts change propagates to 4 files · 1 trust boundary without coverage</Eyebrow>
            <BlastMiniDiagram />
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 14, fontSize: 12.5, color: C.muted }}>
              <span><strong style={{ fontWeight: 500, color: C.ink }}>Solid red</strong> — changed or reached, no tests</span>
              <span><strong style={{ fontWeight: 500, color: C.ink }}>Dashed red</strong> — reached, no tests</span>
              <span><strong style={{ fontWeight: 500, color: C.ink }}>Grey</strong> — reached, covered</span>
              <span><strong style={{ fontWeight: 500, color: C.ink }}>Dashed grey</strong> — distance 2</span>
            </div>
          </div>

          {/* Affected node table */}
          <div style={{ background: C.chart, border: `1px solid ${C.strong}` }}>
            {[
              { path: 'src/api/billing/refund.ts', reason: 'Calls canAdminister() as its only authorization gate before issuing a refund', tests: false, dist: 1, trust: true },
              { path: 'src/lib/session.ts',         reason: 'Derives the step-up authentication flag from canAdminister()',                  tests: true,  dist: 1, trust: true },
              { path: 'src/app/admin/users/route.ts',reason: 'Guards user administration endpoints with canAdminister()',                     tests: true,  dist: 1, trust: false },
              { path: 'src/app/admin/layout.tsx',    reason: 'Renders the admin shell behind a session flag set in session.ts',               tests: false, dist: 2, trust: false },
            ].map((n, i) => (
              <div key={n.path} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 16, padding: '11px 18px', borderTop: i > 0 ? `1px solid ${C.rule}` : undefined, alignItems: 'start' }}>
                <div>
                  <code style={{ ...mono, fontSize: 12.5, color: n.tests ? C.ink : C.block }}>{n.path}</code>
                  <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>{n.reason}</div>
                </div>
                <div style={{ ...mono, fontSize: 10, padding: '2px 6px', border: `1px solid ${n.tests ? C.strong : C.block}`, color: n.tests ? C.muted : C.block, whiteSpace: 'nowrap', alignSelf: 'start' }}>
                  {n.tests ? 'tested' : 'no tests'}
                </div>
                <div style={{ ...mono, fontSize: 10, color: C.muted, whiteSpace: 'nowrap', alignSelf: 'start' }}>dist {n.dist}</div>
                {n.trust && <div style={{ ...mono, fontSize: 10, color: C.caution, border: `1px solid ${C.caution}`, padding: '2px 5px', whiteSpace: 'nowrap', alignSelf: 'start' }}>trust boundary</div>}
                {!n.trust && <div />}
              </div>
            ))}
          </div>
        </section>

        {/* ── Stage 06: Orchestrator ── */}
        <section style={{ marginTop: 48, paddingBottom: 48 }}>
          <SectionHeader
            step="06"
            title="Orchestrator issues the final verdict"
            sub="The PR Orchestrator reads all three specialist reports, resolves disagreements with explicit reasoning, and produces a single verdict — MERGE, NEEDS_WORK, or BLOCK — with a full evidence chain."
          />

          {/* Verdict tag */}
          <div style={{ background: C.chart, border: `1px solid ${C.strong}`, borderLeft: `8px solid ${C.block}`, padding: '22px 26px 22px 30px', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 26, alignItems: 'center', marginBottom: 20 }}>
            <div style={{ ...condensed, fontWeight: 700, fontSize: 52, lineHeight: 0.9, letterSpacing: '-0.01em', color: C.block, border: `3px solid ${C.block}`, padding: '8px 16px 10px', transform: 'rotate(-1.5deg)' }}>
              BLOCK
            </div>
            <div>
              <div style={{ ...mono, fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>
                Orchestrator verdict · IBM BOB 2.0
              </div>
              <div style={{ fontSize: 14.5, maxWidth: '48ch' }}>
                An unverified account holding the admin role can now reach refund issuance,
                a money-moving path with no test coverage. Test &amp; Security reproduced the path;
                Code Analyst confirmed the removed condition is the only gate.
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ ...mono, fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted }}>Confidence</div>
              <div style={{ ...condensed, fontWeight: 700, fontSize: 34, lineHeight: 1 }}>91%</div>
              <div style={{ ...mono, fontSize: 11, color: C.muted }}>not evidence</div>
            </div>
          </div>

          {/* Disagreement */}
          <div style={{ background: '#FCF8EF', border: `1px solid ${C.caution}`, padding: '14px 20px', marginBottom: 20 }}>
            <div style={{ ...mono, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.caution, marginBottom: 6 }}>
              Recorded disagreement
            </div>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65 }}>
              Code Analyst rated the removed condition <strong>high</strong> on the basis of the diff alone.
              Test &amp; Security rated it <strong>critical</strong> after tracing it to refund issuance.
              Weighted toward Test &amp; Security: reachability was established from the dependency graph,
              not assumed.
            </p>
          </div>

          {/* Driving findings */}
          <div style={{ background: C.chart, border: `1px solid ${C.strong}` }}>
            <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.rule}`, ...mono, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted }}>
              Driving findings — what caused the BLOCK
            </div>
            {['TS-01 — Unverified admin can issue refunds without a second gate', 'CA-01 — Verification requirement removed from the sole admin gate', 'TS-02 — No remaining test coverage on the changed function'].map((f, i) => (
              <div key={i} style={{ padding: '10px 18px', borderTop: i > 0 ? `1px solid ${C.rule}` : undefined, display: 'flex', gap: 12, alignItems: 'baseline' }}>
                <span style={{ ...mono, fontSize: 10, fontWeight: 600, color: C.block, background: C.blockWash, border: `1px solid ${C.block}`, padding: '2px 6px', whiteSpace: 'nowrap' }}>
                  {f.split(' — ')[0]}
                </span>
                <span style={{ fontSize: 13.5 }}>{f.split(' — ')[1]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div style={{ background: C.plex, padding: '32px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ ...condensed, fontWeight: 700, fontSize: 20, color: '#FFFFFF', marginBottom: 4 }}>
              See the full pipeline run in real time.
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.68)' }}>
              acme/ledger-api · PR #4821 · BLOCK at 91% confidence
            </div>
          </div>
          <Link href="/investigation" style={{ display: 'inline-block', background: 'transparent', color: '#FFFFFF', fontWeight: 600, fontSize: 14, padding: '11px 28px', border: '2px solid #FFFFFF', textDecoration: 'none', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
            Run the investigation
          </Link>
        </div>

      </div>

      {/* Footer */}
      <footer style={{ background: C.ink, borderTop: `1px solid #2C3338`, padding: '22px 24px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ ...mono, fontSize: 12, color: '#68757F' }}>Prototype · IBM TechXchange 2026 Dev Day</span>
          <a href="https://github.com" style={{ ...mono, fontSize: 12, color: '#68757F', textDecoration: 'none' }}>GitHub</a>
        </div>
      </footer>

    </div>
  );
}
