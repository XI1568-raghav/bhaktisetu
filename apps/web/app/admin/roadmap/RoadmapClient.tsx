'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import OrchestratorProgress from './OrchestratorProgress';
import { H1 } from '../../../components/ui/heading-recipe';
import { formatDateTime } from '../../../lib/format-locale';

interface RoadmapItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  owner_role: string;
  category: string;
  quarter: string;
  kpi?: { metric: string; current: number; target: number; unit: string };
}

interface QueueEntry {
  filename: string;
  queueId: string;
  itemId: string;
  itemTitle?: string;
  role: string;
  priority: string;
  emittedAt: string;
  estMinutes: number;
  source?: string;
}

interface DecisionEntry {
  filename: string;
  content: string;
}

interface KpiEntry {
  value?: number | string | null;
  fetchedAt: string;
  stale?: boolean;
  error?: string;
  metric?: string;
}

interface TripwireEntry {
  id: string;
  name: string;
}

interface RoadmapData {
  index: { items: RoadmapItem[] };
  queue: QueueEntry[];
  decisions: DecisionEntry[];
  kpis: { entries: Record<string, KpiEntry> };
  tripwires: { all: TripwireEntry[] };
}

export default function RoadmapClient() {
  const { session } = useAuth();
  const token = session?.accessToken;
  const [data, setData] = useState<RoadmapData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setErr('No auth token — sign in as admin.');
      return;
    }

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const r = await fetch(`${API_BASE_URL}/admin/roadmap`, {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!r.ok) {
          throw new Error(`HTTP ${r.status} ${r.statusText}`);
        }
        const json = (await r.json()) as RoadmapData;
        if (!cancelled) {
          setData(json);
          setErr(null);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    const i = setInterval(fetchData, 60000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, [token]);

  if (err) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          <p className="font-semibold">Error loading roadmap</p>
          <p className="text-sm mt-1">{err}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="p-6 text-surface-500">{loading ? 'Loading…' : 'Initialising…'}</div>;
  }

  const items = data.index?.items || [];
  const byStatus = items.reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1;
    return acc;
  }, {});
  const verifiedPct = items.length > 0
    ? (((byStatus.verified || 0) * 100) / items.length).toFixed(1)
    : '0.0';

  const kpiEntries = Object.entries(data.kpis?.entries || {});

  // Build itemId → title lookup for queue + KPI panels
  const itemById: Record<string, RoadmapItem> = {};
  for (const it of items) itemById[it.id] = it;
  const metricToItem: Record<string, RoadmapItem> = {};
  for (const it of items) {
    if (it.kpi?.metric) metricToItem[it.kpi.metric] = it;
  }

  const formatKpiValue = (v: KpiEntry): { display: string; status: 'live' | 'stale' | 'error' } => {
    if (v.error) return { display: `err: ${v.error.slice(0, 30)}`, status: 'error' };
    if (v.stale && (v.value === undefined || v.value === null)) return { display: 'stale (awaiting scrape)', status: 'stale' };
    if (v.value === undefined || v.value === null) return { display: '—', status: 'stale' };
    return { display: String(v.value), status: 'live' };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className={H1.portal}>Bhaktisetu Roadmap — Year 1</h1>
        <p className="text-sm text-surface-500 mt-1">
          Autonomous Roadmap Engine — 60s auto-refresh. Reads git-tracked .md/.json/.yaml artifacts.
        </p>
      </div>

      {/* Panel 0: Live orchestrator progress (new — R-#93) */}
      <OrchestratorProgress />

      {/* Panel 1: Burn-down */}
      <section className="bg-white rounded-xl border border-surface-200 p-5">
        <h2 className="text-sm font-semibold text-surface-700 mb-3">Burn-down</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-semibold text-surface-900">{items.length} total</span>
          <span className="text-surface-300">·</span>
          <span className="text-emerald-700">
            {byStatus.verified || 0} verified ({verifiedPct}%)
          </span>
          <span className="text-surface-300">·</span>
          <span className="text-saffron-700">{byStatus.in_progress || 0} in_progress</span>
          <span className="text-surface-300">·</span>
          <span className="text-red-600">{byStatus.blocked || 0} blocked</span>
          <span className="text-surface-300">·</span>
          <span className="text-surface-600">{byStatus.planned || 0} planned</span>
          <span className="text-surface-300">·</span>
          <span className="text-indigo-700">{byStatus.shipped || 0} shipped</span>
          <span className="text-surface-300">·</span>
          <span className="text-surface-400">{byStatus.killed || 0} killed</span>
        </div>
      </section>

      {/* Panel 2: KPIs */}
      <section className="bg-white rounded-xl border border-surface-200 p-5">
        <h2 className="text-sm font-semibold text-surface-700 mb-3">Live KPIs (60s refresh)</h2>
        {kpiEntries.length === 0 ? (
          <p className="text-sm text-surface-500">
            No KPIs cached yet. Run orchestrator first cycle to populate.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {kpiEntries.slice(0, 18).map(([key, v]) => {
              const fmt = formatKpiValue(v);
              const metric = v.metric || key.split(':').slice(1).join(':');
              const item = metricToItem[metric];
              const target = item?.kpi?.target;
              const unit = item?.kpi?.unit;
              const bg =
                fmt.status === 'live'
                  ? 'bg-emerald-50 border-emerald-200'
                  : fmt.status === 'error'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-surface-50 border-surface-200';
              return (
                <div key={key} className={`border rounded-lg p-3 ${bg}`}>
                  <div className="font-mono text-xs text-surface-500 truncate" title={key}>
                    {key}
                  </div>
                  {item && (
                    <div className="text-xs text-surface-700 mt-0.5 truncate" title={item.title}>
                      {item.id}: {item.title}
                    </div>
                  )}
                  <div className="font-bold text-lg text-surface-900 mt-1">
                    {fmt.display}
                    {target && fmt.status === 'live' ? (
                      <span className="text-xs font-normal text-surface-500 ml-1">
                        / {target} {unit || ''}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-surface-400 mt-1">
                    {v.fetchedAt ? new Date(v.fetchedAt).toLocaleTimeString() : ''}
                    {fmt.status === 'stale' && (
                      <span className="ml-2 text-amber-700">⚠ stale</span>
                    )}
                    {fmt.status === 'error' && (
                      <span className="ml-2 text-red-700">⚠ error</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Panel 3: Queue */}
      <section className="bg-white rounded-xl border border-surface-200 p-5">
        <h2 className="text-sm font-semibold text-surface-700 mb-3">
          Queue ({data.queue.length})
        </h2>
        {data.queue.length === 0 ? (
          <p className="text-sm text-surface-500">
            Empty — orchestrator hasn't emitted prompts yet, OR all consumed.
          </p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 text-left text-xs text-surface-500">
                  <th className="py-2 pr-3 font-medium">queueId</th>
                  <th className="py-2 pr-3 font-medium">itemId</th>
                  <th className="py-2 pr-3 font-medium">Title</th>
                  <th className="py-2 pr-3 font-medium">role</th>
                  <th className="py-2 pr-3 font-medium">P</th>
                  <th className="py-2 pr-3 font-medium">min</th>
                  <th className="py-2 pr-3 font-medium">src</th>
                  <th className="py-2 pr-3 font-medium">emittedAt</th>
                </tr>
              </thead>
              <tbody>
                {data.queue.slice(0, 30).map((q) => {
                  const item = itemById[q.itemId];
                  const title = q.itemTitle || item?.title || '(item not in index)';
                  const srcBadge = q.source === 'dryrun'
                    ? <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-800">dryrun</span>
                    : <span className="px-1.5 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800">live</span>;
                  return (
                    <tr key={q.queueId + q.filename} className="border-b border-surface-100">
                      <td className="py-2 pr-3 font-mono text-xs text-surface-600">{q.queueId}</td>
                      <td className="py-2 pr-3 font-mono text-xs text-surface-700">{q.itemId}</td>
                      <td className="py-2 pr-3 text-surface-800" title={title}>{title}</td>
                      <td className="py-2 pr-3 text-surface-600">{q.role}</td>
                      <td className="py-2 pr-3 text-surface-600">{q.priority}</td>
                      <td className="py-2 pr-3 text-surface-600">{q.estMinutes}</td>
                      <td className="py-2 pr-3">{srcBadge}</td>
                      <td className="py-2 pr-3 text-xs text-surface-400">
                        {q.emittedAt ? formatDateTime(q.emittedAt) : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Panel 4: Tripwires */}
      <section className="bg-white rounded-xl border border-surface-200 p-5">
        <h2 className="text-sm font-semibold text-surface-700 mb-3">
          Tripwires ({data.tripwires.all.length})
        </h2>
        {data.tripwires.all.length === 0 ? (
          <p className="text-sm text-surface-500">No tripwires loaded.</p>
        ) : (
          <ul className="text-sm space-y-1.5">
            {data.tripwires.all.map((t) => (
              <li key={t.id} className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-surface-500">{t.id}</span>
                <span className="text-surface-800">{t.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Panel 5: Items board */}
      <section className="bg-white rounded-xl border border-surface-200 p-5">
        <h2 className="text-sm font-semibold text-surface-700 mb-3">
          Items ({items.length})
        </h2>
        <div className="overflow-auto max-h-96">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface-200 sticky top-0 bg-white text-left text-surface-500">
                <th className="py-2 pr-3 font-medium">id</th>
                <th className="py-2 pr-3 font-medium">title</th>
                <th className="py-2 pr-3 font-medium">status</th>
                <th className="py-2 pr-3 font-medium">P</th>
                <th className="py-2 pr-3 font-medium">owner</th>
                <th className="py-2 pr-3 font-medium">cat</th>
                <th className="py-2 pr-3 font-medium">Q</th>
                <th className="py-2 pr-3 font-medium">KPI</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 100).map((i) => (
                <tr key={i.id} className="border-b border-surface-100">
                  <td className="py-1.5 pr-3 font-mono text-surface-600">{i.id}</td>
                  <td className="py-1.5 pr-3 text-surface-800">{i.title}</td>
                  <td className="py-1.5 pr-3 text-surface-600">{i.status}</td>
                  <td className="py-1.5 pr-3 text-surface-600">{i.priority}</td>
                  <td className="py-1.5 pr-3 text-surface-600">{i.owner_role}</td>
                  <td className="py-1.5 pr-3 text-surface-600">{i.category}</td>
                  <td className="py-1.5 pr-3 text-surface-600">{i.quarter}</td>
                  <td className="py-1.5 pr-3 text-surface-600">
                    {i.kpi?.current ?? '?'}/{i.kpi?.target ?? '?'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {items.length > 100 && (
          <p className="text-xs text-surface-400 mt-2">
            Showing first 100 of {items.length} items.
          </p>
        )}
      </section>

      {/* Panel 6: Decision history */}
      <section className="bg-white rounded-xl border border-surface-200 p-5">
        <h2 className="text-sm font-semibold text-surface-700 mb-3">
          Decision history ({data.decisions.length})
        </h2>
        {data.decisions.length === 0 ? (
          <p className="text-sm text-surface-500">No decisions logged yet.</p>
        ) : (
          <details className="text-sm">
            <summary className="cursor-pointer text-surface-700 hover:text-saffron-700">
              Show recent decisions
            </summary>
            <div className="mt-3 space-y-4">
              {data.decisions.slice(0, 5).map((d) => (
                <div key={d.filename} className="border-l-2 border-saffron-300 pl-3">
                  <div className="font-mono text-xs text-surface-500">{d.filename}</div>
                  <pre className="text-xs text-surface-700 whitespace-pre-wrap mt-1 font-mono leading-relaxed">
                    {d.content.slice(0, 1000)}
                    {d.content.length > 1000 ? '…' : ''}
                  </pre>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>
    </div>
  );
}
