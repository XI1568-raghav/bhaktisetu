'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useFeatureFlag } from '../lib/feature-flags';
import { useExperiment } from '../lib/experiments';

// Layer AL: home hero primary CTA flag (kept as the legacy A/B seed).
//
// Flag key: `home-hero-cta-text`
// Variants:
//   - `control`         → "Explore Temples" linking to /temples (default)
//   - `watch-darshan`   → "Watch Live Darshan" linking to /darshan
//
// R-Q1-E-009 adds a second concurrent flag — `cta_color_test` — that swaps
// the background color (saffron-600 vs indigo-600) so the experiments can
// stack without conflicting. Exposure captured via useExperiment.

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

// Saffron-600 / indigo-600 — match the brand palette used in the home
// category strip so this experiment never picks a color outside the system.
const CTA_COLORS: Record<'saffron' | 'indigo', string> = {
  saffron: 'var(--color-primary)', // saffron-600 #E16318
  indigo: '#4F46E5', // indigo-600
};

export function HomeHeroCta() {
  const variant = useFeatureFlag<string>(FLAG_KEY, { defaultValue: 'control' });
  const color = useExperiment<'saffron' | 'indigo'>('cta_color_test', 'saffron');
  const v: Variant = VARIANTS[variant ?? 'control'] ?? CONTROL;

  return (
    <Link
      href={v.href}
      data-experiment={FLAG_KEY}
      data-variant={variant ?? 'control'}
      data-cta-color={color}
      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white transition-all btn-press"
      style={{ background: CTA_COLORS[color] }}
    >
      {v.label} <ArrowRight className="w-3.5 h-3.5" />
    </Link>
  );
}
