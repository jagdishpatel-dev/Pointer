'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { GithubPRItem } from '@/app/api/github/prs/route';

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
  caution: '#8A5A00',
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

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function PRRow({ pr, repo }: { pr: GithubPRItem; repo: string }) {
  const isDraft = pr.draft;
  const urlSafePr = pr.number;
  return (
    <Link
      href={`/pulls/${urlSafePr}?repo=${encodeURIComponent(repo)}`}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <div style={{
        padding: '16px 24px',
        borderTop: `1px solid ${C.rule}`,
        cursor: 'pointer',
        transition: 'background 0.1s',
      }}
        onMouseEnter={e => (e.currentTarget.style.background = '#F6F8FA')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0 20px', alignItems: 'start' }}>

          {/* Left: number + title + meta */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' as const }}>
              <span style={{ ...mono, fontSize: 12, color: C.muted }}>#{pr.number}</span>
              {isDraft && (
                <span style={{ ...mono, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: C.muted, border: `1px solid ${C.ruleStrong}`, padding: '1px 5px' }}>
                  Draft
                </span>
              )}
              {pr.labels.map(l => (
                <span key={l} style={{ ...mono, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: C.plex, background: C.plexWash, padding: '1px 6px' }}>
                  {l}
                </span>
              ))}
            </div>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 5, lineHeight: 1.3 }}>{pr.title}</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const, alignItems: 'center' }}>
              <span style={{ ...mono, fontSize: 11.5, color: C.muted }}>
                {pr.author} opened {relativeTime(pr.createdAt)}
              </span>
              <span style={{ ...mono, fontSize: 11.5, color: C.muted }}>
                {pr.branch} → {pr.baseBranch}
              </span>
              {pr.reviewComments > 0 && (
                <span style={{ ...mono, fontSize: 11.5, color: C.muted }}>
                  {pr.reviewComments} comment{pr.reviewComments !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Right: diff stats */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, paddingTop: 2 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ ...mono, fontSize: 12, color: C.clear }}>+{pr.additions}</span>
              <span style={{ ...mono, fontSize: 12, color: C.block }}>−{pr.deletions}</span>
            </div>
            <span style={{ ...mono, fontSize: 11, color: C.muted }}>
              {pr.changedFiles} file{pr.changedFiles !== 1 ? 's' : ''}
            </span>
            <span style={{ ...mono, fontSize: 11, color: C.muted }}>updated {relativeTime(pr.updatedAt)}</span>
          </div>

        </div>
      </div>
    </Link>
  );
}

export default function PullsPage() {
  const router = useRouter();
  const [repo, setRepo] = useState<string>('');
  const [prs, setPrs] = useState<GithubPRItem[] | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'open' | 'all'>('open');

  const fetchPRs = useCallback(async (r: string) => {
    setLoading(true);
    setError('');
    try {
      // The server proxies to the pr-ingestion service — no token needed here.
      const res = await fetch(`/api/github/prs?repo=${encodeURIComponent(r)}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json?.needsToken === undefined && (res.status === 503 || res.status === 502)) {
          router.push('/connect');
          return;
        }
        throw new Error(json?.error ?? json?.detail ?? `pr-ingestion ${res.status}`);
      }
      const data: GithubPRItem[] = await res.json();
      setPrs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch PRs');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Live refresh — asks pr-ingestion to re-fetch open PRs from GitHub, then lists.
  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/github/prs', { method: 'POST' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (res.status === 503 || res.status === 502) { router.push('/connect'); return; }
        throw new Error(json?.error ?? json?.detail ?? `pr-ingestion ${res.status}`);
      }
      const data: GithubPRItem[] = await res.json();
      setPrs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh PRs');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    try {
      const r = sessionStorage.getItem('gh:repo') ?? '';
      if (!r) { router.push('/connect'); return; }
      setRepo(r);
      fetchPRs(r);
    } catch {
      router.push('/connect');
    }
  }, [router, fetchPRs]);

  function disconnect() {
    sessionStorage.removeItem('gh:repo');
    router.push('/connect');
  }

  const visiblePRs = prs ?? [];

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: '"IBM Plex Sans", system-ui, sans-serif', color: C.ink }}>

      {/* Nav */}
      <header style={{ background: C.chart, borderBottom: `1px solid ${C.ruleStrong}`, padding: '0 24px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Link href="/" style={{ ...mono, fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', color: C.plex, textDecoration: 'none' }}>
              PR Doctor
            </Link>
            <span style={{ color: C.ruleStrong }}>›</span>
            <span style={{ ...mono, fontSize: 12, color: C.muted }}>{repo}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <button
              onClick={refresh}
              style={{ ...mono, fontSize: 11, color: C.plex, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}
            >
              ↻ Refresh from GitHub
            </button>
            <button
              onClick={disconnect}
              style={{ ...mono, fontSize: 11, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}
            >
              Disconnect
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1060, margin: '32px auto 0', padding: '0 24px 80px' }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap' as const, gap: 12 }}>
          <div>
            <Eyebrow style={{ marginBottom: 6 }}>Open Pull Requests</Eyebrow>
            <h1 style={{ fontFamily: '"IBM Plex Sans Condensed", sans-serif', fontWeight: 700, fontSize: 24, margin: 0, lineHeight: 1.1 }}>
              {repo}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 1, border: `1px solid ${C.ruleStrong}` }}>
            {(['open', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  ...mono,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  padding: '6px 14px',
                  border: 'none',
                  cursor: 'pointer',
                  background: filter === f ? C.plex : C.chart,
                  color: filter === f ? '#FFF' : C.muted,
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* PR list card */}
        <div style={{ background: C.chart, border: `1px solid ${C.ruleStrong}` }}>

          {/* Column header */}
          <div style={{ padding: '10px 24px', borderBottom: `1px solid ${C.rule}`, display: 'flex', justifyContent: 'space-between' }}>
            <Eyebrow>Pull request</Eyebrow>
            <Eyebrow>Changes</Eyebrow>
          </div>

          {loading && (
            <div style={{ padding: '40px 24px', textAlign: 'center', ...mono, fontSize: 13, color: C.muted }}>
              Loading pull requests…
            </div>
          )}

          {!loading && error && (
            <div style={{ padding: '24px', ...mono, fontSize: 13, color: C.block }}>
              {error}
            </div>
          )}

          {!loading && !error && visiblePRs.length === 0 && (
            <div style={{ padding: '40px 24px', textAlign: 'center', ...mono, fontSize: 13, color: C.muted }}>
              No open pull requests found in <strong>{repo}</strong>.
            </div>
          )}

          {!loading && !error && visiblePRs.map(pr => (
            <PRRow key={pr.number} pr={pr} repo={repo} />
          ))}

        </div>

        {!loading && !error && visiblePRs.length > 0 && (
          <div style={{ marginTop: 10, ...mono, fontSize: 12, color: C.muted }}>
            {visiblePRs.length} open PR{visiblePRs.length !== 1 ? 's' : ''} · Click any row to view details and run analysis
          </div>
        )}

      </div>
    </div>
  );
}
