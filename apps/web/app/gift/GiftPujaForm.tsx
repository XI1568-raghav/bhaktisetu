'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../../lib/api-config';

type Status = 'idle' | 'submitting' | 'success' | 'error';

type GiftConfig = {
  paymentEnabled: boolean;
  whatsappEnabled: boolean;
  autoFlowReady: boolean;
};

// CreateOrderResponse (Stripe PaymentIntent) was removed 2026-08-11 with the
// gift-puja Stripe rail. `GET /gift-puja/config` now always reports
// autoFlowReady:false, so this form is an inquiry funnel: ops reply with
// pandits, dates and a payment link. The self-serve purchase returns with the
// PayPal-via-Razorpay rail.

const OCCASIONS = [
  'Parents anniversary',
  'Birthday blessing',
  'Health recovery',
  'New home pravesh',
  'Job promotion',
  'Pitra paksha',
  'Marriage in family',
  'Newborn blessing',
  'Other',
];

const PUJAS = [
  'Satyanarayan Puja',
  'Rudrabhishek',
  'Ganesh Puja',
  'Mahalakshmi Puja',
  'Navagraha Shanti',
  'Hanuman Chalisa Path',
  'Sundarkand Path',
  'Mahamrityunjay Jaap',
  'Sri Suktam Path',
  'Not sure — recommend one',
];

// PRICE_TIERS ($60/$120/$250) went with the Stripe rail, 2026-08-11.

export function GiftPujaForm() {
  const [config, setConfig] = useState<GiftConfig | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [err, setErr] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/gift-puja/config`).catch(() => null);
        if (!cancelled && res && res.ok) {
          const json = (await res.json()) as GiftConfig;
          setConfig(json);
        } else if (!cancelled) {
          setConfig({ paymentEnabled: false, whatsappEnabled: false, autoFlowReady: false });
        }
      } catch {
        if (!cancelled) setConfig({ paymentEnabled: false, whatsappEnabled: false, autoFlowReady: false });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');
    setErr(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      buyer: {
        name: String(fd.get('buyer_name') || '').trim(),
        email: String(fd.get('buyer_email') || '').trim(),
        country: String(fd.get('buyer_country') || '').trim(),
      },
      recipient: {
        name: String(fd.get('recipient_name') || '').trim(),
        whatsapp: String(fd.get('recipient_whatsapp') || '').trim(),
        city: String(fd.get('recipient_city') || '').trim(),
      },
      puja: String(fd.get('puja') || '').trim(),
      occasion: String(fd.get('occasion') || '').trim(),
      message: String(fd.get('message') || '').trim(),
      source: 'web-gift',
    };

    if (!payload.buyer.email || !payload.recipient.name || !payload.recipient.whatsapp) {
      setErr('Please fill your email, recipient name, and WhatsApp number.');
      setStatus('error');
      return;
    }

    try {
      // Inquiry is the only path. The API's create-order/verify-payment pair
      // went with the Stripe rail (2026-08-11).
      const res = await fetch(`${API_BASE_URL}/gift-puja/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => null);

      if (res && res.ok) {
        const data = (await res.json().catch(() => null)) as { referenceId?: string } | null;
        setReferenceId(data?.referenceId ?? 'GIFT-RECEIVED');
        setStatus('success');
        return;
      }

      // Last-resort mailto if API unreachable
      const subject = encodeURIComponent('Gift puja inquiry');
      const body = encodeURIComponent(
        [
          `Buyer: ${payload.buyer.name} <${payload.buyer.email}> (${payload.buyer.country})`,
          `Recipient: ${payload.recipient.name} — WA ${payload.recipient.whatsapp} — ${payload.recipient.city}`,
          `Puja: ${payload.puja}`,
          `Occasion: ${payload.occasion}`,
          `Message: ${payload.message}`,
        ].join('\n'),
      );
      window.location.href = `mailto:gift@darshya.online?subject=${subject}&body=${body}`;
      setReferenceId('GIFT-MAILTO');
      setStatus('success');
    } catch (e: unknown) {
      setErr((e as Error)?.message ?? 'Could not submit. Please email gift@darshya.online directly.');
      setStatus('error');
    }
  };

  // Inquiry success (no payment)
  if (status === 'success') {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold text-emerald-800">Inquiry received</p>
            <p className="mt-1 text-emerald-700">
              Reference: <span className="font-mono">{referenceId}</span>. Our team replies within 4 hours with available pandits + dates + a secure payment link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <input
          name="buyer_name"
          placeholder="Your name"
          required
          className="rounded-lg border border-surface-300 px-3 py-2"
        />
        <input
          name="buyer_country"
          placeholder="Country (e.g. USA)"
          className="rounded-lg border border-surface-300 px-3 py-2"
        />
      </div>
      <input
        name="buyer_email"
        type="email"
        placeholder="Your email"
        required
        className="w-full rounded-lg border border-surface-300 px-3 py-2"
      />

      <div className="pt-2 text-xs font-semibold uppercase tracking-wide text-surface-500">
        Recipient (in India)
      </div>
      <input
        name="recipient_name"
        placeholder="Recipient name"
        required
        className="w-full rounded-lg border border-surface-300 px-3 py-2"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          name="recipient_whatsapp"
          placeholder="WhatsApp +91…"
          required
          className="rounded-lg border border-surface-300 px-3 py-2"
        />
        <input
          name="recipient_city"
          placeholder="City"
          className="rounded-lg border border-surface-300 px-3 py-2"
        />
      </div>

      <div className="pt-2 text-xs font-semibold uppercase tracking-wide text-surface-500">
        Puja
      </div>
      <select
        name="puja"
        defaultValue="Satyanarayan Puja"
        className="w-full rounded-lg border border-surface-300 px-3 py-2 bg-white"
      >
        {PUJAS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <select
        name="occasion"
        defaultValue="Parents anniversary"
        className="w-full rounded-lg border border-surface-300 px-3 py-2 bg-white"
      >
        {OCCASIONS.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <textarea
        name="message"
        rows={2}
        placeholder="Optional message for sankalp"
        className="w-full rounded-lg border border-surface-300 px-3 py-2"
      />

      {/* The USD offering-amount picker was removed 2026-08-11 with the Stripe
          rail — quoting a dollar amount the site cannot charge is the failure
          mode RV-01 was. Ops quote the amount in the reply. */}

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {err}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'submitting' || !config}
        className="w-full rounded-lg bg-saffron-600 hover:bg-saffron-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 inline-flex items-center justify-center gap-2"
      >
        {status === 'submitting' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting…
          </>
        ) : (
          'Request gift puja'
        )}
      </button>
      <p className="text-[11px] text-surface-500 text-center">
        Free to ask — no payment yet. We email pandit + date options + payment link within 4 hours.
      </p>
    </form>
  );
}
