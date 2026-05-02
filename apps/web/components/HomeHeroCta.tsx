'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useFeatureFlag } from '../lib/feature-flags';

// First A/B test seed (Layer AL): toggles the home hero primary CTA.
//
// Flag key: `home-hero-cta-text`
// Variants:
//   - `control`         → "Explore Temples" linking to /temples (default)
//   - `watch-darshan`   → "Watch Live Darshan" linking to /darshan
//
// When PostHog is unconfigured or flags haven't loaded, we render the
// control variant — never blank.

const FLAG_KEY = 'home-hero-cta-text';

interface Variant {
  label: string;
  href: string;
}

const CONTROL: Variant = { label: 'Explore Temples', href: '/temples' };

const VARIANTS: Record<string, Variant> = {
  control: CONTROL,
  'watch-darshan': { label: 'Watch Live Darshan', href: '/darshan' },
};

export function HomeHeroCta() {
  const variant = useFeatureFlag<string>(FLAG_KEY, { defaultValue: 'control' });
  const v: Variant = VARIANTS[variant ?? 'control'] ?? CONTROL;

  return (
    <Link
      href={v.href}
      data-experiment={FLAG_KEY}
      data-variant={variant ?? 'control'}
      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white transition-all btn-press"
      style={{ background: 'var(--color-primary)' }}
    >
      {v.label} <ArrowRight className="w-3.5 h-3.5" />
    </Link>
  );
}
