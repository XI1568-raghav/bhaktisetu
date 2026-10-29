'use client';

/**
 * The profile of a REAL listed wellness instructor (a `wellness_profiles` row), reached from the
 * "Instructors on Darshya" strip.
 *
 * That strip links every card to /wellness/instructors/<profile id>, but this route only knew the eight
 * `inst-00N` fixture profiles, so every real card landed on "Instructor not found". This reads the
 * public provider record instead. Nothing is invented: a rating or reviews appear only when the
 * platform actually holds some, the per-session rate is not shown (each class carries its own price,
 * listed below from the live feed), and credentials are labelled as self-listed.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Award } from 'lucide-react';
import { API_BASE_URL } from '../../../../lib/api-config';
import { H1 } from '../../../../components/ui/heading-recipe';
import InstructorClasses from './InstructorClasses';

interface RealInstructor {
  id: string;
  displayName: string;
  specialties?: string[];
  certifications?: string[];
  experience?: number;
  bio?: string | null;
  ratingAvg?: number;
  ratingCount?: number;
  reviews?: Array<{ id?: string; rating: number; comment?: string | null; createdAt?: string }>;
}

export default function RealInstructorProfile({ id }: { id: string }) {
  const [inst, setInst] = useState<RealInstructor | null>(null);
  const [state, setState] = useState<'loading' | 'missing' | 'failed' | 'ok'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/providers/wellness/${encodeURIComponent(id)}`, { cache: 'no-store' });
        if (res.status === 404) {
          if (!cancelled) setState('missing');
          return;
        }
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = (await res.json()) as { provider?: RealInstructor };
        if (cancelled) return;
        if (json.provider?.displayName) {
          setInst(json.provider);
          setState('ok');
        } else {
          setState('missing');
        }
      } catch {
        if (!cancelled) setState('failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state === 'loading') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="prose-meta" style={{ color: 'var(--color-text-muted)' }}>Loading instructor…</p>
      </div>
    );
  }

  if (state !== 'ok' || !inst) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className={`${H1.portal} mb-2`}>
            {state === 'failed' ? 'Instructor unavailable' : 'Instructor not found'}
          </h1>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
            {state === 'failed'
              ? 'We could not load this profile just now. Please try again in a moment.'
              : 'The instructor you are looking for does not exist.'}
          </p>
          <Link href="/wellness/classes" className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
            Browse live classes
          </Link>
        </div>
      </div>
    );
  }

  const ratingCount = inst.ratingCount ?? 0;
  const reviews = inst.reviews ?? [];
  const initials = inst.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  return (
    <div style={{ background: 'var(--color-bg)' }}>
      <section className="py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1.5 text-xs mb-8" style={{ color: 'var(--color-text-muted)' }}>
            <Link href="/wellness" className="hover:underline" style={{ color: 'var(--color-primary)' }}>Wellness</Link>
            <span>/</span>
            <span>{inst.displayName}</span>
          </nav>

          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 text-2xl font-semibold"
              style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary)' }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className={H1.portal}>{inst.displayName}</h1>
              {inst.specialties && inst.specialties.length > 0 ? (
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {inst.specialties.join(' · ')}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {typeof inst.experience === 'number' && inst.experience > 0 ? (
                  <span className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> {inst.experience} years of experience (self-reported)
                  </span>
                ) : null}
                {ratingCount > 0 && typeof inst.ratingAvg === 'number' ? (
                  <span>
                    <strong style={{ color: 'var(--color-text)' }}>{inst.ratingAvg.toFixed(1)}</strong> from {ratingCount}{' '}
                    {ratingCount === 1 ? 'review' : 'reviews'}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {inst.bio || (inst.certifications && inst.certifications.length > 0) ? (
        <section className="py-10" style={{ background: 'var(--color-surface)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {inst.bio ? (
              <>
                <h2 className="text-xs font-medium uppercase tracking-widest mb-4" style={{ color: 'var(--color-primary)' }}>
                  About
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{inst.bio}</p>
              </>
            ) : null}
            {inst.certifications && inst.certifications.length > 0 ? (
              <div className="mt-6">
                <h3 className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>
                  Certifications listed by the instructor
                </h3>
                <div className="flex flex-wrap gap-2">
                  {inst.certifications.map((cert) => (
                    <span
                      key={cert}
                      className="text-xs px-3 py-1 rounded-full flex items-center gap-1.5"
                      style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary)' }}
                    >
                      <Award className="w-3 h-3" /> {cert}
                    </span>
                  ))}
                </div>
                <p className="mt-3 prose-meta" style={{ color: 'var(--color-text-muted)' }}>
                  Darshya does not verify these credentials.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {reviews.length > 0 ? (
        <section className="py-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xs font-medium uppercase tracking-widest mb-4" style={{ color: 'var(--color-primary)' }}>
              Reviews
            </h2>
            <ul className="space-y-3">
              {reviews.map((r, i) => (
                <li
                  key={r.id ?? i}
                  className="p-4 rounded-xl text-sm"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                >
                  <p className="prose-meta" style={{ color: 'var(--color-text-muted)' }}>{r.rating} / 5</p>
                  {r.comment ? <p className="mt-1">{r.comment}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <InstructorClasses instructorName={inst.displayName} categoryHref="/wellness" categoryLabel="wellness" />
    </div>
  );
}
