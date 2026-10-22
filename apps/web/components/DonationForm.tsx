'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  Loader2,
  AlertCircle,
  CheckCircle2,
  IndianRupee,
  Shield,
  FileText,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { API_BASE_URL } from '../lib/api-config';
import { COMPANY } from '../lib/company';
import { buttonClass } from '../components/ui/button-recipe';
import { userFacingMessage } from '../lib/friendly-error';
import { loadRazorpayCheckout, preloadRazorpayCheckout } from '../lib/razorpay-loader';
import {
  MIN_INR,
  MAX_INR,
  PHONE_REGEX,
  EMAIL_REGEX,
  parseAmount,
  normalizePhone,
  validateDonation,
} from '../lib/donation-validation';

/**
 * COM-02 (prod sweep 2026-08-12): this form asserted Section 80G eligibility in
 * four places — the header line, the PAN helper, a trust badge and the success
 * screen — while `donationLegal.HAS_80G_VERIFIED` is false and both the
 * registration number and the donee PAN are null. The receipt the donor
 * receives therefore carries neither, and the deduction is disallowed at
 * assessment; PROJECT_CONTEXT.md business rule 7 says the same. The PDF and the
 * /donations and /gaushala pages were already gated on this flag — the form was
 * the last surface still promising it. Flip the flag the day the 80G(5)
 * certificate is on file and every claim returns at once.
 */
const HAS_80G = COMPANY.donationLegal.HAS_80G_VERIFIED;

// ─── Types ──────────────────────────────────────────────────────

export interface DonationFormProps {
  causeId: string;
  causeName: string;
  causeKind?: 'temple' | 'gaushala';
  defaultAmounts?: number[];
  className?: string;
  /** Pre-select a donation amount (e.g. from a gau-seva plan link). */
  planAmount?: number;
}

interface CreateOrderResponse {
  donationId: string;
  razorpayOrderId: string;
  amount: number;
  currency: 'INR';
  keyId: string;
  isDemoPayment: boolean;
}

interface VerifyResponse {
  ok: boolean;
  donationId: string;
  receiptNumber: string;
  amount: number;
  status: 'paid';
}

// Razorpay's checkout.js attaches a global `Razorpay` constructor.
// Use a narrow shape rather than `any` so the call sites stay typed.
type RazorpayInstance = {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: { error?: { description?: string } }) => void) => void;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void | Promise<void>;
  modal?: { ondismiss?: () => void };
};

const DEFAULT_AMOUNTS = [101, 501, 1100, 2100, 5100, 11000];

// ─── Component ──────────────────────────────────────────────────

export default function DonationForm({
  causeId,
  causeName,
  causeKind = 'gaushala',
  defaultAmounts,
  className,
  planAmount,
}: DonationFormProps) {
  const { user, session, isAuthenticated } = useAuth();

  const presets = defaultAmounts && defaultAmounts.length > 0 ? defaultAmounts : DEFAULT_AMOUNTS;

  // Form state — a planAmount (from a gau-seva plan link) pre-selects that amount.
  const [amount, setAmount] = useState<string>(String(planAmount ?? presets[2] ?? 1100));
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [donorPan, setDonorPan] = useState('');
  const [dedication, setDedication] = useState('');

  // UX state
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<'order' | 'checkout'>('order');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string>('');
  const [success, setSuccess] = useState<{
    receiptNumber: string;
    amount: number;
  } | null>(null);

  // Pre-fill from auth session once it loads.
  useEffect(() => {
    if (!user) return;
    setDonorName((prev) => prev || user.fullName || '');
    setDonorEmail((prev) => prev || user.email || '');
    // user.phone is stored as +91XXXXXXXXXX; trim country code for the
    // 10-digit input field. If the format is unexpected, leave empty
    // so we don't ship a malformed value into validation.
    setDonorPhone((prev) => {
      if (prev) return prev;
      const raw = user.phone ?? '';
      const m = raw.match(/(\d{10})$/);
      return m ? m[1]! : '';
    });
  }, [user]);

  const amountNumber = useMemo(() => parseAmount(amount), [amount]);

  // Start downloading checkout.js now so Pay does not wait on it.
  useEffect(() => {
    preloadRazorpayCheckout();
  }, []);

  // Editing a field clears ITS error at once. Errors used to persist until the
  // next submit, so a donor who fixed the amount/phone still saw the old message.
  function clearError(...keys: string[]) {
    setErrors((prev) => {
      if (!keys.some((k) => k in prev)) return prev;
      const next = { ...prev };
      for (const k of keys) delete next[k];
      return next;
    });
  }

  // ─── Validation ─────────────────────────────────────────────

  function validate(): boolean {
    const errs = validateDonation({
      amount,
      name: donorName,
      email: donorEmail,
      phone: donorPhone,
      pan: donorPan,
      hasTaxReceipt: HAS_80G,
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ─── Submit ─────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTopError('');

    if (!isAuthenticated || !session?.accessToken) {
      const next = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/donations';
      window.location.href = `/auth/login?redirect=${encodeURIComponent(next)}`;
      return;
    }

    if (!validate()) return;

    setSubmitting(true);
    setStage('order');

    try {
      // 1. Create order on backend. checkout.js loads in parallel (usually already
      // cached by the mount preload), so the two waits overlap instead of adding up.
      const razorpayReady = loadRazorpayCheckout();
      const createRes = await fetch(`${API_BASE_URL}/donations/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          // POLYMORPHIC DONEE (fixed 2026-08-12, P0).
          //
          // This used to post `{ gaushalaId: causeId }` for EVERY cause, with a
          // comment claiming the backend treated it as an opaque id for both
          // kinds. It does not: the API takes a `causeKind` and writes either
          // donations.temple_id or donations.gaushala_id, and
          // finalizeDonationReceipt decides the donee from which one is set.
          // So every temple donation took the gaushala branch — temple_id NULL,
          // the gaushala lookup missing, and the 80G receipt falling back to
          // the literal string "Darshya Gaushala Network". A devotee giving
          // Rs 2,100 to Siddhivinayak was emailed a receipt naming a cow
          // shelter, and the temple manager's portal (which filters on
          // templeId) showed Rs 0 forever.
          //
          // donorPan and dedication were collected and validated here — PAN is
          // REQUIRED above Rs 2,000 for a valid 80G receipt — and then dropped
          // on the floor; the API has accepted both since PBO-14.
          ...(causeKind === 'temple'
            ? { causeKind: 'temple' as const, templeId: causeId }
            : { causeKind: 'gaushala' as const, gaushalaId: causeId }),
          amountInr: amountNumber,
          // The donor's own name / email / phone, so the recipient's portal shows
          // who gave rather than the account that paid.
          ...(donorName.trim() ? { donorName: donorName.trim() } : {}),
          ...(EMAIL_REGEX.test(donorEmail.trim()) ? { donorEmail: donorEmail.trim() } : {}),
          ...(PHONE_REGEX.test(normalizePhone(donorPhone)) ? { donorPhone: normalizePhone(donorPhone) } : {}),
          ...(donorPan.trim() ? { donorPan: donorPan.trim().toUpperCase() } : {}),
          ...(dedication.trim() ? { dedication: dedication.trim() } : {}),
        }),
      }).catch(() => null);

      if (!createRes || !createRes.ok) {
        const fallback = createRes
          ? `Could not create your donation order (${createRes.status}).`
          : 'Network error reaching the donations service.';
        setTopError(`${fallback} Please try again or email support@darshya.online.`);
        setSubmitting(false);
        return;
      }

      const data = (await createRes.json().catch(() => null)) as CreateOrderResponse | null;
      if (!data?.donationId || !data?.razorpayOrderId || !data?.amount) {
        setTopError('Donation service returned an unexpected response. Please try again.');
        setSubmitting(false);
        return;
      }

      // 2. Open Razorpay checkout.
      setStage('checkout');
      const Razorpay = await razorpayReady;
      if (!Razorpay) {
        setTopError('Could not load Razorpay checkout. Please check your connection.');
        setSubmitting(false);
        return;
      }

      const options: RazorpayOptions = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || data.keyId || 'rzp_test_demo',
        amount: data.amount,
        currency: data.currency,
        name: 'Darshya',
        description: `Donation to ${causeName}`,
        order_id: data.razorpayOrderId,
        prefill: {
          name: donorName,
          email: donorEmail,
          contact: normalizePhone(donorPhone),
        },
        notes: {
          causeId,
          causeName,
          causeKind,
          dedication: dedication.slice(0, 200),
          donorPan: donorPan.toUpperCase(),
        },
        theme: { color: '#ea580c' },
        handler: async (response) => {
          try {
            const verifyRes = await fetch(`${API_BASE_URL}/donations/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.accessToken}`,
              },
              body: JSON.stringify({
                donationId: data.donationId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (!verifyRes.ok) {
              setTopError(
                `Payment received (id: ${response.razorpay_payment_id}) but we could not confirm your donation. ` +
                  `Email support@darshya.online with this payment ID and we'll reconcile within 24 hours.`,
              );
              setSubmitting(false);
              return;
            }

            const verified = (await verifyRes.json()) as VerifyResponse;
            setSuccess({
              receiptNumber: verified.receiptNumber,
              amount: verified.amount,
            });
            setSubmitting(false);
          } catch {
            setTopError('Payment verification failed. Please contact support with your Razorpay payment ID.');
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => setSubmitting(false),
        },
      };

      const rzp = new Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        setTopError(resp.error?.description || 'Payment failed. Please try again.');
        setSubmitting(false);
      });
      rzp.open();
    } catch (err) {
      const msg = userFacingMessage(err, 'Something went wrong. Please try again.');
      setTopError(msg);
      setSubmitting(false);
    }
  }

  // ─── Success state ──────────────────────────────────────────

  if (success) {
    return (
      <div className={`rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-saffron-50 p-6 sm:p-8 ${className ?? ''}`}>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500">
          <CheckCircle2 className="h-8 w-8 text-white" />
        </div>
        <h3 className="mb-1 text-center text-xl font-bold text-surface-800">
          Thank you for your seva!
        </h3>
        <p className="mb-4 text-center text-sm text-surface-600">
          Your donation of <span className="font-semibold text-emerald-700">
            ₹{success.amount.toLocaleString('en-IN')}
          </span>{' '}
          to <strong>{causeName}</strong> has been received.
        </p>

        <div className="mb-4 rounded-xl border border-surface-200 bg-white p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-surface-500">
              {HAS_80G ? '80G Receipt Number' : 'Receipt Number'}
            </span>
            <span className="font-mono font-semibold text-surface-800">{success.receiptNumber}</span>
          </div>
          <p className="mt-3 flex items-start gap-2 text-xs text-surface-500">
            <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            A signed PDF receipt has been emailed to <strong>{donorEmail}</strong>.{' '}
            {HAS_80G
              ? 'Save it for your tax filing.'
              : 'It is proof of your donation; it is not a Section 80G certificate.'}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/donations"
            className={buttonClass('primary', 'md', 'flex-1')}
          >
            <Heart className="h-4 w-4" /> Donate to another cause
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-surface-200 bg-white px-5 py-2.5 text-sm font-semibold text-surface-700 hover:bg-surface-50"
          >
            View my donations
          </Link>
        </div>
      </div>
    );
  }

  // ─── Form ───────────────────────────────────────────────────

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-xl border border-surface-200 bg-white p-6 shadow-sm sm:p-8 ${className ?? ''}`}
      noValidate
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-saffron-100 text-saffron-700">
          <Heart className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-surface-800">Donate to {causeName}</h2>
          <p className="text-xs text-surface-500">
            {HAS_80G
              ? 'Secure payment via Razorpay · 80G tax-deductible · Numbered receipt'
              : 'Secure payment via Razorpay · Numbered receipt'}
          </p>
        </div>
      </div>

      {topError && (
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{topError}</span>
        </div>
      )}

      {/* Amount */}
      <div className="mb-5">
        <label className="mb-2 block text-sm font-semibold text-surface-700">
          Donation Amount <span className="text-red-500">*</span>
        </label>

        <div className="mb-3 flex flex-wrap gap-2">
          {presets.map((preset) => {
            const isActive = amountNumber === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setAmount(String(preset));
                  clearError('amount', 'donorPan');
                }}
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all ${
                  isActive
                    ? 'border-saffron-500 bg-saffron-50 text-saffron-700 shadow-sm'
                    : 'border-surface-200 bg-white text-surface-600 hover:border-saffron-300'
                }`}
              >
                ₹{preset.toLocaleString('en-IN')}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            type="number"
            inputMode="numeric"
            min={MIN_INR}
            max={MAX_INR}
            step={1}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              clearError('amount', 'donorPan');
            }}
            placeholder={`Custom amount (min ₹${MIN_INR})`}
            className={`w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 ${
              errors.amount ? 'border-red-300 bg-red-50' : 'border-surface-200'
            }`}
          />
        </div>
        {errors.amount && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="h-3 w-3" /> {errors.amount}
          </p>
        )}
      </div>

      {/* Donor name */}
      <div className="mb-4">
        <label htmlFor="donor-name" className="mb-1.5 block text-sm font-semibold text-surface-700">
          Full Name <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            id="donor-name"
            type="text"
            value={donorName}
            onChange={(e) => {
              setDonorName(e.target.value);
              clearError('donorName');
            }}
            placeholder="As per PAN card"
            className={`w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 ${
              errors.donorName ? 'border-red-300 bg-red-50' : 'border-surface-200'
            }`}
          />
        </div>
        {errors.donorName && (
          <p className="mt-1 text-xs text-red-600">{errors.donorName}</p>
        )}
      </div>

      {/* Email + Phone */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="donor-email" className="mb-1.5 block text-sm font-semibold text-surface-700">
            Email <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              id="donor-email"
              type="email"
              value={donorEmail}
              onChange={(e) => {
                setDonorEmail(e.target.value);
                clearError('donorEmail');
              }}
              placeholder="you@example.com"
              className={`w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 ${
                errors.donorEmail ? 'border-red-300 bg-red-50' : 'border-surface-200'
              }`}
            />
          </div>
          {errors.donorEmail && (
            <p className="mt-1 text-xs text-red-600">{errors.donorEmail}</p>
          )}
        </div>

        <div>
          <label htmlFor="donor-phone" className="mb-1.5 block text-sm font-semibold text-surface-700">
            Phone <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              id="donor-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={donorPhone}
              onChange={(e) => {
                setDonorPhone(normalizePhone(e.target.value));
                clearError('donorPhone');
              }}
              placeholder="10-digit number"
              className={`w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 ${
                errors.donorPhone ? 'border-red-300 bg-red-50' : 'border-surface-200'
              }`}
            />
          </div>
          {errors.donorPhone && (
            <p className="mt-1 text-xs text-red-600">{errors.donorPhone}</p>
          )}
        </div>
      </div>

      {/* PAN */}
      <div className="mb-4">
        <label htmlFor="donor-pan" className="mb-1.5 block text-sm font-semibold text-surface-700">
          PAN Number{' '}
          <span className="text-xs font-normal text-surface-500">
            {HAS_80G
              ? '(required for 80G receipt on ≥ ₹2,000)'
              : '(optional; printed on your receipt)'}
          </span>
        </label>
        <div className="relative">
          <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            id="donor-pan"
            type="text"
            maxLength={10}
            value={donorPan}
            onChange={(e) => {
              setDonorPan(e.target.value.toUpperCase());
              clearError('donorPan');
            }}
            placeholder="ABCDE1234F"
            className={`w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-saffron-200 ${
              errors.donorPan ? 'border-red-300 bg-red-50' : 'border-surface-200'
            }`}
          />
        </div>
        {errors.donorPan && (
          <p className="mt-1 text-xs text-red-600">{errors.donorPan}</p>
        )}
      </div>

      {/* Dedication / cause */}
      <div className="mb-6">
        <label htmlFor="dedication" className="mb-1.5 block text-sm font-semibold text-surface-700">
          Dedication or Cause{' '}
          <span className="text-xs font-normal text-surface-500">(optional)</span>
        </label>
        <textarea
          id="dedication"
          value={dedication}
          onChange={(e) => setDedication(e.target.value)}
          rows={2}
          maxLength={200}
          placeholder="In memory of, or specific cause this donation supports…"
          className="w-full rounded-lg border border-surface-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200"
        />
      </div>

      {/* Trust strip.
          COM-16 (prod sweep 2026-08-12): a third badge here read "100% to
          cause". Donations settle into Darshya's own Razorpay account and
          apps/api/src/routes/donations.ts writes no Commission, no
          TemplePayout and no PayoutRequest on any donation path — the temple
          and gaushala portals only LIST donations, nothing disburses them. So
          the claim had no mechanism behind it and no way to be evidenced, on a
          consumer-facing charitable collection. It is removed rather than
          reworded; put it back when a donation settlement rail exists and can
          show the donor where the money went. The two remaining badges are
          both backed by code that runs. */}
      <div className="mb-5 flex flex-wrap items-center gap-3 text-xs text-surface-500">
        <span className="flex items-center gap-1">
          <Shield className="h-3.5 w-3.5 text-emerald-600" /> Razorpay secured
        </span>
        <span className="flex items-center gap-1">
          <FileText className="h-3.5 w-3.5 text-saffron-600" />{' '}
          {HAS_80G ? '80G receipt' : 'Numbered receipt'}
        </span>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-saffron-600 py-3 font-bold text-white shadow-md transition-colors hover:bg-saffron-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />{' '}
            {stage === 'order' ? 'Preparing secure payment…' : 'Opening payment window…'}
          </>
        ) : (
          <>
            <Heart className="h-5 w-5" />
            Donate ₹{amountNumber > 0 ? amountNumber.toLocaleString('en-IN') : '—'}
          </>
        )}
      </button>

      {!isAuthenticated && (
        <p className="mt-3 text-center text-xs text-surface-500">
          You will be asked to sign in before payment.
        </p>
      )}
    </form>
  );
}
