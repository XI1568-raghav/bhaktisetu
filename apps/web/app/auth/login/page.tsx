'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Flame, Phone, Mail, ArrowRight, Loader2, CheckCircle2, ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth, getRoleDashboardPath } from '../../../lib/auth-context';

type AuthTab = 'email' | 'phone';
type Step = 'input' | 'otp';

function GoogleIcon({ className }: { className?: string }) {
 return (
 <svg className={className} viewBox="0 0 24 24" fill="none">
 <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
 <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
 <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
 <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
 </svg>
 );
}

export default function LoginPage() {
 const { signInWithOtp, verifyOtp, signInWithCredentials, isAuthenticated, user } = useAuth();

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

 // Redirect if already authenticated
 useEffect(() => {
 if (isAuthenticated && user) {
 const params = new URLSearchParams(window.location.search);
 const redirect = params.get('redirect') || getRoleDashboardPath(user.role);
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
 const params = new URLSearchParams(window.location.search);
 const redirect = result.isNewUser
 ? '/profile'
 : (params.get('redirect') || getRoleDashboardPath(user?.role ?? 'devotee'));
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
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-warm overflow-hidden">
 {/* Header */}
 <div className="bg-[#ede9e3] px-6 py-8 text-center border-b border-[var(--color-border)]">
 <div className="flex items-center justify-center gap-2 mb-2">
 <div className="w-7 h-7 bg-saffron-600/15 rounded-lg flex items-center justify-center">
 <Flame className="w-4 h-4 text-saffron-600" />
 </div>
 <span className="text-xl font-semibold text-surface-800 tracking-tight">
 Bhakti<span className="text-saffron-600">setu</span>
 </span>
 </div>
 <p className="text-surface-500 text-sm">
 {step === 'otp'
 ? 'Enter the code sent to your phone'
 : 'Sign in to your spiritual journey'}
 </p>
 </div>

 {/* Form body */}
 <div className="px-6 py-6">
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
 className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

 {/* ─── Input Step (tabs: Email or Phone) ─── */}
 {step === 'input' && (
 <div>
 {/* Google Sign-In */}
 <button
 onClick={() => {
 // In demo, sign in as devotee
 setError('Google Sign-In is not available in demo mode. Use email login below.');
 }}
 className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-surface-200 rounded-lg text-sm font-medium text-surface-700 hover:bg-surface-50 hover:-translate-y-0.5 hover:shadow-md transition-all"
 >
 <GoogleIcon className="w-5 h-5" />
 Continue with Google
 </button>

 {/* Divider */}
 <div className="relative my-5">
 <div className="absolute inset-0 flex items-center">
 <div className="w-full border-t border-surface-200" />
 </div>
 <div className="relative flex justify-center text-xs uppercase">
 <span className="bg-[var(--color-surface)] px-3 text-surface-400">or continue with</span>
 </div>
 </div>

 {/* Tab switcher */}
 <div className="flex bg-surface-100 rounded-lg p-1 mb-5">
 <button
 onClick={() => { setActiveTab('email'); setError(''); }}
 className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
 activeTab === 'email'
 ? 'bg-white text-surface-800 shadow-sm'
 : 'text-surface-500 hover:text-surface-700'
 }`}
 >
 <Mail className="w-4 h-4" />
 Email
 </button>
 <button
 onClick={() => { setActiveTab('phone'); setError(''); }}
 className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
 activeTab === 'phone'
 ? 'bg-white text-surface-800 shadow-sm'
 : 'text-surface-500 hover:text-surface-700'
 }`}
 >
 <Phone className="w-4 h-4" />
 Mobile
 </button>
 </div>

 {/* ─── Email + Password Form ─── */}
 {activeTab === 'email' && (
 <div>
 <div className="mb-4">
 <label htmlFor="email" className="block text-sm font-medium text-surface-700 mb-1.5">
 Email Address
 </label>
 <div className="relative">
 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
 <input
 ref={emailInputRef}
 id="email"
 type="email"
 placeholder="you@example.com"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 onKeyDown={(e) => { if (e.key === 'Enter') handleEmailLogin(); }}
 className="w-full pl-10 pr-4 py-2.5 border border-surface-200 rounded-lg text-sm text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-saffron-300 focus:border-saffron-400 transition-colors"
 />
 </div>
 </div>

 <div className="mb-5">
 <label htmlFor="password" className="block text-sm font-medium text-surface-700 mb-1.5">
 Password
 </label>
 <div className="relative">
 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
 <input
 id="password"
 type={showPassword ? 'text' : 'password'}
 placeholder="Enter password"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 onKeyDown={(e) => { if (e.key === 'Enter') handleEmailLogin(); }}
 className="w-full pl-10 pr-10 py-2.5 border border-surface-200 rounded-lg text-sm text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-saffron-300 focus:border-saffron-400 transition-colors"
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
 >
 {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>
 </div>

 <button
 onClick={handleEmailLogin}
 disabled={isSubmitting}
 className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="w-5 h-5 animate-spin" />
 Signing in...
 </>
 ) : (
 <>
 Sign In
 <ArrowRight className="w-5 h-5" />
 </>
 )}
 </button>

 {/* Demo accounts — one-click login */}
 <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
 <p className="text-xs font-semibold text-amber-800 mb-2">Quick Login — Demo Accounts</p>
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
 className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-white hover:bg-amber-100 border border-amber-200 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed group"
 >
 <span className="text-[11px] font-medium text-surface-700 truncate">{acc.role}</span>
 <span className="text-[10px] font-semibold text-saffron-600 group-hover:text-saffron-700 shrink-0">Sign in →</span>
 </button>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* ─── Phone + OTP Form ─── */}
 {activeTab === 'phone' && (
 <div>
 <label htmlFor="phone" className="block text-sm font-medium text-surface-700 mb-1.5">
 Mobile Number
 </label>
 <div className="flex gap-2 mb-5">
 <div className="flex items-center gap-1.5 px-3 py-2.5 bg-surface-50 border border-surface-200 rounded-lg text-surface-600 text-sm font-medium shrink-0">
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
 className="flex-1 px-4 py-2.5 border border-surface-200 rounded-lg text-surface-800 text-lg tracking-wider placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-saffron-300 focus:border-saffron-400 transition-colors"
 />
 </div>

 <button
 onClick={handleSendOtp}
 disabled={isSubmitting || phone.replace(/\D/g, '').length !== 10}
 className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
 </div>
 )}

 {/* Terms & Sign up link */}
 <div className="mt-5 space-y-3">
 <p className="text-xs text-surface-400 text-center">
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
 <p className="text-sm text-surface-500">
 Don&apos;t have an account?{' '}
 <a href="/auth/signup" className="text-saffron-600 font-semibold hover:text-saffron-700 transition-colors">
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
