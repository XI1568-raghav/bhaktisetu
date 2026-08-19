'use client';

/**
 * AW-13 (2026-08-12, P2) — "My classes".
 *
 * A devotee enrolled and paid ₹1,000, and the moment they closed the tab the
 * class was unreachable: there was no enrolments endpoint and no page, so the
 * only route back was already knowing the session UUID. GET
 * /wellness/enrollments/mine now exists; this is the surface that reads it.
 *
 * Every row is a real `wellness_enrollments` row. There is no fixture fallback,
 * and an empty list is reported separately from a failed read — to someone who
 * has paid, "you have no classes" and "we could not read your classes" are
 * very different sentences.
 *
 * `roomUrl` is decided by the server (a PAID entitlement, see
 * routes/wellness-sessions.ts). This page never synthesises one: if the server
 * withheld it, the card says the instructor has not published it yet.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Leaf,
  Loader2,
} from 'lucide-react';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import { formatClassPrice, formatClassWhen } from '../classes/WellnessClassesClient';

type EnrolmentSession = {
  id: string;
  title: string;
  type?: string | null;
  scheduledAt: string;
  durationMinutes: number;
  capacity: number;
  /** Decimal crosses the wire as a string — never do float math on it. */
  priceInr: string | number;
  status?: string | null;
  instructorName?: string | null;
  roomUrl?: string | null;
};

type Enrolment = {
  id: string;
  sessionId: string;
  status: 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED' | 'REFUNDED' | 'ATTENDED' | string;
  enrolledAt: string;
  attendedAt?: string | null;
  session: EnrolmentSession;
};

function statusBadge(status: string): { cls: string; label: string } {
  switch (status) {
    case 'PAID':
      return { cls: 'bg-emerald-100 text-emerald-700', label: 'Paid' };
    case 'ATTENDED':
      return { cls: 'bg-blue-100 text-blue-700', label: 'Attended' };
    case 'PENDING_PAYMENT':
      return { cls: 'bg-amber-100 text-amber-700', label: 'Payment pending' };
    case 'CANCELLED':
      return { cls: 'bg-surface-100 text-surface-600', label: 'Cancelled' };
    case 'REFUNDED':
      return { cls: 'bg-surface-100 text-surface-600', label: 'Refunded' };
    default:
      return { cls: 'bg-surface-100 text-surface-600', label: status };
  }
}

function MyClassesList() {
  const { session } = useAuth();
  const token = session?.accessToken;
  const [items, setItems] = useState<Enrolment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/wellness/enrollments/mine`, {
        headers: token ? { authorization: `Bearer ${token}` } : {},
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = (await res.json()) as { data?: Enrolment[] };
      setItems(Array.isArray(json.data) ? json.data : []);
    } catch {
      setItems(null);
      setError('We couldn’t load your classes just now. Please try again.');
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div style={{ background: 'var(--color-bg)' }} className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p
          className="text-xs font-medium uppercase tracking-widest mb-3"
          style={{ color: 'var(--color-primary)' }}
        >
          Wellness
        </p>
        <h1
          className="heading-display text-3xl font-semibold tracking-tight mb-2"
          style={{ color: 'var(--color-text)' }}
        >
          My classes
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)' }}>
          Every wellness class you have enrolled in, with the join link once your instructor
          publishes it.
        </p>

        {error ? (
          <div
            role="alert"
            className="flex flex-wrap items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="flex-1 min-w-[12rem]">{error}</span>
            <button
              type="button"
              onClick={() => void load()}
              className="font-semibold underline underline-offset-2 hover:text-amber-900"
            >
              Retry
            </button>
          </div>
        ) : items === null ? (
          <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your classes…
          </p>
        ) : items.length === 0 ? (
          <div
            className="rounded-xl p-6 text-sm"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <p style={{ color: 'var(--color-text)' }}>You haven’t enrolled in a class yet.</p>
            <Link
              href="/wellness/classes"
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium"
              style={{ color: 'var(--color-primary)' }}
            >
              <Leaf className="w-4 h-4" /> Browse live classes
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((e) => {
              const badge = statusBadge(e.status);
              const paid = e.status === 'PAID' || e.status === 'ATTENDED';
              return (
                <div
                  key={e.id}
                  className="rounded-xl p-5"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                        {e.session.title}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        with {e.session.instructorName ?? 'your instructor'}
                      </p>
                      <p
                        className="text-xs mt-2 flex flex-wrap items-center gap-3"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {formatClassWhen(e.session.scheduledAt)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {e.session.durationMinutes} min
                        </span>
                        <span>{formatClassPrice(e.session.priceInr)}</span>
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="mt-4">
                    {e.session.roomUrl ? (
                      <a
                        href={e.session.roomUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white"
                        style={{ background: 'var(--color-primary)' }}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Join the live room
                      </a>
                    ) : paid ? (
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Your instructor has not published the live room link yet. It will appear
                        here before the session starts.
                      </p>
                    ) : (
                      <Link
                        href={`/wellness/classes/${e.session.id}`}
                        className="text-sm font-medium"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        Open the class
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-10">
          <Link
            href="/wellness/classes"
            className="text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ← Back to the class catalog
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MyWellnessClassesPage() {
  return (
    <AuthGuard>
      <MyClassesList />
    </AuthGuard>
  );
}
