'use client';

/**
 * AW-07 (2026-08-12, P1) — the "Upcoming this week" section of /wellness.
 *
 * This section used to be a hardcoded array of six classes that exist in no
 * table: "Morning Hatha Flow · Aarav Sharma · Apr 18 · 8 spots left", each one
 * linking to a static category page rather than anything bookable. A devotee
 * could not enrol in any of them, and meanwhile the REAL class an instructor
 * had just published was invisible.
 *
 * It now renders `wellness_sessions` rows. Nothing is substituted when the
 * fetch fails or the schedule is empty — the section says so and points at the
 * full catalog.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, Clock, Users } from 'lucide-react';
import {
  fetchWellnessClasses,
  formatClassPrice,
  formatClassWhen,
  type WellnessClass,
} from './classes/WellnessClassesClient';

export default function UpcomingClassesSection({ limit = 6 }: { limit?: number }) {
  const [classes, setClasses] = useState<WellnessClass[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchWellnessClasses();
        if (!cancelled) setClasses(data.slice(0, limit));
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return (
    <section className="py-14 md:py-20" style={{ background: 'var(--color-surface)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
          <div>
            <p
              className="text-xs font-medium uppercase tracking-widest mb-3"
              style={{ color: 'var(--color-primary)' }}
            >
              Live Sessions
            </p>
            <h2
              className="text-2xl font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              Upcoming classes
            </h2>
          </div>
          <Link
            href="/wellness/classes"
            className="text-sm font-medium inline-flex items-center gap-1"
            style={{ color: 'var(--color-primary)' }}
          >
            See all classes <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {failed ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            We couldn’t load the class schedule just now.{' '}
            <Link href="/wellness/classes" style={{ color: 'var(--color-primary)' }}>
              Open the full catalog
            </Link>
            .
          </p>
        ) : classes === null ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Loading the schedule…
          </p>
        ) : classes.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No live classes scheduled right now. New sessions are published by instructors through
            the week.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((c) => {
              const spots = typeof c.spotsLeft === 'number' ? c.spotsLeft : null;
              return (
                <Link
                  key={c.id}
                  href={`/wellness/classes/${c.id}`}
                  className="block p-4 rounded-xl card-hover transition-all"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    {c.type ? (
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
                        style={{
                          background: 'var(--color-art-2)',
                          color: 'var(--color-primary-active)',
                        }}
                      >
                        {String(c.type).toLowerCase()}
                      </span>
                    ) : (
                      <span />
                    )}
                    {spots !== null ? (
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          background: spots === 0 ? '#fef2f2' : 'var(--color-surface-offset)',
                          color: spots === 0 ? '#b91c1c' : 'var(--color-text-muted)',
                        }}
                      >
                        {spots === 0 ? 'Full' : `${spots} spots left`}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    {c.title}
                  </h3>
                  {c.instructorName ? (
                    <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
                      {c.instructorName}
                    </p>
                  ) : null}
                  <div
                    className="flex items-center justify-between gap-3 text-xs"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {formatClassWhen(c.scheduledAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {c.durationMinutes} min
                      </span>
                    </div>
                    <span className="font-medium" style={{ color: 'var(--color-primary)' }}>
                      {formatClassPrice(c.priceInr)}
                    </span>
                  </div>
                  <p className="sr-only">
                    <Users className="w-3 h-3" /> {c.capacity} seats
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
