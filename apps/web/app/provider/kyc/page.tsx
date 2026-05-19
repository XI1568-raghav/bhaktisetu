'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
 ShieldCheck,
 CheckCircle2,
 Clock,
 AlertCircle,
 Loader2,
 Lock,
} from 'lucide-react';
import { useAuth, type UserRole } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import AuthGuard from '../../../components/AuthGuard';

// Provider roles allowed to access KYC. Devotees redirected to their
// dashboard — they do not collect payouts and have no business submitting
// Aadhaar/PAN/bank. Mirror of PROVIDER_ROLES in apps/api/src/routes/provider-kyc.ts.
const PROVIDER_ROLES: UserRole[] = [
  'priest',
  'store_owner',
  'astrologer',
  'wellness_instructor',
  'gaushala_manager',
  'temple_manager',
  'admin',
];

interface KycView {
 aadhaarLast4: string | null;
 panNumber: string | null;
 bankAccountNumber: string | null;
 bankIfsc: string | null;
 bankHolderName: string | null;
 verified: boolean;
 rejectionReason: string | null;
}

export default function ProviderKycPage() {
 return (
  <AuthGuard allowedRoles={PROVIDER_ROLES}>
   <ProviderKycContent />
  </AuthGuard>
 );
}

function ProviderKycContent() {
 const { session, user } = useAuth();
 const token = session?.accessToken;

 const [kyc, setKyc] = useState<KycView | null>(null);
 const [loading, setLoading] = useState(true);
 const [submitting, setSubmitting] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [success, setSuccess] = useState<string | null>(null);

 const [aadhaarFull, setAadhaarFull] = useState('');
 const [panNumber, setPanNumber] = useState('');
 const [bankAccountNumber, setBankAccountNumber] = useState('');
 const [bankIfsc, setBankIfsc] = useState('');
 const [bankHolderName, setBankHolderName] = useState('');

 useEffect(() => {
 if (!token) return;
 if (token.startsWith('demo-')) {
 setLoading(false);
 return;
 }
 (async () => {
 try {
 const res = await fetch(`${API_BASE_URL}/provider-kyc`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 if (res.status === 403 || res.status === 404) {
 // No provider role assigned yet — show empty form, not error
 setKyc(null);
 setLoading(false);
 return;
 }
 if (!res.ok) throw new Error(`Failed to load KYC (${res.status})`);
 const data = await res.json();
 setKyc(data.kyc ?? null);
 if (data.kyc?.bankHolderName) setBankHolderName(data.kyc.bankHolderName);
 if (data.kyc?.bankIfsc) setBankIfsc(data.kyc.bankIfsc);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Failed to load KYC');
 } finally {
 setLoading(false);
 }
 })();
 }, [token]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setError(null);
 setSuccess(null);

 if (!token) {
 setError('You must be signed in.');
 return;
 }
 if (token.startsWith('demo-')) {
 setError('Demo accounts cannot submit real KYC. Sign up with a real provider account first.');
 return;
 }

 const payload: Record<string, string> = {};
 if (aadhaarFull) payload.aadhaarFull = aadhaarFull;
 if (panNumber) payload.panNumber = panNumber.toUpperCase();
 if (bankAccountNumber) payload.bankAccountNumber = bankAccountNumber;
 if (bankIfsc) payload.bankIfsc = bankIfsc.toUpperCase();
 if (bankHolderName) payload.bankHolderName = bankHolderName;

 if (Object.keys(payload).length === 0) {
 setError('Fill at least one field to submit.');
 return;
 }

 setSubmitting(true);
 try {
 const res = await fetch(`${API_BASE_URL}/provider-kyc`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 Authorization: `Bearer ${token}`,
 },
 body: JSON.stringify(payload),
 });
 if (!res.ok) {
 const txt = await res.text().catch(() => '');
 throw new Error(`Submission failed (${res.status}). ${txt}`);
 }
 const data = await res.json();
 setSuccess(data.message ?? 'KYC submitted.');
 setAadhaarFull('');
 // Refresh redacted view.
 const r2 = await fetch(`${API_BASE_URL}/provider-kyc`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 if (r2.ok) {
 const d2 = await r2.json();
 setKyc(d2.kyc ?? null);
 }
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Submission failed');
 } finally {
 setSubmitting(false);
 }
 };

 if (!user) {
 return (
 <div className="max-w-2xl mx-auto px-4 py-12">
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-8 text-center">
 <Lock className="w-10 h-10 text-surface-300 mx-auto mb-3" />
 <h1 className="text-lg font-semibold text-surface-800 mb-2">Sign in required</h1>
 <p className="text-sm text-surface-500 mb-4">You need to sign in to submit KYC details.</p>
 <Link
 href="/auth/login"
 className="inline-flex items-center gap-2 px-4 py-2 bg-saffron-600 text-white text-sm font-medium rounded-lg hover:bg-saffron-700"
 >
 Go to Sign In
 </Link>
 </div>
 </div>
 );
 }

 return (
 <div className="max-w-2xl mx-auto px-4 py-10">
 <div className="mb-6">
 <h1 className="text-2xl font-semibold text-surface-800 mb-2 inline-flex items-center gap-2">
 <ShieldCheck className="w-6 h-6 text-saffron-600" />
 Provider KYC
 </h1>
 <p className="text-sm text-surface-500">
 Submit your Aadhaar, PAN, and bank details. KYC is required before
 we can release your first payout. Verification typically completes
 within 2 business days.
 </p>
 </div>

 {/* Status banner */}
 {loading ? (
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5 mb-5 inline-flex items-center gap-2 text-sm text-surface-500">
 <Loader2 className="w-4 h-4 animate-spin" /> Loading current KYC…
 </div>
 ) : kyc?.verified ? (
 <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-5 flex items-start gap-3">
 <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
 <div>
 <p className="font-semibold text-green-900">KYC verified</p>
 <p className="text-sm text-green-800 mt-0.5">
 Your account is ready to receive payouts.
 </p>
 </div>
 </div>
 ) : kyc?.rejectionReason ? (
 <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-5">
 <div className="flex items-start gap-3">
 <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
 <div>
 <p className="font-semibold text-red-900 mb-1">KYC needs revision</p>
 <p className="text-sm text-red-800">{kyc.rejectionReason}</p>
 </div>
 </div>
 </div>
 ) : kyc ? (
 <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-5 flex items-start gap-3">
 <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
 <div>
 <p className="font-semibold text-amber-900">KYC under review</p>
 <p className="text-sm text-amber-800 mt-0.5">
 We received your details. You can still update them below — submitting
 again will reset the review.
 </p>
 </div>
 </div>
 ) : null}

 {error && (
 <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
 {error}
 </div>
 )}
 {success && (
 <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4 text-sm">
 {success}
 </div>
 )}

 <form onSubmit={handleSubmit} className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6 space-y-5">
 <fieldset>
 <legend className="text-sm font-semibold text-surface-700 mb-3">Identity</legend>
 <div className="grid grid-cols-1 gap-4">
 <div>
 <label htmlFor="aadhaar" className="block text-sm font-medium text-surface-700 mb-1.5">
 Aadhaar Number
 {kyc?.aadhaarLast4 && (
 <span className="ml-2 text-xs text-surface-500">on file: ••••{kyc.aadhaarLast4}</span>
 )}
 </label>
 <input
 id="aadhaar"
 inputMode="numeric"
 maxLength={12}
 placeholder="12-digit Aadhaar"
 value={aadhaarFull}
 onChange={(e) => setAadhaarFull(e.target.value.replace(/\D/g, '').slice(0, 12))}
 className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-300"
 />
 <p className="text-[11px] text-surface-500 mt-1">
 We store only the last 4 digits and a one-way hash. The full number is never written to disk.
 </p>
 </div>
 <div>
 <label htmlFor="pan" className="block text-sm font-medium text-surface-700 mb-1.5">
 PAN Number
 {kyc?.panNumber && (
 <span className="ml-2 text-xs text-surface-500">on file: {kyc.panNumber}</span>
 )}
 </label>
 <input
 id="pan"
 maxLength={10}
 placeholder="AAAAA9999A"
 value={panNumber}
 onChange={(e) => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
 className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-saffron-300"
 />
 </div>
 </div>
 </fieldset>

 <fieldset>
 <legend className="text-sm font-semibold text-surface-700 mb-3">Bank Account (for payouts)</legend>
 <div className="grid grid-cols-1 gap-4">
 <div>
 <label htmlFor="holder" className="block text-sm font-medium text-surface-700 mb-1.5">
 Account Holder Name
 </label>
 <input
 id="holder"
 placeholder="As printed on the cheque book"
 value={bankHolderName}
 onChange={(e) => setBankHolderName(e.target.value)}
 className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-300"
 />
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label htmlFor="acc" className="block text-sm font-medium text-surface-700 mb-1.5">
 Account Number
 {kyc?.bankAccountNumber && (
 <span className="ml-2 text-xs text-surface-500">{kyc.bankAccountNumber}</span>
 )}
 </label>
 <input
 id="acc"
 inputMode="numeric"
 maxLength={18}
 placeholder="9-18 digits"
 value={bankAccountNumber}
 onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 18))}
 className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-300"
 />
 </div>
 <div>
 <label htmlFor="ifsc" className="block text-sm font-medium text-surface-700 mb-1.5">
 IFSC Code
 {kyc?.bankIfsc && (
 <span className="ml-2 text-xs text-surface-500">{kyc.bankIfsc}</span>
 )}
 </label>
 <input
 id="ifsc"
 maxLength={11}
 placeholder="HDFC0001234"
 value={bankIfsc}
 onChange={(e) => setBankIfsc(e.target.value.toUpperCase().slice(0, 11))}
 className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-saffron-300"
 />
 </div>
 </div>
 </div>
 </fieldset>

 <div className="border-t border-surface-100 pt-4 flex items-center justify-between">
 <p className="text-xs text-surface-500 max-w-sm">
 By submitting you confirm these details are yours and authorise Darshya to use them for compliance and payouts.
 </p>
 <button
 type="submit"
 disabled={submitting}
 className="inline-flex items-center gap-2 px-5 py-2.5 bg-saffron-600 text-white text-sm font-medium rounded-lg hover:bg-saffron-700 disabled:opacity-60"
 >
 {submitting ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
 </>
 ) : (
 'Submit KYC'
 )}
 </button>
 </div>
 </form>
 </div>
 );
}
