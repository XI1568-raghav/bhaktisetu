'use client';

/**
 * COM-14 (prod sweep 2026-08-12, P2/content) — the "Our Instructors" section
 * of /wellness.
 *
 * This used to be a literal array of six people: Aarav Sharma 4.9 / 12 yrs /
 * ₹599, Swami Dhyanananda 4.9 / 20 yrs / ₹799, Acharya Goenkaji 4.9 / 25 yrs /
 * ₹999 and three more. Ratings, years of experience and per-session prices,
 * all invented, each card linking to a fixture profile — presented to a visitor
 * as the supply they were about to buy into, directly above six equally
 * invented "upcoming classes" (removed by AW-07).
 *
 * An instructor now appears here because they have an upcoming class in
 * `wellness_sessions`, priced at what that class actually costs. There is no
 * rating and no experience claim, because the platform holds neither. Empty
 * and failed states say what happened; nothing is substituted.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays } from 'lucide-react';
import {
  fetchWellnessClasses,
  formatClassPrice,
  type WellnessClass,
} from './classes/WellnessClassesClient';

interface LiveInstructor {
  name: string;
  classCount: number;
  /** The cheapest real upcoming class — never a made-up "from" price. */
  lowestPriceInr: number;
  nextTitle: string;
}

export function groupInstructors(classes: WellnessClass[]): LiveInstructor[] {
  const byName = new Map<string, LiveInstructor>();
  for (const c of classes) {
    const name = (c.instructorName ?? '').trim();
    if (!name) continue;
    const price = Number(c.priceInr);
    const existing = byName.get(name);
    if (!existing) {
      byName.set(name, {
        name,
        classCount: 1,
        lowestPriceInr: Number.isFinite(price) ? price : 0,
        nextTitle: c.title,
      });
      continue;
    }
    existing.classCount += 1;
    if (Number.isFinite(price) && price < existing.lowestPriceInr) {
      existing.lowestPriceInr = price;
    }
  }
  return [...byName.values()].sort((a, b) => b.classCount - a.classCount);
}

export default function FeaturedInstructorsSection({ limit = 6 }: { limit?: number }) {
  const [instructors, setInstructors] = useState<LiveInstructor[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchWellnessClasses();
        if (!cancelled) setInstructors(groupInstructors(data).slice(0, limit));
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return (
    <section className="py-14 md:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <p
          className="text-xs font-medium uppercase tracking-widest mb-3"
          style={{ color: 'var(--color-primary)' }}
        >
          Our Instructors
        </p>
        <h2
          className="text-2xl font-semibold tracking-tight mb-10"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
        >
          Learn from practitioners teaching here now
        </h2>

        {failed ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            We couldn’t load the instructor list just now.{' '}
            <Link href="/wellness/classes" style={{ color: 'var(--color-primary)' }}>
              Open the full catalog
            </Link>
            .
          </p>
        ) : instructors === null ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Loading instructors…
          </p>
        ) : instructors.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            There are no instructors with an upcoming class right now. New classes
            are added as instructors publish them —{' '}
            <Link href="/wellness/classes" style={{ color: 'var(--color-primary)' }}>
              check the catalog
            </Link>
            .
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {instructors.map((inst) => (
              <Link
                key={inst.name}
                href="/wellness/classes"
                className="group p-5 rounded-xl card-hover transition-all block"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 text-lg font-semibold"
                    style={{
                      background: 'var(--color-primary-highlight)',
                      color: 'var(--color-primary)',
                    }}
                  >
                    {inst.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-sm font-medium group-hover:underline"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {inst.name}
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {inst.nextTitle}
                    </p>
                    <div
                      className="flex items-center gap-3 mt-2 text-xs"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {inst.classCount} upcoming
                      </span>
                      <span style={{ color: 'var(--color-primary)' }}>
                        from {formatClassPrice(inst.lowestPriceInr)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {instructors && instructors.length > 0 && (
          <Link
            href="/wellness/classes"
            className="text-sm font-medium inline-flex items-center gap-1 mt-8"
            style={{ color: 'var(--color-primary)' }}
          >
            See all classes <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </section>
  );
}
