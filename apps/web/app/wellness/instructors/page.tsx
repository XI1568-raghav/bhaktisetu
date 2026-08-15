'use client';

/**
 * AW-17 (2026-08-12, P3) — the /wellness/instructors index.
 *
 * This directory held only `[id]/`, so the index level of a marketed section
 * was a hard 404: reachable by URL guess or an external link, dead either way.
 *
 * It is built on the live `wellness_sessions` feed — the same source the
 * /wellness landing page's instructor section uses since COM-14 — and NOT on
 * GET /api/v1/wellness/instructors. That endpoint still serves the eight-person
 * `instructors` fixture in apps/api/src/routes/wellness.ts, complete with
 * invented ratings, review counts and per-session prices; consuming it here
 * would re-import through a new door exactly the fiction COM-14 and AW-07 took
 * out of this section.
 *
 * So: an instructor is listed because they have a real upcoming class, priced
 * at what that class actually costs. No rating, no experience claim, no stock
 * portrait — the platform holds none of those for these people. An empty feed
 * says it is empty and a failed fetch says it failed; neither substitutes data.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Leaf } from 'lucide-react';
import {
  fetchWellnessClasses,
  formatClassPrice,
  formatClassWhen,
  type WellnessClass,
} from '../classes/WellnessClassesClient';

interface LiveInstructor {
  name: string;
  classCount: number;
  /** The cheapest real upcoming class — never a made-up "from" price. */
  lowestPriceInr: number;
  nextTitle: string;
  nextAt: string;
}

export function buildInstructorIndex(classes: WellnessClass[]): LiveInstructor[] {
  const byName = new Map<string, LiveInstructor>();
  const sorted = [...classes].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );
  for (const c of sorted) {
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
        nextAt: c.scheduledAt,
      });
      continue;
    }
    existing.classCount += 1;
    if (Number.isFinite(price) && price < existing.lowestPriceInr) {
      existing.lowestPriceInr = price;
    }
  }
  return [...byName.values()].sort(
    (a, b) => b.classCount - a.classCount || a.name.localeCompare(b.name),
  );
}

export default function WellnessInstructorsIndexPage() {
  const [instructors, setInstructors] = useState<LiveInstructor[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchWellnessClasses();
        if (!cancelled) setInstructors(buildInstructorIndex(data));
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ background: 'var(--color-bg)' }}>
      <section className="py-14 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p
            className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: 'var(--color-primary)' }}
          >
            Wellness
          </p>
          <h1
            className="text-3xl font-semibold tracking-tight mb-3"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Instructors teaching on Darshya
          </h1>
          <p className="text-sm mb-10 max-w-2xl" style={{ color: 'var(--color-text-muted)' }}>
            Everyone here has at least one live class scheduled. Prices are what those
            classes actually cost.
          </p>

          {failed ? (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              We couldn’t load the instructor directory just now.{' '}
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
              There are no instructors with an upcoming class right now. New classes appear
              here as instructors publish them —{' '}
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
                    <div className="min-w-0">
                      <p className="font-medium truncate" style={{ color: 'var(--color-text)' }}>
                        {inst.name}
                      </p>
                      <p
                        className="text-xs mt-1 flex items-center gap-1"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        <CalendarDays className="w-3.5 h-3.5" />
                        {inst.classCount} upcoming {inst.classCount === 1 ? 'class' : 'classes'}
                      </p>
                      <p className="text-xs mt-1 truncate" style={{ color: 'var(--color-text-muted)' }}>
                        Next: {inst.nextTitle} · {formatClassWhen(inst.nextAt)}
                      </p>
                      <p className="text-sm mt-2 font-medium" style={{ color: 'var(--color-text)' }}>
                        From {formatClassPrice(inst.lowestPriceInr)}
                      </p>
                    </div>
                  </div>
                  <span
                    className="mt-4 inline-flex items-center gap-1 text-sm"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    See their classes <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          )}

          <p className="mt-10 text-sm flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
            <Leaf className="w-4 h-4" />
            Teach on Darshya?{' '}
            <Link href="/become-wellness" style={{ color: 'var(--color-primary)' }}>
              Apply as an instructor
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
