'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function apiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
  return raw.endsWith('/api/v1') ? raw : `${raw.replace(/\/$/, '')}/api/v1`;
}

function InquiryForm() {
  const params = useSearchParams();
  const presetPackage = params.get('package');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    city: '',
    weddingDate: '',
    package: presetPackage === 'basic' || presetPackage === 'premium' || presetPackage === 'royal'
      ? presetPackage
      : '',
    guests: '',
    budget: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError(null);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!payload.weddingDate) delete payload.weddingDate;
      if (!payload.package) delete payload.package;
      if (!payload.guests) delete payload.guests;
      if (!payload.budget) delete payload.budget;
      if (!payload.message) delete payload.message;

      const res = await fetch(`${apiBase()}/weddings/inquiry`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      setStatus('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-xl p-8 border border-amber-100 text-center">
        <h2 className="font-serif text-2xl text-amber-900">Thank you</h2>
        <p className="mt-2 text-stone-700">
          A Darshya wedding concierge will reach out within 24 hours. Please check your email for a
          confirmation.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-xl mx-auto bg-white rounded-xl p-6 border border-amber-100 grid gap-4"
    >
      <label className="block">
        <span className="text-sm text-stone-700">Full name</span>
        <input
          required
          value={form.fullName}
          onChange={(e) => update('fullName', e.target.value)}
          className="mt-1 w-full rounded-md border border-stone-300 p-2"
        />
      </label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm text-stone-700">Email</span>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 p-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-stone-700">Phone</span>
          <input
            required
            type="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 p-2"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-sm text-stone-700">City</span>
        <input
          required
          value={form.city}
          onChange={(e) => update('city', e.target.value)}
          className="mt-1 w-full rounded-md border border-stone-300 p-2"
        />
      </label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm text-stone-700">Wedding date (if known)</span>
          <input
            type="date"
            value={form.weddingDate}
            onChange={(e) => update('weddingDate', e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 p-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-stone-700">Package</span>
          <select
            value={form.package}
            onChange={(e) => update('package', e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 p-2"
          >
            <option value="">— select —</option>
            <option value="basic">Basic — ₹15,000</option>
            <option value="premium">Premium — ₹50,000</option>
            <option value="royal">Royal — ₹2,00,000</option>
          </select>
        </label>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm text-stone-700">Guests (approx)</span>
          <input
            type="number"
            min={0}
            value={form.guests}
            onChange={(e) => update('guests', e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 p-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-stone-700">Budget (₹)</span>
          <input
            type="number"
            min={0}
            value={form.budget}
            onChange={(e) => update('budget', e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 p-2"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-sm text-stone-700">Anything else</span>
        <textarea
          value={form.message}
          onChange={(e) => update('message', e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-md border border-stone-300 p-2"
        />
      </label>

      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="px-6 py-3 rounded-lg bg-amber-700 text-white font-medium disabled:opacity-50"
      >
        {status === 'sending' ? 'Sending…' : 'Send inquiry'}
      </button>
    </form>
  );
}

export default function InquiryPage() {
  return (
    <main className="min-h-[100dvh] bg-amber-50/40 py-12 px-4">
      <h1 className="font-serif text-3xl text-amber-900 text-center">Wedding inquiry</h1>
      <p className="mt-2 text-stone-700 text-center max-w-2xl mx-auto">
        Tell us a little about your wedding. A Darshya concierge will respond within 24 hours.
      </p>
      <div className="mt-8">
        <Suspense fallback={<div className="text-center text-stone-600">Loading…</div>}>
          <InquiryForm />
        </Suspense>
      </div>
    </main>
  );
}
