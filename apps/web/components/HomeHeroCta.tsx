'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useFeatureFlag } from '../lib/feature-flags';
import { useExperiment } from '../lib/experiments';
import { buttonClass } from './ui/button-recipe';

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

// CM-13 / CM-14 (prod sweep 2026-08-12): the control used to be
// "Explore Temples" -> /temples, competing at equal weight with a second hero
// button. Two co-equal CTAs split intent at the highest-stakes decision point,
// and this was the weaker branch: 15 of the 20 temples in the database have
// zero puja offerings (`SELECT count(*) FROM temples t WHERE NOT EXISTS
// (SELECT 1 FROM temple_puja_offerings o WHERE o.temple_id = t.id)` = 15), so
// three of every four destinations behind it cannot take money. The single
// primary is now the catalogue; /temples is demoted to a text link in the page.
const CONTROL: Variant = { label: 'Book a Puja', href: '/pujas' };

const VARIANTS: Record<string, Variant> = {
  control: CONTROL,
  'watch-darshan': { label: 'Watch Live Darshan', href: '/darshan' },
};

// Saffron-600 / indigo-600 — match the brand palette used in the home
// category strip so this experiment never picks a color outside the system.
const CTA_COLORS: Record<'saffron' | 'indigo', string> = {
  saffron: 'var(--color-primary)', // saffron-600 #9e6229
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
      // CM-20: measured 108x38 at 390x844. WCAG 2.5.5 and both platform HIGs
      // put the floor at 44px, and this is the single conversion control on the
      // page for a mobile-first, often-older audience.
      // DU-03: the height, padding, radius and type now come from the one
      // shared recipe instead of being hand-set here. The cta_color_test
      // experiment only overrides the fill.
      className={buttonClass('primary', 'md', 'btn-press')}
      style={color === 'indigo' ? { background: CTA_COLORS.indigo } : undefined}
    >
      {v.label} <ArrowRight className="w-3.5 h-3.5" />
    </Link>
  );
}
