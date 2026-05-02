'use client';

import Link from 'next/link';
import { Calendar, MapPin, ArrowRight, Flame } from 'lucide-react';

interface Props {
  href: string;
  title: string;
  subtitle?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  amount?: number | null;
  amountLabel?: string;
  statusLabel?: string;
  statusClass?: string;
  currency?: 'INR' | 'USD';
}

function fmtCur(n: number | null | undefined, currency: 'INR' | 'USD' = 'INR'): string {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(d?: string): string {
  if (!d) return '';
  const parsed = d.includes('T') ? new Date(d) : new Date(d + 'T00:00:00');
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtTime(t?: string): string {
  if (!t) return '';
  const [hStr, mStr] = t.split(':');
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export default function BookingRow({
  href,
  title,
  subtitle,
  scheduledDate,
  scheduledTime,
  amount,
  amountLabel = 'Payout',
  statusLabel,
  statusClass,
  currency = 'INR',
}: Props) {
  return (
    <Link href={href} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition-colors">
      <div className="w-12 h-12 bg-saffron-50 rounded-xl flex items-center justify-center shrink-0">
        <Flame className="w-5 h-5 text-saffron-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-sm font-semibold text-surface-800 truncate">{title}</h3>
          {statusLabel && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusClass ?? 'bg-surface-100 text-surface-600'}`}>
              {statusLabel}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-surface-500">
          {subtitle && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {subtitle}
            </span>
          )}
          {(scheduledDate || scheduledTime) && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {fmtDate(scheduledDate)}
              {scheduledTime ? ` at ${fmtTime(scheduledTime)}` : ''}
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        {amount !== undefined && (
          <>
            <p className="text-sm font-bold text-surface-800">{fmtCur(amount, currency)}</p>
            <p className="text-xs text-surface-400">{amountLabel}</p>
          </>
        )}
      </div>
      <ArrowRight className="w-4 h-4 text-surface-300 ml-2" />
    </Link>
  );
}
