'use client';

import { API_BASE_URL } from '../lib/api-config';
import { useState, FormEvent, ReactNode } from 'react';

import { buttonClass } from '../components/ui/button-recipe';
import { userFacingMessage, serverErrorMessage } from '../lib/friendly-error';


export type OnboardRole =
  | 'TEMPLE'
  | 'PRIEST'
  | 'ASTROLOGER'
  | 'WELLNESS_INSTRUCTOR'
  | 'GAUSHALA';

interface SelfOnboardFormProps {
  role: OnboardRole;
  ctaLabel: string;
  extraFields: ReactNode;
}

const inputStyle: React.CSSProperties = {
  background: 'var(--color-bg, #faf7f2)',
  border: '1px solid var(--color-border, #e7dfd2)',
  color: 'var(--color-text, #1f1b18)',
};

const labelStyle: React.CSSProperties = {
  color: 'var(--color-text, #1f1b18)',
};

export default function SelfOnboardForm({ role, ctaLabel, extraFields }: SelfOnboardFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = { role };
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) payload[key] = trimmed;
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/leads/self-onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok?: boolean; leadId?: string; error?: string };
      if (!res.ok || !json.ok) {
        setError(serverErrorMessage(json, 'Something went wrong. Please try again.'));
        setSubmitting(false);
        return;
      }
      setSuccess(
        "Thanks — we have received your application. Our team will review it and reach out; we do not promise a reply time.",
      );
      (event.target as HTMLFormElement).reset();
    } catch (err) {
      setError(userFacingMessage(err, 'Network error. Please try again.'));
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="fullName" className="block text-xs font-medium mb-1" style={labelStyle}>
            Full name <span style={{ color: 'var(--color-primary, #ea580c)' }}>*</span>
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            autoComplete="name"
            placeholder="Your name"
            className="w-full px-3 py-2.5 text-sm rounded-lg outline-none"
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-xs font-medium mb-1" style={labelStyle}>
            Email <span style={{ color: 'var(--color-primary, #ea580c)' }}>*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full px-3 py-2.5 text-sm rounded-lg outline-none"
            style={inputStyle}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="phone" className="block text-xs font-medium mb-1" style={labelStyle}>
            Phone <span style={{ color: 'var(--color-primary, #ea580c)' }}>*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="+91 9XXXXXXXXX"
            className="w-full px-3 py-2.5 text-sm rounded-lg outline-none"
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="city" className="block text-xs font-medium mb-1" style={labelStyle}>
            City <span style={{ color: 'var(--color-primary, #ea580c)' }}>*</span>
          </label>
          <input
            id="city"
            name="city"
            type="text"
            required
            autoComplete="address-level2"
            placeholder="e.g. Varanasi"
            className="w-full px-3 py-2.5 text-sm rounded-lg outline-none"
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="state" className="block text-xs font-medium mb-1" style={labelStyle}>
            State <span style={{ color: 'var(--color-primary, #ea580c)' }}>*</span>
          </label>
          <input
            id="state"
            name="state"
            type="text"
            required
            autoComplete="address-level1"
            placeholder="e.g. Uttar Pradesh"
            className="w-full px-3 py-2.5 text-sm rounded-lg outline-none"
            style={inputStyle}
          />
        </div>
      </div>

      {extraFields}

      {error ? (
        <p className="text-xs px-3 py-2 rounded-md" style={{ background: '#fde6df', color: '#9a2a0a' }}>
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm px-3 py-3 rounded-md" style={{ background: '#e6f5e9', color: '#1f6b35' }}>
          {success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className={buttonClass('primary', 'md', 'w-full disabled:cursor-not-allowed')}

      >
        {submitting ? 'Submitting…' : ctaLabel}
      </button>
    </form>
  );
}

export function ExtraInput(props: {
  name: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'number';
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label htmlFor={props.name} className="block text-xs font-medium mb-1" style={labelStyle}>
        {props.label}
        {props.required ? <span style={{ color: 'var(--color-primary, #ea580c)' }}> *</span> : null}
      </label>
      <input
        id={props.name}
        name={props.name}
        type={props.type ?? 'text'}
        required={props.required}
        placeholder={props.placeholder}
        min={props.min}
        max={props.max}
        className="w-full px-3 py-2.5 text-sm rounded-lg outline-none"
        style={inputStyle}
      />
    </div>
  );
}

export function ExtraSelect(props: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={props.name} className="block text-xs font-medium mb-1" style={labelStyle}>
        {props.label}
        {props.required ? <span style={{ color: 'var(--color-primary, #ea580c)' }}> *</span> : null}
      </label>
      <select
        id={props.name}
        name={props.name}
        required={props.required}
        defaultValue=""
        className="w-full px-3 py-2.5 text-sm rounded-lg outline-none"
        style={inputStyle}
      >
        <option value="" disabled>
          Select…
        </option>
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ExtraCheckbox(props: { name: string; label: string }) {
  return (
    <label className="flex items-center gap-2 text-xs cursor-pointer" style={labelStyle}>
      <input type="checkbox" name={props.name} value="yes" className="w-3.5 h-3.5 accent-orange-600" />
      {props.label}
    </label>
  );
}
