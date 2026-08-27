'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { buttonClass } from '../../../components/ui/button-recipe';
import Link from 'next/link';
import { useTranslations } from '../../../lib/t';
import {
  Flame,
  Phone,
  Mail,
  ArrowRight,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth, getRoleDashboardPath } from '../../../lib/auth-context';
import { getSupabaseBrowserClient } from '../../../lib/supabase';

// P0-1 (2026-07-17): open-redirect guard. /auth/callback already validated
// ?redirect= (root-relative or same-origin only) but /auth/login did not — a
// logged-in user hitting /auth/login?redirect=https://evil.com, or any user
// completing OTP login with that param, was sent straight to evil.com
// (phishing / token-grab vector). Mirror the callback guard so the redirect
// target can never leave the origin.
function safeRedirect(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  // Root-relative only (reject protocol-relative "//evil.com" and absolute URLs).
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  try {
    const u = new URL(raw, window.location.origin);
    if (u.origin === window.location.origin) return u.pathname + u.search + u.hash;
  } catch {
    /* malformed — fall through to fallback */
  }
  return fallback;
}

type AuthTab = 'email' | 'phone';
type Step = 'input' | 'otp';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function LoginPage() {
  const { signInWithOtp, verifyOtp, signInWithCredentials, isAuthenticated, user } = useAuth();
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');

  // Demo chips are hard-gated to non-production builds. The `demo123` password
  // lives in the client bundle, so it must NEVER be reachable in prod — if
  // admin@demo.com were ever seeded in prod, the previous gate (env flag OR
  // ?demo=1) would let anyone quick-login as admin. NODE_ENV check is the only
  // safe default; ?demo=1 still works for local QA.
  const showDemoChips =
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('demo') === '1';

  const [activeTab, setActiveTab] = useState<AuthTab>('email');
  const [step, setStep] = useState<Step>('input');

  // Email/password state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phone/OTP state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Shared state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  // A-012: set by handleVerifyOtp before the auth state settles, so the single
  // redirect effect below can send a brand-new account to /profile. A ref, not
  // state, so reading it can't reintroduce a stale closure.
  const isNewAccountRef = useRef(false);

  // A-012 (2026-08-10): SINGLE owner of post-login navigation. handleVerifyOtp
  // used to redirect directly as well, computing the target from a `user` it
  // had closed over BEFORE the OTP succeeded (its deps omitted `user`, so on a
  // fresh login that value was null → every returning non-devotee raced toward
  // /dashboard). This effect reads the fresh user from context; every login
  // path (email, OTP, already-signed-in) now lands here and nowhere else.
  useEffect(() => {
    if (isAuthenticated && user) {
      const params = new URLSearchParams(window.location.search);
      const redirect = isNewAccountRef.current
        ? '/profile'
        : safeRedirect(params.get('redirect'), getRoleDashboardPath(user.role));
      window.location.href = redirect;
    }
  }, [isAuthenticated, user]);

  // Focus appropriate input on tab change
  useEffect(() => {
    if (activeTab === 'email') {
      emailInputRef.current?.focus();
    } else {
      phoneInputRef.current?.focus();
    }
  }, [activeTab]);

  // Focus first OTP input when moving to OTP step
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const formatPhoneDisplay = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)} ${digits.slice(5, 10)}`;
  };

  // ─── Email/Password Login ───────────────────────────────────────

  const handleEmailLogin = async () => {
    setError('');
    setSuccessMessage('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    const result = await signInWithCredentials(email, password);
    setIsSubmitting(false);

    if (result.success) {
      // Redirect happens via useEffect
    } else {
      setError(result.message);
    }
  };

  // ─── Phone OTP Login ────────────────────────────────────────────

  const handleSendOtp = async () => {
    setError('');
    setSuccessMessage('');

    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);
    const fullPhone = `+91${digits}`;
    const result = await signInWithOtp(fullPhone);
    setIsSubmitting(false);

    if (result.success) {
      setSuccessMessage('OTP sent! Check your phone for the 6-digit code.');
      setStep('otp');
      setResendCountdown(30);
    } else {
      setError(result.message);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6);
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = digits[i] || '';
      }
      setOtp(newOtp);
      const nextEmpty = newOtp.findIndex((d) => d === '');
      const focusIndex = nextEmpty === -1 ? 5 : nextEmpty;
      otpInputRefs.current[focusIndex]?.focus();
      return;
    }

    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = useCallback(async () => {
    setError('');
    const otpString = otp.join('');

    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit OTP.');
      return;
    }

    setIsSubmitting(true);
    const digits = phone.replace(/\D/g, '');
    const fullPhone = `+91${digits}`;

    const result = await verifyOtp(fullPhone, otpString);
    setIsSubmitting(false);

    if (result.success) {
      // A-012: record the intent only — the [isAuthenticated, user] effect owns
      // the navigation. verifyOtp's setSession/setUser are already scheduled at
      // this point but React commits them after this continuation runs, so the
      // ref is always set before the effect reads it. Redirecting here too was
      // a second, racing navigation computed from a stale `user`.
      isNewAccountRef.current = !!result.isNewUser;
    } else {
      setError(result.message);
      setOtp(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    }
  }, [otp, phone, verifyOtp]);

  // Auto-submit when all 6 digits are entered.
  // A-012: `!isAuthenticated` stops a second, doomed verify of the same
  // (now consumed) OTP. On success the digits stay in state and isSubmitting
  // flips back to false in the very commit that authenticates the user, so
  // without this guard the effect re-fires while the redirect is still in
  // flight and flashes a bogus "Verification failed".
  useEffect(() => {
    const otpString = otp.join('');
    if (otpString.length === 6 && step === 'otp' && !isSubmitting && !isAuthenticated) {
      handleVerifyOtp();
    }
  }, [otp, step, isSubmitting, isAuthenticated, handleVerifyOtp]);

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;

    setError('');
    setIsSubmitting(true);

    const digits = phone.replace(/\D/g, '');
    const fullPhone = `+91${digits}`;
    const result = await signInWithOtp(fullPhone);

    setIsSubmitting(false);

    if (result.success) {
      setSuccessMessage('New OTP sent!');
      setResendCountdown(30);
      setOtp(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="shadow-warm overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Header */}
      {/* RESP-01: every vertical step from here down to the Sign In button is
          tightened BELOW sm (640px) and restored at sm:. Measured at 390x844
          with the compiled Tailwind bundle and a real layout engine: the card
          was 569px tall starting at y=96 (main's pt-16 plus the auth wrapper's
          py-8), which put Sign In at y 596-640 while the cookie banner's top
          edge sat at y=566 — elementFromPoint on the button's own centre
          returned the banner's <h2>. Nothing here removes copy or drops a tap
          target below 44px; the "Continue with Google" button keeps py-3 for
          exactly that reason. After: card 489px, Sign In 539-583, banner top
          582, elementFromPoint returns the Sign In button. */}
      <div className="border-b border-[var(--color-border)] bg-[#ede9e3] px-6 py-4 text-center sm:py-8">
        {/* A11Y-15 / DU-05: /auth/login shipped with h1Count=0 - no heading
            of any level anywhere on the page - so the heading rotor had no
            entry for "this is the sign-in page" and search engines saw no
            title. The lockup is unchanged pixel-for-pixel; it is now the
            h1, and the purpose is appended for AT instead of being
            duplicated on screen. */}
        <h1 className="mb-1.5 flex items-center justify-center gap-2 sm:mb-2">
          <span className="bg-saffron-600/15 flex h-7 w-7 items-center justify-center rounded-lg">
            <Flame className="text-saffron-600 h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-surface-800 text-xl font-semibold tracking-tight">
            Darsh<span className="text-saffron-600">ya</span>
          </span>
          <span className="sr-only">{step === 'otp' ? '\u2014 verify code' : '\u2014 sign in'}</span>
        </h1>
        <p className="text-surface-500 text-sm">
          {step === 'otp' ? t('otpLabel') : t('loginSubtitle')}
        </p>
      </div>

      {/* Form body */}
      <div className="px-6 py-4 sm:py-6">
        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Success message */}
        {successMessage && !error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {successMessage}
          </div>
        )}

        {/* ─── OTP Verification Step ─── */}
        {step === 'otp' && (
          <div>
            <button
              onClick={() => {
                setStep('input');
                setOtp(['', '', '', '', '', '']);
                setError('');
                setSuccessMessage('');
              }}
              className="text-surface-500 hover:text-saffron-600 mb-4 flex items-center gap-1 text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('back')}
            </button>

            <p className="text-surface-600 mb-1 text-sm">{t('otpSent')}</p>
            <p className="text-surface-800 mb-6 text-sm font-semibold">
              +91 {formatPhoneDisplay(phone)}
            </p>

            <div className="mb-6 flex justify-center gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    otpInputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                    if (pasted) handleOtpChange(index, pasted);
                  }}
                  className="border-surface-200 text-surface-800 focus:ring-saffron-300 focus:border-saffron-400 h-14 w-12 rounded-lg border-2 text-center text-xl font-semibold transition-colors focus:ring-2 focus:outline-none"
                />
              ))}
            </div>

            <button
              onClick={handleVerifyOtp}
              disabled={isSubmitting || otp.join('').length !== 6}
              className={buttonClass('primary', 'md', 'w-full disabled:cursor-not-allowed')}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {tCommon('loading')}
                </>
              ) : (
                <>
                  {t('verifyCta')}
                  <CheckCircle2 className="h-5 w-5" />
                </>
              )}
            </button>

            <div className="mt-4 text-center">
              {resendCountdown > 0 ? (
                <p className="text-surface-400 text-sm">
                  {t('resendIn')}{' '}
                  <span className="text-surface-600 font-semibold">
                    {resendCountdown}
                    {t('seconds')}
                  </span>
                </p>
              ) : (
                <button
                  onClick={handleResendOtp}
                  disabled={isSubmitting}
                  className="text-saffron-600 hover:text-saffron-700 text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {t('resendOtp')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── Input Step (tabs: Email or Phone) ─── */}
        {step === 'input' && (
          <div>
            {/* Google Sign-In */}
            <button
              onClick={async () => {
                setError('');
                try {
                  const supabase = getSupabaseBrowserClient();
                  const params = new URLSearchParams(window.location.search);
                  // P0-1 (2026-07-17): only forward a same-origin redirect to
                  // /auth/callback — that page re-validates, but don't hand it
                  // an arbitrary absolute URL to encode into the OAuth callback.
                  const redirect = safeRedirect(params.get('redirect'), '');
                  const callbackUrl = `${window.location.origin}/auth/callback${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`;
                  const { error: oauthError } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: callbackUrl },
                  });
                  if (oauthError) setError(oauthError.message || 'Could not start Google sign-in');
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Could not start Google sign-in');
                }
              }}
              className="border-surface-200 text-surface-700 hover:bg-surface-50 flex w-full items-center justify-center gap-3 rounded-lg border bg-white px-4 py-3 text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <GoogleIcon className="h-5 w-5" />
              {t('continueWithGoogle')}
            </button>

            {/* Divider */}
            <div className="relative my-3 sm:my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="border-surface-200 w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="text-surface-400 bg-[var(--color-surface)] px-3">{t('or')}</span>
              </div>
            </div>

            {/* Tab switcher */}
            <div className="bg-surface-100 mb-4 flex rounded-lg p-1 sm:mb-5">
              <button
                onClick={() => {
                  setActiveTab('email');
                  setError('');
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'email'
                    ? 'text-surface-800 bg-white shadow-sm'
                    : 'text-surface-500 hover:text-surface-700'
                }`}
              >
                <Mail className="h-4 w-4" />
                Email
              </button>
              <button
                onClick={() => {
                  setActiveTab('phone');
                  setError('');
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'phone'
                    ? 'text-surface-800 bg-white shadow-sm'
                    : 'text-surface-500 hover:text-surface-700'
                }`}
              >
                <Phone className="h-4 w-4" />
                Mobile
              </button>
            </div>

            {/* ─── Email + Password Form ─── */}
            {activeTab === 'email' && (
              <div>
                <div className="mb-3 sm:mb-4">
                  <label
                    htmlFor="email"
                    className="text-surface-700 mb-1.5 block text-sm font-medium"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="text-surface-400 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <input
                      ref={emailInputRef}
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEmailLogin();
                      }}
                      className="border-surface-200 text-surface-800 placeholder:text-surface-400 focus:ring-saffron-300 focus:border-saffron-400 w-full rounded-lg border py-2.5 pr-4 pl-10 text-sm transition-colors focus:ring-2 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mb-4 sm:mb-5">
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <label
                      htmlFor="password"
                      className="text-surface-700 block text-sm font-medium"
                    >
                      Password
                    </label>
                    {/* A-002: the only entry point to password recovery. Without
                        it the reset pages exist but are unreachable, which is
                        the state the whole product was in until 2026-08-11. */}
                    {/* RESP-07: measured 89.2x14.8 at 390px — the account
                        recovery path, a third of a fingertip tall. `.tap-safe`
                        grows the hit box to 44px and cancels it back out with
                        negative margin, so the label row does not move. */}
                    <Link
                      href="/auth/forgot-password"
                      className="text-saffron-700 hover:text-saffron-800 tap-safe text-xs font-medium"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="text-surface-400 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEmailLogin();
                      }}
                      className="border-surface-200 text-surface-800 placeholder:text-surface-400 focus:ring-saffron-300 focus:border-saffron-400 w-full rounded-lg border py-2.5 pr-10 pl-10 text-sm transition-colors focus:ring-2 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      className="text-surface-400 hover:text-surface-600 absolute top-1/2 right-3 -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleEmailLogin}
                  disabled={isSubmitting}
                  className={buttonClass('primary', 'md', 'w-full disabled:cursor-not-allowed')}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>

                {/* Demo accounts — one-click login. Hidden by default; pass ?demo=1 to show. */}
                {showDemoChips && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="mb-2 text-xs font-semibold text-amber-800">
                      Quick Login — Demo Accounts
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { email: 'devotee@demo.com', role: 'Devotee' },
                        { email: 'pandit@demo.com', role: 'Pandit' },
                        { email: 'store@demo.com', role: 'Store Owner' },
                        { email: 'astro@demo.com', role: 'Astrologer' },
                        { email: 'wellness@demo.com', role: 'Wellness' },
                        { email: 'temple@demo.com', role: 'Temple' },
                        { email: 'gaushala@demo.com', role: 'Gaushala' },
                        { email: 'admin@demo.com', role: 'Admin' },
                      ].map((acc) => (
                        <button
                          key={acc.email}
                          type="button"
                          disabled={isSubmitting}
                          onClick={async () => {
                            setError('');
                            setSuccessMessage('');
                            setEmail(acc.email);
                            setPassword('demo123');
                            setIsSubmitting(true);
                            const result = await signInWithCredentials(acc.email, 'demo123');
                            setIsSubmitting(false);
                            if (!result.success) setError(result.message);
                          }}
                          className="group flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-white px-2.5 py-1.5 text-left transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="text-surface-700 truncate text-xs font-medium">
                            {acc.role}
                          </span>
                          <span className="text-saffron-600 group-hover:text-saffron-700 shrink-0 text-xs font-semibold">
                            Sign in →
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── Phone + OTP Form ─── */}
            {activeTab === 'phone' && (
              <div>
                <label
                  htmlFor="phone"
                  className="text-surface-700 mb-1.5 block text-sm font-medium"
                >
                  Mobile Number
                </label>
                <div className="mb-5 flex gap-2">
                  <div className="bg-surface-50 border-surface-200 text-surface-600 flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium">
                    <span className="text-base"></span>
                    +91
                  </div>
                  <input
                    ref={phoneInputRef}
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={12}
                    placeholder="98765 43210"
                    value={formatPhoneDisplay(phone)}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(digits);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendOtp();
                    }}
                    className="border-surface-200 text-surface-800 placeholder:text-surface-300 focus:ring-saffron-300 focus:border-saffron-400 flex-1 rounded-lg border px-4 py-2.5 text-lg tracking-wider transition-colors focus:ring-2 focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleSendOtp}
                  disabled={isSubmitting || phone.replace(/\D/g, '').length !== 10}
                  className={buttonClass('primary', 'md', 'w-full disabled:cursor-not-allowed')}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Send OTP
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Terms & Sign up link */}
            <div className="mt-5 space-y-3">
              <p className="text-surface-400 text-center text-xs">
                By continuing, you agree to our{' '}
                <a href="/terms" className="text-saffron-600 hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-saffron-600 hover:underline">
                  Privacy Policy
                </a>
              </p>

              <div className="text-center">
                <p className="text-surface-500 text-sm">
                  Don&apos;t have an account?{' '}
                  <a
                    href="/auth/signup"
                    className="text-saffron-600 hover:text-saffron-700 font-semibold transition-colors"
                  >
                    Sign Up
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
