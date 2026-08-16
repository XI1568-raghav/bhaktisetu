'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import { H1 } from '../../../components/ui/heading-recipe';

interface WaitlistStats {
  total: number;
  confirmed: number;
  invited: number;
  converted: number;
  topReferrers: Array<{ rank: number; email: string; referralCount: number }>;
  daily: Array<{ date: string; signups: number }>;
  funnel: { pending: number; confirmed: number; invited: number; converted: number };
}

async function authFetch<T>(token: string | undefined, path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export default function AdminWaitlistPage() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [stats, setStats] = useState<WaitlistStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const s = await authFetch<WaitlistStats>(token, '/admin/waitlist/stats');
        if (!cancelled) setStats(s);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load waitlist stats');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const maxSignup = Math.max(1, ...(stats?.daily.map((d) => d.signups) ?? [1]));

  // Funnel percentages relative to total (pending+confirmed+invited+converted).
  const funnelTotal = stats
    ? stats.funnel.pending + stats.funnel.confirmed + stats.funnel.invited + stats.funnel.converted
    : 0;
  const pct = (n: number) => (funnelTotal > 0 ? ((n / funnelTotal) * 100).toFixed(1) : '0');

  return (
    <div className="space-y-6">
      <div>
        <h1 className={H1.portal}>Waitlist</h1>
        <p className="text-sm text-surface-500 mt-0.5">Signups, referrals, and conversion funnel</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Signups" value={(stats?.total ?? 0).toLocaleString('en-IN')} color="text-blue-600" />
        <StatCard label="Confirmed" value={(stats?.confirmed ?? 0).toLocaleString('en-IN')} color="text-green-600" />
        <StatCard label="Invited" value={(stats?.invited ?? 0).toLocaleString('en-IN')} color="text-amber-600" />
        <StatCard label="Converted" value={(stats?.converted ?? 0).toLocaleString('en-IN')} color="text-saffron-600" />
      </div>

      {/* 30-day signup chart */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
        <h2 className="text-sm font-semibold text-surface-800 mb-4">30-Day Signups</h2>
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-saffron-600 mx-auto" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1 min-w-[600px] h-40">
              {(stats?.daily ?? []).map((d) => (
                <div
                  key={d.date}
                  className="flex-1 flex flex-col items-center justify-end"
                  title={`${d.date}: ${d.signups} signups`}
                >
                  <div
                    className="w-full bg-saffron-600 rounded-t"
                    style={{ height: `${(d.signups / maxSignup) * 100}%` }}
                  />
                  {d.signups === 0 && <div className="w-full h-px bg-surface-200" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Funnel */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
        <h2 className="text-sm font-semibold text-surface-800 mb-4">Conversion Funnel</h2>
        <div className="space-y-3">
          <FunnelRow label="Pending" count={stats?.funnel.pending ?? 0} pct={pct(stats?.funnel.pending ?? 0)} color="bg-blue-500" />
          <FunnelRow label="Confirmed" count={stats?.funnel.confirmed ?? 0} pct={pct(stats?.funnel.confirmed ?? 0)} color="bg-green-500" />
          <FunnelRow label="Invited" count={stats?.funnel.invited ?? 0} pct={pct(stats?.funnel.invited ?? 0)} color="bg-amber-500" />
          <FunnelRow label="Converted" count={stats?.funnel.converted ?? 0} pct={pct(stats?.funnel.converted ?? 0)} color="bg-saffron-600" />
        </div>
      </div>

      {/* Top referrers */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-surface-800">Top 20 Referrers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-surface-50">
                <th className="text-left py-2 px-4 text-xs font-medium text-surface-500 uppercase">Rank</th>
                <th className="text-left py-2 px-4 text-xs font-medium text-surface-500 uppercase">Email</th>
                <th className="text-right py-2 px-4 text-xs font-medium text-surface-500 uppercase">Referrals</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.topReferrers ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-surface-500 text-sm">
                    No referrers yet
                  </td>
                </tr>
              )}
              {(stats?.topReferrers ?? []).map((r) => (
                <tr key={r.email} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="py-2 px-4 text-surface-500">#{r.rank}</td>
                  <td className="py-2 px-4 text-surface-800">{r.email}</td>
                  <td className="py-2 px-4 text-right font-medium text-saffron-600">{r.referralCount}</td>
                </tr>
              ))}
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

function FunnelRow({ label, count, pct, color }: { label: string; count: number; pct: string; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-surface-600">{label}</span>
        <span className="text-surface-800 font-medium">
          {count.toLocaleString('en-IN')} ({pct}%)
        </span>
      </div>
      <div className="w-full h-3 bg-surface-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
