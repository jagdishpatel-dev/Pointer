'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const C = {
  bg: '#E9ECEF',
  chart: '#FFFFFF',
  ink: '#14181C',
  muted: '#68757F',
  rule: '#D2D8DD',
  ruleStrong: '#AEB8C0',
  plex: '#24408E',
  plexWash: '#EDF0F8',
  block: '#B3261E',
  clear: '#1F6B45',
};

const mono: React.CSSProperties = { fontFamily: '"IBM Plex Mono", monospace' };

function Eyebrow({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ ...mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: C.muted, ...style }}>
      {children}
    </div>
  );
}

export default function ConnectPage() {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  // The pr-ingestion service holds the GitHub credentials. Connecting here
  // triggers a bulk ingest of the service's configured open PRs, then lists them.
  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setConnecting(true);
    try {
      const res = await fetch('/api/github/prs', { method: 'POST' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const detail = json?.detail ?? json?.error ?? `Error ${res.status}`;
        throw new Error(detail);
      }
      const prs = await res.json();
      const repo = (Array.isArray(prs) && prs[0]?.repo) || 'configured repo';
      sessionStorage.setItem('gh:repo', repo);
      router.push('/pulls');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: '"IBM Plex Sans", system-ui, sans-serif', color: C.ink }}>

      {/* Nav */}
      <header style={{ background: C.chart, borderBottom: `1px solid ${C.ruleStrong}`, padding: '0 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ ...mono, fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', color: C.plex, textDecoration: 'none' }}>
            PR Doctor
          </Link>
          <Eyebrow>Connect the ingestion service</Eyebrow>
        </div>
      </header>

      <div style={{ maxWidth: 760, margin: '48px auto 0', padding: '0 24px 80px' }}>

        <Eyebrow style={{ marginBottom: 10 }}>Step 1 of 2</Eyebrow>
        <h1 style={{ fontFamily: '"IBM Plex Sans Condensed", sans-serif', fontWeight: 700, fontSize: 28, margin: '0 0 6px', lineHeight: 1.15 }}>
          Connect your GitHub repository
        </h1>
        <p style={{ fontSize: 14, color: C.muted, margin: '0 0 32px', lineHeight: 1.6 }}>
          PR Doctor sources pull requests through the <strong style={{ color: C.ink }}>pr-ingestion</strong> service
          (FastAPI). That service is configured server-side with a GitHub token and repo — start it once with{' '}
          <code style={{ ...mono, fontSize: 12, background: '#F6F8F9', border: `1px solid ${C.rule}`, padding: '1px 5px' }}>pnpm run api:serve</code>,
          then connect here to ingest its open PRs.
        </p>

        <form onSubmit={handleConnect}>
          <div style={{ background: C.chart, border: `1px solid ${C.ruleStrong}` }}>

            {/* Summary row */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.rule}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: C.clear, display: 'inline-block' }} />
                <span style={{ ...mono, fontSize: 12, color: C.ink }}>Prerequisite — service must be running</span>
              </div>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.9, color: C.ink }}>
                <li>Set <code style={{ ...mono, fontSize: 12 }}>GITHUB_TOKEN</code> and <code style={{ ...mono, fontSize: 12 }}>GITHUB_REPO</code> in <code style={{ ...mono, fontSize: 12 }}>packages/pr-ingestion/.env</code></li>
                <li>Run <code style={{ ...mono, fontSize: 12 }}>pnpm run install:python</code> once</li>
                <li>Run <code style={{ ...mono, fontSize: 12 }}>pnpm run api:serve</code> (FastAPI on http://localhost:8000)</li>
              </ol>
            </div>

            {error && (
              <div style={{ padding: '14px 24px', borderBottom: `1px solid ${C.rule}`, ...mono, fontSize: 12, color: C.block }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Link href="/" style={{ ...mono, fontSize: 12, color: C.muted, textDecoration: 'none', padding: '10px 0', letterSpacing: '0.04em' }}>
                Cancel
              </Link>
              <button
                type="submit"
                disabled={connecting}
                style={{
                  background: connecting ? C.muted : C.plex,
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '10px 28px',
                  ...mono,
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  cursor: connecting ? 'not-allowed' : 'pointer',
                }}
              >
                {connecting ? 'Connecting…' : 'Connect & List PRs →'}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
