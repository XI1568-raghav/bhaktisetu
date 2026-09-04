'use client';

import Link from 'next/link';
import { Gift, ArrowRight } from 'lucide-react';
import { useExperiment } from '../../lib/experiments';

/**
 * A/B experiment: nri_lane_above_fold
 *
 * Variants:
 *   below → NRI gift-puja card hidden (renders nothing); the existing below-fold
 *           NRI surface (other parts of the page) carries the lane. Default.
 *   above → Inserts a compact NRI gift-puja card above first scroll.
 *
 * The component is mounted twice in the page tree — once near the top (slot
 * "above") and once where the historical NRI strip lives (slot "below").
 * Only the slot matching the resolved variant renders content; the other
 * renders an empty fragment. Exposure event fires once per page view.
 *
 * Slot must be passed as prop so two mounts don't double-capture exposure
 * — useExperiment guards by experiment key so only the first mount fires.
 */

interface Props {
  slot: 'above' | 'below';
}

export default function NriLaneAbTest({ slot }: Props) {
  const variant = useExperiment<'above' | 'below'>('nri_lane_above_fold', 'below');

  if (variant !== slot) return null;

  return (
    <section
      aria-label="NRI gift puja"
      className="py-4 md:py-6"
      data-experiment="nri_lane_above_fold"
      data-variant={variant}
      data-slot={slot}
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/gift"
          prefetch={false}
          className="flex items-center justify-between gap-4 p-4 md:p-5 rounded-xl card-hover transition-all"
          style={{
            background: 'linear-gradient(135deg, #FFF8F0 0%, #FFFBEB 100%)',
            border: '1px solid #FDD8AF',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(225, 99, 24, 0.12)' }}
            >
              <Gift className="w-5 h-5" style={{ color: '#9e6229' }} />
            </span>
            <div className="min-w-0">
              <p
                className="text-sm font-semibold leading-tight"
                style={{ color: '#7d4e1f' }}
              >
                {/* CM-06: this lane used to list four foreign currencies as
                    billing options. Razorpay is the only rail and it is
                    INR-only, so those were a promise checkout could not keep.
                    The honest sentence already existed on /gift. */}
                Gift a puja from abroad — billed in INR, international cards accepted
              </p>
              <p
                className="text-xs mt-0.5 leading-snug"
                style={{ color: '#7d4e1f', opacity: 0.8 }}
              >
                A recording of the ceremony, with your name and gotra spoken in it.
              </p>
            </div>
          </div>
          <span
            className="hidden sm:inline-flex items-center gap-1 text-xs font-medium shrink-0"
            style={{ color: '#7d4e1f' }}
          >
            Send gift <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>
    </section>
  );
}
