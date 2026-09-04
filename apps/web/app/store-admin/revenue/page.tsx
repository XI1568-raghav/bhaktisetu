'use client';

// P0 #S-09 (2026-07-09): the store-admin sidebar linked to /store-admin/revenue,
// but no such page existed — a dead 404 nav entry. This page fetches the
// /store-admin/revenue API (which already existed) and renders the revenue
// breakdown + top products, so the sidebar link lands somewhere real.

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../../lib/api-config';
import { useAuth } from '../../../lib/auth-context';
import { UserFacingError, userFacingMessage } from '../../../lib/friendly-error';
import { IndianRupee, TrendingUp, Package, Loader2 } from 'lucide-react';
import { H1 } from '../../../components/ui/heading-recipe';

type RevenueData = {
  topProducts: Array<{ productId: string; name: string; unitsSold: number; revenueInr: number }>;
  totals: { todayInr: number; monthInr: number; yearInr: number };
};

function formatInr(n: number): string {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function StoreRevenuePage() {
  const { session } = useAuth();
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) return;
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/store-admin/revenue`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        if (!r.ok) {
          // RES-09: the seller was shown `Failed to load revenue (HTTP 500)`.
          setError(userFacingMessage(new UserFacingError('', r.status), 'We could not load your revenue. Please try again.'));
          return;
        }
        setData((await r.json()) as RevenueData);
      } catch {
        setError('Network error — please retry.');
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-saffron-600" />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  }

  const totals = data?.totals ?? { todayInr: 0, monthInr: 0, yearInr: 0 };
  const cards = [
    { label: "Today's Revenue", value: formatInr(totals.todayInr), icon: IndianRupee },
    { label: 'This Month', value: formatInr(totals.monthInr), icon: TrendingUp },
    { label: 'This Year', value: formatInr(totals.yearInr), icon: Package },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className={H1.portal}>Revenue</h1>
        <p className="text-surface-500 mt-1">Your store's earnings breakdown</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-surface-100 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-surface-500">{c.label}</span>
              <c.icon className="w-4 h-4 text-saffron-600" />
            </div>
            <p className="text-2xl font-bold text-surface-800 mt-2">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-surface-100 p-6">
        <h2 className="text-lg font-semibold text-surface-800 mb-4">Top Products</h2>
        {data && data.topProducts.length > 0 ? (
          <div className="space-y-3">
            {data.topProducts.map((p) => (
              <div key={p.productId} className="flex items-center justify-between py-2 border-b border-surface-50 last:border-0">
                <div>
                  <p className="font-medium text-surface-800">{p.name}</p>
                  <p className="text-xs text-surface-500">{p.unitsSold} units sold</p>
                </div>
                <p className="font-semibold text-saffron-700">{formatInr(p.revenueInr)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-surface-500">No sales yet.</p>
        )}
      </div>
    </div>
  );
}
