'use client';

// OrchestratorProgress — live progress bar for autonomous roadmap orchestrator.
// Fetches GET /api/v1/admin/roadmap/orchestrator-status every 10s.
// Parses log tail to detect current phase, percent complete, halted/error state.
// Phases: lock → ingest → kpi → tripwires → decision → subagents → write → commit/push → done

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../../lib/api-config';

interface CycleSummary {
  cycleId: string;
  size: number;
  mtime: string;
}

interface OrchestratorStatus {
  status: string;
  cycles: CycleSummary[];
  latestLogTail: string | null;
}

interface PhaseState {
  key: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error' | 'skipped';
  detail?: string;
}

// Phase keywords to scan in log tail (order = pipeline order)
const PHASE_PATTERNS: { key: string; label: string; regex: RegExp }[] = [
  { key: 'spawn', label: 'GH Actions job start', regex: /Running orchestrator|wrapper start|spawned at|orchestrator start/i },
  { key: 'gitsync', label: 'Checkout main (actions/checkout@v4)', regex: /actions\/checkout|fetch-depth|origin\/main/i },
  { key: 'orchstart', label: 'Orchestrator boot', regex: /orchestrator start|cycle C-[\d-T]+\s+start|\[orchestrator\] boot/i },
  { key: 'ingest', label: 'Ingest 303 items + tripwires', regex: /ingested \d+ items/i },
  { key: 'kpi', label: 'Scrape KPIs (Supabase + PostHog + CF)', regex: /scraped \d+ KPIs/i },
  { key: 'fleet', label: 'Fleet agent summaries', regex: /fleet summary:|fleet summary skipped/i },
  { key: 'experiments', label: 'A/B experiment tracker', regex: /experiments: \d+ tracked|experiments skipped/i },
  { key: 'tripwires', label: 'Evaluate tripwires', regex: /fired tripwires:/i },
  { key: 'decision', label: 'Decision Agent (Opus 4.7 / 16k / 10min, streaming)', regex: /\[orchestrator\] decision: spawn \d+, defer \d+, kill \d+/i },
  { key: 'subagents', label: 'Sub-agents fan-out (Opus 4.7 / 12k / 4 max, 2 concurrent)', regex: /sub-agent runner.*emitted|queueFiles\.push|RoundTrip|\[sub-agent\]/i },
  { key: 'write', label: 'Write queue files + decision note', regex: /cycle .+ done\. \d+ queue files written/i },
  { key: 'commit', label: 'Git commit + push to main (orchestrator-bot[bot])', regex: /PUSH OK|PUSH RETRY OK|push origin HEAD:main/i },
  { key: 'done', label: 'Cycle complete', regex: /Wrapper done \(exit=0\)|cycle .+ done/i },
];

const ERROR_PATTERNS = [
  { key: 'misconfig', label: 'CRON_AUTH_TOKEN env unset (fail-loud)', regex: /cron_auth_misconfigured|GH_ORCHESTRATOR_PAT not set/i },
  { key: 'lock', label: 'Another cycle in flight (lock held)', regex: /another cycle in flight/i },
  { key: 'model-rejected', label: 'Opus 4.7 rejected by Blackbox proxy (halted)', regex: /ModelRejectedError|model-rejected/i },
  { key: 'decision-error', label: 'Decision Agent error (see _alerts/decision-error-*.md)', regex: /decision-error|Streaming is strongly recommended|Decision Agent timeout/i },
  { key: 'push-fail', label: 'Git push failed', regex: /PUSH FAILED|PUSH RETRY FAILED/i },
  { key: 'uncaught', label: 'Uncaught exception', regex: /UNCAUGHT:|uncaught-/i },
  { key: 'oom', label: 'Out-of-memory (GH runner 7GB exhausted)', regex: /Killed|OOM|out of memory|JavaScript heap out of memory/i },
  { key: 'gh-timeout', label: 'GH timeout (50min ceiling hit)', regex: /The job running on runner .+ has exceeded the maximum execution time|timeout-minutes: 50/i },
];

function buildPhases(logTail: string | null): { phases: PhaseState[]; errorLabel: string | null; percent: number } {
  const phases: PhaseState[] = PHASE_PATTERNS.map((p) => ({ key: p.key, label: p.label, status: 'pending' }));
  let errorLabel: string | null = null;

  if (!logTail) {
    return { phases, errorLabel, percent: 0 };
  }

  // Detect errors first — they short-circuit the pipeline.
  for (const e of ERROR_PATTERNS) {
    if (e.regex.test(logTail)) {
      errorLabel = e.label;
      break;
    }
  }

  // Mark phases done in order. A phase is "done" if its regex matches in log.
  // The last matched phase is "running" UNTIL the next one matches OR cycle ends.
  let lastMatchedIdx = -1;
  for (let i = 0; i < PHASE_PATTERNS.length; i++) {
    if (PHASE_PATTERNS[i].regex.test(logTail)) {
      lastMatchedIdx = i;
    }
  }

  for (let i = 0; i < phases.length; i++) {
    if (i < lastMatchedIdx) {
      phases[i].status = 'done';
    } else if (i === lastMatchedIdx) {
      // If last phase ('done') matches, mark all as done.
      // Otherwise current phase is still running.
      phases[i].status = lastMatchedIdx === phases.length - 1 ? 'done' : 'running';
    }
  }

  // If error detected, mark current running phase as error.
  if (errorLabel) {
    for (let i = phases.length - 1; i >= 0; i--) {
      if (phases[i].status === 'running' || phases[i].status === 'pending') {
        phases[i].status = 'error';
        phases[i].detail = errorLabel;
        break;
      }
    }
  }

  const doneCount = phases.filter((p) => p.status === 'done').length;
  const percent = Math.round((doneCount / phases.length) * 100);

  return { phases, errorLabel, percent };
}

function statusBadge(status: PhaseState['status']): { icon: string; classes: string } {
  switch (status) {
    case 'done':
      return { icon: '✓', classes: 'bg-emerald-100 text-emerald-700 border-emerald-300' };
    case 'running':
      return { icon: '⏳', classes: 'bg-saffron-100 text-saffron-800 border-saffron-300 animate-pulse' };
    case 'error':
      return { icon: '✗', classes: 'bg-red-100 text-red-700 border-red-300' };
    case 'skipped':
      return { icon: '⊘', classes: 'bg-surface-100 text-surface-500 border-surface-300' };
    default:
      return { icon: '○', classes: 'bg-surface-50 text-surface-400 border-surface-200' };
  }
}

export default function OrchestratorProgress() {
  const [data, setData] = useState<OrchestratorStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStatus() {
      try {
        const r = await fetch(`${API_BASE_URL}/admin/roadmap/orchestrator-status`, {
          cache: 'no-store',
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as OrchestratorStatus;
        if (!cancelled) {
          setData(j);
          setErr(null);
          setLastFetch(new Date());
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      }
    }

    fetchStatus();
    const i = setInterval(fetchStatus, 10000); // 10s refresh
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, []);

  const { phases, errorLabel, percent } = buildPhases(data?.latestLogTail || null);

  const cycleCount = data?.cycles?.length ?? 0;
  const latestCycle = data?.cycles?.[0];

  // Top-level summary state
  let summary: { label: string; classes: string };
  if (err) {
    summary = { label: `Status endpoint unreachable: ${err}`, classes: 'bg-red-50 border-red-300 text-red-800' };
  } else if (data?.status === 'no-logs' || cycleCount === 0) {
    summary = {
      label: 'Idle — waiting on next GH cron run (every 8hr at :17 UTC). Manual trigger: gh workflow run roadmap-loop.yml',
      classes: 'bg-surface-50 border-surface-300 text-surface-700',
    };
  } else if (errorLabel) {
    summary = { label: `HALTED — ${errorLabel}`, classes: 'bg-red-50 border-red-300 text-red-800' };
  } else if (percent === 100) {
    summary = { label: 'Last cycle: DONE ✓', classes: 'bg-emerald-50 border-emerald-300 text-emerald-800' };
  } else {
    summary = {
      label: `Running — ${percent}% (${phases.find((p) => p.status === 'running')?.label || 'in progress'})`,
      classes: 'bg-saffron-50 border-saffron-300 text-saffron-900',
    };
  }

  return (
    <section className="bg-white rounded-xl border border-surface-200 p-5">
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h2 className="text-sm font-semibold text-surface-700">Autonomous Orchestrator — Live Progress</h2>
          <p className="text-xs text-surface-500 mt-0.5">
            Every 8hr via GH Actions runner · Opus 4.7 Decision Agent · 4 sub-agents max (2 concurrent) · pushes to main as orchestrator-bot · 10s UI refresh
          </p>
        </div>
        <div className="text-xs text-surface-400 shrink-0">
          {lastFetch ? `synced ${lastFetch.toLocaleTimeString()}` : 'connecting…'}
        </div>
      </div>

      {/* Summary banner */}
      <div className={`rounded-lg border p-3 mb-4 text-sm font-medium ${summary.classes}`}>
        {summary.label}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-surface-500 mb-1">
          <span>Cycle progress</span>
          <span className="font-mono">{percent}%</span>
        </div>
        <div className="w-full bg-surface-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 transition-all duration-500 ${
              errorLabel ? 'bg-red-500' : percent === 100 ? 'bg-emerald-500' : 'bg-saffron-500'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Phase ladder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
        {phases.map((p) => {
          const b = statusBadge(p.status);
          return (
            <div
              key={p.key}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${b.classes}`}
              title={p.detail}
            >
              <span className="font-mono font-bold">{b.icon}</span>
              <span className="flex-1 truncate">{p.label}</span>
              {p.detail && <span className="text-[10px] opacity-75 truncate ml-1">{p.detail}</span>}
            </div>
          );
        })}
      </div>

      {/* Cycle history (last 10) */}
      {cycleCount > 0 && (
        <details className="mb-4">
          <summary className="cursor-pointer text-sm font-semibold text-surface-700 hover:text-saffron-700">
            Recent cycles ({cycleCount})
          </summary>
          <div className="mt-2 space-y-1">
            {data!.cycles.slice(0, 10).map((c) => (
              <div key={c.cycleId} className="flex items-center justify-between text-xs text-surface-600 font-mono py-1 border-b border-surface-100">
                <span>{c.cycleId}</span>
                <span className="text-surface-400">{c.size}B · {new Date(c.mtime).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Log tail (collapsed) */}
      {data?.latestLogTail && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-surface-700 hover:text-saffron-700">
            Live log tail ({latestCycle?.cycleId || 'latest'})
          </summary>
          <pre className="mt-2 text-[11px] text-surface-700 bg-surface-50 border border-surface-200 rounded p-3 overflow-auto max-h-72 font-mono whitespace-pre-wrap leading-relaxed">
            {data.latestLogTail}
          </pre>
        </details>
      )}

      {/* Idle hint — architecture now GH-runner native, no setup beyond secrets */}
      {(data?.status === 'no-logs' || cycleCount === 0) && !err && (
        <div className="mt-4 text-xs text-surface-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="font-semibold text-amber-900 mb-1">Orchestrator runs inside GH Actions runner (Option 2-GH).</p>
          <p className="text-amber-800">Cron: <code className="font-mono bg-amber-100 px-1 rounded">17 */8 * * *</code> (3 cycles/day @ 00:17 / 08:17 / 16:17 UTC). Each cycle: ingest 303 items → KPI scrape → tripwires → Opus 4.7 Decision Agent → up to 4 sub-agents fan-out → write queue → commit + push to main as orchestrator-bot[bot] (with <code>[skip ci]</code>).</p>
          <p className="mt-2 text-amber-800">Manual trigger: <code className="font-mono bg-amber-100 px-1 rounded">gh workflow run roadmap-loop.yml -f dry_run=true</code>. Full audit trail in <a href="https://github.com" className="underline">Actions tab</a> + git log <code>orchestrator-bot[bot]</code>.</p>
        </div>
      )}
    </section>
  );
}
