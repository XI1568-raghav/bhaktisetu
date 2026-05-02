'use client';

import { IndianRupee, Clock, CheckCircle2, TrendingUp } from 'lucide-react';

interface Props {
  totalPaid?: number | null;
  pending?: number | null;
  thisMonth?: number | null;
  currency?: 'INR' | 'USD';
  loading?: boolean;
}

function fmt(n: number | null | undefined, currency: 'INR' | 'USD' = 'INR'): string {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function EarningsCard({ totalPaid, pending, thisMonth, currency = 'INR', loading }: Props) {
  const cards = [
    { label: 'Paid out', value: fmt(totalPaid, currency), icon: CheckCircle2, color: 'text-tulsi-green', bg: 'bg-tulsi-green-light/20' },
    { label: 'Pending payout', value: fmt(pending, currency), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'This month', value: fmt(thisMonth, currency), icon: TrendingUp, color: 'text-saffron-600', bg: 'bg-saffron-50' },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="bg-white rounded-xl border border-surface-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 ${c.bg} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <span className="text-sm text-surface-500">{c.label}</span>
            </div>
            <p className="text-lg font-semibold text-surface-800">
              {loading ? '…' : c.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
