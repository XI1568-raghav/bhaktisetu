import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Sparkles,
  Globe2,
  Calendar,
  ShieldCheck,
  Phone,
  FileText,
  MessageCircle,
  CheckCircle2,
  ArrowRight,
  Info,
} from 'lucide-react';
import { nriPremiumServiceJsonLd } from '../../lib/jsonld';
import EmailCapture from '../../components/EmailCapture';
import { COMPANY } from '../../lib/company';
import { CANCELLATION_BADGE_LABEL } from '../../lib/cancellation-policy';
import { buttonClass } from '../../components/ui/button-recipe';
import { H1 } from '../../components/ui/heading-recipe';
import {
  NRI_PREMIUM_IS_SELLABLE,
  NRI_PREMIUM_WITHDRAWN_NOTICE,
  NRI_CANCELLATION_SENTENCE,
} from './plan-availability';

/**
 * TC-01 (P0, trust). COM-02 gated every 80G claim on /gaushala, /donations,
 * /about, /refunds, /csr-match, /gaushala/[id] and DonationForm on this one
 * owner-controlled flag, and left ~45 other surfaces asserting a deduction the
 * platform cannot deliver. This page was one of the worst of them: it sold a
 * "tax-compliant 80G receipt" as a paid benefit of a ₹5,000/yr subscription.
 *
 * The flag is false, `eightyGNumber` and `pan` are both null, and
 * apps/api/src/lib/pdf-receipt.ts prints "Proof of donation — not a tax
 * exemption certificate" on every receipt because `is80GEligible()` requires a
 * donee registration number AND PAN, and `gaushala_profiles.regn_80g` / `.pan`
 * are read in one place and written nowhere.
 *
 * Every 80G sentence below is now a branch on the flag. Obtaining the 80G(5)
 * registration is the owner's action; the copy returns the day it lands.
 */
const HAS_80G = COMPANY.donationLegal.HAS_80G_VERIFIED;

/**
 * TC-01, second pass. Gating the VISIBLE copy above left this page still
 * shipping the deduction promise to the reader that matters most for a tax
 * assertion: `nriPremiumServiceJsonLd` (lib/jsonld.ts:222) describes the plan
 * as including "free 80G receipts", and the page renders that object verbatim
 * inside `<script type="application/ld+json">`. tc01-80g-surface-coverage
 * .test.tsx says so in its own helper — it deletes every <script> before
 * asserting and names the five lines of lib/jsonld.ts still doing this.
 *
 * lib/jsonld.ts is another lane, so the page sanitises what IT emits. The
 * transform is conditional and idempotent: gate lib/jsonld.ts, or set the
 * owner flag, and it passes the object straight through.
 */
function honestServiceDescription(description: string): string {
  if (HAS_80G || !/80G/i.test(description)) return description;
  const cleaned = description.replace(/free 80G receipts/gi, 'free donation receipt PDFs');
  // Belt and braces: any 80G phrasing this does not recognise gets its whole
  // clause dropped rather than published.
  if (!/80G/i.test(cleaned)) return cleaned;
  return cleaned
    .split(/(?<=\.)\s+/)
    .filter((sentence) => !/80G/i.test(sentence))
    .join(' ');
}

const nriServiceJsonLd = {
  ...nriPremiumServiceJsonLd,
  description: honestServiceDescription(nriPremiumServiceJsonLd.description),
};

/**
 * TC-04, item 4 — the metadata was NOT gated on `NRI_PREMIUM_IS_SELLABLE`,
 * while the whole page body was.
 *
 * These three strings are what Google prints in a SERP entry and what
 * WhatsApp, Slack and iMessage render in a link preview, so the one channel
 * that reaches someone who has never opened the site went on advertising
 * "₹5,000 per year" and the six unenforced benefits — long after both
 * activation rails started answering 400 with the withdrawal message. A search
 * snippet also outlives the deploy that changed the page.
 *
 * Gated, not deleted: the priced copy is the `true` branch and returns intact
 * the day a benefit gets a non-null `enforcedBy`. The withdrawn-state copy
 * still describes what /nri is for — it remains a real landing page for the
 * diaspora with nothing to sell — and keeps the word "receipt" without the 80G
 * claim beside it, which TC-01 requires separately.
 *
 * Guarded by __tests__/tc04-nri-withdrawn-metadata.test.tsx.
 */
export const metadata: Metadata = {
  title: 'NRI Premium — Stay Connected to India',
  description: NRI_PREMIUM_IS_SELLABLE
    ? 'Annual all-access for the Indian diaspora. No NRI surcharge on bookings, weekly 1:1 priest call, priority booking, free donation receipt PDFs, unlimited AI Pandit. ₹5,000 per year, charged in INR (about $60).'
    : 'Book pujas at Indian temples from abroad, watch live darshan in your timezone, and donate to temples and gaushalas with a numbered receipt. Built for the Indian diaspora. The NRI Premium membership is not currently sold.',
  alternates: { canonical: 'https://darshya.online/nri' },
  openGraph: {
    title: 'NRI Premium — Darshya',
    description: NRI_PREMIUM_IS_SELLABLE
      ? 'Annual all-access tier built for the Indian diaspora. ₹5,000 per year, charged in INR (about $60).'
      : 'Pujas, live darshan and donations at Indian temples, for the Indian diaspora. The NRI Premium membership is not currently sold.',
    url: 'https://darshya.online/nri',
    type: 'website',
    images: ['/og/nri-premium.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NRI Premium — Darshya',
    description: NRI_PREMIUM_IS_SELLABLE
      ? 'Annual all-access for the Indian diaspora. ₹5,000/yr, charged in INR.'
      : 'Pujas, live darshan and donations at Indian temples, for the Indian diaspora.',
  },
};

const benefits = [
  {
    icon: Globe2,
    title: 'NRI price: shown in USD, billed in INR',
    body: 'Booking as an NRI costs 2.5 times the domestic price of the same puja, with or without this tier. The price is shown in US dollars next to the exact rupee amount; the order itself is charged in rupees and paid with UPI, an Indian card or net banking. Cards issued outside India and PayPal are coming soon.',
  },
  {
    icon: Calendar,
    title: 'Priority booking, 7 days early',
    body: 'Book Mahashivratri, Diwali, Janmashtami, Navratri slots before they open to general devotees. No more lottery.',
  },
  {
    icon: Phone,
    title: 'Weekly 1:1 priest video call',
    body: 'Free 30-min Jitsi consultation every week. Discuss family puja, share gotra, get personalized sankalpa guidance in your language.',
  },
  {
    icon: ShieldCheck,
    title: 'No ads, ever',
    body: 'Clean experience across web + mobile. Your donation pages, live darshan streams, and AI Pandit chat stay distraction-free.',
  },
  {
    icon: FileText,
    title: HAS_80G ? 'Free 80G receipt PDFs' : 'Free donation receipt PDFs',
    body: HAS_80G
      ? 'Every donation auto-generates a tax-compliant 80G receipt. India-tax filers get the deduction; US/UK/CA filers get proof for charitable contribution claims.'
      : 'Every donation gets a receipt PDF with its own receipt number. It is proof of payment, not a tax-exemption certificate — Darshya does not hold a Section 80G registration yet, so no donation made today can be claimed as a deduction.',
  },
  {
    icon: MessageCircle,
    title: 'Unlimited AI Pandit chat',
    body: 'No 5-message monthly cap on the free tier. Ask scripture questions, muhurat lookups, panchang queries — anytime, any language.',
  },
];

const comparison = [
  { feature: 'AI Pandit messages', free: '5 / month', perPuja: '5 / month', nri: 'Unlimited' },
  { feature: 'Booking price', free: 'NRI price: 2.5x domestic', perPuja: 'NRI price: 2.5x domestic', nri: 'NRI price: 2.5x domestic' },
  { feature: 'Priority booking window', free: 'No', perPuja: 'No', nri: '7 days early' },
  { feature: 'Weekly priest video call', free: 'No', perPuja: 'No', nri: 'Free, 30 min' },
  { feature: 'Ads', free: 'Yes', perPuja: 'Yes', nri: 'None' },
  // LEG-05: this row advertised "₹49 each" on the free and per-puja tiers. No
  // code path charges anything for an 80G receipt — routes/donations.ts mints
  // the receipt number and the PDF at no cost — so the fee was fiction, and it
  // contradicted /terms (which said ₹100) and /gaushala and /donations (free).
  {
    feature: HAS_80G ? '80G receipt PDF' : 'Donation receipt PDF',
    free: 'Included',
    perPuja: 'Included',
    nri: 'Included',
  },
  { feature: 'Live darshan replay history', free: '24 hours', perPuja: '24 hours', nri: '90 days' },
  // TC-03. This row read "24h notice / 24h notice / 4h notice" and sold the
  // shorter window as a Premium perk. There is no such perk and there cannot
  // be one today: booking.service.ts throws "Cancellation is not allowed
  // within 24 hours of the scheduled puja time." for every devotee, no
  // subscription tier is consulted anywhere in cancellation.service.ts, and
  // lib/cancellation-policy records that the 4-24h and <4h tiers of
  // DEFAULT_CANCEL_POLICY are unreachable for a devotee cancel and therefore
  // "no consumer surface may advertise them". Advertising the unreachable tier
  // as the reason to pay ₹5,000 is the worst version of that.
  //
  // The policy is identical for all three columns, so the row now says so and
  // is generated from the shared constant rather than typed.
  {
    feature: 'Puja cancellation policy',
    free: CANCELLATION_BADGE_LABEL,
    perPuja: CANCELLATION_BADGE_LABEL,
    nri: CANCELLATION_BADGE_LABEL,
  },
];

const faqs = [
  // TC-03. These three answers gave operating instructions for a purchase that
  // cannot be made ("cancel anytime from /account/subscriptions", "anyone can
  // subscribe", "book any open slot from /priests directly after subscribing").
  // The plan is withdrawn, and the priest-call answer describes an entitlement
  // the registry calls a supply commitment nobody has made:
  // consultation.ts is paid per session with no premium waiver and no weekly
  // allowance counter.
  {
    q: 'How does billing work?',
    a: NRI_PREMIUM_IS_SELLABLE
      ? 'Annual subscription, billed once through Razorpay in INR (₹5,000, roughly $60 USD equivalent). Auto-renews after 365 days; cancel anytime from /account/subscriptions.'
      : 'It does not, currently — the tier is withdrawn and nothing can be billed for it. When it was on sale it was an annual subscription charged once through Razorpay in INR (₹5,000, roughly $60 USD equivalent), auto-renewing after 365 days, cancellable from /account/subscriptions. If you already hold one, that is still how it works and it runs to its end date.',
  },
  // TC-03 (P0, trust). This answer used to read "full refund within 14 days, no
  // questions asked. Pro-rated refund within 90 days." Neither exists.
  //
  //  - subscriptionService.cancel() flips MarketplaceSubscription.status to
  //    CANCELLED and returns "Access continues until end of current billing
  //    period." It calls no gateway and moves no money; `refund` does not appear
  //    anywhere in subscription.service.ts.
  //  - subscribe() writes only a marketplaceSubscription row — no Payment, no
  //    PujaBooking — and the one refund engine, refund.service.processRefund,
  //    starts at prisma.pujaBooking.findUnique and refunds the Payment attached
  //    to that booking. The annual fee is invisible to it.
  //  - Nothing in the repo pro-rates a subscription in either direction; the
  //    same claim was already removed from /pricing for that reason.
  //
  // So the honest answer is a manual, reviewed one. Restore an automatic window
  // only when a subscription refund path exists to honour it.
  // TC-03, second pass. The replacement written above still contained a promise
  // of its own — "your access runs to the end of the year you have already paid
  // for" — and it is false. `cancel()` performs one write,
  // `marketplaceSubscription.update({ data: { status: 'CANCELLED' } })`, and
  // every consumer of the entitlement filters on `status: 'ACTIVE'`
  // (`isPremium()` in subscription.service.ts, `getActivePlan()` in
  // lib/ai-usage.ts). MarketplaceSubscription carries no cancelAtPeriodEnd,
  // no grace column and no deferred job, so access ends at the moment of
  // cancellation. The sentence lives in ./plan-availability so the hero, the
  // FAQ and the closing CTA cannot drift apart again.
  {
    q: 'Can I get a refund?',
    a: `${NRI_CANCELLATION_SENTENCE} The annual fee is not refunded automatically, because there is no automatic refund for a subscription in the product today: the only refund engine reads a puja booking, and a subscription has none. If something has genuinely gone wrong — a duplicate charge, or a benefit we did not deliver — write to ${COMPANY.supportEmail} and a person reviews it and issues the refund by hand in the payment gateway where we are at fault. Puja bookings you make are separate and follow the cancellation policy on /refunds.`,
  },
  {
    q: 'What about taxes?',
    a: HAS_80G
      ? 'The subscription is billed in INR and is not tax-deductible in your country (it is a service, not a donation). Donations made through Darshya remain 80G-eligible in India separately.'
      : 'The subscription is billed in INR and is not tax-deductible in your country (it is a service, not a donation). Donations are separate, but they are not deductible either today: Darshya does not hold a Section 80G registration, so the receipt you get is proof of payment rather than a tax instrument. We will say so here the day the registration is issued.',
  },
  {
    q: 'Do I need to be NRI to subscribe?',
    a: NRI_PREMIUM_IS_SELLABLE
      ? 'No, anyone can subscribe. The tier is named for who it most benefits — Indians abroad who want India-rate pricing and live priest connection. Domestic users are welcome.'
      : 'Nobody can subscribe today, NRI or not — the tier is withdrawn. The name describes who it was designed for, not a restriction: when it returns it will be open to domestic devotees too.',
  },
  {
    q: 'How is the 1:1 priest call scheduled?',
    a: NRI_PREMIUM_IS_SELLABLE
      ? 'Book any open slot from /priests directly after subscribing. The first call is auto-scheduled within 7 days. Each subsequent week unlocks one new free slot.'
      : 'It is not scheduled yet, and this is the benefit the tier is most blocked on. Consultations are booked and paid per session at /priests; there is no weekly free allowance in the product, and building one needs a priest roster that can actually staff it, not just code. That is one of the reasons the tier is on hold.',
  },
  {
    q: 'What languages are supported?',
    a: 'The site is available in English, Hindi, Tamil, Telugu, Bengali and Marathi; most of it is in English and each language page says how much is translated.',
  },
];

export default function NriPremiumLanding() {
  return (
    <main className="bg-surface-50 min-h-[100dvh]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(nriServiceJsonLd) }}
      />
      <section className="relative overflow-hidden bg-gradient-to-br from-saffron-50 via-cream-50 to-saffron-100/30 border-b border-surface-200/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-saffron-100 text-saffron-800 text-xs font-medium mb-6">
              <Globe2 className="w-3.5 h-3.5" />
              Built for the Indian diaspora
            </div>
            <h1 className={`${H1.marketing} mb-6`}>
              Stay connected to India,
              <br />
              <span className="text-saffron-700">at India prices.</span>
            </h1>
            <p className="prose-lead text-surface-600 mb-8 leading-relaxed">
              {NRI_PREMIUM_IS_SELLABLE
                ? 'Annual all-access for NRIs. Drop the surcharge on every puja, get a free weekly 1:1 priest call, and unlimited AI Pandit guidance — all for less than the cost of a single live darshan booking abroad.'
                : 'This is the page for Darshya NRI Premium, the annual all-access tier for the Indian diaspora. It is on hold. What follows describes what the tier was specified to do, so you can decide whether it is worth waiting for.'}
            </p>
            {/* TC-03 root cause. This page is a hardcoded shopfront that never
                consulted the server about whether the thing it sells is for
                sale. It is not: all six NRI Premium benefits carry
                `enforcedBy: null`, so nriPremiumIsSellable() is false,
                getPlans() drops the plan, and both activation rails answer 400
                with the withdrawal message. "Go Premium" led a devotee to
                /upgrade to be refused. Publishing a refund policy for a
                purchase that cannot complete is the same finding one layer up,
                so the buy affordance is gated on the mirrored server fact and
                the page prints the server's own refusal instead. */}
            {NRI_PREMIUM_IS_SELLABLE ? (
              <>
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                  <Link
                    href="/auth?redirect=/upgrade"
                    className={buttonClass('primary', 'md', 'shadow-md shadow-saffron-600/20')}
                  >
                    Go Premium — ₹5,000 / year (about $60)
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="#compare"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-surface-50 text-surface-800 font-medium rounded-lg border border-surface-200 transition-all"
                  >
                    Compare plans
                  </Link>
                </div>
                <p className="text-xs text-surface-500 mt-4">
                  Charged ₹5,000 in INR (about $60) · your bank sets the conversion rate · cancel anytime · cancelling ends access immediately, it does not run to the end of the year you paid for
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto max-w-2xl rounded-xl border border-amber-300 bg-amber-50 p-5 text-left">
                  <p className="flex items-start gap-2 text-sm font-semibold text-amber-900">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    NRI Premium is not currently sold
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
                    {NRI_PREMIUM_WITHDRAWN_NOTICE}
                  </p>
                </div>
                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center items-center">
                  {/* DU-03: the one primary-CTA recipe, not a hand-rolled
                      saffron fill — cta-uniformity-ratchet.du03 counts those
                      and only lets the total fall. */}
                  <Link
                    href="/pricing"
                    className={buttonClass('primary', 'lg', 'shadow-md shadow-saffron-600/20')}
                  >
                    See what you can book today
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="#compare"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-surface-50 text-surface-800 font-medium rounded-lg border border-surface-200 transition-all"
                  >
                    Compare plans
                  </Link>
                </div>
                <p className="text-xs text-surface-500 mt-4">
                  Nothing on this page can be charged to you while the tier is withdrawn. Everything free on Darshya — live darshan, panchang, the temple and puja catalogue — stays available without an account.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-surface-900 text-center mb-3">
          What you get
        </h2>
        {/* TC-03. Not one of the six is enforced today — the registry in
            apps/api/src/services/subscription-entitlements.ts names, per
            benefit, the file that would have to gate it and does not. That is
            exactly why the plan was withdrawn, so the section says what it is
            describing rather than presenting the list as delivered goods. */}
        <p className="text-surface-600 text-center mb-12 max-w-2xl mx-auto">
          {NRI_PREMIUM_IS_SELLABLE
            ? 'Six benefits that pay for the subscription on a single booking.'
            : 'What the tier was designed to include. None of it is on sale today — we withdrew it because we could not yet deliver every item on this list.'}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className="bg-white rounded-xl border border-surface-200/60 p-6 hover:shadow-md hover:shadow-surface-900/5 transition-shadow"
              >
                <div className="w-10 h-10 rounded-lg bg-saffron-100 text-saffron-700 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-surface-900 mb-2">{b.title}</h3>
                <p className="text-sm text-surface-600 leading-relaxed">{b.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="compare" className="bg-white border-y border-surface-200/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-surface-900 text-center mb-3">
            Compare plans
          </h2>
          {/* TC-03. Every difference this table claims for the NRI Premium
              column is one of the six benefits carrying `enforcedBy: null`, so
              none of them is enforced anywhere in the product. Gating each row
              would leave an empty table; saying so once above it is honest and
              keeps the specification readable. */}
          <p className="text-surface-600 text-center mb-12 max-w-2xl mx-auto">
            {NRI_PREMIUM_IS_SELLABLE
              ? 'One annual fee. No surprise charges per booking.'
              : 'What the tier was specified to change. None of these differences is enforced in the product today — the NRI Premium column describes the design, not current behaviour.'}
          </p>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm border border-surface-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-surface-50 text-surface-700">
                  <th className="text-left px-4 py-3 font-medium">Feature</th>
                  <th className="text-center px-4 py-3 font-medium">Free</th>
                  <th className="text-center px-4 py-3 font-medium">Per puja</th>
                  <th className="text-center px-4 py-3 font-medium bg-saffron-50 text-saffron-900">
                    NRI Premium
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? 'bg-white' : 'bg-surface-50/50'}>
                    <td className="px-4 py-3 font-medium text-surface-800">{row.feature}</td>
                    <td className="text-center px-4 py-3 text-surface-600">{row.free}</td>
                    <td className="text-center px-4 py-3 text-surface-600">{row.perPuja}</td>
                    <td className="text-center px-4 py-3 font-medium text-saffron-900 bg-saffron-50/50">
                      {row.nri}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* TC-03. A five-star testimonial ("Anjali R. · NRI Premium since 2026",
          "Saved over $400 in NRI surcharges on Janmashtami booking alone")
          stood here. It is fabricated twice over: the plan is withdrawn from
          sale, so there is no such subscriber, and the saving it describes is
          the one benefit the entitlement registry calls impossible —
          `booking.nri_surcharge_waived` is `enforcedBy: null` with the note
          "No surcharge waiver exists on any booking path. The NRI multiplier
          is applied without consulting any subscription." Deleted rather than
          rewritten: there is no real review to put in its place. */}

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-surface-900 text-center mb-12">
          Questions
        </h2>
        <div className="space-y-6">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group bg-white rounded-xl border border-surface-200/60 p-5 open:shadow-md transition-shadow"
            >
              <summary className="flex items-start justify-between cursor-pointer text-base font-semibold text-surface-900 list-none">
                <span>{f.q}</span>
                <span className="ml-4 text-saffron-600 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-3 text-sm text-surface-600 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* TC-03. The subtitle offered "our NRI festival calendar + a $10 trial
            credit when we launch your country premium tier". There is no
            credit — `trial credit` appeared in exactly this one string in the
            whole repo — no country-specific tier anywhere in the plan
            definitions, and no calendar mailing. EmailCapture posts to
            POST /waitlist and stores a row; that is the whole mechanism, so
            that is what the copy may promise. */}
        <EmailCapture
          source="nri-landing"
          title={NRI_PREMIUM_IS_SELLABLE ? 'Not ready to subscribe yet?' : 'Want to know when the tier is back?'}
          subtitle="Leave your email to join the waitlist for when there is something to buy. It is stored as a waitlist entry and used for nothing else, and we cannot promise when a message will be sent."
          cta="Notify me"
        />
      </section>

      <section className="bg-saffron-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center">
          <Sparkles className="w-10 h-10 text-saffron-200 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {NRI_PREMIUM_IS_SELLABLE
              ? 'Less than a single live darshan abroad.'
              : 'Everything free on Darshya is still yours.'}
          </h2>
          <p className="prose-lead text-saffron-100 mb-8 max-w-2xl mx-auto">
            {NRI_PREMIUM_IS_SELLABLE
              ? `₹5,000 per year, charged in INR (about $60). ${NRI_CANCELLATION_SENTENCE}`
              : 'The paid tier is withdrawn until we can deliver what it promises. Live darshan, panchang, the temple and puja catalogue and the AI Pandit free tier need no subscription and no account.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {NRI_PREMIUM_IS_SELLABLE ? (
              <Link
                href="/auth?redirect=/upgrade"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-saffron-800 hover:bg-saffron-50 font-semibold rounded-lg shadow-md transition-all"
              >
                Go Premium
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href="/pujas"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-saffron-800 hover:bg-saffron-50 font-semibold rounded-lg shadow-md transition-all"
              >
                Browse pujas
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <Link
              href="/nri-pujas"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-saffron-800/40 hover:bg-saffron-800/60 text-white font-medium rounded-lg border border-saffron-400/30 transition-all"
            >
              Book pujas from abroad
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-saffron-800/40 hover:bg-saffron-800/60 text-white font-medium rounded-lg border border-saffron-400/30 transition-all"
            >
              See all plans
            </Link>
          </div>
          <ul className="mt-8 grid sm:grid-cols-3 gap-3 text-sm text-saffron-100 max-w-2xl mx-auto">
            <li className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-saffron-200" />
              Razorpay secure checkout
            </li>
            {/* TC-03. This tile read "Access to the end of your paid year".
                cancel() flips status to CANCELLED and isPremium() /
                getActivePlan() both require ACTIVE, so it does not. */}
            <li className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-saffron-200" />
              Cancelling ends access at once
            </li>
            <li className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-saffron-200" />
              Cancel in 1 click
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
