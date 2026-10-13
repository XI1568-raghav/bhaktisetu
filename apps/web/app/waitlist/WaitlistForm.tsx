'use client';

import { API_BASE_URL } from '../../lib/api-config';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { buttonClass } from '../../components/ui/button-recipe';
import { userFacingMessage, serverErrorMessage } from '../../lib/friendly-error';
interface WaitlistFormProps {
  initialRef: string;
  cities: string[];
  deities: string[];
}



export default function WaitlistForm({ initialRef, cities, deities }: WaitlistFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      email: String(formData.get('email') ?? '').trim(),
      fullName: String(formData.get('fullName') ?? '').trim() || undefined,
      phone: String(formData.get('phone') ?? '').trim() || undefined,
      city: String(formData.get('city') ?? '').trim() || undefined,
      preferredDeity: String(formData.get('preferredDeity') ?? '').trim() || undefined,
      panchangOptIn: formData.get('panchangOptIn') === 'on',
      whatsappOptIn: formData.get('whatsappOptIn') === 'on',
      source: 'web_waitlist_page',
    };
    const ref = (formData.get('referredByCode') as string | null)?.trim();
    if (ref) payload.referredByCode = ref;

    try {
      const res = await fetch(`${API_BASE_URL}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { referralCode?: string; error?: string };
      if (!res.ok) {
        setError(serverErrorMessage(json, 'Something went wrong. Try again.'));
        setSubmitting(false);
        return;
      }
      if (json.referralCode) {
        router.push(`/waitlist/welcome?code=${json.referralCode}`);
        return;
      }
      setError('Unexpected response from server.');
    } catch (err) {
      setError(userFacingMessage(err, 'Network error.'));
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text, #1f1b18)' }}>
          Email <span style={{ color: 'var(--color-primary, #ea580c)' }}>*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="w-full px-3 py-2.5 text-sm rounded-lg outline-none transition-colors"
          style={{
            background: 'var(--color-bg, #faf7f2)',
            border: '1px solid var(--color-border, #e7dfd2)',
            color: 'var(--color-text, #1f1b18)',
          }}
        />
      </div>

      <div>
        <label htmlFor="fullName" className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text, #1f1b18)' }}>
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          className="w-full px-3 py-2.5 text-sm rounded-lg outline-none"
          style={{
            background: 'var(--color-bg, #faf7f2)',
            border: '1px solid var(--color-border, #e7dfd2)',
            color: 'var(--color-text, #1f1b18)',
          }}
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text, #1f1b18)' }}>
          Phone (optional, for WhatsApp)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+91 9XXXXXXXXX"
          className="w-full px-3 py-2.5 text-sm rounded-lg outline-none"
          style={{
            background: 'var(--color-bg, #faf7f2)',
            border: '1px solid var(--color-border, #e7dfd2)',
            color: 'var(--color-text, #1f1b18)',
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="city" className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text, #1f1b18)' }}>
            City
          </label>
          <select
            id="city"
            name="city"
            className="w-full px-3 py-2.5 text-sm rounded-lg outline-none"
            style={{
              background: 'var(--color-bg, #faf7f2)',
              border: '1px solid var(--color-border, #e7dfd2)',
              color: 'var(--color-text, #1f1b18)',
            }}
            defaultValue=""
          >
            <option value="">Select city</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="preferredDeity" className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text, #1f1b18)' }}>
            Preferred deity
          </label>
          <select
            id="preferredDeity"
            name="preferredDeity"
            className="w-full px-3 py-2.5 text-sm rounded-lg outline-none"
            style={{
              background: 'var(--color-bg, #faf7f2)',
              border: '1px solid var(--color-border, #e7dfd2)',
              color: 'var(--color-text, #1f1b18)',
            }}
            defaultValue=""
          >
            <option value="">Select deity</option>
            {deities.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2 pt-1">
        <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--color-text, #1f1b18)' }}>
          <input
            type="checkbox"
            name="panchangOptIn"
            defaultChecked
            className="w-3.5 h-3.5 accent-orange-600"
          />
          Email me daily panchang (tithi, muhurat, festivals)
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--color-text, #1f1b18)' }}>
          <input
            type="checkbox"
            name="whatsappOptIn"
            className="w-3.5 h-3.5 accent-orange-600"
          />
          Send me WhatsApp updates (rare, opt-out anytime)
        </label>
      </div>

      <input type="hidden" name="referredByCode" defaultValue={initialRef} />

      {error ? (
        <p className="text-xs px-3 py-2 rounded-md" style={{ background: '#fde6df', color: '#9a2a0a' }}>
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className={buttonClass('primary', 'md', 'w-full disabled:cursor-not-allowed')}

      >
        {submitting ? 'Reserving your spot…' : 'Reserve my spot'}
      </button>
    </form>
  );
}
