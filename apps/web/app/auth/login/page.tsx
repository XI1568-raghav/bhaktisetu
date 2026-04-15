'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Flame, Phone, ArrowRight, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';

type Step = 'phone' | 'otp';

export default function LoginPage() {
  const { signInWithOtp, verifyOtp, isAuthenticated, demoSignIn } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || '/dashboard';
      window.location.href = redirect;
    }
  }, [isAuthenticated]);

  // Focus phone input on mount
  useEffect(() => {
    phoneInputRef.current?.focus();
  }, []);

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

  /**
   * Formats a 10-digit number as phone display: 98765 43210
   */
  const formatPhoneDisplay = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)} ${digits.slice(5, 10)}`;
  };

  /**
   * Handle phone number submission.
   */
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

  /**
   * Handle individual OTP digit input.
   */
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
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

    // Auto-advance to next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  /**
   * Handle backspace in OTP input.
   */
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  /**
   * Submit OTP for verification.
   */
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
      const params = new URLSearchParams(window.location.search);
      const redirect = result.isNewUser ? '/profile' : (params.get('redirect') || '/dashboard');
      window.location.href = redirect;
    } else {
      setError(result.message);
      setOtp(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    }
  }, [otp, phone, verifyOtp]);

  // Auto-submit when all 6 digits are entered
  useEffect(() => {
    const otpString = otp.join('');
    if (otpString.length === 6 && step === 'otp' && !isSubmitting) {
      handleVerifyOtp();
    }
  }, [otp, step, isSubmitting, handleVerifyOtp]);

  /**
   * Resend OTP.
   */
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
    <div className="bg-white rounded-xl border border-surface-200/60 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="gradient-saffron px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-semibold text-white tracking-tight">
            Bhakti<span className="text-sandal-cream">setu</span>
          </span>
        </div>

        <p className="text-saffron-100 text-sm">
          {step === 'phone'
            ? 'Sign in to your spiritual journey'
            : 'Enter the code sent to your phone'}
        </p>
      </div>

      {/* Form body */}
      <div className="px-6 py-8">
        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Success message */}
        {successMessage && !error && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {successMessage}
          </div>
        )}

        {/* ─── Phone Step ─── */}
        {step === 'phone' && (
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-surface-700 mb-2">
              Mobile Number
            </label>
            <div className="flex gap-2 mb-6">
              {/* Country code */}
              <div className="flex items-center gap-1.5 px-3 py-3 bg-surface-50 border border-surface-200 rounded-lg text-surface-600 text-sm font-medium shrink-0">
                <span className="text-base">🇮🇳</span>
                +91
              </div>

              {/* Phone input */}
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
                className="flex-1 px-4 py-3 border border-surface-200 rounded-lg text-surface-800 text-lg tracking-wider placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-saffron-300 focus:border-saffron-400 transition-colors"
              />
            </div>

            <button
              onClick={handleSendOtp}
              disabled={isSubmitting || phone.replace(/\D/g, '').length !== 10}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                <>
                  Send OTP
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <p className="mt-4 text-xs text-surface-400 text-center">
              By continuing, you agree to our{' '}
              <a href="/terms" className="text-saffron-600 hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-saffron-600 hover:underline">
                Privacy Policy
              </a>
            </p>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-surface-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-surface-400">or</span>
              </div>
            </div>

            {/* Demo Sign In */}
            <button
              onClick={() => {
                demoSignIn();
                window.location.href = '/dashboard';
              }}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-surface-900 text-white font-medium rounded-lg hover:bg-surface-800 transition-colors"
            >
              <span className="text-lg">🪔</span>
              Demo Sign In as Arjun Sharma
            </button>
            <p className="mt-2 text-xs text-surface-400 text-center">
              Instantly explore all features with a demo account
            </p>
          </div>
        )}

        {/* ─── OTP Step ─── */}
        {step === 'otp' && (
          <div>
            <button
              onClick={() => {
                setStep('phone');
                setOtp(['', '', '', '', '', '']);
                setError('');
                setSuccessMessage('');
              }}
              className="flex items-center gap-1 text-sm text-surface-500 hover:text-saffron-600 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Change number
            </button>

            <p className="text-sm text-surface-600 mb-1">
              Enter the 6-digit code sent to
            </p>
            <p className="text-sm font-semibold text-surface-800 mb-6">
              +91 {formatPhoneDisplay(phone)}
            </p>

            {/* OTP input boxes */}
            <div className="flex gap-2 justify-center mb-6">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { otpInputRefs.current[index] = el; }}
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
                  className="w-12 h-14 text-center text-xl font-semibold border-2 border-surface-200 rounded-lg text-surface-800 focus:outline-none focus:ring-2 focus:ring-saffron-300 focus:border-saffron-400 transition-colors"
                />
              ))}
            </div>

            <button
              onClick={handleVerifyOtp}
              disabled={isSubmitting || otp.join('').length !== 6}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify & Sign In
                  <CheckCircle2 className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Resend OTP */}
            <div className="mt-4 text-center">
              {resendCountdown > 0 ? (
                <p className="text-sm text-surface-400">
                  Resend OTP in{' '}
                  <span className="font-semibold text-surface-600">{resendCountdown}s</span>
                </p>
              ) : (
                <button
                  onClick={handleResendOtp}
                  disabled={isSubmitting}
                  className="text-sm text-saffron-600 font-semibold hover:text-saffron-700 transition-colors disabled:opacity-50"
                >
                  Resend OTP
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
