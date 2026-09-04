'use client';

/**
 * AW-07 (2026-08-12, P1) — the devotee side of the wellness marketplace.
 *
 * Before this page existed, an instructor could create a class, the API would
 * happily list it at GET /wellness/sessions, and POST /wellness/sessions/:id/enroll
 * worked from curl — but nothing in the website could reach either. Wellness
 * revenue was structurally zero and the entire instructor-side build
 * (create/edit/room-link/students/commissions) was stranded.
 *
 * Everything on this page is a real `wellness_sessions` row. There is no
 * fixture fallback: an empty API means an empty catalog and it says so, and a
 * failed fetch says THAT rather than quietly rendering "no classes". The
 * /wellness landing page used to ship six invented classes with hardcoded
 * "8 spots left" badges — that is the defect this page exists to not repeat.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Users, Loader2, AlertCircle, Leaf } from 'lucide-react';
import { API_BASE_URL } from '../../../lib/api-config';
import { H1 } from '../../../components/ui/heading-recipe';

export interface WellnessClass {
  id: string;
  title: string;
  description?: string | null;
  type?: string | null;
  scheduledAt: string;
  durationMinutes: number;
  capacity: number;
  /** Decimal crosses the wire as a string — never do float math on it. */
  priceInr: string | number;
  status?: string | null;
  instructorName?: string | null;
  enrolledCount?: number | null;
  spotsLeft?: number | null;
}

export function formatClassPrice(priceInr: string | number): string {
  const n = Number(priceInr);
  if (!Number.isFinite(n)) return '—';
  if (n <= 0) return 'Free';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatClassWhen(scheduledAt: string): string {
  const d = new Date(scheduledAt);
  if (Number.isNaN(d.getTime())) return 'Time to be confirmed';
  return d.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function fetchWellnessClasses(): Promise<WellnessClass[]> {
  const res = await fetch(`${API_BASE_URL}/wellness/sessions`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Classes fetch failed (${res.status})`);
  const json = (await res.json()) as { data?: WellnessClass[] };
  return Array.isArray(json.data) ? json.data : [];
}

export default function WellnessClassesClient() {
  const [classes, setClasses] = useState<WellnessClass[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchWellnessClasses();
        if (!cancelled) setClasses(data);
      } catch {
        // No fixture fallback. An unreadable catalog is reported as such.
        if (!cancelled) setError('We couldn’t load the class schedule just now. Please try again.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-5"
          style={{ background: 'var(--color-art-1)', color: 'var(--color-text)' }}
        >
          <Leaf className="w-3.5 h-3.5" />
          Live classes
        </div>
        <h1
          className={H1.catalogue}
        >
          Upcoming yoga, meditation &amp; pranayama classes
        </h1>
        <p className="mt-3 prose-body max-w-xl" style={{ color: 'var(--color-text-muted)' }}>
          Every class below is scheduled by a verified instructor on Darshya. Enrol to reserve your
          seat; the live room link appears here once your payment is confirmed.
        </p>
        {/* AW-13: the catalog is where a devotee lands after paying, so it is
            where the route back to what they bought has to be. */}
        <Link
          href="/wellness/my-classes"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium"
          style={{ color: 'var(--color-primary)' }}
        >
          <Users className="w-4 h-4" /> Classes I have enrolled in
        </Link>
      </div>

      {error ? (
        <div
          className="flex items-start gap-3 rounded-xl p-5"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <AlertCircle className="w-5 h-5 shrink-0" style={{ color: '#b91c1c' }} />
          <p className="text-sm" style={{ color: 'var(--color-text)' }}>
            {error}
          </p>
        </div>
      ) : classes === null ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 className="w-4 h-4 animate-spin" /> Loading classes…
        </div>
      ) : classes.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            No live classes scheduled right now.
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            New sessions are published by instructors through the week — check back soon.
          </p>
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => {
            const spots = typeof c.spotsLeft === 'number' ? c.spotsLeft : null;
            return (
              <li key={c.id}>
                <Link
                  href={`/wellness/classes/${c.id}`}
                  className="block h-full p-5 rounded-xl card-hover transition-all"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    {c.type ? (
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
                        style={{ background: 'var(--color-art-2)', color: 'var(--color-primary-active)' }}
                      >
                        {String(c.type).toLowerCase()}
                      </span>
                    ) : (
                      <span />
                    )}
                    {/* Real seats from the API's capacity − held enrolments. When
                        the API does not send it we say nothing rather than invent
                        a number. */}
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

                  <h2 className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    {c.title}
                  </h2>
                  {c.instructorName ? (
                    <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
                      with {c.instructorName}
                    </p>
                  ) : null}

                  <div
                    className="flex items-center flex-wrap gap-3 text-xs"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatClassWhen(c.scheduledAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {c.durationMinutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {c.capacity} seats
                    </span>
                  </div>

                  <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                    {formatClassPrice(c.priceInr)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
