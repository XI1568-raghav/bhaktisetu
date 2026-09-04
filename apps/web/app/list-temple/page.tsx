import type { Metadata } from 'next';
import SelfOnboardPageShell from '../../components/SelfOnboardPageShell';
import SelfOnboardForm, { ExtraInput } from '../../components/SelfOnboardForm';
import { COMPANY } from '../../lib/company';
import { getPlatformCounts } from '../../lib/platform-stats';
import { PAYOUT_TIMING_SHORT } from '../pricing/faqs';

/**
 * TC-12 (P2) / TC-01 (P0) — the supply-acquisition claims on this page.
 *
 * What was published to temple trusts, and what is actually true:
 *
 *   "Live darshan to 10,000+ devotees"  There is no devotee counter anywhere in
 *   "Reach 10,000+ devotees on Darshya"  the product, and nothing has ever
 *                                        counted an audience. The number was
 *                                        remembered, not measured, so it is
 *                                        deleted rather than restated: the only
 *                                        inventory figure this page may print is
 *                                        one lib/platform-stats.ts just counted
 *                                        off the API, and that module counts
 *                                        TEMPLES, not devotees.
 *
 *   "verified devotees"                  There is no devotee verification of any
 *                                        kind — no KYC, no flag, no column.
 *
 *   "Settlements within 7 days."         payout.service refuses every withdrawal
 *                                        until an admin sets provider_kyc.verified,
 *                                        and the transfer is manual on a rail
 *                                        (RazorpayX/Cashfree) that is not enabled.
 *                                        Replaced with the wording /pricing already
 *                                        publishes, imported so the two cannot drift.
 *
 *   "80G donation receipts"              HAS_80G_VERIFIED is false, eightyGNumber and
 *                                        pan are null, and pdf-receipt.ts stamps every
 *                                        receipt "Proof of donation — not a tax
 *                                        exemption certificate". Gated, not deleted:
 *                                        the temple's OWN 80G registration is a
 *                                        separate thing from Darshya's, and the honest
 *                                        version says which one is missing.
 *
 * `getPlatformCounts()` never throws and never invents: a count it could not
 * read comes back null and the copy loses its digits rather than its honesty.
 */
const HAS_80G = COMPANY.donationLegal.HAS_80G_VERIFIED;

export const metadata: Metadata = {
  alternates: { canonical: 'https://darshya.online/list-temple' },
  title: 'List your temple',
  description: HAS_80G
    ? 'Bring your temple online. Live darshan, puja bookings, devotee donations and 80G receipts — all on Darshya.'
    : 'Bring your temple online. Live darshan, puja bookings and devotee donations — all on Darshya.',
};

function benefits(liveDarshanTemples: number | null) {
  const alreadyStreaming =
    liveDarshanTemples === null
      ? ''
      : ` ${liveDarshanTemples} temple${liveDarshanTemples === 1 ? '' : 's'} already stream on Darshya.`;

  return [
    {
      title: 'Live darshan',
      body: `Stream daily aarti and special pujas to devotees across India and the diaspora.${alreadyStreaming}`,
    },
    {
      title: 'Online puja bookings',
      body: `Devotees book pujas at your temple with full sankalp + video proof. ${PAYOUT_TIMING_SHORT}`,
    },
    HAS_80G
      ? {
          title: '80G donation receipts',
          body: 'If your trust is 80G-registered, devotees can donate online and receive instant tax receipts.',
        }
      : {
          title: 'Donation receipts',
          body: 'Devotees donate online and get a numbered receipt PDF by email. It is proof of payment, not a tax-exemption certificate — Darshya does not hold a Section 80G registration yet, so we cannot issue 80G receipts on your trust’s behalf today.',
        },
    {
      title: 'Analytics + devotee CRM',
      body: 'See who watched, who booked, who donated. Send festival nudges to repeat devotees.',
    },
  ];
}

export default async function ListTemplePage() {
  const counts = await getPlatformCounts();

  return (
    <SelfOnboardPageShell
      eyebrow="For Temple Trusts"
      title="List your temple on Darshya"
      subtitle="List your temple in minutes. Take live darshan, puja bookings and donations online, with transparent payouts."
      benefits={benefits(counts.liveDarshanTemples)}
      formCard={
        <SelfOnboardForm
          role="TEMPLE"
          ctaLabel="Apply to list my temple"
          extraFields={
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ExtraInput name="templeName" label="Temple name" required placeholder="e.g. Shri Kashi Vishwanath Mandir" />
              <ExtraInput name="deity" label="Primary deity" required placeholder="e.g. Shiva" />
            </div>
          }
        />
      }
    />
  );
}
