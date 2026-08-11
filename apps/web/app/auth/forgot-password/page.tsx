'use client';

/**
 * A-002 (2026-08-11): the product had no password-reset path of any kind. A
 * devotee — or a pandit, or an admin — who forgot their password had no route
 * back into their account: email/password sign-in is the primary login, phone
 * OTP needs an SMS provider that is not configured, and the magic link was
 * never surfaced as a recovery option. Support had no remedy either, because
 * nothing in the admin surface can set a password.
 *
 * Owner decision (2026-08-11): Supabase reset email, not magic-link-only, so
 * existing password logins keep working.
 *
 * Enumeration: the success state is shown for ANY syntactically valid email,
 * whether or not an account exists, and Supabase's own error is never echoed.
 * Otherwise this page becomes a free "is this address registered?" oracle for
 * a platform whose membership is itself sensitive.
 *
 * Renders as a card — apps/web/app/auth/layout.tsx supplies the full-screen
 * gradient and centering for every route in this segment.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { getSupabaseBrowserClient } from '../../../lib/supabase';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
 const [email, setEmail] = useState('');
 const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
 const [error, setError] = useState('');

 const handleSubmit = async () => {
  const trimmed = email.trim();
  if (!EMAIL_RE.test(trimmed)) {
   setError('Please enter a valid email address.');
   setStatus('error');
   return;
  }

  setStatus('submitting');
  setError('');

  try {
   const supabase = getSupabaseBrowserClient();
   await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
   });
  } catch {
   // Deliberately swallowed — see the enumeration note above. A transport
   // failure and an unknown address must look identical from here.
  }

  setStatus('sent');
 };

 if (status === 'sent') {
  return (
   <div className="shadow-warm overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
    <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
    <h1 className="text-surface-800 mb-2 text-xl font-bold">Check your email</h1>
    <p className="text-surface-500 mb-6 text-sm">
     If an account exists for{' '}
     <span className="text-surface-700 font-medium">{email.trim()}</span>, we&apos;ve sent a
     link to reset your password. It expires in one hour.
    </p>
    <p className="text-surface-400 mb-6 text-xs">
     Nothing arrived? Check spam, then try again — the link is only sent to registered
     addresses.
    </p>
    <Link
     href="/auth/login"
     className="text-saffron-700 hover:text-saffron-800 inline-flex items-center gap-2 text-sm font-medium"
    >
     <ArrowLeft className="h-4 w-4" />
     Back to sign in
    </Link>
   </div>
  );
 }

 return (
  <div className="shadow-warm overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
   <h1 className="text-surface-800 mb-2 text-xl font-bold">Reset your password</h1>
   <p className="text-surface-500 mb-6 text-sm">
    Enter the email you signed up with and we&apos;ll send you a link to choose a new password.
   </p>

   <label htmlFor="email" className="text-surface-700 mb-1.5 block text-sm font-medium">
    Email
   </label>
   <div className="relative mb-4">
    <Mail className="text-surface-400 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
    <input
     id="email"
     type="email"
     autoComplete="email"
     placeholder="you@example.com"
     value={email}
     onChange={(e) => {
      setEmail(e.target.value);
      if (status === 'error') setStatus('idle');
     }}
     onKeyDown={(e) => {
      if (e.key === 'Enter') handleSubmit();
     }}
     className="border-surface-200 text-surface-800 placeholder:text-surface-400 focus:ring-saffron-300 focus:border-saffron-400 w-full rounded-lg border py-2.5 pr-3 pl-10 text-sm transition-colors focus:ring-2 focus:outline-none"
    />
   </div>

   {status === 'error' && error && (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3">
     <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
     <p className="text-sm text-red-700">{error}</p>
    </div>
   )}

   <button
    onClick={handleSubmit}
    disabled={status === 'submitting'}
    className="bg-saffron-600 hover:bg-saffron-700 flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
   >
    {status === 'submitting' ? (
     <>
      <Loader2 className="h-5 w-5 animate-spin" />
      Sending...
     </>
    ) : (
     'Send reset link'
    )}
   </button>

   <div className="mt-6 text-center">
    <Link
     href="/auth/login"
     className="text-surface-500 hover:text-saffron-700 inline-flex items-center gap-2 text-sm"
    >
     <ArrowLeft className="h-4 w-4" />
     Back to sign in
    </Link>
   </div>
  </div>
 );
}
