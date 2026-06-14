'use client';

export const runtime = 'edge';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, CheckCircle2, Circle, ExternalLink, ShieldCheck } from 'lucide-react';

// R-Q4-S-006: B2B temple chain rollout — anchor 5 chain temples live + custom branding.
// Scaffold for founder-driven onboarding loop. Real per-temple state lives in
// `temples` table once R-Q4-S-006-schema migration ships (adds chain_id +
// whitelabel_status + went_live_at + brand_* columns). Until then this page is
// a checklist surface that mirrors docs/runbooks/b2b-temple-onboarding.md.

const STAGES = [
 {
  key: 'prospect',
  label: 'Prospect',
  description: 'Founder intro call w/ chain regional head. Collect KYC + bank + brand asset wishlist.',
 },
 {
  key: 'kyc_pending',
  label: 'KYC pending',
  description: 'Chain HQ uploads PAN/GSTIN/MOA + per-temple bank details into Razorpay partner dashboard.',
 },
 {
  key: 'kyc_verified',
  label: 'KYC verified',
  description: 'Razorpay webhook fired. Engineering provisions subdomain + sub-merchant ID + brand assets.',
 },
 {
  key: 'branding_deployed',
  label: 'Branding deployed',
  description: 'Custom logo + color theme live on subdomain. Test booking placed end-to-end.',
 },
 {
  key: 'live',
  label: 'Live',
  description: 'Founder sign-off complete. went_live_at stamped. KPI b2b_chain_temples_live increments.',
 },
] as const;

type StageKey = (typeof STAGES)[number]['key'];

// Static seed list — replace w/ API call to /api/v1/admin/b2b-onboarding/chains
// once the route ships (Phase 2 of this item).
const SEED_CHAINS = [
 {
  chainName: 'ISKCON Bengaluru Region',
  hqContact: '<TBD-founder-collected>',
  temples: [
   { slug: 'iskcon-bengaluru-mahalakshmi', stage: 'prospect' as StageKey, manager: null },
   { slug: 'iskcon-bengaluru-rajajinagar', stage: 'prospect' as StageKey, manager: null },
  ],
 },
];

function StageBadge({ stage }: { stage: StageKey }) {
 const stageIdx = STAGES.findIndex((s) => s.key === stage);
 const isLive = stage === 'live';
 const palette = isLive
  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
  : stageIdx >= 3
   ? 'bg-amber-100 text-amber-800 border-amber-300'
   : 'bg-surface-100 text-surface-700 border-surface-300';
 const label = STAGES[stageIdx]?.label ?? stage;
 return (
  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${palette}`}>
   {isLive ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
   {label}
  </span>
 );
}

export default function B2BOnboardingPage() {
 const [chains] = useState(SEED_CHAINS);

 const counts = useMemo(() => {
  let live = 0;
  let inFlight = 0;
  let prospect = 0;
  for (const c of chains) {
   for (const t of c.temples) {
    if (t.stage === 'live') live += 1;
    else if (t.stage === 'prospect') prospect += 1;
    else inFlight += 1;
   }
  }
  return { live, inFlight, prospect, total: live + inFlight + prospect };
 }, [chains]);

 const targetLive = 5;
 const remaining = Math.max(0, targetLive - counts.live);

 return (
  <main className="min-h-[100dvh] bg-surface-50 px-6 py-10 pb-20">
   <div className="max-w-6xl mx-auto">
    <nav className="text-sm text-surface-600 mb-2">
     <Link href="/admin" className="hover:underline">
      Admin
     </Link>
     <span className="mx-2">/</span>
     <span>B2B chain onboarding</span>
    </nav>

    <header className="flex items-start justify-between gap-4 mb-8">
     <div>
      <h1 className="text-3xl font-semibold text-surface-900 flex items-center gap-2">
       <Building2 className="w-7 h-7 text-saffron-600" />
       B2B chain onboarding
      </h1>
      <p className="text-surface-700 mt-1 max-w-2xl">
       R-Q4-S-006 — Anchor chain rollout. Target: 5 chain temples live with custom branding by Nov 30
       2026. Founder-driven loop; this page mirrors the runbook for status visibility.
      </p>
     </div>
     <Link
      href="https://github.com/XI1568-raghav/bhaktisetu/blob/main/docs/runbooks/b2b-temple-onboarding.md"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-saffron-700 hover:underline whitespace-nowrap"
     >
      Runbook <ExternalLink className="w-3 h-3" />
     </Link>
    </header>

    {/* Progress strip */}
    <section className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
     <div className="rounded-xl border border-surface-200 bg-white p-4">
      <div className="text-xs uppercase text-surface-500 tracking-wider">Live</div>
      <div className="text-3xl font-semibold text-emerald-700 mt-1">{counts.live}</div>
      <div className="text-xs text-surface-600 mt-1">of {targetLive} target</div>
     </div>
     <div className="rounded-xl border border-surface-200 bg-white p-4">
      <div className="text-xs uppercase text-surface-500 tracking-wider">In flight</div>
      <div className="text-3xl font-semibold text-amber-700 mt-1">{counts.inFlight}</div>
      <div className="text-xs text-surface-600 mt-1">KYC + branding stages</div>
     </div>
     <div className="rounded-xl border border-surface-200 bg-white p-4">
      <div className="text-xs uppercase text-surface-500 tracking-wider">Prospect</div>
      <div className="text-3xl font-semibold text-surface-700 mt-1">{counts.prospect}</div>
      <div className="text-xs text-surface-600 mt-1">Awaiting founder intro</div>
     </div>
     <div className="rounded-xl border border-surface-200 bg-white p-4">
      <div className="text-xs uppercase text-surface-500 tracking-wider">Remaining to target</div>
      <div className="text-3xl font-semibold text-saffron-700 mt-1">{remaining}</div>
      <div className="text-xs text-surface-600 mt-1">go-lives required</div>
     </div>
    </section>

    {/* Stage legend */}
    <section className="rounded-xl border border-surface-200 bg-white p-5 mb-8">
     <h2 className="text-sm font-semibold text-surface-900 uppercase tracking-wider mb-3">
      Onboarding stages
     </h2>
     <ol className="space-y-2 text-sm">
      {STAGES.map((s, i) => (
       <li key={s.key} className="flex items-start gap-3">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-surface-100 text-surface-700 text-xs font-semibold flex items-center justify-center mt-0.5">
         {i + 1}
        </span>
        <div>
         <div className="font-medium text-surface-900">{s.label}</div>
         <div className="text-surface-700 text-xs">{s.description}</div>
        </div>
       </li>
      ))}
     </ol>
    </section>

    {/* Chains */}
    <section>
     <h2 className="text-sm font-semibold text-surface-900 uppercase tracking-wider mb-3">
      Anchor chains
     </h2>
     {chains.length === 0 ? (
      <div className="rounded-xl border border-dashed border-surface-300 bg-white p-8 text-center">
       <p className="text-surface-700">
        No chains seeded yet. Founder action: kick off intro calls per runbook §1.
       </p>
      </div>
     ) : (
      <div className="space-y-4">
       {chains.map((c) => (
        <article key={c.chainName} className="rounded-xl border border-surface-200 bg-white p-5">
         <header className="flex items-start justify-between gap-3 mb-3">
          <div>
           <h3 className="text-lg font-semibold text-surface-900">{c.chainName}</h3>
           <a
            href={`mailto:${c.hqContact}`}
            className="text-xs text-saffron-700 hover:underline"
           >
            {c.hqContact}
           </a>
          </div>
          <span className="text-xs text-surface-600">{c.temples.length} temples</span>
         </header>
         <ul className="divide-y divide-surface-100">
          {c.temples.map((t) => (
           <li key={t.slug} className="py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
             <div className="font-mono text-sm text-surface-900 truncate">{t.slug}</div>
             <div className="text-xs text-surface-600 mt-0.5">
              Manager: {t.manager ?? '— not assigned —'}
             </div>
            </div>
            <StageBadge stage={t.stage} />
           </li>
          ))}
         </ul>
        </article>
       ))}
      </div>
     )}
    </section>

    {/* Founder-action footer */}
    <section className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-5">
     <h2 className="text-sm font-semibold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-2">
      <ShieldCheck className="w-4 h-4" />
      Founder action required
     </h2>
     <p className="text-sm text-amber-900">
      Schema migration <code className="font-mono text-xs">R-Q4-S-006-schema</code> ships{' '}
      <code>chain_id</code> + <code>whitelabel_status</code> + <code>went_live_at</code> +{' '}
      <code>brand_*</code> columns on temples + a <code>temple_chains</code> table. Once applied, this
      page swaps the seed list for a live <code>/api/v1/admin/b2b-onboarding/chains</code> feed.
      Per-temple intro calls, KYC sign-off, and Razorpay sub-merchant approvals remain founder-owned
      per runbook §6.
     </p>
    </section>
   </div>
  </main>
 );
}
