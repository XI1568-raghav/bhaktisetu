'use client';

import { useEffect, useState } from 'react';
import { BarChart3, IndianRupee, Users, Globe2, TrendingUp, RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import { H1 } from '../../../components/ui/heading-recipe';
import { buttonClass } from '../../../components/ui/button-recipe';

type LineBreak = { name: string; count: number; gmvPaise: number; netPaise: number };

type InvestorPayload = {
  mrrPaise: number;
  gmvCumulativePaise: number;
  paidUsers: number;
  nriMixPct: number | null;
  signupsThisWeek: number;
  activeUsers: number;
  cacPaise: number | null;
  d7Retention: number | null;
  d30Retention: number | null;
  lineBreakdown: LineBreak[];
  topFunnelLeaks: Array<{ stage: string; dropPct: number }>;
  generatedAt: string;
};

type DashboardPayload = {
  today: {
    date: string;
    // AO-14: which day boundary the figures below were cut on. Optional so an
    // older API build still renders rather than showing "undefined".
    timezone?: string;
    gmvPaise: number;
    successfulPayments: number;
    bookings: number;
    signups: number;
  };
  mrrPaise: number;
  gmvCumulativePaise: number;
  generatedAt: string;
};

type FunnelPayload = {
  daily: Array<{ date: string; stages: Record<string, number> }>;
  generatedAt: string;
};

function paiseToInr(p: number): string {
  return `₹${(p / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function pct(n: number | null): string {
  if (n == null) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

function Tile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-surface-200 p-5 ${accent ?? ''}`}>
      <p className="text-xs uppercase tracking-wider text-surface-500 font-semibold">{label}</p>
      <p className="text-3xl font-bold text-surface-900 mt-2">{value}</p>
      {sub && <p className="text-xs text-surface-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function MetricsPage() {
  const { session } = useAuth();
  const token = session?.accessToken;
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [investor, setInvestor] = useState<InvestorPayload | null>(null);
  const [funnel, setFunnel] = useState<FunnelPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    setLoading(true);
    setErr(null);
    const hdr = { headers: { authorization: `Bearer ${token}` } };
    // Phase B Admin P0-1: Promise.allSettled — one panel failure does not kill the other two.
    const results = await Promise.allSettled([
      fetch(`${API_BASE_URL}/admin/metrics/dashboard`, hdr).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`dashboard ${r.status}`)))),
      fetch(`${API_BASE_URL}/admin/metrics/investor`, hdr).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`investor ${r.status}`)))),
      fetch(`${API_BASE_URL}/admin/metrics/funnel?days=7`, hdr).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`funnel ${r.status}`)))),
    ]);
    const failed: string[] = [];
    if (results[0].status === 'fulfilled') setDashboard(results[0].value); else failed.push(`dashboard (${results[0].reason?.message ?? 'err'})`);
    if (results[1].status === 'fulfilled') setInvestor(results[1].value); else failed.push(`investor (${results[1].reason?.message ?? 'err'})`);
    if (results[2].status === 'fulfilled') setFunnel(results[2].value); else failed.push(`funnel (${results[2].reason?.message ?? 'err'})`);
    setErr(failed.length === 3 ? `All panels failed: ${failed.join(', ')}` : failed.length > 0 ? `Partial: ${failed.join(', ')}` : null);
    setLoading(false);
  }

  useEffect(() => { load(); }, [token]);

  const today = dashboard?.today;
  const funnelLatest = funnel?.daily?.[funnel.daily.length - 1]?.stages;
  const funnelPrev = funnel?.daily?.[funnel.daily.length - 2]?.stages;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`${H1.portal} flex items-center gap-2`}>
            <BarChart3 className="w-6 h-6 text-saffron-600" />
            Real-numbers dashboard
          </h1>
          <p className="text-sm text-surface-500">Founder + investor view. Pulls live from Payment / Booking / Donation / User / Lead.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className={buttonClass('primary', 'md')}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">{err}</div>}

      {/* Today snapshot */}
      <section>
        {/* AO-14: the window is an India day now (API: startOfDayIst). Naming
            the zone on the heading stops this tile being read as a UTC figure,
            which is how it came to say "0 signups" over ten signups the next
            tab was already listing as today. */}
        <h2 className="text-sm font-semibold text-surface-700 mb-3 uppercase tracking-wider">
          Today ({today?.date ?? '—'}
          {today?.timezone ? ` ${today.timezone}` : ''})
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile label="GMV today" value={today ? paiseToInr(today.gmvPaise) : '—'} sub={`${today?.successfulPayments ?? 0} successful payments`} />
          <Tile label="Bookings" value={String(today?.bookings ?? 0)} />
          <Tile label="Signups" value={String(today?.signups ?? 0)} />
          <Tile label="Generated" value={dashboard ? new Date(dashboard.generatedAt).toLocaleTimeString() : '—'} sub="cache: live" />
        </div>
      </section>

      {/* Top-line investor metrics */}
      <section>
        <h2 className="text-sm font-semibold text-surface-700 mb-3 uppercase tracking-wider">Top-line (last 30 days)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile label="MRR (30d)" value={investor ? paiseToInr(investor.mrrPaise) : '—'} accent="border-saffron-300" />
          <Tile label="GMV cumulative" value={investor ? paiseToInr(investor.gmvCumulativePaise) : '—'} accent="border-emerald-300" />
          <Tile label="Paying users" value={investor ? String(investor.paidUsers) : '—'} />
          <Tile label="NRI mix" value={investor ? pct(investor.nriMixPct) : '—'} sub="of paying users" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <Tile label="Active users (30d)" value={investor ? String(investor.activeUsers) : '—'} sub="any payment or booking" />
          <Tile label="Signups this week" value={investor ? String(investor.signupsThisWeek) : '—'} />
          <Tile label="D7 retention" value={pct(investor?.d7Retention ?? null)} sub="Sprint 4+ stub" />
          <Tile label="D30 retention" value={pct(investor?.d30Retention ?? null)} sub="Sprint 4+ stub" />
        </div>
      </section>

      {/* Revenue line breakdown */}
      {investor?.lineBreakdown?.length ? (
        <section>
          <h2 className="text-sm font-semibold text-surface-700 mb-3 uppercase tracking-wider">Revenue line breakdown</h2>
          <div className="bg-white rounded-lg border border-surface-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 text-xs uppercase text-surface-500">
                <tr>
                  <th className="text-left px-4 py-2">Line</th>
                  <th className="text-right px-4 py-2">Count</th>
                  <th className="text-right px-4 py-2">GMV</th>
                  <th className="text-right px-4 py-2">Net platform</th>
                </tr>
              </thead>
              <tbody>
                {investor.lineBreakdown.map((l) => (
                  <tr key={l.name} className="border-t border-surface-100">
                    <td className="px-4 py-2 font-medium text-surface-900">{l.name}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{l.count}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{paiseToInr(l.gmvPaise)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-emerald-700 font-medium">{paiseToInr(l.netPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* Funnel 7-day */}
      {funnel?.daily?.length ? (
        <section>
          <h2 className="text-sm font-semibold text-surface-700 mb-3 uppercase tracking-wider">Funnel — last 7 days</h2>
          <div className="bg-white rounded-lg border border-surface-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 text-xs uppercase text-surface-500">
                <tr>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-right px-4 py-2">Landing</th>
                  <th className="text-right px-4 py-2">Signup</th>
                  <th className="text-right px-4 py-2">KYC</th>
                  <th className="text-right px-4 py-2">Booking</th>
                  <th className="text-right px-4 py-2">Payment</th>
                </tr>
              </thead>
              <tbody>
                {funnel.daily.map((d) => (
                  <tr key={d.date} className="border-t border-surface-100">
                    <td className="px-4 py-2 font-medium text-surface-700">{d.date}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{d.stages.landing ?? 0}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{d.stages.signup ?? 0}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{d.stages.kyc ?? 0}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{d.stages.booking ?? 0}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-emerald-700 font-semibold">{d.stages.payment_success ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {funnelLatest && funnelPrev && (
            <p className="text-xs text-surface-500 mt-2">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              Latest day vs prior: payments {funnelLatest.payment_success} vs {funnelPrev.payment_success}, bookings {funnelLatest.booking} vs {funnelPrev.booking}.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
