'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import type { AgentReport, FinalVerdict, Finding, Severity } from '@/lib/types';

const SEV_STYLE: Record<Severity, { color: string; borderColor: string; background: string }> = {
  critical: { color: '#B3261E', borderColor: '#B3261E', background: '#FBEDEC' },
  high:     { color: '#B3261E', borderColor: '#B3261E', background: 'transparent' },
  medium:   { color: '#8A5A00', borderColor: '#8A5A00', background: 'transparent' },
  low:      { color: '#68757F', borderColor: '#AEB8C0', background: 'transparent' },
};

function parseDiff(raw: string): { type: 'del' | 'add' | 'ctx'; text: string }[] {
  return raw.split('\n').map(line => {
    if (line.startsWith('-') && !line.startsWith('---')) return { type: 'del', text: line };
    if (line.startsWith('+') && !line.startsWith('+++')) return { type: 'add', text: line };
    return { type: 'ctx', text: line };
  });
}

export default function FindingPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [verdict, setVerdict] = useState<FinalVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // A real PR investigation passes its job id so we fetch the stored verdict
    // rather than the demo fixture. If none is supplied, fall back to the demo.
    const jobId = searchParams.get('job') ?? 'demo';
    console.log(jobId)
    fetch(`/api/verdict/${encodeURIComponent(jobId)}`)
      .then(r => r.json())
      .then(setVerdict)
      .catch(() => setError('Failed to load verdict'));
  }, [searchParams]);

  if (error) {
    return (
      <div style={wrapStyle}>
        <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 13, color: '#B3261E' }}>{error}</div>
      </div>
    );
  }

  if (!verdict) {
    return (
      <div style={wrapStyle}>
        <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 13, color: '#68757F' }}>Loading…</div>
      </div>
    );
  }

  // Find the finding and its parent report
  let finding: Finding | undefined;
  let report: AgentReport | undefined;
  for (const r of verdict.reports) {
    const f = r.findings.find(f => f.id === id);
    if (f) { finding = f; report = r; break; }
  }

  if (!finding || !report) {
    return (
      <div style={wrapStyle}>
        <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 13, color: '#14181C' }}>
          Finding not found.
        </p>
        <Link href="/investigation" style={backLinkStyle}>&larr; Back to investigation</Link>
      </div>
    );
  }

  const sev = SEV_STYLE[finding.severity];

  // Diff: prefer the file matching finding.file, fallback to first
  const fileChange =
    verdict.context.filesChanged.find(fc => fc.path === finding!.file) ??
    verdict.context.filesChanged[0];

  const diffLines = fileChange ? parseDiff(fileChange.diff) : [];

  return (
    <div style={{ background: '#E9ECEF', minHeight: '100vh', fontFamily: '"IBM Plex Sans", system-ui, sans-serif', color: '#14181C', padding: '28px 20px 80px' }}>
      <div style={{ maxWidth: 1060, margin: '0 auto' }}>

        {/* 1. Back link */}
        <div style={{ marginBottom: 20 }}>
          <Link href="/investigation" style={backLinkStyle}>&larr; Investigation</Link>
        </div>

        {/* Triage tag wrapper */}
        <div style={{ background: '#FFFFFF', border: '1px solid #AEB8C0', borderLeft: `8px solid ${sev.borderColor}` }}>

          {/* 2. Severity + title */}
          <div style={{ padding: '20px 26px', borderBottom: '1px solid #D2D8DD' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <div style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '3px 8px',
                border: '1px solid',
                color: sev.color,
                borderColor: sev.borderColor,
                background: sev.background,
                whiteSpace: 'nowrap',
              }}>
                {finding.severity}
              </div>
              <div style={{ fontWeight: 600, fontSize: 17 }}>{finding.title}</div>
            </div>

            {/* 3. file:line + agent badge */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', alignItems: 'center' }}>
              <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 13, color: '#68757F' }}>
                {finding.file}:{finding.line}
              </span>
              <span style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 10.5,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#24408E',
                background: '#EDF0F8',
                padding: '3px 7px',
                whiteSpace: 'nowrap',
              }}>
                Reported by {report.displayName} · BOB {report.mode} mode
              </span>
            </div>
          </div>

          {/* 4. OBSERVED / CONCLUDED split */}
          <div style={{ padding: '20px 26px', borderBottom: '1px solid #D2D8DD' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1px 1fr',
              border: '1px solid #AEB8C0',
            }}>
              {/* Observed */}
              <div style={{ padding: '16px 18px', background: '#FAFBFC' }}>
                <div style={{
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#14181C',
                  marginBottom: 9,
                }}>
                  Observed
                </div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{finding.evidence}</p>
              </div>

              {/* Gutter */}
              <div style={{ background: '#AEB8C0' }} />

              {/* Concluded */}
              <div style={{ padding: '16px 18px' }}>
                <div style={{
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#24408E',
                  marginBottom: 9,
                }}>
                  Concluded
                </div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{finding.inference}</p>
              </div>
            </div>
          </div>

          {/* 5. Diff */}
          {diffLines.length > 0 && (
            <div style={{ padding: '0 26px 20px', borderBottom: '1px solid #D2D8DD' }}>
              <div style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#68757F',
                margin: '16px 0 8px',
              }}>
                {fileChange.path}
              </div>
              <div style={{
                background: '#F6F8F9',
                border: '1px solid #D2D8DD',
                padding: '12px 14px',
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 12.5,
                lineHeight: 1.65,
                overflowX: 'auto',
                whiteSpace: 'pre',
              }}>
                {diffLines.map((line, i) => {
                  const style: React.CSSProperties =
                    line.type === 'del'
                      ? { background: '#FBEDEC', color: '#8C1D18', display: 'block' }
                      : line.type === 'add'
                      ? { background: '#E9F2EC', color: '#14512F', display: 'block' }
                      : { color: '#68757F', display: 'block' };
                  return <span key={i} style={style}>{line.text}</span>;
                })}
              </div>
            </div>
          )}

          {/* 6. Reaches */}
          {finding.reaches.length > 0 && (
            <div style={{ padding: '16px 26px', borderBottom: '1px solid #D2D8DD' }}>
              <div style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#68757F',
                marginBottom: 10,
              }}>
                This finding propagates to
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {finding.reaches.map(path => (
                  <span key={path} style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 12.5,
                    color: '#14181C',
                    background: '#F6F8F9',
                    border: '1px solid #D2D8DD',
                    padding: '3px 10px',
                    display: 'inline-block',
                    alignSelf: 'start',
                  }}>
                    {path}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 7. Remediation */}
          <div style={{ padding: '16px 26px' }}>
            <div style={{
              borderLeft: '3px solid #1F6B45',
              background: '#F2F8F4',
              padding: '12px 16px',
            }}>
              <span style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#1F6B45',
                display: 'block',
                marginBottom: 5,
              }}>
                Remediation
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.6 }}>{finding.remediation}</span>
            </div>
          </div>

        </div>

        {/* Confidence note */}
        <div style={{ marginTop: 14, fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: '#68757F' }}>
          Finding confidence: {Math.round(finding.confidence * 100)}% — not evidence, only a hint about how hard to look.
        </div>

      </div>
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  background: '#E9ECEF',
  minHeight: '100vh',
  fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
  color: '#14181C',
  padding: '28px 20px 80px',
  maxWidth: 1060,
  margin: '0 auto',
};

const backLinkStyle: React.CSSProperties = {
  fontFamily: '"IBM Plex Mono", monospace',
  fontSize: 12,
  color: '#68757F',
  textDecoration: 'none',
  letterSpacing: '0.04em',
};
