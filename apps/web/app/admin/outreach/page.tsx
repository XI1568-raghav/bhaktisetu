'use client';

import { useEffect, useState } from 'react';
import { Loader2, PlayCircle } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import { H1 } from '../../../components/ui/heading-recipe';
import { buttonClass } from '../../../components/ui/button-recipe';
import { userFacingMessage } from '../../../lib/friendly-error';

interface OutreachStats {
  daily: Array<{ date: string; sent: number; replied: number; bounced: number }>;
  totals: { sent: number; replied: number; bounced: number };
}

interface LeadsStats {
  byRole: Record<string, Record<string, number>>;
  total: number;
  replied: number;
  converted: number;
}

const ROLES = ['TEMPLE', 'PRIEST', 'ASTROLOGER', 'WELLNESS_INSTRUCTOR', 'GAUSHALA'];

async function authFetch<T>(token: string | undefined, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export default function AdminOutreachPage() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [outreach, setOutreach] = useState<OutreachStats | null>(null);
  const [leads, setLeads] = useState<LeadsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [a, b] = await Promise.all([
          authFetch<OutreachStats>(token, '/admin/outreach/stats'),
          authFetch<LeadsStats>(token, '/admin/leads/stats'),
        ]);
        if (cancelled) return;
        setOutreach(a);
        setLeads(b);
      } catch (err) {
        if (!cancelled) setError(userFacingMessage(err, 'Failed to load stats'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const runNow = async () => {
    if (!token) return;
    setRunning(true);
    setError(null);
    setRunResult(null);
    try {
      const r = await authFetch<{ ok: boolean; result: unknown }>(token, '/admin/outreach/run', {
        method: 'POST',
      });
      setRunResult(JSON.stringify(r.result));
      const a = await authFetch<OutreachStats>(token, '/admin/outreach/stats');
      setOutreach(a);
    } catch (err) {
      setError(userFacingMessage(err, 'Run failed'));
    } finally {
      setRunning(false);
    }
  };

  const maxDailyValue = Math.max(
    1,
    ...(outreach?.daily.flatMap((d) => [d.sent, d.replied, d.bounced]) ?? [1]),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={H1.portal}>Outreach</h1>
          <p className="text-sm text-surface-500 mt-0.5">30-day email performance</p>
        </div>
        <button
          onClick={runNow}
          disabled={running || !token}
          className={buttonClass('primary', 'md')}
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
          Run outreach now
        </button>
      </div>

      {runResult && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg p-3 font-mono">
          {runResult}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Sent (30d)" value={(outreach?.totals.sent ?? 0).toLocaleString('en-IN')} color="text-blue-600" />
        <StatCard label="Replied (30d)" value={(outreach?.totals.replied ?? 0).toLocaleString('en-IN')} color="text-green-600" />
        <StatCard label="Bounced (30d)" value={(outreach?.totals.bounced ?? 0).toLocaleString('en-IN')} color="text-red-600" />
      </div>

      {/* 30-day chart */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
        <h2 className="text-sm font-semibold text-surface-800 mb-4">Daily Activity</h2>
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-saffron-600 mx-auto" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1 min-w-[600px] h-40">
              {(outreach?.daily ?? []).map((d) => {
                const total = d.sent + d.replied + d.bounced;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-0.5" title={`${d.date}: sent ${d.sent}, replied ${d.replied}, bounced ${d.bounced}`}>
                    {d.bounced > 0 && (
                      <div
                        className="w-full bg-red-400 rounded-t"
                        style={{ height: `${(d.bounced / maxDailyValue) * 100}%` }}
                      />
                    )}
                    {d.replied > 0 && (
                      <div
                        className="w-full bg-green-500"
                        style={{ height: `${(d.replied / maxDailyValue) * 100}%` }}
                      />
                    )}
                    {d.sent > 0 && (
                      <div
                        className="w-full bg-blue-500 rounded-t"
                        style={{ height: `${(d.sent / maxDailyValue) * 100}%` }}
                      />
                    )}
                    {total === 0 && <div className="w-full h-px bg-surface-200" />}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-3 text-xs text-surface-500">
              <Legend color="bg-blue-500" label="Sent" />
              <Legend color="bg-green-500" label="Replied" />
              <Legend color="bg-red-400" label="Bounced" />
            </div>
          </div>
        )}
      </div>

      {/* Per-role breakdown */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
        <h2 className="text-sm font-semibold text-surface-800 mb-4">Per-Role Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2 px-3 text-xs font-medium text-surface-500 uppercase">Role</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-surface-500 uppercase">Total</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-surface-500 uppercase">Emailed</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-surface-500 uppercase">Replied</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-surface-500 uppercase">Converted</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-surface-500 uppercase">Reply Rate</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map((r) => {
                const row = leads?.byRole[r] ?? {};
                const total = Object.values(row).reduce((a, b) => a + b, 0);
                const emailed = (row.EMAILED ?? 0) + (row.REPLIED ?? 0) + (row.CONVERTED ?? 0);
                const replied = (row.REPLIED ?? 0) + (row.CONVERTED ?? 0);
                const converted = row.CONVERTED ?? 0;
                const rate = emailed > 0 ? ((replied / emailed) * 100).toFixed(1) : '—';
                return (
                  <tr key={r} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-2 px-3 font-medium text-surface-800">{r.replace('_', ' ')}</td>
                    <td className="py-2 px-3 text-right">{total}</td>
                    <td className="py-2 px-3 text-right">{emailed}</td>
                    <td className="py-2 px-3 text-right">{replied}</td>
                    <td className="py-2 px-3 text-right">{converted}</td>
                    <td className="py-2 px-3 text-right">{rate}{rate !== '—' ? '%' : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)]">
      <p className="text-xs text-surface-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded ${color}`} />
      {label}
    </span>
  );
}
