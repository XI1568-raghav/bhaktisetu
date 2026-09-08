import { Video, Receipt, ShieldCheck, RotateCcw, BadgeCheck } from 'lucide-react';
import {
  CANCELLATION_POLICY_SENTENCE,
  FULL_REFUND_HOURS_BEFORE,
  CANCELLATION_CUTOFF_HOURS,
} from '../../lib/cancellation-policy';
import { PLATFORM_FEE_INR, PRASAD_DELIVERY_FEE_INR, formatInr } from '../../lib/puja-pricing';

/**
 * "What you actually get" — the homepage's one trust surface.
 *
 * WHY THIS EXISTS AS A COMPONENT RATHER THAN JSX IN page.tsx
 *
 * It replaces four hardcoded trust cards that rotted. Two of them were making
 * claims the code contradicted — an 80G certificate against
 * HAS_80G_VERIFIED: false, and "manager-signed, on-site audit" against a
 * Temple model with no column that could record either. They rotted because
 * they were string literals with nothing holding them to the system.
 *
 * Every row below is instead derived from a module that already has a drift
 * test pointing at the API:
 *
 *   cancellation  lib/cancellation-policy.ts  (pinned to DEFAULT_CANCEL_POLICY)
 *   fees          lib/puja-pricing.ts         (pinned to booking.service.ts)
 *
 * and the two that are behavioural rather than numeric — video proof and the
 * payment rail — are stated as the mechanism the API enforces rather than as
 * a promise, so there is no number to drift.
 *
 * THE BAR FOR ADDING A ROW: something in apps/api must refuse to do the wrong
 * thing. Not "we intend to", not "our policy is". If the only thing behind a
 * row is a sentence, it does not go here.
 *
 * Deliberately NOT here, and why:
 *   - 80G / tax deduction — HAS_80G_VERIFIED is false, pan and eightyGNumber null.
 *   - "vetted"/"Vedic certified" pandits — Priest.isVerified has no writer
 *     outside prisma/seed.ts, there is no trust-score column, no credential
 *     upload and no reference workflow. The payout gate below is the true part.
 *   - a completion count — lib/social-proof.ts renders nothing below 3 real
 *     completions and production has none. Wire it in when it can say something.
 *   - "100% money-back" — no dissatisfaction refund exists.
 *   - the 50% and 25% refund tiers — unreachable behind the 24h cancellation
 *     block, so printing them would advertise an outcome no devotee can reach.
 */

type Row = {
  Icon: typeof Video;
  title: string;
  body: string;
  /** The thing in the system that makes the row true. Rendered as small print. */
  backing: string;
};

/**
 * Exported for HowItWorks, which renders these as the promise strip under its
 * three steps (HOME-IA 2026-09-08 merge). ONE source of truth: the wording here
 * is sourced line by line against the code that enforces it — a second copy in
 * the other component is how a promise drifts away from its mechanism.
 */
export const PROMISES: Row[] = [
  {
    Icon: Video,
    title: 'A recording of your ceremony',
    // The mechanism, not a promise. checkVideoProofGate (routes/bookings.ts)
    // refuses the transition to video_uploaded/delivered without a
    // videoProofUrl, and createPriestPayout (payment.service.ts) refuses to
    // mint a payout for a booking that has not reached that status.
    body: 'The assigned pandit uploads it after the puja, with your name and gotra spoken in it.',
    backing: 'The API refuses to mark a booking delivered without one, and the pandit is not paid until it exists.',
  },
  {
    Icon: RotateCcw,
    title: 'Cancel and get your money back',
    body: CANCELLATION_POLICY_SENTENCE,
    backing: `Inside ${CANCELLATION_CUTOFF_HOURS} hours the pandit is assigned and samagri is being bought, so cancellation closes.`,
  },
  {
    Icon: Receipt,
    title: 'One price, and you see it first',
    // Question 2, answered 2026-08-23: show one total, with the split
    // available rather than a second number competing at the decision point.
    body: `The total you are quoted is the total you are charged — the ₹${formatInr(PLATFORM_FEE_INR)} platform fee is inside it, not added later.`,
    backing: `Prasad posted to your address is the one optional extra, at ₹${formatInr(PRASAD_DELIVERY_FEE_INR)}, and you choose it before you pay.`,
  },
  {
    Icon: ShieldCheck,
    title: 'We never see your card',
    body: 'Payment happens inside Razorpay’s own checkout.',
    backing: 'Our server only ever receives Razorpay’s order id, payment id and signature, and verifies the signature before a booking is marked paid.',
  },
  {
    Icon: BadgeCheck,
    title: 'Pandits are paid against ID, not a badge',
    // The honest sentence, already shipping verbatim at lib/faqs.ts:86 and
    // app/temples/[slug]/pujas/page.tsx:163. Deliberately says what we do NOT
    // do, because the alternative is the "Vedic certified" badge with nothing
    // behind it that TC-08 flagged.
    body: 'A pandit is paid only once Aadhaar-based KYC is on file.',
    backing: 'That is a payout gate, not a public credential check — we do not yet run independent credential verification or publish a per-pandit score.',
  },
];

export default function WhatYouGet() {
  return (
    // HOME-01 (2026-08-23 re-rank): below the fold, zero images, 6,363 B — the
    // largest text-only section on the page and the heaviest row of the ranked
    // deferral list that was still paying full layout and paint at load.
    <section
      aria-label="What you actually get"
      className="defer-paint py-7 md:py-10"
      style={{ background: 'var(--color-surface)' }}
    >
      <div className="container-wide">
        <h2
          data-reveal="up"
          className="text-xl sm:text-2xl font-semibold tracking-tight mb-1.5"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
        >
          What you actually get
        </h2>
        <p
          data-reveal="up"
          data-delay="1"
          className="prose-meta mb-5 max-w-prose"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Every line here is something the system refuses to do without. Nothing on this
          page is a claim we cannot show you the mechanism for.
        </p>

        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {PROMISES.map((row, i) => (
            <li
              key={row.title}
              data-reveal="cascade"
              data-delay={String(Math.min(i + 1, 6))}
              className="flex items-start gap-3 p-3.5 rounded-xl"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
            >
              <row.Icon
                className="w-5 h-5 shrink-0 mt-0.5"
                style={{ color: 'var(--color-primary)' }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p
                  className="text-sm font-semibold leading-snug"
                  style={{ color: 'var(--color-text)' }}
                >
                  {row.title}
                </p>
                <p
                  className="text-xs mt-1 leading-relaxed"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {row.body}
                </p>
                <p
                  className="text-xs mt-1.5 leading-relaxed"
                  style={{ color: 'var(--color-text-faint)' }}
                >
                  {row.backing}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
