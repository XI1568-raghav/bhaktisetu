'use client';

// R-Q4-M-007 — CSR Donation Match landing page.
//
// LEG-14 (prod sweep 2026-08-12): the file header used to say "Dev-server only.
// NOT deployed until founder approves 80G + CSR-1 compliance attestation" — a
// comment, which is not a control. The page built and served on every
// environment, returning 200 with a statutory certification claim aimed at
// corporate CSR buyers. The route is now gated in page.tsx behind
// ENABLE_CSR_MATCH (default off) and the certification sentence is rendered
// from lib/company.ts, so it cannot be published while the gates are false.
//
// Hard rule from queue item: 2x match copy, calculator, signup form (4 fields), transparency mock (3 cards).

import { useState, type FormEvent } from 'react';
import { csrCredentialLine, COMPANY } from '../../lib/company';
import { H1 } from '../../components/ui/heading-recipe';
import { userFacingMessage } from '../../lib/friendly-error';

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN').format(Math.max(0, Math.round(n)));
}

const TEMPLES = [
  { id: 't1', name: 'Sample Temple A (verified)', adoptionPct: 64 },
  { id: 't2', name: 'Sample Temple B (verified)', adoptionPct: 38 },
  { id: 't3', name: 'Sample Temple C (verified)', adoptionPct: 12 },
];

const BUDGET_BRACKETS = ['<10L', '10L-25L', '25L-50L', '50L-1Cr', '1Cr+'];

export default function CsrMatchClient() {
  const [pledge, setPledge] = useState<number>(0);
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [bracket, setBracket] = useState('');
  const [matchCap, setMatchCap] = useState<number>(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const employeeAmt = pledge;
  const corporateAmt = pledge * 2;
  const totalImpact = employeeAmt + corporateAmt;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/csr-match/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          csrHeadEmail: email,
          csrBudgetBracket: bracket,
          expectedMatchCap: matchCap,
          submittedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSubmitted(true);
    } catch (err) {
      setError(userFacingMessage(err, 'submission failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-saffron-50 text-surface-900">
      {/* Hero */}
      <section className="px-6 py-16 max-w-5xl mx-auto text-center">
        <p className="text-xs uppercase tracking-wider text-saffron-700 mb-4">CSR Schedule VII · Item III</p>
        <h1 className={`${H1.marketing} mb-6`}>
          Your employees pledge. We <span className="text-saffron-700">2x Match</span> via corporate CSR.
        </h1>
        <p className="prose-lead text-surface-700 max-w-2xl mx-auto">
          Adopt-a-temple subscriptions. Every ₹1 your employees contribute, {COMPANY.brand} matches ₹2 from your CSR budget.
          Live transparency dashboard. Diwali-aligned launch.
        </p>
        <p
          className="mt-6 max-w-2xl mx-auto prose-meta text-surface-700 bg-white border border-saffron-200 rounded-lg px-4 py-3 text-left"
          data-testid="csr-credential-line"
        >
          {csrCredentialLine()}
        </p>
      </section>

      {/* Match calculator */}
      <section className="px-6 py-12 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center">Match Calculator</h2>
          <div className="bg-saffron-50 rounded-lg p-6 border border-saffron-200">
            <label htmlFor="pledge" className="block text-sm font-medium mb-2">
              Employee pledge (₹ annual aggregate)
            </label>
            <input
              id="pledge"
              type="number"
              min={0}
              step={10000}
              value={pledge}
              onChange={(e) => setPledge(Math.max(0, parseInt(e.target.value || '0', 10)))}
              className="w-full px-4 py-3 border border-saffron-300 rounded-md text-lg"
              placeholder="e.g. 100000"
            />
            <div className="grid grid-cols-3 gap-4 mt-6 text-center">
              <div>
                <p className="text-xs text-surface-600">Employees</p>
                <p className="text-xl font-bold text-saffron-700">₹{formatINR(employeeAmt)}</p>
              </div>
              <div>
                <p className="text-xs text-surface-600">Corporate (2x match)</p>
                <p className="text-xl font-bold text-saffron-700">₹{formatINR(corporateAmt)}</p>
              </div>
              <div className="bg-saffron-100 rounded-md py-2">
                <p className="text-xs text-surface-700">Total impact</p>
                <p className="text-xl font-bold text-saffron-900" data-testid="total-impact">
                  ₹{formatINR(totalImpact)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Transparency mock */}
      <section className="px-6 py-12 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-2 text-center">Transparency dashboard — illustrative mock-up</h2>
        {/* The three cards below are invented sample rows, not temples and not
            adoption figures. Labelled as such rather than left to read as a
            live dashboard. */}
        <p className="text-center text-sm text-surface-600 mb-6">
          Sample layout only — the temples and percentages below are placeholders, not live data. The
          real dashboard is built after the first MoU is signed.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TEMPLES.map((t) => (
            <div key={t.id} data-testid="temple-card" className="bg-white rounded-lg p-5 border border-surface-200">
              <h3 className="font-semibold mb-3">{t.name}</h3>
              <div className="w-full bg-surface-100 rounded-full h-3 mb-2">
                <div className="bg-saffron-600 h-3 rounded-full" style={{ width: `${t.adoptionPct}%` }} />
              </div>
              <p className="text-sm text-surface-600">{t.adoptionPct}% adopted</p>
            </div>
          ))}
        </div>
      </section>

      {/* Signup form */}
      <section className="px-6 py-12 bg-saffron-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center">Corporate Signup</h2>
          {submitted ? (
            <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-6 text-center">
              <p className="text-emerald-800 font-semibold">Interest registered.</p>
              <p className="text-sm text-emerald-700 mt-2">Our CSR partnerships team will reach out; we do not promise a reply time.</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="bg-white rounded-lg p-6 border border-saffron-200 space-y-4">
              <div>
                <label htmlFor="company" className="block text-sm font-medium mb-1">Company name</label>
                <input
                  id="company"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-md"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">CSR head email</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-md"
                />
              </div>
              <div>
                <label htmlFor="bracket" className="block text-sm font-medium mb-1">CSR budget bracket</label>
                <select
                  id="bracket"
                  required
                  value={bracket}
                  onChange={(e) => setBracket(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-md"
                >
                  <option value="">Select bracket</option>
                  {BUDGET_BRACKETS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="cap" className="block text-sm font-medium mb-1">Expected match cap (₹)</label>
                <input
                  id="cap"
                  type="number"
                  min={0}
                  step={100000}
                  required
                  value={matchCap}
                  onChange={(e) => setMatchCap(Math.max(0, parseInt(e.target.value || '0', 10)))}
                  className="w-full px-3 py-2 border border-surface-300 rounded-md"
                />
              </div>
              {error && <p className="text-sm text-red-700">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-saffron-700 hover:bg-saffron-800 text-white py-3 rounded-md font-medium disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit Interest'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer disclaimer */}
      <footer className="px-6 py-8 text-center text-xs text-surface-600 max-w-3xl mx-auto">
        <p>{csrCredentialLine()}</p>
        <p className="mt-2">
          Religious heritage promotion is listed under CSR Schedule VII Item III; whether a
          particular contribution qualifies as CSR spend is your CSR committee&apos;s and auditor&apos;s
          call, not ours. Match commitments execute via signed MoU; transparency dashboard goes live
          within 7 days of MoU.
        </p>
      </footer>
    </main>
  );
}
