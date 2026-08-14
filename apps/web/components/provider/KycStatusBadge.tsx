'use client';

import Link from 'next/link';
import { ShieldCheck, AlertCircle, Clock } from 'lucide-react';

/**
 * RES-06 (2026-08-12): 'unknown' is the state a portal is in before its
 * /provider-kyc call has SUCCEEDED — including when that call failed.
 *
 * Every provider portal defaulted to 'unsubmitted' and left it there on a
 * non-OK response, so with the API returning 500 all six portals told an
 * approved, Aadhaar-verified provider "KYC required for payout". That is the
 * single most alarming sentence we can show a provider, and a backend hiccup
 * was enough to trigger it — providers re-submit documents or conclude we lost
 * their verification. An unread state renders NOTHING; silence is honest, an
 * accusation is not.
 */
type KycState = 'verified' | 'pending' | 'unsubmitted' | 'rejected' | 'unknown';

interface Props {
  state: KycState;
  reason?: string | null;
  href?: string;
}

const CFG: Record<Exclude<KycState, 'unknown'>, { label: string; cls: string; Icon: typeof ShieldCheck }> = {
  verified: { label: 'Aadhaar verified', cls: 'bg-tulsi-green-light/20 text-tulsi-green', Icon: ShieldCheck },
  pending: { label: 'KYC under review', cls: 'bg-amber-100 text-amber-700', Icon: Clock },
  unsubmitted: { label: 'KYC required for payout', cls: 'bg-red-100 text-red-700', Icon: AlertCircle },
  rejected: { label: 'KYC rejected — resubmit', cls: 'bg-red-100 text-red-700', Icon: AlertCircle },
};

export default function KycStatusBadge({ state, reason, href = '/provider/kyc' }: Props) {
  if (state === 'unknown') return null;
  const c = CFG[state];
  const I = c.Icon;
  const inner = (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${c.cls}`}>
      <I className="w-3.5 h-3.5" />
      {c.label}
    </span>
  );
  return (
    <span className="inline-flex flex-col gap-0.5">
      {state === 'verified' ? inner : <Link href={href}>{inner}</Link>}
      {reason && <span className="text-xs text-red-600">{reason}</span>}
    </span>
  );
}
