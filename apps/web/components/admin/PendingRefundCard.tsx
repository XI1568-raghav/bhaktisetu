'use client';

import Link from 'next/link';
import { ArrowUpRight, Undo2 } from 'lucide-react';
import { formatInrExact } from '../../lib/format-money';

/**
 * Dashboard tile: money captured on bookings that were cancelled and has not
 * been refunded yet (`pendingRefundInr` from GET /admin/dashboard). This money
 * is excluded from "Revenue", so without a tile it was invisible to operators.
 * Renders nothing when the API did not send the figure — never a fake zero.
 */
export default function PendingRefundCard({ amountInr }: { amountInr: number | undefined }) {
  if (typeof amountInr !== 'number' || !Number.isFinite(amountInr)) return null;

  const owed = amountInr > 0;
  return (
    <Link
      href="/admin/refunds"
      className={`bg-[var(--color-surface)] rounded-xl p-5 border transition-all group ${owed ? 'border-red-300' : 'border-[var(--color-border)] hover:border-saffron-200'}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${owed ? 'bg-red-50' : 'bg-surface-100'}`}>
            <Undo2 className={`w-5 h-5 ${owed ? 'text-red-600' : 'text-surface-400'}`} />
          </div>
          <h3 className="text-sm font-semibold text-surface-800">Awaiting refund</h3>
          {owed ? (
            <>
              <p className="text-2xl font-bold text-surface-800 mt-1">{formatInrExact(amountInr)}</p>
              <p className="text-xs text-surface-500 mt-1">Captured on cancelled bookings, not yet refunded</p>
            </>
          ) : (
            <p className="text-xs text-surface-500 mt-1">Nothing awaiting refund</p>
          )}
        </div>
        <ArrowUpRight className="w-5 h-5 text-surface-300 group-hover:text-saffron-500 transition-colors" />
      </div>
    </Link>
  );
}
