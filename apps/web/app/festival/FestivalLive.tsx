'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { buttonClass } from '../../components/ui/button-recipe';

/**
 * The two clock-dependent pieces of /festival and /festival/<slug>.
 *
 * They used to be computed on the server (`nextFestival()`, `daysUntil()`), which kept
 * both pages rendering in the Cloudflare Worker (free plan: 10 ms CPU, a cold start is
 * error 1102). The pages are now prerendered once and answered from assets; the date
 * logic runs here, in the visitor's browser, the same way the home page's
 * "what is coming up" strip does. Server HTML carries no date-dependent text, so a
 * prerendered copy can never show yesterday's "Today".
 */

export interface FestivalLite {
  slug: string;
  name: string;
  sanskrit: string;
  deity: string;
  date2026: string;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function daysUntil(iso: string, now: Date = new Date()): number {
  const today = new Date(now.toISOString().slice(0, 10));
  const target = new Date(iso);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Same rule as lib/festivals.ts nextFestival(): earliest festival dated today or later. */
export function pickNextFestival(list: readonly FestivalLite[], today: string = todayIso()): FestivalLite | undefined {
  return [...list].filter((f) => f.date2026 >= today).sort((a, b) => a.date2026.localeCompare(b.date2026))[0];
}

export function NextFestivalHero({ festivals }: { festivals: FestivalLite[] }) {
  const [upcoming, setUpcoming] = useState<FestivalLite | undefined>(undefined);
  useEffect(() => setUpcoming(pickNextFestival(festivals)), [festivals]);
  if (!upcoming) return null;
  return (
    <section className="mb-10 rounded-xl border border-saffron-300 bg-saffron-50 p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700 mb-2">Next festival</p>
      <h2 className="text-2xl font-bold text-surface-900 mb-1">
        {upcoming.name} <span className="text-base text-surface-500 font-serif ml-2">{upcoming.sanskrit}</span>
      </h2>
      <p className="text-sm text-surface-700 mb-3">
        {fmtDate(upcoming.date2026)} — {upcoming.deity}
      </p>
      <Link href={`/festival/${upcoming.slug}`} className={buttonClass('primary', 'md')}>
        Plan {upcoming.name} →
      </Link>
    </section>
  );
}

/** "Today" / "In N days" / "Returns next year" next to the date; empty until the browser knows today. */
export function FestivalCountdownBadge({ iso }: { iso: string }) {
  const [days, setDays] = useState<number | null>(null);
  useEffect(() => setDays(daysUntil(iso)), [iso]);
  if (days === null) return null;
  if (days === 0) {
    return (
      <span className="inline-block px-2.5 py-0.5 text-xs font-semibold text-white bg-saffron-700 rounded-full">
        Today
      </span>
    );
  }
  if (days > 0 && days <= 30) {
    return (
      <span className="inline-block px-2.5 py-0.5 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full">
        In {days} days
      </span>
    );
  }
  if (days < 0) {
    return (
      <span className="inline-block px-2.5 py-0.5 text-xs font-semibold text-surface-600 bg-surface-100 rounded-full">
        Returns next year
      </span>
    );
  }
  return null;
}
