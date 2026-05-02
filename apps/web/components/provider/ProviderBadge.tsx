'use client';

import { ShieldCheck, Award, Sparkles } from 'lucide-react';

/**
 * Verification tier badge for any provider (priest, astrologer, wellness,
 * store, temple manager). Tier is computed on-the-fly from raw signals;
 * we deliberately avoid a cached tier column so a freshly-rated provider
 * surfaces the right badge on the very next page render. The aggregate
 * (ratingAvg, ratingCount) is already maintained by booking.service when
 * a devotee submits a review post-puja.
 *
 * Tiers (gated on Aadhaar verification — payouts already require this):
 *   elite     — 100+ ratings, avg ≥ 4.5
 *   top_rated —  20+ ratings, avg ≥ 4.5
 *   verified  —   5+ ratings, avg ≥ 4.0
 *   none      — anything else (no badge)
 */

export type ProviderTier = 'elite' | 'top_rated' | 'verified' | 'none';

interface ProviderTierInputs {
  aadhaarVerified?: boolean | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
}

export function computeProviderTier(input: ProviderTierInputs): ProviderTier {
  const verified = Boolean(input.aadhaarVerified);
  const avg = typeof input.ratingAvg === 'number' ? input.ratingAvg : 0;
  const count = typeof input.ratingCount === 'number' ? input.ratingCount : 0;

  if (!verified) return 'none';
  if (count >= 100 && avg >= 4.5) return 'elite';
  if (count >= 20 && avg >= 4.5) return 'top_rated';
  if (count >= 5 && avg >= 4.0) return 'verified';
  return 'none';
}

interface BadgeStyle {
  label: string;
  cls: string;
  Icon: typeof ShieldCheck;
}

const TIER_STYLES: Record<Exclude<ProviderTier, 'none'>, BadgeStyle> = {
  verified: {
    label: 'Verified',
    cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    Icon: ShieldCheck,
  },
  top_rated: {
    label: 'Top Rated',
    cls: 'bg-amber-50 text-amber-700 ring-amber-200',
    Icon: Award,
  },
  elite: {
    label: 'Elite',
    cls: 'bg-purple-50 text-purple-700 ring-purple-200',
    Icon: Sparkles,
  },
};

interface Props {
  tier?: ProviderTier;
  // Pass raw inputs and let the component compute. Either tier or inputs
  // must be provided; tier wins when both are present.
  aadhaarVerified?: boolean | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  size?: 'xs' | 'sm';
  className?: string;
}

export default function ProviderBadge({
  tier,
  aadhaarVerified,
  ratingAvg,
  ratingCount,
  size = 'sm',
  className = '',
}: Props) {
  const resolved =
    tier ?? computeProviderTier({ aadhaarVerified, ratingAvg, ratingCount });
  if (resolved === 'none') return null;

  const style = TIER_STYLES[resolved];
  const Icon = style.Icon;
  const sizeCls =
    size === 'xs'
      ? 'text-[10px] px-1.5 py-0.5 gap-1'
      : 'text-xs px-2.5 py-1 gap-1.5';
  const iconCls = size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ring-1 ring-inset ${style.cls} ${sizeCls} ${className}`}
      title={`${style.label} provider on Darshya`}
    >
      <Icon className={iconCls} />
      {style.label}
    </span>
  );
}

interface RatingDisplayProps {
  avg?: number | null;
  count?: number | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

/**
 * Compact "★ 4.7 (23 ratings)" display reused across listings.
 */
export function RatingDisplay({
  avg,
  count,
  size = 'sm',
  className = '',
}: RatingDisplayProps) {
  const a = typeof avg === 'number' ? avg : 0;
  const c = typeof count === 'number' ? count : 0;
  if (c <= 0 || a <= 0) {
    return (
      <span
        className={`text-surface-400 ${size === 'md' ? 'text-sm' : 'text-xs'} ${className}`}
      >
        No ratings yet
      </span>
    );
  }
  const sizeCls =
    size === 'md' ? 'text-sm' : size === 'sm' ? 'text-xs' : 'text-[11px]';
  return (
    <span
      className={`inline-flex items-center gap-1 ${sizeCls} ${className}`}
    >
      <span className="text-amber-500">★</span>
      <span className="font-semibold text-surface-700">{a.toFixed(1)}</span>
      <span className="text-surface-400">
        ({c} {c === 1 ? 'rating' : 'ratings'})
      </span>
    </span>
  );
}
