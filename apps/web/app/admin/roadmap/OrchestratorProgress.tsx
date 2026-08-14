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

interface PlannedItem {
  id: string;
  title: string;
  priority: string;
  quarter: string;
  owner_role: string;
  est_hours: number | null;
}

interface QueueItem {
  name: string;
  role: string;
  itemId: string;
  cycleTs: string;
}

interface FiredTripwire {
  id: string;
  shortTitle: string;
}

interface ShippedItem {
  id: string;
  title: string;
  priority: string;
  quarter: string;
  owner_role: string;
  shipped_at: string | null;
}

interface InProgressItem {
  id: string;
  title: string;
  priority: string;
  quarter: string;
  owner_role: string;
}

interface StatusOK {
  ok: true;
  runs: NormalizedRun[];
  commits: NormalizedCommit[];
  queueCount: number;
  queueItems: QueueItem[];
  plannedTop: PlannedItem[];
  shippedRecent: ShippedItem[];
  inProgress: InProgressItem[];
  tripwiresFired: FiredTripwire[];
  tripwiresCount: number;
  nextCronAt: string;
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
  const queueItems = ok ? data.queueItems : [];
  const plannedTop = ok ? data.plannedTop : [];
  const shippedRecent = ok ? data.shippedRecent : [];
  const inProgress = ok ? data.inProgress : [];
  const tripwiresCount = ok ? data.tripwiresCount : 0;
  const nextCronAt = ok ? data.nextCronAt : null;
  const latestRun = runs[0];
  const lastSuccessRun = runs.find((r) => r.conclusion === 'success');

  // PAST 24h: filter runs in last 24h, categorize outcome
  const now = Date.now();
  const past24 = runs.filter((r) => now - new Date(r.updatedAt).getTime() < 24 * 3600 * 1000);
  const past24Green = past24.filter((r) => r.conclusion === 'success').length;
  const past24Cancelled = past24.filter((r) => r.conclusion === 'cancelled').length;
  const past24Failed = past24.filter((r) => r.conclusion === 'failure' || r.conclusion === 'timed_out').length;
  const past24Running = past24.filter((r) => r.status === 'in_progress').length;

  // FUTURE: countdown to nextCronAt
  let nextCronCountdown: string = '—';
  if (nextCronAt) {
    const diff = new Date(nextCronAt).getTime() - now;
    if (diff > 0) {
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      nextCronCountdown = h > 0 ? `${h}h ${m}m` : `${m}m`;
    } else {
      nextCronCountdown = 'imminent';
    }
  }

  // STEP-BY-STEP: phase tracker for live-running cycle (best-effort, no log access).
  // Without per-step log scraping, infer from elapsed time vs typical phase wall times.
  // Typical green cycle phases (from cycle 13 log):
  //   00:00 boot · 00:47 ingest · 00:47 kpi (1.5min) · 02:17 fleet · 02:17 experiments
  //   02:17 decision (1min) · 03:21 subagents (2.5min) · 05:43 done · 05:47 commit+push
  const livePhases: Array<{ key: string; label: string; etaSec: number }> = [
    { key: 'boot', label: 'GH runner + pnpm install', etaSec: 50 },
    { key: 'ingest', label: 'Ingest 306 items + tripwires', etaSec: 52 },
    { key: 'kpi', label: 'KPI scrape (Supabase/PostHog/CF/GH)', etaSec: 145 },
    { key: 'fleet', label: 'Fleet agent summaries (28 agents)', etaSec: 147 },
    { key: 'experiments', label: 'Experiment tracker', etaSec: 147 },
    { key: 'decision', label: 'Decision Agent (Opus 4.7 / 16k / streaming)', etaSec: 210 },
    { key: 'subagents', label: 'Sub-agents fan-out (4 × Opus / 12k / 2 concurrent)', etaSec: 355 },
    { key: 'write', label: 'Write queue files + decision note', etaSec: 358 },
    { key: 'commit', label: 'Git commit + push to main (orchestrator-bot)', etaSec: 362 },
  ];
  let liveElapsedSec = 0;
  if (latestRun && latestRun.status === 'in_progress') {
    liveElapsedSec = Math.floor((now - new Date(latestRun.createdAt).getTime()) / 1000);
  }

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
            <div className="text-xs mt-0.5">GH rate: {data.rateLimit.remaining} left</div>
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
          <div className="text-xs uppercase tracking-wide text-surface-500">Green rate (last {completed.length})</div>
          <div className={`text-xl font-mono font-bold ${greenPct >= 80 ? 'text-emerald-700' : greenPct >= 50 ? 'text-saffron-700' : 'text-red-700'}`}>{greenPct}%</div>
          <div className="text-xs text-surface-500">{green}/{completed.length} cycles</div>
        </div>
        <div className="bg-surface-50 rounded-lg border border-surface-200 p-3">
          <div className="text-xs uppercase tracking-wide text-surface-500">Queue depth (dryrun)</div>
          <div className="text-xl font-mono font-bold text-surface-800">{queueCount}</div>
          <div className="text-xs text-surface-500">unconsumed items</div>
        </div>
        <div className="bg-surface-50 rounded-lg border border-surface-200 p-3">
          <div className="text-xs uppercase tracking-wide text-surface-500">Last green wall</div>
          <div className="text-xl font-mono font-bold text-surface-800">
            {lastSuccessRun ? fmtWall(lastSuccessRun.wallSeconds) : '—'}
          </div>
          <div className="text-xs text-surface-500">target &lt; 10min</div>
        </div>
      </div>

      {/* STEP-BY-STEP PHASE TRACKER — visible only when cycle running */}
      {latestRun && latestRun.status === 'in_progress' && (
        <div className="mb-4 bg-saffron-50/40 border border-saffron-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-saffron-900 uppercase tracking-wide">Cycle in progress — step-by-step</h3>
            <span className="text-xs font-mono text-saffron-700">{fmtWall(liveElapsedSec)} elapsed</span>
          </div>
          <div className="space-y-1">
            {livePhases.map((p, idx) => {
              const prevEta = idx === 0 ? 0 : (livePhases[idx - 1]?.etaSec ?? 0);
              const done = liveElapsedSec >= p.etaSec;
              const running = !done && liveElapsedSec >= prevEta;
              return (
                <div
                  key={p.key}
                  className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
                    done
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : running
                      ? 'bg-saffron-100 text-saffron-900 border border-saffron-300 animate-pulse'
                      : 'bg-white text-surface-500 border border-surface-200'
                  }`}
                >
                  <span className="font-mono font-bold w-4">{done ? '✓' : running ? '⏳' : '○'}</span>
                  <span className="flex-1 truncate">{p.label}</span>
                  <span className="font-mono text-xs opacity-75 shrink-0">~{p.etaSec}s</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-saffron-700/80">ETAs based on cycle 13 baseline (5min47s green). Live log unavailable inside GH runner — phase inferred from elapsed time.</p>
        </div>
      )}

      {/* 4-PANEL TIMELINE: PAST 24h / PRESENT / FUTURE / PIPELINE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {/* PAST 24h */}
        <div className="bg-surface-50/60 border border-surface-200 rounded-lg p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-surface-600 mb-2">Past 24h — outcomes</h3>
          <div className="flex flex-wrap gap-1.5">
            {past24.length === 0 ? (
              <span className="text-xs text-surface-400">No runs in last 24h.</span>
            ) : (
              past24.map((r) => {
                const b = runBadge(r);
                return (
                  <a
                    key={r.id}
                    href={r.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-mono ${b.classes}`}
                    title={`${r.title} — ${b.label} (${fmtWall(r.wallSeconds)})`}
                  >
                    <span>{b.icon}</span>
                    <span>{fmtWall(r.wallSeconds)}</span>
                  </a>
                );
              })
            )}
          </div>
          <div className="mt-2 text-xs text-surface-500 grid grid-cols-4 gap-1">
            <span className="text-emerald-700">✓ {past24Green} green</span>
            <span className="text-amber-700">⊘ {past24Cancelled} cancelled</span>
            <span className="text-red-700">✗ {past24Failed} failed</span>
            <span className="text-saffron-700">⏳ {past24Running} running</span>
          </div>
        </div>

        {/* FUTURE — next cron + countdown */}
        <div className="bg-blue-50/40 border border-blue-200 rounded-lg p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-2">Future — next scheduled cycle</h3>
          {nextCronAt ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-mono font-bold text-blue-900">{nextCronCountdown}</span>
                <span className="text-xs text-blue-700">until next cron</span>
              </div>
              <div className="mt-1 text-xs text-blue-700 font-mono">
                {new Date(nextCronAt).toLocaleString(undefined, { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'short' })} UTC
              </div>
              <div className="mt-2 text-xs text-blue-700/80">
                Schedule: <code className="font-mono bg-blue-100 px-1 rounded">17 */8 * * *</code> · 3 cycles/day @ 00:17 / 08:17 / 16:17 UTC
              </div>
            </>
          ) : (
            <span className="text-xs text-blue-700">—</span>
          )}
        </div>

        {/* PIPELINE — top planned items next cycle will likely pick */}
        <div className="bg-emerald-50/40 border border-emerald-200 rounded-lg p-3 md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Pipeline — top planned items (next cycle candidates)</h3>
            <span className="text-xs text-emerald-700">{plannedTop.length} of {tripwiresCount} tripwires armed</span>
          </div>
          {plannedTop.length === 0 ? (
            <span className="text-xs text-emerald-700">No planned items above founder-blocker filter.</span>
          ) : (
            <div className="space-y-1">
              {plannedTop.map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-2 py-1 rounded bg-white border border-emerald-100 text-xs">
                  <span className={`font-mono font-bold shrink-0 w-7 text-center text-xs px-1 rounded ${p.priority === 'P0' ? 'bg-red-100 text-red-700' : p.priority === 'P1' ? 'bg-amber-100 text-amber-700' : 'bg-surface-100 text-surface-600'}`}>{p.priority}</span>
                  <span className="font-mono text-xs text-surface-500 shrink-0 w-16 truncate">{p.id}</span>
                  <span className="flex-1 truncate text-surface-700">{p.title}</span>
                  <span className="font-mono text-xs text-surface-400 shrink-0">{p.owner_role}</span>
                  {p.est_hours !== null && (
                    <span className="font-mono text-xs text-surface-400 shrink-0">{p.est_hours}h</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SHIPPED RECENT — what actually closed in last 14d (proof of throughput) */}
        {shippedRecent.length > 0 && (
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3 md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Shipped — last 14 days ({shippedRecent.length})</h3>
              <span className="text-xs text-emerald-700">closed by orchestrator + claude-code session</span>
            </div>
            <div className="space-y-1">
              {shippedRecent.map((s) => (
                <div key={s.id} className="flex items-center gap-2 px-2 py-1 rounded bg-white border border-emerald-100 text-xs">
                  <span className="font-mono font-bold shrink-0 w-4 text-emerald-700">✓</span>
                  <span className={`font-mono font-bold shrink-0 w-7 text-center text-xs px-1 rounded ${s.priority === 'P0' ? 'bg-red-100 text-red-700' : s.priority === 'P1' ? 'bg-amber-100 text-amber-700' : 'bg-surface-100 text-surface-600'}`}>{s.priority}</span>
                  <span className="font-mono text-xs text-surface-500 shrink-0 w-16 truncate">{s.id}</span>
                  <span className="flex-1 truncate text-surface-700">{s.title}</span>
                  <span className="font-mono text-xs text-surface-400 shrink-0">{s.owner_role}</span>
                  {s.shipped_at && (
                    <span className="font-mono text-xs text-surface-400 shrink-0 w-16 text-right">{fmtRelative(s.shipped_at)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* IN-PROGRESS — items started but not closed (visibility into WIP) */}
        {inProgress.length > 0 && (
          <div className="bg-saffron-50/60 border border-saffron-200 rounded-lg p-3 md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-saffron-800">In progress ({inProgress.length})</h3>
              <span className="text-xs text-saffron-700">started, awaiting completion or founder-action</span>
            </div>
            <div className="space-y-1">
              {inProgress.map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-2 py-1 rounded bg-white border border-saffron-100 text-xs">
                  <span className="font-mono font-bold shrink-0 w-4 text-saffron-700">⏳</span>
                  <span className={`font-mono font-bold shrink-0 w-7 text-center text-xs px-1 rounded ${p.priority === 'P0' ? 'bg-red-100 text-red-700' : p.priority === 'P1' ? 'bg-amber-100 text-amber-700' : 'bg-surface-100 text-surface-600'}`}>{p.priority}</span>
                  <span className="font-mono text-xs text-surface-500 shrink-0 w-16 truncate">{p.id}</span>
                  <span className="flex-1 truncate text-surface-700">{p.title}</span>
                  <span className="font-mono text-xs text-surface-400 shrink-0">{p.owner_role}</span>
                  <span className="font-mono text-xs text-surface-400 shrink-0">{p.quarter}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QUEUE — unconsumed items (what was emitted but not yet handled) */}
        {queueItems.length > 0 && (
          <div className="bg-amber-50/40 border border-amber-200 rounded-lg p-3 md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-800">Queue — unconsumed sub-agent emissions</h3>
              <span className="text-xs text-amber-700">{queueCount} total · showing top {Math.min(10, queueItems.length)}</span>
            </div>
            <div className="space-y-1">
              {queueItems.slice(0, 10).map((q) => (
                <div key={q.name} className="flex items-center gap-2 px-2 py-1 rounded bg-white border border-amber-100 text-xs">
                  <span className="font-mono text-xs text-amber-600 shrink-0 w-12 text-center bg-amber-100 rounded px-1">{q.role || '?'}</span>
                  <span className="font-mono text-xs text-surface-700 shrink-0 w-24 truncate">{q.itemId || '—'}</span>
                  <span className="flex-1 truncate text-surface-500 font-mono text-xs">{q.name}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-amber-700/80">
              Each queue item is a sub-agent prompt waiting for human consumption (via session UserPromptSubmit hook routes it into Claude Code session).
            </p>
          </div>
        )}
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
                  <span className="font-mono text-xs opacity-75 shrink-0">{fmtWall(r.wallSeconds)}</span>
                  <span className="font-mono text-xs opacity-50 shrink-0 w-16 text-right">{fmtRelative(r.updatedAt)}</span>
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
                <span className="font-mono text-xs text-surface-400 shrink-0">{fmtRelative(c.date)}</span>
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
      <div className="mt-4 pt-3 border-t border-surface-100 flex items-center justify-between text-xs text-surface-500">
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
