'use client';

/**
 * AW-07 (2026-08-12, P1) — class detail + the only devotee-facing enrolment
 * surface in the app.
 *
 * Contract with apps/api/src/routes/wellness-sessions.ts:
 *   GET  /wellness/sessions/:id            — detail. `roomUrl` is returned ONLY
 *                                            to the instructor, an admin, or a
 *                                            PAID enrollee. Its presence is
 *                                            therefore the server's own proof
 *                                            of entitlement; the client never
 *                                            decides who may join.
 *   POST /wellness/sessions/:id/enroll     — 201 {enrollmentId, razorpayOrderId,
 *                                            amount, keyId, isDemoPayment} or
 *                                            201 {enrollmentId, free:true}.
 *                                            409 for full / cancelled / already
 *                                            enrolled.
 *   POST /wellness/enrollments/:id/verify  — flips PENDING_PAYMENT → PAID and
 *                                            writes the instructor's Commission.
 *
 * Two rules this page will not break:
 *   1. Success is only ever claimed after the server confirms it. A failed
 *      enroll or verify surfaces the server's own sentence and stops — it never
 *      renders a join link it did not receive.
 *   2. Nothing is invented. No fixture class, no guessed price, no fake seat
 *      count; a missing field renders as absent.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, Users, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../../lib/auth-context';
import { API_BASE_URL } from '../../../../lib/api-config';
import { formatClassPrice, formatClassWhen, type WellnessClass } from '../WellnessClassesClient';

import { buttonClass } from '../../../../components/ui/button-recipe';
import { H1 } from '../../../../components/ui/heading-recipe';
import { userFacingMessage, UserFacingError, serverErrorMessage } from '../../../../lib/friendly-error';
import CancelEnrolment from '../../../../components/wellness/CancelEnrolment';
type ClassDetail = WellnessClass & { roomUrl?: string | null };

let razorpayScriptPromise: Promise<void> | null = null;
function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve();
  if (razorpayScriptPromise) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('razorpay script load failed')), {
        once: true,
      });
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      razorpayScriptPromise = null;
      reject(new Error('razorpay script load failed'));
    };
    document.body.appendChild(s);
  });
  return razorpayScriptPromise;
}

/** Prefer the API's own message — a raw JSON dump helps nobody. */
async function messageFrom(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    return serverErrorMessage(body, fallback);
  } catch {
    return fallback;
  }
}

export default function ClassDetailClient() {
  const params = useParams();
  const router = useRouter();
  const sessionId = String((params as { id?: string })?.id ?? '');
  const { session, user } = useAuth();
  const token = session?.accessToken;

  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolError, setEnrolError] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  // The signed-in devotee's own enrolment in THIS class (needed to offer Cancel).
  const [mine, setMine] = useState<{ id: string; status: string } | null>(null);
  const [mineTick, setMineTick] = useState(0);
  const [cancelledId, setCancelledId] = useState<string | null>(null);

  const authHeaders = useCallback(
    (): Record<string, string> => ({
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  );

  const load = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/wellness/sessions/${sessionId}`, {
      headers: authHeaders(),
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) throw new UserFacingError(await messageFrom(res, 'This class could not be loaded.'));
    const json = (await res.json()) as { data?: ClassDetail };
    return json.data ?? null;
  }, [sessionId, authHeaders]);

  useEffect(() => {
    if (!token || !sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/wellness/enrollments/mine`, {
          headers: { authorization: `Bearer ${token}` },
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) return;
        const json = (await res.json()) as { data?: { id: string; sessionId: string; status: string }[] };
        const row = (json.data ?? []).find(
          (r) => r.sessionId === sessionId && (r.status === 'PAID' || r.status === 'ATTENDED' || r.status === 'PENDING_PAYMENT'),
        );
        if (!cancelled) setMine(row ? { id: row.id, status: row.status } : null);
      } catch {
        // Cancel is an extra; the page works without it.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, sessionId, enrolled, mineTick]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await load();
        if (cancelled) return;
        if (data) setDetail(data);
        else setLoadError('This class could not be found.');
      } catch (err) {
        if (!cancelled) {
          setLoadError(userFacingMessage(err, 'This class could not be loaded.'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function handleEnrol() {
    if (!detail) return;
    setEnrolling(true);
    setEnrolError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/wellness/sessions/${sessionId}/enroll`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        // authHeaders() sets Content-Type: application/json; Fastify answers an empty body
        // under that type with 400, so enrolment never started.
        body: '{}',
      });
      if (res.status === 401) {
        // AW-07 (2026-08-14): this page tells the devotee "You'll be asked to
        // sign in to complete the enrolment" and then delivered a dead-end
        // "Unauthorized" string with no way forward. Honour the promise: send
        // them to sign-in and bring them back to this exact class. Nothing is
        // claimed and no payment step runs.
        //
        // The param name is `redirect` — that is the ONLY one /auth/login
        // reads (app/auth/login/page.tsx:119 and :441, through safeRedirect).
        // A `returnTo`/`next` spelling is silently ignored and dumps the
        // devotee on their role dashboard instead of back at the class.
        const returnTo = `/wellness/classes/${sessionId}`;
        router.push(`/auth/login?redirect=${encodeURIComponent(returnTo)}`);
        return;
      }
      if (!res.ok) {
        // 409 full / cancelled / already enrolled, 403 wrong role.
        throw new UserFacingError(await messageFrom(res, 'Could not complete enrolment.'));
      }
      const order = ((await res.json()) as {
        data?: {
          enrollmentId: string;
          free?: boolean;
          razorpayOrderId?: string;
          amount?: number;
          currency?: string;
          keyId?: string;
          isDemoPayment?: boolean;
        };
      }).data;
      if (!order?.enrollmentId) throw new UserFacingError('Enrolment failed — no enrolment was created.');

      // Free satsang: the API already returns the enrolment as PAID.
      if (order.free) {
        setEnrolled(true);
        setDetail(await load());
        return;
      }

      if (order.isDemoPayment) {
        const verifyRes = await fetch(
          `${API_BASE_URL}/wellness/enrollments/${order.enrollmentId}/verify`,
          {
            method: 'POST',
            headers: authHeaders(),
            credentials: 'include',
            body: JSON.stringify({
              razorpayOrderId: order.razorpayOrderId,
              razorpayPaymentId: `pay_demo_${Date.now()}`,
              razorpaySignature: 'demo',
            }),
          },
        );
        if (!verifyRes.ok) {
          throw new UserFacingError(await messageFrom(verifyRes, 'We could not confirm your payment. If you were charged, contact support@darshya.online.'));
        }
        setEnrolled(true);
        setDetail(await load());
        return;
      }

      await loadRazorpayScript();
      const Razorpay = (
        window as unknown as {
          Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
        }
      ).Razorpay;
      if (!Razorpay) throw new UserFacingError('The payment window could not load. Check your connection and try again.');
      if (!order.keyId) throw new UserFacingError('Payments are not available right now. Please try again later.');

      await new Promise<void>((resolve, reject) => {
        const rzp = new Razorpay({
          key: order.keyId!,
          amount: order.amount,
          currency: order.currency ?? 'INR',
          name: 'Darshya',
          description: detail.title,
          order_id: order.razorpayOrderId,
          prefill: { name: user?.fullName ?? '', email: user?.email ?? '' },
          theme: { color: '#9e6229' },
          modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              const verifyRes = await fetch(
                `${API_BASE_URL}/wellness/enrollments/${order.enrollmentId}/verify`,
                {
                  method: 'POST',
                  headers: authHeaders(),
                  credentials: 'include',
                  body: JSON.stringify({
                    razorpayOrderId: response.razorpay_order_id,
                    razorpayPaymentId: response.razorpay_payment_id,
                    razorpaySignature: response.razorpay_signature,
                  }),
                },
              );
              if (!verifyRes.ok) {
                throw new UserFacingError(
                  await messageFrom(verifyRes, 'We could not confirm your payment. If you were charged, contact support@darshya.online.'),
                );
              }
              setEnrolled(true);
              setDetail(await load());
              resolve();
            } catch (verifyErr) {
              reject(verifyErr);
            }
          },
        });
        rzp.open();
      });
    } catch (err) {
      setEnrolError(userFacingMessage(err, 'Could not complete enrolment.'));
    } finally {
      setEnrolling(false);
    }
  }

  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className={`${H1.portal} mb-2`}>
          Class unavailable
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          {loadError}
        </p>
        <Link
          href="/wellness/classes"
          className={buttonClass('primary', 'md')}
        >
          Back to all classes
        </Link>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 className="w-4 h-4 animate-spin" /> Loading class…
        </div>
      </div>
    );
  }

  const spots = typeof detail.spotsLeft === 'number' ? detail.spotsLeft : null;
  const isFull = spots === 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/wellness/classes"
        className="inline-flex items-center gap-1.5 text-xs mb-6"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <ArrowLeft className="w-3.5 h-3.5" /> All classes
      </Link>

      <h1
        className={H1.catalogue}
      >
        {detail.title}
      </h1>
      {detail.instructorName ? (
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          with {detail.instructorName}
        </p>
      ) : null}

      <div
        className="mt-6 flex items-center flex-wrap gap-4 text-sm"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" /> {formatClassWhen(detail.scheduledAt)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" /> {detail.durationMinutes} min
        </span>
        {spots !== null ? (
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" /> {isFull ? 'Full' : `${spots} spots left`}
          </span>
        ) : null}
      </div>

      {detail.description ? (
        <p className="mt-6 text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
          {detail.description}
        </p>
      ) : null}

      <div
        className="mt-8 rounded-xl p-5"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <p className="text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>
          {formatClassPrice(detail.priceInr)}
        </p>

        {/* The server returns roomUrl only to a PAID enrollee — its presence is
            the entitlement, so a returning devotee sees Join without re-paying. */}
        {cancelledId ? (
          <div className="mt-4">
            <Link href="/wellness/classes" className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
              Browse other classes
            </Link>
          </div>
        ) : detail.roomUrl ? (
          <div className="mt-4">
            <p
              className="flex items-center gap-1.5 text-sm font-medium mb-3"
              style={{ color: 'var(--color-tulsi-green, #2f7a53)' }}
            >
              <CheckCircle2 className="w-4 h-4" /> You are enrolled in this class.
            </p>
            <a
              href={detail.roomUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass('primary', 'md')}
            >
              Join the live room
            </a>
          </div>
        ) : enrolled || mine?.status === 'PAID' || mine?.status === 'ATTENDED' ? (
          <div className="mt-4">
            <p className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              <CheckCircle2 className="w-4 h-4" /> You are enrolled in this class.
            </p>
            {/* Honest: paid, but the instructor has not published the room yet. */}
            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              The instructor has not published the live room link yet. It will appear here — and in
              your class reminder — before the session starts.
            </p>
            {/* AW-13: the devotee has just paid and may well close this tab. */}
            <Link
              href="/wellness/my-classes"
              className="mt-3 inline-block text-sm font-medium"
              style={{ color: 'var(--color-primary)' }}
            >
              Find this class again in My classes
            </Link>
          </div>
        ) : (
          <div className="mt-4">
            <button
              type="button"
              onClick={handleEnrol}
              disabled={enrolling || isFull}
              className={buttonClass('primary', 'md')}
            >
              {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isFull ? 'Class is full' : `Enrol — ${formatClassPrice(detail.priceInr)}`}
            </button>
            {!token ? (
              <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                You&apos;ll be asked to sign in to complete the enrolment.
              </p>
            ) : null}
          </div>
        )}

        {mine || cancelledId ? (
          <CancelEnrolment
            key={cancelledId ?? mine!.id}
            token={token}
            enrollmentId={cancelledId ?? mine!.id}
            status={cancelledId ? 'PAID' : mine!.status}
            priceInr={detail.priceInr}
            scheduledAt={detail.scheduledAt}
            onCancelled={() => {
              setCancelledId(mine?.id ?? cancelledId);
              setEnrolled(false);
              setMine(null);
              setMineTick((n) => n + 1);
            }}
          />
        ) : null}

        {enrolError ? (
          <p
            className="mt-4 flex items-start gap-2 text-sm"
            style={{ color: '#b91c1c' }}
            role="alert"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {enrolError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
