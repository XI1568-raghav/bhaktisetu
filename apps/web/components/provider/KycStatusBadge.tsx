'use client';

import Link from 'next/link';
import { ShieldCheck, AlertCircle, Clock } from 'lucide-react';

type KycState = 'verified' | 'pending' | 'unsubmitted' | 'rejected';

interface Props {
  state: KycState;
  reason?: string | null;
  href?: string;
}

const CFG: Record<KycState, { label: string; cls: string; Icon: typeof ShieldCheck }> = {
  verified: { label: 'Aadhaar verified', cls: 'bg-tulsi-green-light/20 text-tulsi-green', Icon: ShieldCheck },
  pending: { label: 'KYC under review', cls: 'bg-amber-100 text-amber-700', Icon: Clock },
  unsubmitted: { label: 'KYC required for payout', cls: 'bg-red-100 text-red-700', Icon: AlertCircle },
  rejected: { label: 'KYC rejected — resubmit', cls: 'bg-red-100 text-red-700', Icon: AlertCircle },
};

export default function KycStatusBadge({ state, reason, href = '/provider/kyc' }: Props) {
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
      {reason && <span className="text-[11px] text-red-600">{reason}</span>}
    </span>
  );
}
