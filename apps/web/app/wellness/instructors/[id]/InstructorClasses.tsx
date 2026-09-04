'use client';

/**
 * CI-05 — the booking exit for `/wellness/instructors/[id]`.
 *
 * The profile is a prerendered page built from eight static instructor rows.
 * Before this component its only hrefs were `/wellness` (breadcrumb, not-found
 * branch, and a footer "Back to Wellness"), plus the category listing — so a
 * reader who arrived from search, read a full profile, and wanted to book had
 * nowhere to go. `/wellness/classes/[id]` is the bookable unit in this section
 * and nothing on the profile reached it, or even reached the class index.
 *
 * WHERE THE DATA COMES FROM, AND WHY
 * AW-17 established that this section does not republish the eight-person
 * fixture as if it were supply, so the classes listed here are read from the
 * live `wellness_sessions` feed — the same one `/wellness/classes` and
 * `/wellness/instructors` use — and matched on the instructor's name. If the
 * live feed holds no class for this person, the page says so rather than
 * inventing one, and still hands the reader the catalogue that always exists.
 * An unreadable feed reports that it failed; it never renders as "no classes".
 *
 * It is a client component because the profile is statically prerendered and
 * must not have its HTTP response depend on the API being up.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays } from 'lucide-react';
import {
  fetchWellnessClasses,
  formatClassPrice,
  formatClassWhen,
  type WellnessClass,
} from '../../classes/WellnessClassesClient';

interface Props {
  /** The profile's display name, matched against the live feed. */
  instructorName: string;
  /** e.g. `/wellness/yoga` — the listing this instructor belongs to. */
  categoryHref: string;
  categoryLabel: string;
}

/** Names cross the wire as typed. Compare on a normalised form, not verbatim. */
export function normalizeInstructorName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** This instructor's classes from the live feed, soonest first. */
export function classesByInstructor(
  classes: readonly WellnessClass[],
  instructorName: string,
): WellnessClass[] {
  const wanted = normalizeInstructorName(instructorName);
  if (!wanted) return [];
  return classes
    .filter((c) => normalizeInstructorName(c.instructorName ?? '') === wanted)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

export default function InstructorClasses({
  instructorName,
  categoryHref,
  categoryLabel,
}: Props) {
  const [classes, setClasses] = useState<WellnessClass[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchWellnessClasses();
        if (!cancelled) setClasses(classesByInstructor(data, instructorName));
      } catch {
        // No fixture fallback. An unreadable schedule is reported as such.
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [instructorName]);

  const firstName = instructorName.split(' ')[0];

  return (
    <section className="py-14 md:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2
          className="text-xs font-medium uppercase tracking-widest mb-3"
          style={{ color: 'var(--color-primary)' }}
        >
          Book a live class
        </h2>

        {failed ? (
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
            We couldn&rsquo;t load the live class schedule just now. The full catalogue is
            still browsable below.
          </p>
        ) : classes === null ? (
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
            Checking the live schedule&hellip;
          </p>
        ) : classes.length === 0 ? (
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
            {firstName} has no upcoming class listed on Darshya right now.
          </p>
        ) : (
          <ul className="space-y-3 mb-6">
            {classes.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/wellness/classes/${c.id}`}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl card-hover transition-all"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <span>
                    <span
                      className="block text-sm font-medium"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {c.title}
                    </span>
                    <span
                      className="flex items-center gap-1 text-xs mt-1"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <CalendarDays className="w-3 h-3" /> {formatClassWhen(c.scheduledAt)} &middot;{' '}
                      {formatClassPrice(c.priceInr)}
                    </span>
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0" style={{ color: 'var(--color-primary)' }} />
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link
            href="/wellness/classes"
            className="inline-flex items-center gap-1.5 font-medium link-underline"
            style={{ color: 'var(--color-primary)' }}
          >
            Browse all live classes <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href={categoryHref}
            className="inline-flex items-center gap-1.5 font-medium link-underline"
            style={{ color: 'var(--color-primary)' }}
          >
            More {categoryLabel} on Darshya
          </Link>
        </div>
      </div>
    </section>
  );
}
