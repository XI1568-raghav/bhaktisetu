'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DateInput } from '../../../components/ui/DateInput';

// Layer AT — booking flow. Single-page form, no multi-step wizard.
// Defaults preferredDate to today since most rites are needed same-day.
// Submitting calls /api/v1/antim-sanskar/book (no online payment), then
// shows a quiet confirmation screen.

const PACKAGES = [
  { tier: 'basic', name: 'Basic Antyeshti', priceInr: 15000 },
  { tier: 'standard', name: 'Standard with Asthi Visarjan', priceInr: 35000 },
  {
    tier: 'comprehensive',
    name: 'Comprehensive with Shradh',
    priceInr: 50000,
  },
] as const;

type PackageTier = (typeof PACKAGES)[number]['tier'];

const RIVERS = [
  { id: 'ganga', label: 'Ganga (Haridwar / Kashi / Prayag)' },
  { id: 'godavari', label: 'Godavari (Nashik / Rajahmundry)' },
  { id: 'yamuna', label: 'Yamuna (Mathura)' },
  { id: 'narmada', label: 'Narmada (Omkareshwar / Maheshwar)' },
] as const;

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function apiBase(): string {
  const candidate =
    process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
  return candidate.endsWith('/api/v1')
    ? candidate
    : `${candidate.replace(/\/$/, '')}/api/v1`;
}

interface SubmitOk {
  bookingNumber: string;
  packageName: string;
  priceInr: number;
  preferredDate: string;
  coordinatorCallEtaMinutes: number;
  message: string;
}

export default function AntimSanskarBookPage() {
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelation, setContactRelation] = useState('');
  const [deceasedName, setDeceasedName] = useState('');
  const [city, setCity] = useState('');
  const [preferredGhat, setPreferredGhat] = useState('');
  const [preferredDate, setPreferredDate] = useState(todayIso());
  const [packageTier, setPackageTier] = useState<PackageTier>('standard');
  const [asthiVisarjanRiver, setAsthiVisarjanRiver] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<SubmitOk | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase()}/antim-sanskar/book`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          deceasedName: deceasedName.trim(),
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
          contactRelation: contactRelation.trim() || undefined,
          city: city.trim(),
          preferredGhat: preferredGhat.trim() || undefined,
          preferredDate,
          packageTier,
          asthiVisarjanRiver: asthiVisarjanRiver || undefined,
          notes: notes.trim() || undefined,
          email: email.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? 'Could not submit. Please try the call line.');
      }
      const data = (await res.json()) as SubmitOk;
      setConfirmation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    return (
      <div
        data-ad-quarantine="true"
        className="min-h-[100dvh] flex items-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
          <h1
            className="text-2xl md:text-3xl font-semibold mb-4"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text)',
            }}
          >
            We have received your request.
          </h1>
          <p
            className="text-sm leading-relaxed mb-6"
            style={{ color: 'var(--color-text-muted)' }}
          >
            A coordinator will call you within the next{' '}
            {confirmation.coordinatorCallEtaMinutes} minutes. There is nothing
            further you need to do right now.
          </p>
          <div
            className="p-5 rounded-lg mb-6"
            style={{
              background: 'var(--color-surface-offset)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p
              className="text-xs uppercase tracking-widest mb-2"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Reference
            </p>
            <p
              className="text-base font-mono"
              style={{ color: 'var(--color-text)' }}
            >
              {confirmation.bookingNumber}
            </p>
            <p
              className="text-xs mt-3"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {confirmation.packageName} — Rs{' '}
              {confirmation.priceInr.toLocaleString('en-IN')}, settled on-site
              after the rites.
            </p>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Om shanti.
          </p>
          <div className="mt-8">
            <Link
              href="/"
              className="text-sm underline"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Return to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-ad-quarantine="true" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <p
          className="text-xs uppercase tracking-[0.2em] mb-3"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Antim Sanskar — Talk to Coordinator
        </p>
        <h1
          className="text-2xl md:text-3xl font-semibold mb-3 leading-tight"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--color-text)',
          }}
        >
          Share a few details. We will call you back within 30 minutes.
        </h1>
        <p
          className="text-sm leading-relaxed mb-8"
          style={{ color: 'var(--color-text-muted)' }}
        >
          No payment is collected here. The amount is settled on-site only
          after the rites are complete.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field
            label="Your name"
            value={contactName}
            onChange={setContactName}
            required
            autoComplete="name"
          />
          <Field
            label="Your phone number"
            value={contactPhone}
            onChange={setContactPhone}
            required
            type="tel"
            autoComplete="tel"
            help="The coordinator will call this number."
          />
          <Field
            label="Your relation to the deceased"
            value={contactRelation}
            onChange={setContactRelation}
            placeholder="Son / Daughter / Spouse / Other"
          />
          <Field
            label="Name of the deceased"
            value={deceasedName}
            onChange={setDeceasedName}
            required
          />
          <Field
            label="City"
            value={city}
            onChange={setCity}
            required
            autoComplete="address-level2"
          />
          <Field
            label="Preferred ghat (if any)"
            value={preferredGhat}
            onChange={setPreferredGhat}
            placeholder="Leave blank if not sure"
          />
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text)' }}
            >
              Preferred date
            </label>
            <DateInput value={preferredDate} onChange={(v) => setPreferredDate(v)} />
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
            <p
              className="text-xs mt-1.5"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Defaults to today.
            </p>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--color-text)' }}
            >
              Package
            </label>
            <div className="space-y-2">
              {PACKAGES.map((p) => (
                <label
                  key={p.tier}
                  className="flex items-start gap-3 p-3 rounded-md cursor-pointer"
                  style={{
                    border:
                      packageTier === p.tier
                        ? '1px solid var(--color-text)'
                        : '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                  }}
                >
                  <input
                    type="radio"
                    name="package"
                    value={p.tier}
                    checked={packageTier === p.tier}
                    onChange={() => setPackageTier(p.tier)}
                    className="mt-1"
                  />
                  <span className="flex-1">
                    <span
                      className="block text-sm font-medium"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {p.name}
                    </span>
                    <span
                      className="block text-xs mt-0.5"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      Rs {p.priceInr.toLocaleString('en-IN')} — settled on-site
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {(packageTier === 'standard' || packageTier === 'comprehensive') && (
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text)' }}
              >
                Asthi visarjan — sacred river (optional)
              </label>
              <select
                value={asthiVisarjanRiver}
                onChange={(e) => setAsthiVisarjanRiver(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md text-sm"
                style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                <option value="">Decide on the call</option>
                {RIVERS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Field
            label="Email for confirmation (optional)"
            value={email}
            onChange={setEmail}
            type="email"
            autoComplete="email"
          />

          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text)' }}
            >
              Anything else we should know
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-md text-sm"
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              placeholder="Family tradition, language preference, mobility needs, etc."
            />
          </div>

          {error && (
            <div
              className="p-3 rounded-md text-sm"
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              role="alert"
            >
              {error}. You can also call us directly — line is open 24x7.
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-3 text-sm font-medium rounded-lg text-white transition-all disabled:opacity-60"
            style={{ background: 'var(--color-text)' }}
          >
            {submitting ? 'Submitting…' : 'Talk to Coordinator'}
          </button>
          <p
            className="text-xs text-center"
            style={{ color: 'var(--color-text-muted)' }}
          >
            By submitting, you understand a coordinator will call your number
            within 30 minutes. No payment is taken now.
          </p>
        </form>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  help?: string;
}

function Field({
  label,
  value,
  onChange,
  required,
  type = 'text',
  placeholder,
  autoComplete,
  help,
}: FieldProps) {
  return (
    <div>
      <label
        className="block text-sm font-medium mb-1.5"
        style={{ color: 'var(--color-text)' }}
      >
        {label}
        {required ? ' *' : ''}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full px-3 py-2.5 rounded-md text-sm"
        style={{
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
        }}
      />
      {help && (
        <p
          className="text-xs mt-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {help}
        </p>
      )}
    </div>
  );
}
