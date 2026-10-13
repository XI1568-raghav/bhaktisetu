import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
import { COMPANY } from '../../lib/company';
import { buttonClass } from '../../components/ui/button-recipe';
import {
  CANCELLATION_BADGE_LABEL,
  CANCELLATION_BADGE_DESC,
  CANCELLATION_POLICY_SENTENCE,
  REFUND_DAYS_LABEL,
} from '../../lib/cancellation-policy';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

/**
 * TC-01 (P0) / TC-08 (P1) — this page is the site's "honest comparison", and
 * three of its rows made claims the product cannot back.
 *
 *  - 80G: `HAS_80G_VERIFIED` is false, `eightyGNumber` and `pan` are both null,
 *    and apps/api/src/lib/pdf-receipt.ts stamps every receipt "Proof of
 *    donation — not a tax exemption certificate". Gated on the same
 *    owner-controlled flag as lib/company.ts and app/gaushala/page.tsx.
 *  - Pandit vetting: `Priest.isVerified`, `.verificationStatus` and
 *    `.aadhaarVerified` have no writer outside apps/api/prisma/seed.ts. There
 *    is no credential upload, no reference workflow, no probation job and no
 *    trust-score column anywhere in the schema. The replacement wording is the
 *    sentence already shipping at app/temples/[slug]/pujas/page.tsx, reused
 *    verbatim so the two surfaces cannot drift.
 *  - Live darshan count: apps/api/prisma/seed/darshan-streams.ts defines 20
 *    streams and skips any whose temple is not seeded, so "25+ temples" was
 *    never true, and "optional premium" sold a darshan tier that does not
 *    exist on any rail (TC-13).
 */
const HAS_80G = COMPANY.donationLegal.HAS_80G_VERIFIED;

export const metadata: Metadata = {
  title: 'Why Darshya — vs Sri Mandir, Utsav, AstroSage | Devotional App Comparison',
  description: HAS_80G
    ? 'Compare Darshya with Sri Mandir, Utsav, AstroSage, AppsForBharat. Video proof guarantee, NRI-fair pricing, gaushala donations, 80G receipts. Solo founder, devotee-first.'
    : 'Compare Darshya with Sri Mandir, Utsav, AstroSage, AppsForBharat. Video proof guarantee, NRI-fair pricing, gaushala donations, numbered donation receipts. Solo founder, devotee-first.',
  alternates: { canonical: `${BASE_URL}/why-darshya` },
  openGraph: {
    title: 'Why Darshya — How we compare',
    description: 'Side-by-side comparison with leading devotional apps in India.',
    url: `${BASE_URL}/why-darshya`,
    type: 'website',
    images: ['/og/default.png'],
  },
};

interface Row {
  feature: string;
  darshya: string;
  sriMandir: string;
  utsav: string;
  astrosage: string;
  detail?: string;
}

const ROWS: Row[] = [
  {
    feature: 'Video proof of every puja',
    darshya: `✓ Mandatory, ${COMPANY.refunds.videoProofTargetLabel} target`,
    sriMandir: '~ Partial (premium tier)',
    utsav: '~ On request',
    astrosage: '✗',
    detail: `We refuse to ship a puja without recorded sankalp. Every booking gets a 5-10 min video, and we aim to have it up within ${COMPANY.refunds.videoProofTargetLabel}. That is a target, not a money-backed clock: if nothing has arrived ${COMPANY.refunds.missingVideoEscalationHours} hours after your slot, a sweep cancels the booking for manual refund review if it is still waiting on its assigned pandit, and any other status needs an email from you.`,
  },
  {
    feature: 'NRI-fair pricing',
    darshya: '✓ NRI price shown in USD (2.5x domestic), billed in INR, total shown first',
    sriMandir: '~ Some USD pricing, opaque',
    utsav: '~ Single global price',
    astrosage: '~ INR only (devotee converts)',
    detail: 'NRI devotees see a US-dollar price that is 2.5x the domestic puja price. It is a display conversion: the order is charged in rupees and paid with UPI, an Indian card or net banking. Checkout breaks out the puja fee, the flat platform fee and any prasad delivery, and shows the rupee amount charged next to the dollar total.',
  },
  {
    feature: 'Pandit checks before payout',
    darshya: '~ Aadhaar KYC only, no trust score',
    sriMandir: '~ Pandits onboarded by aggregator',
    utsav: '~ Temple-only model',
    astrosage: 'N/A',
    detail: 'A pandit is paid only once Aadhaar-based KYC is on file, which is a payout gate rather than a public credential check — we do not yet run independent credential verification or temple reference checks, and we do not publish a per-pandit trust score. What every booking does carry is mandatory video proof of the ceremony.',
  },
  {
    feature: 'Live darshan (free)',
    darshya: '✓ Free for everyone, no signup',
    sriMandir: '✓ Yes',
    utsav: '~ Limited',
    astrosage: '✗',
    detail: 'Major temples include Kashi Vishwanath, Tirupati, Siddhivinayak, Somnath and Jagannath Puri. The list that is live right now is on /darshan. There is no paid darshan tier — every stream is free.',
  },
  {
    feature: HAS_80G ? '80G tax receipts' : 'Donation receipts',
    darshya: HAS_80G ? '✓ Auto-issued, PAN-validated' : '✓ Auto-issued, numbered, emailed',
    sriMandir: '~ Some donations only',
    utsav: '~ Manual on request',
    astrosage: '✗',
    detail: HAS_80G
      ? 'Format DR-YYYYMMDD-XXXX, downloadable from account within 24h. Requires donee 80G registration.'
      : 'Format DR-YYYYMMDD-XXXX, downloadable from your account within 24h. It is proof of payment, not a tax-exemption certificate: Darshya holds no Section 80G registration yet, so a donation made today cannot be claimed as an income-tax deduction.',
  },
  {
    feature: 'Gaushala seva integration',
    darshya: '✓ Donate to approved gaushalas, with a receipt',
    sriMandir: '✗',
    utsav: '✗',
    astrosage: '✗',
    detail: 'Contribute to cow care at an approved gaushala from anywhere; billed in INR. Photo updates are coming soon.',
  },
  {
    feature: 'Free Vedic content (shlokas, aarti, chalisa, mantras)',
    darshya: '✓ Full Sanskrit + transliteration + meaning, no signup',
    sriMandir: '~ App-locked',
    utsav: '~ Limited',
    astrosage: '~ Article-style',
    detail: '100+ shlokas, all major aarti, chalisa for 12 deities, deity-specific mantras with how-to-recite.',
  },
  {
    feature: 'Yatra package planning',
    darshya: '✓ Char Dham, 12 Jyotirlinga, Sapta Puri, custom',
    sriMandir: '~ Partner-aggregated',
    utsav: '✗',
    astrosage: '✗',
    detail: 'Inquiry-only model — our team responds in 24h with custom itinerary + verified hotels + VIP darshan where available.',
  },
  {
    feature: 'Astrology (free birth chart + Vimshottari dasha)',
    darshya: '✓ Free chart, paid consultations',
    sriMandir: '✓ Premium gated',
    utsav: '✗',
    astrosage: '✓ Free chart',
    detail: 'AstroSage is strong here; we focus on quality over feature breadth — single-pandit consultation, not chatbot.',
  },
  {
    feature: 'Gift puja for family in India',
    darshya: '✓ NRI gifts to India, recipient WhatsApp delivery',
    sriMandir: '✗',
    utsav: '✗',
    astrosage: '✗',
    detail: 'You book from abroad, recipient in India gets booking number + video proof via WhatsApp + name in sankalp.',
  },
  {
    feature: 'Published cancellation ladder',
    darshya: `✓ ${CANCELLATION_BADGE_LABEL}, then ${CANCELLATION_BADGE_DESC}`,
    sriMandir: '~ Case-by-case',
    utsav: '~ Strict policies',
    astrosage: 'N/A',
    detail: `${CANCELLATION_POLICY_SENTENCE} Inside the cutoff the samagri is procured and the pandit slot is locked; a reschedule is still possible. Refunds settle in ${REFUND_DAYS_LABEL}.`,
  },
  {
    feature: 'Mobile app + web parity',
    darshya: '✓ Expo + Next, full feature parity',
    sriMandir: '✓ App-first',
    utsav: '~ Web-light',
    astrosage: '✓ App',
    detail: 'Whether you book on web or mobile, same booking flow, same prices, same video delivery.',
  },
  {
    feature: 'Multi-language',
    darshya: 'English, Hindi, Tamil, Telugu, Bengali, Marathi',
    sriMandir: '11+ languages',
    utsav: '~ Hindi + English',
    astrosage: '✓ Multi-lang',
    detail: 'Sri Mandir leads on language breadth; we ship landing pages today, full UI rolling out.',
  },
  {
    feature: 'Pricing transparency (no hidden fees)',
    darshya: '✓ All-in at checkout',
    sriMandir: '~ Some upsells',
    utsav: '~ Add-ons during',
    astrosage: '~ Pay-per-question',
    detail: 'No phantom charges. The total (listed price + flat platform fee) is shown before you pay, and it is the same from any country. Billing is in INR.',
  },
];

const PILLARS = [
  {
    title: 'Devotee-first, not aggregator-first',
    body: 'We refuse partnerships that compromise temple authenticity or pandit livelihoods. A uniform 20% platform commission funds infrastructure, not VC quarterly targets.',
  },
  {
    title: 'Built by one founder',
    body: 'No layer of middle management to dilute decisions. When you message support, your message goes to the person who can fix it.',
  },
  {
    title: 'NRI is a first-class customer',
    body: 'Not a USD pricing experiment bolted onto Indian app. Currency conversion, fair processing fee, gaushala donations, WhatsApp delivery, gift-puja flow — built for diaspora from day one.',
  },
  {
    title: 'Zero VC pressure',
    body: 'Bootstrapped. Means we can refuse upsells, skip dark-pattern flows, and keep free content actually free. Revenue from pujas + premium + yatra commission, not ads to your bereaved family.',
  },
];

function comparisonJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Why Darshya — Comparison',
    description: 'Compare Darshya with Sri Mandir, Utsav, AstroSage',
    url: `${BASE_URL}/why-darshya`,
  };
}

const cellStyle = (val: string) => {
  if (val.startsWith('✓')) return 'text-emerald-700 font-medium';
  if (val.startsWith('✗')) return 'text-rose-700 font-medium';
  if (val.startsWith('~')) return 'text-amber-700';
  return 'text-surface-700';
};

export default function WhyDarshya() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(comparisonJsonLd()) }}
      />

      <header className="text-center mb-10">
        <div className="inline-block px-3 py-1 mb-3 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
          Honest comparison
        </div>
        <h1 className={`${H1.marketing} mb-3`}>
          Why Darshya?
        </h1>
        <p className="prose-lead text-surface-700 leading-relaxed max-w-3xl mx-auto">
          How we compare with Sri Mandir, Utsav, AppsForBharat, AstroSage. We&apos;ll be honest
          about where competitors lead — and where we choose to differ deliberately.
        </p>
      </header>

      <section className="mb-12 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-surface-50 border-b-2 border-surface-300">
            <tr>
              <th className="text-left p-3 font-bold text-surface-900 sticky left-0 bg-surface-50">
                Feature
              </th>
              <th className="text-left p-3 font-bold text-saffron-700 bg-saffron-50">Darshya</th>
              <th className="text-left p-3 font-semibold text-surface-700">Sri Mandir</th>
              <th className="text-left p-3 font-semibold text-surface-700">Utsav</th>
              <th className="text-left p-3 font-semibold text-surface-700">AstroSage</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr
                key={row.feature}
                className={`border-b border-surface-200 ${i % 2 === 0 ? 'bg-white' : 'bg-surface-50/50'}`}
              >
                <td className="p-3 font-medium text-surface-900 align-top">
                  {row.feature}
                  {row.detail && (
                    <div className="text-xs text-surface-600 font-normal mt-1 max-w-xs">
                      {row.detail}
                    </div>
                  )}
                </td>
                <td className={`p-3 align-top bg-saffron-50/30 ${cellStyle(row.darshya)}`}>
                  {row.darshya}
                </td>
                <td className={`p-3 align-top ${cellStyle(row.sriMandir)}`}>{row.sriMandir}</td>
                <td className={`p-3 align-top ${cellStyle(row.utsav)}`}>{row.utsav}</td>
                <td className={`p-3 align-top ${cellStyle(row.astrosage)}`}>{row.astrosage}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-xs text-surface-500 mt-3 px-2">
          Legend: ✓ first-class · ~ partial / case-by-case · ✗ not offered · N/A not in scope.
          Comparisons based on public information as of May 2026. Open to corrections — email{' '}
          <a href="mailto:hello@darshya.online" className="text-saffron-700 hover:underline">
            hello@darshya.online
          </a>
          .
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-surface-900 mb-6 text-center">
          Our 4 non-negotiables
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-surface-200 bg-white p-5 hover:border-saffron-300 transition"
            >
              <h3 className="text-lg font-bold text-surface-900 mb-2">{p.title}</h3>
              <p className="text-sm text-surface-700 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12 rounded-xl border-2 border-amber-300 bg-amber-50 p-6">
        <h2 className="text-xl font-bold text-surface-900 mb-3">Where competitors lead</h2>
        <ul className="space-y-2 text-sm text-surface-800">
          <li>
            <strong>Sri Mandir:</strong> Larger user base, 11+ language UI, more deity content,
            stronger app distribution. If you primarily want to read content in your local language
            with a polished app, they&apos;re excellent.
          </li>
          <li>
            <strong>AstroSage:</strong> Most established Vedic astrology platform with deepest
            calculator library. For pure jyotish reports, hard to beat.
          </li>
          <li>
            <strong>Utsav:</strong> Strong temple-direct relationships with select major temples.
            Good for specific temple-only flows.
          </li>
          <li>
            <strong>AppsForBharat:</strong> Sister product to Sri Mandir. Multi-app strategy with
            strong content team.
          </li>
        </ul>
        <p className="text-xs text-surface-600 mt-3 italic">
          We&apos;re not for everyone. If you want the biggest app — Sri Mandir. If you want
          deepest astrology — AstroSage. If you want video-proof + NRI-fair + bootstrapped +
          devotee-first — we&apos;re here.
        </p>
      </section>

      <section className="rounded-xl border border-saffron-200 bg-saffron-50 p-8 text-center">
        <h2 className="text-2xl font-bold text-surface-900 mb-3">Try us with a small puja</h2>
        {/* LEG-06 (prod sweep 2026-08-12): this used to promise a video inside
            48 hours and, if it never came, an automatic cancel-and-repay.
            Neither exists. escalateStaleBookings runs at 72h, selects one of
            nine statuses, and its own comment records that it deliberately
            writes no refund marker — a person issues the money. /refunds was
            rewritten to say so; this CTA was not, and a CTA is read by more
            people than a policy page. */}
        <p className="text-surface-700 text-base mb-5 max-w-xl mx-auto">
          Book a ₹501 puja and judge for yourself. We aim to have your video up within{' '}
          {COMPANY.refunds.videoProofTargetLabel}; if none has arrived{' '}
          {COMPANY.refunds.missingVideoEscalationHours} hours after your slot, write to us and a
          person reviews it &mdash; where the pandit is at fault you are repaid in full. See the{' '}
          <Link href="/refunds" className="underline">
            refund policy
          </Link>{' '}
          for the cancellation tiers that apply when you cancel.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/pujas"
            className={buttonClass('primary', 'md')}
          >
            Browse pujas →
          </Link>
          <Link
            href="/faqs"
            className="px-6 py-3 border border-saffron-600 text-saffron-700 rounded-md text-base font-semibold hover:bg-saffron-100"
          >
            Read FAQs
          </Link>
        </div>
      </section>
    </main>
  );
}
