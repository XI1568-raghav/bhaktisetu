'use client';

// OrchestratorProgress — live status of Autonomous Roadmap Engine.
// Reads from /api/orchestrator-status (Next.js edge route → GitHub Actions REST API).
// Replaces dead Render-disk endpoint (orchestrator now runs on GH runners).
//
// Data shape from GET /api/orchestrator-status:
//   { runs: [{id, status, conclusion, wallSeconds, htmlUrl, ...}], commits: [...], queueCount }
//
// Status semantics:
//   - status='in_progress'              → cycle running, show pulse
//   - status='completed' conclusion='success' → green ✓
//   - status='completed' conclusion='cancelled' → red ✗ (timeout/manual cancel)
//   - status='completed' conclusion='failure'   → red ✗

import { useEffect, useState } from 'react';

interface NormalizedRun {
  id: number;
  status: string;
  conclusion: string | null;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
  title: string;
  wallSeconds: number;
}

interface NormalizedCommit {
  sha: string;
  shortSha: string;
  message: string;
  date: string;
  htmlUrl: string;
}

interface StatusOK {
  ok: true;
  runs: NormalizedRun[];
  commits: NormalizedCommit[];
  queueCount: number;
  fetchedAt: string;
  rateLimit: { remaining: number | null; reset: number | null };
}

interface StatusErr {
  ok: false;
  error: string;
}

type Status = StatusOK | StatusErr;

function fmtWall(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m${s.toString().padStart(2, '0')}s`;
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function runBadge(run: NormalizedRun): { icon: string; label: string; classes: string } {
  if (run.status === 'in_progress' || run.status === 'queued') {
    return { icon: '⏳', label: 'Running', classes: 'bg-saffron-100 text-saffron-800 border-saffron-300 animate-pulse' };
  }
  if (run.conclusion === 'success') {
    return { icon: '✓', label: 'Success', classes: 'bg-emerald-100 text-emerald-700 border-emerald-300' };
  }
  if (run.conclusion === 'cancelled') {
    return { icon: '⊘', label: 'Cancelled', classes: 'bg-amber-100 text-amber-700 border-amber-300' };
  }
  if (run.conclusion === 'failure' || run.conclusion === 'timed_out') {
    return { icon: '✗', label: run.conclusion === 'timed_out' ? 'Timed out' : 'Failed', classes: 'bg-red-100 text-red-700 border-red-300' };
  }
  return { icon: '○', label: run.status, classes: 'bg-surface-50 text-surface-500 border-surface-300' };
}

export default function OrchestratorProgress() {
  const [data, setData] = useState<Status | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStatus() {
      try {
        const r = await fetch('/api/orchestrator-status', { cache: 'no-store' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as Status;
        if (!cancelled) {
          setData(j);
          setErr(j.ok ? null : j.error);
          setLastFetch(new Date());
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      }
    }

    fetchStatus();
    const i = setInterval(fetchStatus, 30000); // 30s refresh (matches edge cache TTL)
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, []);

  const ok = data && data.ok;
  const runs = ok ? data.runs : [];
  const commits = ok ? data.commits : [];
  const queueCount = ok ? data.queueCount : 0;
  const latestRun = runs[0];
  const lastSuccessRun = runs.find((r) => r.conclusion === 'success');

  // Top-level summary state
  let summary: { label: string; classes: string };
  if (err) {
    summary = { label: `Status endpoint unreachable: ${err}`, classes: 'bg-red-50 border-red-300 text-red-800' };
  } else if (!latestRun) {
    summary = {
      label: 'No workflow runs yet — waiting on first GH cron (every 8hr at :17 UTC).',
      classes: 'bg-surface-50 border-surface-300 text-surface-700',
    };
  } else if (latestRun.status === 'in_progress') {
    summary = {
      label: `Cycle running — ${fmtWall(Math.floor((Date.now() - new Date(latestRun.createdAt).getTime()) / 1000))} elapsed (typical green cycle ~5-6min)`,
      classes: 'bg-saffron-50 border-saffron-300 text-saffron-900',
    };
  } else if (latestRun.conclusion === 'success') {
    summary = {
      label: `Last cycle: GREEN ✓ — ${fmtWall(latestRun.wallSeconds)} wall, ${fmtRelative(latestRun.updatedAt)}`,
      classes: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    };
  } else {
    const lastOK = lastSuccessRun ? ` (last green: ${fmtRelative(lastSuccessRun.updatedAt)})` : '';
    summary = {
      label: `Last cycle: ${latestRun.conclusion?.toUpperCase() || 'UNKNOWN'} — ${fmtWall(latestRun.wallSeconds)} wall${lastOK}`,
      classes: 'bg-red-50 border-red-300 text-red-800',
    };
  }

  // Health score: % green over last 10 runs
  const completed = runs.filter((r) => r.status === 'completed');
  const green = completed.filter((r) => r.conclusion === 'success').length;
  const greenPct = completed.length ? Math.round((green / completed.length) * 100) : 0;

  return (
    <section className="bg-white rounded-xl border border-surface-200 p-5">
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h2 className="text-sm font-semibold text-surface-700">Autonomous Orchestrator — Live Status</h2>
          <p className="text-xs text-surface-500 mt-0.5">
            GitHub Actions runner · Opus 4.7 Decision Agent · 4 sub-agents max (2 concurrent) · pushes to main as orchestrator-bot · 30s refresh
          </p>
        </div>
        <div className="text-xs text-surface-400 shrink-0 text-right">
          {lastFetch ? `synced ${lastFetch.toLocaleTimeString()}` : 'connecting…'}
          {ok && data.rateLimit.remaining !== null && (
            <div className="text-[10px] mt-0.5">GH rate: {data.rateLimit.remaining} left</div>
          )}
        </div>
      </div>

      {/* Summary banner */}
      <div className={`rounded-lg border p-3 mb-4 text-sm font-medium ${summary.classes}`}>
        {summary.label}
      </div>

      {/* Health stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-surface-50 rounded-lg border border-surface-200 p-3">
          <div className="text-[10px] uppercase tracking-wide text-surface-500">Green rate (last {completed.length})</div>
          <div className={`text-xl font-mono font-bold ${greenPct >= 80 ? 'text-emerald-700' : greenPct >= 50 ? 'text-saffron-700' : 'text-red-700'}`}>{greenPct}%</div>
          <div className="text-[10px] text-surface-500">{green}/{completed.length} cycles</div>
        </div>
        <div className="bg-surface-50 rounded-lg border border-surface-200 p-3">
          <div className="text-[10px] uppercase tracking-wide text-surface-500">Queue depth (dryrun)</div>
          <div className="text-xl font-mono font-bold text-surface-800">{queueCount}</div>
          <div className="text-[10px] text-surface-500">unconsumed items</div>
        </div>
        <div className="bg-surface-50 rounded-lg border border-surface-200 p-3">
          <div className="text-[10px] uppercase tracking-wide text-surface-500">Last green wall</div>
          <div className="text-xl font-mono font-bold text-surface-800">
            {lastSuccessRun ? fmtWall(lastSuccessRun.wallSeconds) : '—'}
          </div>
          <div className="text-[10px] text-surface-500">target &lt; 10min</div>
        </div>
      </div>

      {/* Recent runs (last 10) */}
      {runs.length > 0 && (
        <details open className="mb-4">
          <summary className="cursor-pointer text-sm font-semibold text-surface-700 hover:text-saffron-700">
            Recent workflow runs ({runs.length})
          </summary>
          <div className="mt-2 space-y-1">
            {runs.map((r) => {
              const b = runBadge(r);
              return (
                <a
                  key={r.id}
                  href={r.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs hover:opacity-80 transition-opacity ${b.classes}`}
                >
                  <span className="font-mono font-bold w-4">{b.icon}</span>
                  <span className="w-20 font-mono shrink-0">{b.label}</span>
                  <span className="flex-1 truncate">{r.title}</span>
                  <span className="font-mono text-[10px] opacity-75 shrink-0">{fmtWall(r.wallSeconds)}</span>
                  <span className="font-mono text-[10px] opacity-50 shrink-0 w-16 text-right">{fmtRelative(r.updatedAt)}</span>
                </a>
              );
            })}
          </div>
        </details>
      )}

      {/* Recent orchestrator-bot commits */}
      {commits.length > 0 && (
        <details className="mb-4">
          <summary className="cursor-pointer text-sm font-semibold text-surface-700 hover:text-saffron-700">
            Recent orchestrator commits ({commits.length})
          </summary>
          <div className="mt-2 space-y-1">
            {commits.map((c) => (
              <a
                key={c.sha}
                href={c.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded text-xs text-surface-700 hover:bg-surface-50 border border-surface-100"
              >
                <span className="font-mono text-surface-500 shrink-0">{c.shortSha}</span>
                <span className="flex-1 truncate">{c.message}</span>
                <span className="font-mono text-[10px] text-surface-400 shrink-0">{fmtRelative(c.date)}</span>
              </a>
            ))}
          </div>
        </details>
      )}

      {/* Idle hint — no runs yet */}
      {ok && !latestRun && (
        <div className="mt-4 text-xs text-surface-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="font-semibold text-amber-900 mb-1">Orchestrator runs inside GitHub Actions runner (Option 2-GH).</p>
          <p className="text-amber-800">
            Cron: <code className="font-mono bg-amber-100 px-1 rounded">17 */8 * * *</code> (3 cycles/day @ 00:17 / 08:17 / 16:17 UTC).
            Each cycle: ingest 306 items → KPI scrape → tripwires → Opus 4.7 Decision Agent → up to 4 sub-agents fan-out → write queue → commit + push to main as orchestrator-bot[bot] (with <code>[skip ci]</code>).
          </p>
          <p className="mt-2 text-amber-800">
            Manual trigger: <code className="font-mono bg-amber-100 px-1 rounded">gh workflow run roadmap-loop.yml -f dry_run=true</code>
          </p>
        </div>
      )}

      {/* Source links */}
      <div className="mt-4 pt-3 border-t border-surface-100 flex items-center justify-between text-[11px] text-surface-500">
        <span>
          Source:{' '}
          <a
            href="https://github.com/XI1568-raghav/bhaktisetu/actions/workflows/roadmap-loop.yml"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-saffron-700"
          >
            GH Actions
          </a>
          {' · '}
          <a
            href="https://github.com/XI1568-raghav/bhaktisetu/commits/main?author=orchestrator-bot"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-saffron-700"
          >
            commits
          </a>
        </span>
        <span>via GitHub REST API (cached 30s)</span>
      </div>
    </section>
  );
}
