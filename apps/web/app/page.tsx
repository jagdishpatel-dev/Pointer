import Link from 'next/link';
import type { FinalVerdict } from '@/lib/types';
import fixtureRaw from '@/fixtures/demo-pr.json';

const fixture = fixtureRaw as unknown as FinalVerdict;

const AGENTS = [
  {
    id: 'code-analyst',
    name: 'Code Analyst',
    mode: 'Code',
    job: 'Reads the diff line-by-line, maps every call site that inherits the change, and checks whether the PR description is supported by the code.',
    output: 'Per-line findings with exact file:line locations.',
  },
  {
    id: 'test-security',
    name: 'Test & Security',
    mode: 'Advanced',
    job: 'Traces reachability through the dependency graph, checks authorization paths, and verifies test coverage on every changed function.',
    output: 'Severity-ranked security findings, coverage gaps.',
  },
  {
    id: 'docs-compliance',
    name: 'Documentation & Compliance',
    mode: 'Ask',
    job: 'Compares code behavior against documentation, changelogs, and stated policies to find contradictions.',
    output: 'Documentation drift findings and process gaps.',
  },
  {
    id: 'orchestrator',
    name: 'PR Orchestrator',
    mode: 'Orchestrator',
    job: 'Weights findings from all three specialists, resolves disagreements with explicit reasoning, and issues the final verdict.',
    output: 'MERGE / NEEDS_WORK / BLOCK with a traceable rationale.',
  },
] as const;

const STEPS = [
  {
    n: '01',
    label: 'GitHub PR',
    desc: 'Paste a PR URL. PR Doctor fetches the diff, file tree, and description.',
  },
  {
    n: '02',
    label: 'Graphify maps blast radius',
    desc: 'IBM Graphify traces every call site and dependency that the change reaches.',
  },
  {
    n: '03',
    label: 'BOB specialists investigate',
    desc: 'Three IBM BOB 2.0 agents run in parallel: Code Analyst, Test & Security, Documentation & Compliance.',
  },
  {
    n: '04',
    label: 'Orchestrator decides',
    desc: 'The Orchestrator weighs all findings, records disagreements, and issues a verdict with a full evidence chain.',
  },
] as const;

const confidencePct = `${Math.round(fixture.confidence * 100)}%`;
const totalFindings = fixture.reports.reduce((s, r) => s + r.findings.length, 0);

export default function Home() {
  return (
    <div style={{ background: 'var(--ground)', minHeight: '100vh', fontFamily: '"IBM Plex Sans", system-ui, sans-serif', color: 'var(--ink)' }}>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header style={{ background: 'var(--chart)', borderBottom: '1px solid var(--rule-strong)', padding: '0 24px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--plex)' }}>
            PR Doctor
          </span>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <Link href="/how-it-works" style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: 'var(--muted)', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>How it works</Link>
            <Link href="/connect" style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: 'var(--plex)', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase', border: '1px solid var(--plex)', padding: '4px 10px' }}>Connect GitHub</Link>
            <span className="eyebrow">IBM BOB 2.0</span>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--plex)', padding: '64px 24px 56px', borderBottom: '4px solid var(--ink)' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 18 }}>
            IBM TechXchange 2026 · AI-Powered Code Review
          </div>
          <h1 style={{
            fontFamily: '"IBM Plex Sans Condensed", sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(28px, 5vw, 52px)',
            lineHeight: 1.1,
            color: '#FFFFFF',
            margin: '0 0 20px',
            maxWidth: '18ch',
          }}>
            Know why a pull request is dangerous before you merge it.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.65, color: 'rgba(255,255,255,0.82)', maxWidth: '60ch', margin: '0 0 36px' }}>
            Four IBM BOB 2.0 specialists investigate every PR in parallel and show
            you the exact line, the exact evidence, and the exact fix.
          </p>
          <Link href="/investigation" style={{
            display: 'inline-block',
            background: '#FFFFFF',
            color: 'var(--plex)',
            fontWeight: 600,
            fontSize: 14,
            padding: '12px 28px',
            border: '2px solid #FFFFFF',
            textDecoration: 'none',
            letterSpacing: '0.02em',
          }}>
            Analyze a Pull Request
          </Link>
        </div>
      </section>

      {/* ── Verdict preview card (triage tag) ───────────────────────── */}
      <section style={{ padding: '0 24px', marginTop: 32 }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>

          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Demo — {fixture.context.repo} · PR #{fixture.context.number}
          </div>

          {/* triage tag — matches preview.html exactly */}
          <div style={{
            position: 'relative',
            background: 'var(--chart)',
            border: '1px solid var(--rule-strong)',
            borderLeft: '8px solid var(--block)',
            padding: '22px 26px 22px 30px',
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            gap: 26,
            alignItems: 'center',
          }}>
            {/* stamp */}
            <div style={{
              fontFamily: '"IBM Plex Sans Condensed", sans-serif',
              fontWeight: 700,
              fontSize: 52,
              lineHeight: 0.9,
              letterSpacing: '-0.01em',
              color: 'var(--block)',
              border: '3px solid var(--block)',
              padding: '8px 16px 10px',
              transform: 'rotate(-1.5deg)',
            }}>
              {fixture.decision}
            </div>

            {/* rationale */}
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                Orchestrator verdict · IBM BOB 2.0
              </div>
              <div style={{ fontSize: 14.5, maxWidth: '48ch' }}>
                {fixture.rationale}
              </div>
              <div style={{ marginTop: 10, fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: 'var(--muted)' }}>
                {fixture.context.title} · {totalFindings} findings
              </div>
            </div>

            {/* confidence */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div className="eyebrow">Confidence</div>
              <div style={{ fontFamily: '"IBM Plex Sans Condensed", sans-serif', fontWeight: 700, fontSize: 34, lineHeight: 1, color: 'var(--ink)' }}>
                {confidencePct}
              </div>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: 'var(--muted)' }}>not evidence</div>
            </div>
          </div>

          {/* chart body — findings preview */}
          <div style={{ background: 'var(--chart)', border: '1px solid var(--rule-strong)', borderTop: 0 }}>
            <div style={{ padding: '14px 26px', borderBottom: '1px solid var(--rule)' }}>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
                Top findings
              </div>
              {fixture.reports.flatMap(r => r.findings).slice(0, 3).map(f => (
                <div key={f.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '78px 1fr auto',
                  gap: 16,
                  alignItems: 'start',
                  padding: '10px 0',
                  borderTop: '1px solid var(--rule)',
                }}>
                  <div style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '3px 0',
                    textAlign: 'center',
                    border: '1px solid',
                    color: f.severity === 'critical' ? 'var(--block)' : f.severity === 'high' ? 'var(--block)' : f.severity === 'medium' ? 'var(--caution)' : 'var(--muted)',
                    borderColor: f.severity === 'critical' ? 'var(--block)' : f.severity === 'high' ? 'var(--block)' : f.severity === 'medium' ? 'var(--caution)' : 'var(--rule-strong)',
                    background: f.severity === 'critical' ? 'var(--block-wash)' : 'transparent',
                  }}>
                    {f.severity}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{f.title}</div>
                    <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                      {f.file}:{f.line}
                    </div>
                  </div>
                  <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--plex)', background: 'var(--plex-wash)', padding: '3px 7px', whiteSpace: 'nowrap' }}>
                    {fixture.reports.find(r => r.findings.some(ff => ff.id === f.id))?.displayName}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 26px' }}>
              <Link href="/investigation" style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: 'var(--plex)', textDecoration: 'none', letterSpacing: '0.06em' }}>
                Run live investigation &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ─────────────────────────────────────────────── */}
      <section style={{ padding: '28px 24px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', background: 'var(--chart)', border: '1px solid var(--rule-strong)', padding: '16px 26px', display: 'flex', gap: '32px 48px', flexWrap: 'wrap', alignItems: 'center' }}>
          {['IBM BOB 2.0', 'Graphify Context', 'Evidence-Backed', 'GitHub'].map(item => (
            <span key={item} style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--plex)' }}>
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* ── Four agent cards ────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 40px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>Specialists</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 1, background: 'var(--rule-strong)', border: '1px solid var(--rule-strong)' }}>
            {AGENTS.map((agent) => (
              <div key={agent.id} style={{ background: 'var(--chart)', padding: '22px 22px 24px' }}>
                <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--plex)', background: 'var(--plex-wash)', display: 'inline-block', padding: '2px 7px', marginBottom: 12 }}>
                  {agent.mode} mode
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{agent.name}</div>
                <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.55, marginBottom: 12 }}>{agent.job}</div>
                <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 10 }}>
                  <div className="eyebrow" style={{ marginBottom: 4 }}>Output</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{agent.output}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Four-step flow ──────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 40px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>How it works</div>
          <div style={{ background: 'var(--chart)', border: '1px solid var(--rule-strong)' }}>
            {STEPS.map((step, i) => (
              <div key={step.n} style={{
                display: 'grid',
                gridTemplateColumns: '56px 1fr',
                gap: '0 20px',
                alignItems: 'start',
                padding: '18px 22px',
                borderTop: i > 0 ? '1px solid var(--rule)' : undefined,
              }}>
                <div style={{
                  fontFamily: '"IBM Plex Sans Condensed", sans-serif',
                  fontWeight: 700,
                  fontSize: 28,
                  lineHeight: 1,
                  color: 'var(--rule-strong)',
                  paddingTop: 2,
                }}>
                  {step.n}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{step.label}</div>
                  <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.55 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA repeat ──────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 56px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', background: 'var(--plex)', padding: '36px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ fontFamily: '"IBM Plex Sans Condensed", sans-serif', fontWeight: 700, fontSize: 22, color: '#FFFFFF', marginBottom: 6 }}>
              See it run on a real security regression.
            </div>
            <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.72)' }}>
              {fixture.context.repo} · PR #{fixture.context.number} · {fixture.context.title}
            </div>
          </div>
          <Link href="/investigation" style={{
            display: 'inline-block',
            background: 'transparent',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: 14,
            padding: '11px 28px',
            border: '2px solid #FFFFFF',
            textDecoration: 'none',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
          }}>
            Analyze a Pull Request
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer style={{ background: 'var(--ink)', borderTop: '1px solid #2C3338', padding: '22px 24px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: '#68757F' }}>
            Prototype · IBM TechXchange 2026 Dev Day
          </span>
          <a href="https://github.com" style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: '#68757F', textDecoration: 'none', letterSpacing: '0.04em' }}>
            GitHub
          </a>
        </div>
      </footer>

    </div>
  );
}
