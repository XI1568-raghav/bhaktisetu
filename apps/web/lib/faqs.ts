// Structured FAQ data — drives /faqs hub + per-page FAQPage JSON-LD.
// Grouped by topic. Each FAQ MUST be 1 question + 1 plain-text answer (no
// markdown — JSON-LD doesn't render it). Answers should be 30-80 words for
// optimal rich-snippet eligibility per Google's FAQ guidelines.
//
// Money and policy sentences are INTERPOLATED, never retyped. This file is
// syndicated into JSON-LD, so a number typed here is a number Google quotes
// back at a devotee who never opened the policy page. LEG-03/LEG-19 (prod
// sweep 2026-08-12): the cancellation answer promised a full refund at the
// 24-hour mark against an engine that pays 75% in that band, and the refund
// answer published a third settlement timeline that contradicted the table on
// /refunds. Both now come from lib/cancellation-policy.

import {
  CANCELLATION_POLICY_SENTENCE,
  REFUND_SETTLEMENT_SENTENCE,
} from './cancellation-policy';
import { COMPANY } from './company';
import {
  NRI_PREMIUM_IS_SELLABLE,
  NRI_PREMIUM_WITHDRAWN_NOTICE,
} from '../app/nri/plan-availability';

/**
 * TC-01 / TC-13 (trust wave). Four answers in this file promised an income-tax
 * deduction the platform cannot deliver, and because `faqPageJsonLd()`
 * syndicates them into FAQPage structured data they were machine-readable
 * claims, not just page copy.
 *
 * `HAS_80G_VERIFIED` is false, `eightyGNumber` and `pan` are both null, and
 * apps/api/src/lib/pdf-receipt.ts stamps every receipt "Proof of donation —
 * not a tax exemption certificate" because `is80GEligible()` needs a donee
 * registration number AND a PAN, and `gaushala_profiles.regn_80g` / `.pan` are
 * read in one place and written nowhere. Same owner-controlled gate as
 * lib/company.ts, app/gaushala/page.tsx and app/nri/page.tsx: obtaining the
 * Section 80G(5) registration is the owner's action, and the copy returns by
 * itself the day the flag flips.
 */
const HAS_80G = COMPANY.donationLegal.HAS_80G_VERIFIED;

export interface Faq {
  q: string;
  a: string;
}

export interface FaqGroup {
  slug: string;
  title: string;
  description: string;
  faqs: Faq[];
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    slug: 'puja-booking',
    title: 'Puja Booking',
    description: 'Booking, sankalp, video proof, prasad delivery.',
    faqs: [
      {
        q: 'How do I book a puja online on Darshya?',
        a: `Pick a puja from our /pujas catalogue, choose a pandit and temple, enter the sankalp details (your name, gotra, intent), pick a date, and pay. You'll receive a booking number (format BS-YYYYMMDD-XXXXX), a booking page that always shows the current status, and video proof of the puja, which we aim to upload within ${COMPANY.refunds.videoProofTargetLabel} of the ceremony.`,
      },
      {
        q: 'What is video proof and is it mandatory?',
        a: `Video proof is a recording of the pandit performing your puja. It is mandatory for every puja booking on Darshya. We aim to upload it to your account within ${COMPANY.refunds.videoProofTargetLabel} of the ceremony, and it stays downloadable for 90 days. If nothing has arrived ${COMPANY.refunds.missingVideoEscalationHours} hours after your slot, write to ${COMPANY.supportEmail} — a person reviews it and the refund is full where the pandit is at fault.`,
      },
      {
        q: 'Can I cancel or reschedule a puja booking?',
        a: `${CANCELLATION_POLICY_SENTENCE} Inside that window the samagri has been procured and the pandit slot is locked, which is why the booking can no longer be cancelled by you. Reschedule via /support or WhatsApp.`,
      },
      {
        q: 'Will I receive prasad at my home address?',
        a: 'Prasad delivery is an optional flat ₹150 add-on that you switch on while booking, with the address you enter there. It is not included in the puja price, and it is delivered within India only, and we do not promise a delivery date or courier. Your booking page shows a tracking ID once one is recorded.',
      },
      {
        // TC-08 — the previous answer published a four-step vetting process
        // (Vedic credential verification, references from 2 temples or senior
        // pandits, a 30-day probationary video review, a displayed trust
        // score) of which NONE is implemented: Priest.isVerified,
        // .verificationStatus and .aadhaarVerified have no writer outside
        // apps/api/prisma/seed.ts, there is no credential upload, no reference
        // workflow and no trust-score column at all. The wording below is the
        // sentence already shipping at app/temples/[slug]/pujas/page.tsx, kept
        // verbatim so the two surfaces cannot drift.
        q: 'Are the pandits verified?',
        a: 'Only in one specific sense, so here is exactly how far it goes. A pandit is paid only once Aadhaar-based KYC is on file, which is a payout gate rather than a public credential check — we do not yet run independent credential verification or temple reference checks, and we do not publish a per-pandit trust score. What every booking does carry is mandatory video proof of the ceremony.',
      },
    ],
  },
  {
    slug: 'live-darshan',
    title: 'Live Darshan',
    description: 'Streaming and temple coverage.',
    faqs: [
      // TC-13 — "and 25+ other major temples" was a remembered number, not a
      // counted one: apps/api/prisma/seed/darshan-streams.ts defines 20
      // streams and skips any whose temple is not seeded, so 20 is an UPPER
      // bound on what is live. This file is a synchronous data module that
      // faqPageJsonLd() syndicates at build time — it cannot call the API the
      // way lib/platform-stats.ts does — so it follows that module's OTHER
      // rule instead: when we cannot count it, we publish a claim with no
      // digits in it and point at the page that renders the live list.
      // Mahakaleshwar is dropped from the named temples: it has no stream row.
      {
        q: 'Which temples have live darshan on Darshya?',
        a: 'We stream live darshan from major temples including Kashi Vishwanath (Varanasi), Tirumala Tirupati (Andhra Pradesh), Siddhivinayak (Mumbai), Somnath (Gujarat) and Jagannath Puri (Odisha). The list that is actually live right now is on /darshan and changes as temples come online. Aarti timings are shown in your local time zone.',
      },
      // TC-13 — the old answer sold a "₹199/month domestic or $9/month"
      // Premium plan with a recorded-aarti library, multi-camera angles and HD
      // downloads. No such plan exists on any rail: the devotee SKUs are
      // astro_session (₹99), astro_monthly (₹499) and the withdrawn
      // nri_premium_yearly, and none of them touches darshan. The companion
      // "Can I record or download live darshan?" answer, which sold the same
      // fiction as a subscriber entitlement, is deleted rather than reworded —
      // there is no download feature to describe.
      {
        q: 'Is live darshan free?',
        a: 'Yes. Every live darshan stream on Darshya is free, with no signup and no paid tier above it. There is no recorded-aarti library, no multi-camera angle and no HD download to buy — the only monthly devotee subscription we sell is unlimited AI Pandit chat at ₹499, which has nothing to do with darshan.',
      },
    ],
  },
  {
    slug: 'pricing-refunds',
    title: 'Pricing & Refunds',
    description: HAS_80G
      ? 'Costs, NRI pricing, payment methods, 80G receipts.'
      : 'Costs, NRI pricing, payment methods, donation receipts.',
    faqs: [
      {
        q: 'Is NRI pricing different from Indian pricing?',
        a: "Yes. Booking as an NRI costs 2.5 times the domestic price of the same puja. The flat platform fee and the optional prasad-delivery fee are the same for everyone and are not multiplied. We show the NRI price in US dollars, but Razorpay charges the order in INR, and the booking screen shows the exact rupee amount next to the dollar figure. You pay with UPI, an Indian card or net banking; cards issued outside India and PayPal are coming soon. You can switch any page back to rupees.",
      },
      // TC-01 — gated on the same owner flag as every other 80G surface.
      HAS_80G
        ? {
            q: 'Do you issue 80G tax-deduction receipts for donations?',
            a: 'Yes, for all donations to verified temples and gaushalas with valid 80G registration. The receipt is auto-generated within 24 hours, emailed to you, and downloadable from your account. Format: DR-YYYYMMDD-XXXX. You must provide your PAN at the time of donation for the 80G receipt to be valid.',
          }
        : {
            q: 'Can I claim a tax deduction on a donation made through Darshya?',
            a: 'Not today. Every donation gets a numbered receipt (format DR-YYYYMMDD-XXXX), auto-generated within 24 hours, emailed to you and downloadable from your account — but it is proof of payment, not a tax-exemption certificate. It carries no donee registration number and no donee PAN, so no Indian income-tax deduction can be claimed against it. We will say so here the day that registration is issued.',
          },
      {
        q: 'What payment methods do you accept?',
        a: 'Domestic India: UPI (all apps), credit/debit cards (Visa/Mastercard/RuPay), net banking, wallets (Paytm, PhonePe, Amazon Pay). NRI users: the same methods, billed in INR (cards issued outside India and PayPal are coming soon). Cash on Delivery is offered only at store checkout, not for puja bookings; we do not accept cheques.',
      },
      {
        q: 'How long do refunds take?',
        a: `${REFUND_SETTLEMENT_SENTENCE} Your booking page shows the status of the refund. These are the same bands published on our Refund Policy page — we do not quote a different timeline anywhere.`,
      },
    ],
  },
  {
    slug: 'nri-specific',
    title: 'NRI / International',
    description: 'For devotees outside India — pricing, delivery, compliance.',
    faqs: [
      {
        q: 'I live abroad — can I book a puja for my family in India?',
        a: 'Yes, this is one of our most popular use cases. You book online from anywhere, your family in India can attend in person if they wish, or the entire puja can be conducted with only your sankalp recited by the pandit. Video proof is posted to your booking page regardless of location.',
      },
      {
        q: 'Can I gift a puja to someone in India?',
        a: 'Yes, our Gift Puja feature lets you (NRI sender) pay for a puja and name a recipient in India. The sankalp is recited in the recipient\'s name and the video proof appears on your booking page. Available at /gift on our site.',
      },
      // TC-03 / TC-04 / TC-13 — this answer sold nri_premium_yearly at ₹5,000
      // a year with all six of its benefits, every one of which carries
      // `enforcedBy: null` in apps/api/src/services/subscription-entitlements.ts.
      // The server withdrew the plan: getPlans() filters it out and both
      // activation rails answer 400 with NRI_PREMIUM_WITHDRAWN_MESSAGE, so a
      // devotee who acted on this sentence hit a refusal at the buy click.
      // Gated on the constant app/nri/plan-availability.ts already mirrors
      // (with a drift test against the API source) rather than a second mirror.
      NRI_PREMIUM_IS_SELLABLE
        ? {
            q: 'Do you have an annual NRI membership?',
            a: 'Yes — Darshya NRI Premium, ₹5,000 per year (about $60), billed once in INR through Razorpay. The benefits it carries are listed on /nri; we advertise only the ones the product actually enforces, so that list is the authoritative one.',
          }
        : {
            q: 'Do you have an annual NRI membership?',
            a: `No. ${NRI_PREMIUM_WITHDRAWN_NOTICE} Nothing else on Darshya bills you annually — bookings, donations and the optional paid add-ons are each charged one at a time.`,
          },
    ],
  },
  {
    slug: 'yatra',
    title: 'Yatra & Pilgrimage',
    description: 'Char Dham, Jyotirlinga, custom yatra packages.',
    faqs: [
      {
        q: 'Do you book full yatra packages (hotel + transport + temple darshan)?',
        a: 'Yes, our yatra desk handles end-to-end pilgrimage planning — Char Dham, 12 Jyotirlinga, Sapta Puri, Pancha Bhoota and custom itineraries. We coordinate hotels, transport (private cab/bus), VIP darshan slots where available, and meals. Inquiry-only model: submit at /yatra/{slug}/book and our team replies by email.',
      },
      {
        q: 'What is the best time for Char Dham yatra?',
        a: 'The Char Dham temples are open only April-October, closed November-March due to Himalayan snow. Best windows: May-June (post-snow, pre-monsoon) and September-October (post-monsoon, clear skies). Avoid June-August monsoon — landslides frequently block roads. Helicopter packages reduce yatra from 12 days to 2-3 days.',
      },
      {
        q: 'Is online registration mandatory for Char Dham?',
        a: 'Yes, since 2022 the Uttarakhand government has mandated online registration on uttarakhandtourism.gov.in for all Char Dham pilgrims. Our yatra desk handles this for you when you book a package. Registration is free; daily caps apply on each temple.',
      },
    ],
  },
];

export function allFaqs(): Faq[] {
  return FAQ_GROUPS.flatMap((g) => g.faqs);
}

export function faqPageJsonLd(faqs: Faq[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}
