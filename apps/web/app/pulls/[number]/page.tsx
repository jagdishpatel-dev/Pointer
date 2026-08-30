'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import type { GithubPRDetail, GithubFileDiff } from '@/app/api/github/prs/[number]/route';

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
  blockWash: '#FBEDEC',
  caution: '#8A5A00',
  clear: '#1F6B45',
  clearWash: '#E9F2EC',
  ground: '#F6F8FA',
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
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatusPill({ state, draft }: { state: string; draft: boolean }) {
  if (draft) return (
    <span style={{ ...mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: C.muted, border: `1px solid ${C.ruleStrong}`, padding: '3px 8px' }}>
      Draft
    </span>
  );
  if (state === 'open') return (
    <span style={{ ...mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: C.clear, border: `1px solid ${C.clear}`, padding: '3px 8px', background: C.clearWash }}>
      Open
    </span>
  );
  if (state === 'closed') return (
    <span style={{ ...mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: C.block, border: `1px solid ${C.block}`, padding: '3px 8px', background: C.blockWash }}>
      Closed
    </span>
  );
  return null;
}

function parseDiff(patch: string): { type: 'del' | 'add' | 'hunk' | 'ctx'; text: string }[] {
  return patch.split('\n').map(line => {
    if (line.startsWith('@@')) return { type: 'hunk', text: line };
    if (line.startsWith('-') && !line.startsWith('---')) return { type: 'del', text: line };
    if (line.startsWith('+') && !line.startsWith('+++')) return { type: 'add', text: line };
    return { type: 'ctx', text: line };
  });
}

function FileCard({ file }: { file: GithubFileDiff }) {
  const [open, setOpen] = useState(false);
  const statusColor = file.status === 'added' ? C.clear
    : file.status === 'removed' ? C.block
    : C.caution;

  const diffLines = file.patch ? parseDiff(file.patch) : null;

  return (
    <div style={{ border: `1px solid ${C.ruleStrong}`, marginBottom: -1 }}>
      {/* File header row */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: open ? '#F2F5FA' : C.chart,
          border: 'none',
          cursor: file.patch ? 'pointer' : 'default',
          textAlign: 'left' as const,
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: statusColor, border: `1px solid ${statusColor}`, padding: '1px 5px', flexShrink: 0 }}>
            {file.status === 'added' ? 'new' : file.status === 'removed' ? 'del' : file.status === 'renamed' ? 'ren' : 'mod'}
          </span>
          <span style={{ ...mono, fontSize: 12.5, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {file.filename}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
          {file.additions > 0 && <span style={{ ...mono, fontSize: 12, color: C.clear }}>+{file.additions}</span>}
          {file.deletions > 0 && <span style={{ ...mono, fontSize: 12, color: C.block }}>−{file.deletions}</span>}
          {file.patch && (
            <span style={{ ...mono, fontSize: 11, color: C.muted }}>{open ? '▲' : '▼'}</span>
          )}
        </div>
      </button>

      {/* Diff view */}
      {open && diffLines && (
        <div style={{ borderTop: `1px solid ${C.rule}`, overflowX: 'auto', maxHeight: 480, overflowY: 'auto' }}>
          <pre style={{ margin: 0, padding: '10px 0', ...mono, fontSize: 12, lineHeight: 1.6 }}>
            {diffLines.map((line, i) => {
              const bg = line.type === 'del' ? C.blockWash
                : line.type === 'add' ? C.clearWash
                : line.type === 'hunk' ? C.plexWash
                : 'transparent';
              const color = line.type === 'del' ? '#8C1D18'
                : line.type === 'add' ? '#14512F'
                : line.type === 'hunk' ? C.plex
                : C.muted;
              return (
                <span key={i} style={{ display: 'block', background: bg, color, padding: '0 16px', whiteSpace: 'pre' }}>
                  {line.text || ' '}
                </span>
              );
            })}
          </pre>
        </div>
      )}
      {open && !file.patch && (
        <div style={{ borderTop: `1px solid ${C.rule}`, padding: '12px 16px', ...mono, fontSize: 12, color: C.muted }}>
          Binary file or diff not available.
        </div>
      )}
    </div>
  );
}

export default function PRDetailPage() {
  const { number } = useParams<{ number: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [repo, setRepo] = useState('');
  const [pr, setPr] = useState<GithubPRDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const fetchDetail = useCallback(async (r: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/github/prs/${number}?repo=${encodeURIComponent(r)}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.detail ?? json?.error ?? `pr-ingestion ${res.status}`);
      }
      setPr(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PR');
    } finally {
      setLoading(false);
    }
  }, [number]);

  useEffect(() => {
    try {
      // Repo comes from the connect flow (session) or a deep link (?repo=).
      const r = searchParams.get('repo') ?? sessionStorage.getItem('gh:repo') ?? '';
      if (!r) { router.push('/connect'); return; }
      setRepo(r);
      fetchDetail(r);
    } catch {
      router.push('/connect');
    }
  }, [router, searchParams, fetchDetail]);
  // Store context in sessionStorage so /investigation can read it
  function handleAnalyze() {
  if (!pr) return;


  const context = {
    id: `gh-${repo}-${pr.number}`,
    number: pr.number,
    title: pr.title,
    author: pr.author,
    branch: pr.branch,
    baseBranch: pr.baseBranch,
    repo,
    description: pr.body ?? '',
    filesChanged: pr.files.map((f) => ({
      path: f.filename,
      additions: f.additions,
      deletions: f.deletions,
      diff: f.patch ?? '',
    })),
    createdAt: pr.createdAt,
  };

  console.log("context", context);

  try {
    const serialized = JSON.stringify(context);

    console.log("serialized:", serialized);
    console.log("sessionStorage:", sessionStorage);

    sessionStorage.setItem(
      'pr-doctor:pr-context',
      serialized
    );

    console.log(
      "AFTER SET:",
      sessionStorage.getItem('pr-doctor:pr-context')
    );

    sessionStorage.removeItem('pr-doctor:investigation');

    console.log(
      "AFTER REMOVE:",
      sessionStorage.getItem('pr-doctor:investigation')
    );

    router.push('/investigation');
  } catch (error) {
    console.error("SESSION STORAGE ERROR:", error);
  }
}

  const visibleFiles = pr
    ? (showAll ? pr.files : pr.files.slice(0, 10))
    : [];

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: '"IBM Plex Sans", system-ui, sans-serif', color: C.ink }}>

      {/* Nav */}
      <header style={{ background: C.chart, borderBottom: `1px solid ${C.ruleStrong}`, padding: '0 24px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', height: 52, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{ ...mono, fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', color: C.plex, textDecoration: 'none' }}>
            PR Doctor
          </Link>
          <span style={{ color: C.ruleStrong }}>›</span>
          <Link href="/pulls" style={{ ...mono, fontSize: 12, color: C.muted, textDecoration: 'none' }}>{repo}</Link>
          <span style={{ color: C.ruleStrong }}>›</span>
          <span style={{ ...mono, fontSize: 12, color: C.ink }}>#{number}</span>
        </div>
      </header>

      <div style={{ maxWidth: 1060, margin: '32px auto 0', padding: '0 24px 80px' }}>

        {loading && (
          <div style={{ padding: '60px 0', textAlign: 'center', ...mono, fontSize: 13, color: C.muted }}>
            Loading PR #{number}…
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: '24px', ...mono, fontSize: 13, color: C.block }}>{error}</div>
        )}

        {!loading && !error && pr && (
          <>
            {/* ── Header card ─────────────────────────────────────── */}
            <div style={{ background: C.chart, border: `1px solid ${C.ruleStrong}`, marginBottom: 1 }}>
              <div style={{ padding: '22px 26px 18px', borderBottom: `1px solid ${C.rule}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' as const }}>
                  <StatusPill state={pr.state} draft={pr.draft} />
                  <Eyebrow>#{pr.number}</Eyebrow>
                  {pr.labels.map(l => (
                    <span key={l} style={{ ...mono, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: C.plex, background: C.plexWash, padding: '2px 7px' }}>
                      {l}
                    </span>
                  ))}
                </div>
                <h1 style={{ fontFamily: '"IBM Plex Sans Condensed", sans-serif', fontWeight: 700, fontSize: 26, margin: '0 0 12px', lineHeight: 1.15 }}>
                  {pr.title}
                </h1>
                <div style={{ display: 'flex', gap: '8px 20px', flexWrap: 'wrap' as const, ...mono, fontSize: 12, color: C.muted }}>
                  <span>by <strong style={{ color: C.ink }}>{pr.author}</strong></span>
                  <span>{pr.branch} → {pr.baseBranch}</span>
                  <span>opened {relativeTime(pr.createdAt)}</span>
                  <span>updated {relativeTime(pr.updatedAt)}</span>
                  {pr.reviewComments > 0 && <span>{pr.reviewComments} review comment{pr.reviewComments !== 1 ? 's' : ''}</span>}
                  <span>{pr.commits} commit{pr.commits !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ padding: '12px 26px', display: 'flex', gap: 24, flexWrap: 'wrap' as const, alignItems: 'center', borderBottom: `1px solid ${C.rule}` }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <span style={{ ...mono, fontSize: 13, color: C.clear }}>+{pr.additions} additions</span>
                  <span style={{ ...mono, fontSize: 13, color: C.block }}>−{pr.deletions} deletions</span>
                  <span style={{ ...mono, fontSize: 13, color: C.muted }}>{pr.changedFiles} file{pr.changedFiles !== 1 ? 's' : ''} changed</span>
                </div>
                <a
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...mono, fontSize: 12, color: C.plex, textDecoration: 'none', marginLeft: 'auto', letterSpacing: '0.04em' }}
                >
                  View on GitHub ↗
                </a>
              </div>

              {/* Description */}
              {pr.body && (
                <div style={{ padding: '16px 26px', borderBottom: `1px solid ${C.rule}` }}>
                  <Eyebrow style={{ marginBottom: 8 }}>Description</Eyebrow>
                  <div style={{ fontSize: 14, lineHeight: 1.7, color: C.ink, whiteSpace: 'pre-wrap' as const, maxHeight: 240, overflow: 'hidden' }}>
                    {pr.body}
                  </div>
                </div>
              )}

              {/* Analyze CTA */}
              <div style={{ padding: '16px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>Run PR Doctor analysis</div>
                  <div style={{ fontSize: 13, color: C.muted }}>
                    Four IBM BOB 2.0 agents investigate this PR in parallel and return a BLOCK / NEEDS_WORK / MERGE verdict.
                  </div>
                </div>
                <button
                  onClick={() => handleAnalyze()}
                  style={{
                    background: C.plex,
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '12px 32px',
                    ...mono,
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap' as const,
                  }}
                >
                  Analyze this PR →
                </button>
              </div>
            </div>

            {/* ── Changed files ────────────────────────────────────── */}
            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Eyebrow>Changed files ({pr.changedFiles})</Eyebrow>
                {pr.files.length > 10 && (
                  <button
                    onClick={() => setShowAll(s => !s)}
                    style={{ ...mono, fontSize: 11, color: C.plex, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em' }}
                  >
                    {showAll ? 'Show fewer' : `Show all ${pr.files.length} files`}
                  </button>
                )}
              </div>
              <div>
                {visibleFiles.map(f => (
                  <FileCard key={f.filename} file={f} />
                ))}
              </div>
              {!showAll && pr.files.length > 10 && (
                <div style={{ marginTop: 8, ...mono, fontSize: 12, color: C.muted }}>
                  Showing 10 of {pr.files.length} files.{' '}
                  <button onClick={() => setShowAll(true)} style={{ ...mono, fontSize: 12, color: C.plex, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    Show all
                  </button>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
