'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../../lib/auth-context';
import { buttonClass } from '../../../../components/ui/button-recipe';
import { H1 } from '../../../../components/ui/heading-recipe';

function apiBase(): string {
  const b = process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
  return b.replace(/\/$/, '');
}

export default function ApplyClient({ programId }: { programId: string }) {
  const { session, isAuthenticated } = useAuth();
  const [form, setForm] = useState({
    applicantType: 'self' as 'self' | 'parent',
    studentName: '',
    studentAgeYears: 18,
    studentEmail: '',
    guardianName: '',
    guardianRelation: '',
    guardianPhone: '',
    guardianAadhaarLast4: '',
    consentSigned: false,
    statement: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMinor = form.studentAgeYears < 18 || form.applicantType === 'parent';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!isAuthenticated || !session?.accessToken) {
      setError('Please sign in to submit an application.');
      return;
    }
    if (!form.consentSigned) {
      setError('Consent must be signed.');
      return;
    }
    if (isMinor && (!form.guardianName || !form.guardianRelation || !form.guardianPhone)) {
      setError('Guardian name, relation, and phone are required for minors.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        programId,
        applicantType: form.applicantType,
        studentName: form.studentName,
        studentAgeYears: Number(form.studentAgeYears),
        consentSigned: form.consentSigned,
        statement: form.statement,
      };
      if (form.studentEmail) payload.studentEmail = form.studentEmail;
      if (isMinor) {
        payload.guardianName = form.guardianName;
        payload.guardianRelation = form.guardianRelation;
        payload.guardianPhone = form.guardianPhone;
        if (form.guardianAadhaarLast4) payload.guardianAadhaarLast4 = form.guardianAadhaarLast4;
      }
      const res = await fetch(`${apiBase()}/api/v1/gurukul-applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      setSuccess('Application submitted. You can track its status from your account.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className={`${H1.catalogue} mb-2`}>Apply to Gurukul</h1>
      <p className="text-sm text-surface-600 mb-6">All fields are required unless marked optional. Applications for those under 18 require parent/guardian consent.</p>

      {!isAuthenticated && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
          Please <Link href="/auth/login" className="text-saffron-700 font-semibold">sign in</Link> to apply.
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-emerald-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-surface-700">Who is applying?</label>
          <select value={form.applicantType} onChange={(e) => setForm({ ...form, applicantType: e.target.value as 'self' | 'parent' })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg">
            <option value="self">Self (I am the student)</option>
            <option value="parent">Parent (applying for child)</option>
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-surface-700">Student name</label>
            <input required value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg" />
          </div>
          <div>
            <label className="text-sm font-semibold text-surface-700">Student age (years)</label>
            <input required type="number" min={3} max={80} value={form.studentAgeYears} onChange={(e) => setForm({ ...form, studentAgeYears: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg" />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-surface-700">Student email (optional)</label>
          <input type="email" value={form.studentEmail} onChange={(e) => setForm({ ...form, studentEmail: e.target.value })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg" />
        </div>

        {isMinor && (
          <fieldset className="border border-surface-200 rounded-xl p-4">
            <legend className="text-sm font-semibold text-surface-900 px-2">Guardian details (required for minors)</legend>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-surface-700">Guardian full name</label>
                <input required value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-surface-700">Relation</label>
                  <input required placeholder="Father / Mother / Guardian" value={form.guardianRelation} onChange={(e) => setForm({ ...form, guardianRelation: e.target.value })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg" />
                </div>
                <div>
                  <label className="text-sm text-surface-700">Phone</label>
                  <input required type="tel" value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="text-sm text-surface-700">Aadhaar last 4 digits (optional)</label>
                <input pattern="[0-9]{4}" maxLength={4} value={form.guardianAadhaarLast4} onChange={(e) => setForm({ ...form, guardianAadhaarLast4: e.target.value })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg" />
                <p className="text-xs text-surface-500 mt-1">For identity verification only. Full Aadhaar is never stored.</p>
              </div>
            </div>
          </fieldset>
        )}

        <div>
          <label className="text-sm font-semibold text-surface-700">Statement of intent</label>
          <textarea required minLength={20} maxLength={4000} rows={5} value={form.statement} onChange={(e) => setForm({ ...form, statement: e.target.value })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg" placeholder="Why do you want to study here? What is your background?" />
        </div>

        <label className="flex items-start gap-2 text-sm text-surface-700">
          <input required type="checkbox" checked={form.consentSigned} onChange={(e) => setForm({ ...form, consentSigned: e.target.checked })} className="mt-1" />
          <span>
            I confirm that the information provided is true, and I {isMinor ? 'as guardian, ' : ''}consent to my contact details being shared with the gurukul for the purpose of admission. (DPDP Act 2023 compliant)
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={submitting || !isAuthenticated} className={buttonClass('primary', 'md', 'w-full disabled:cursor-not-allowed')}>
          {submitting ? 'Submitting...' : 'Submit application'}
        </button>
      </form>
    </main>
  );
}
