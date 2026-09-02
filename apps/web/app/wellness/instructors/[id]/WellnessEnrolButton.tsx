'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { API_BASE_URL } from '../../../../lib/api-config';

import { buttonClass } from '../../../../components/ui/button-recipe';
// Honest-fallback enrol CTA — captures intent + email via /api/v1/waitlist
// with a deterministic source tag (`wellness-enrol-{instructorId}-{plan}`).
// Real Razorpay enrol flow lives in wellness-sessions.ts but requires a
// per-session DB row; static instructor catalog doesn't have one yet, so we
// route through lead-capture until a session picker ships in MVP2.

type Plan = 'consultation' | 'single' | 'pack5' | 'pack10';

interface Props {
  instructorId: string;
  instructorName: string;
  plan: Plan;
  price?: number;
  variant?: 'primary' | 'tier' | 'tierHighlight';
  label: string;
}

const PLAN_LABEL: Record<Plan, string> = {
  consultation: 'consultation booking',
  single: 'single session',
  pack5: '5-session pack',
  pack10: '10-session pack',
};

export default function WellnessEnrolButton({
  instructorId,
  instructorName,
  plan,
  price,
  variant = 'primary',
  label,
}: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const source = `wellness-enrol-${instructorId}-${plan}`;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          fullName: name.trim() || undefined,
          phone: phone.trim() || undefined,
          source,
          whatsappOptIn: !!phone.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message || 'Could not save your interest. Please try again.');
      } else {
        setDone(true);
        import('../../../../lib/posthog')
          .then((m) => m.capture('wellness_enrol_intent', { source, plan, instructorId }))
          .catch(() => {});
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const btnClass =
    variant === 'primary'
      ? 'inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg text-white btn-press w-full sm:w-auto justify-center'
      : 'w-full py-2 text-xs font-medium rounded-lg btn-press';

  const btnStyle =
    variant === 'tierHighlight'
      ? { background: 'rgba(255,255,255,0.2)', color: '#fff' }
      : { background: 'var(--color-primary)', color: '#fff' };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={btnClass}
        style={btnStyle}
      >
        {label}
        {variant === 'primary' ? <ArrowRight className="w-4 h-4" /> : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl p-6 sm:p-7"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">You're on the list</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {instructorName.split(' ')[0]} or our wellness team will reach out within 24 hours to schedule your {PLAN_LABEL[plan]}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setTimeout(() => { setDone(false); setEmail(''); setName(''); setPhone(''); }, 200);
                  }}
                  className="mt-5 inline-flex items-center justify-center px-5 py-2 text-sm font-medium rounded-lg text-white"
                  style={{ background: 'var(--color-primary)' }}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-1">
                  Reserve your {PLAN_LABEL[plan]}
                </h3>
                <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                  With {instructorName}
                  {typeof price === 'number' ? ` · ₹${price.toLocaleString('en-IN')}` : null}
                </p>
                <form onSubmit={submit} className="space-y-3">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name (optional)"
                    autoComplete="name"
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    inputMode="email"
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="WhatsApp / phone (optional)"
                    autoComplete="tel"
                    inputMode="tel"
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  />
                  {error ? <p className="text-xs" style={{ color: '#b91c1c' }}>{error}</p> : null}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      disabled={busy}
                      className="flex-1 py-2 text-sm font-medium rounded-lg"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={busy}
                      className={buttonClass('primary', 'md', 'flex-1')}
                    >
                      {busy ? 'Saving…' : 'Reserve'}
                    </button>
                  </div>
                  <p className="text-xs pt-1" style={{ color: 'var(--color-text-faint)' }}>
                    Live Razorpay checkout enables once instructor verification completes. No charge today.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
