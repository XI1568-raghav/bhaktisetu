import type { Metadata } from 'next';
import SelfOnboardPageShell from '../../components/SelfOnboardPageShell';
import SelfOnboardForm, { ExtraInput, ExtraCheckbox } from '../../components/SelfOnboardForm';
import { GAUSHALA_PLANS } from '../../lib/gaushala-plans';


export const metadata: Metadata = {
  alternates: { canonical: 'https://darshya.online/list-gaushala' },
  title: 'List your gaushala',
  description:
    'Receive 80G donations online for cow seva. Verified gaushalas only. Instant tax receipts to donors.',
};

/**
 * TC-12: this page told gaushala owners "Devotees can subscribe to ₹500/month
 * 'feed a cow' plans". There has never been a ₹500 monthly tier — the ladder
 * in lib/gaushala-plans.ts runs ₹51/day, ₹3,000/month, ₹30,000/year,
 * ₹2,25,000 one-time — and DF-06 had already removed the identical claim from
 * the homepage Worship rail four months earlier. It survived here because the
 * guard for it only read the two home components; a gaushala reading this page
 * was being recruited on a recurring-revenue feature that was never built,
 * which is the same false fact aimed at the supply side instead of the demand
 * side.
 *
 * The prices are now interpolated off the ladder rather than retyped, so the
 * pitch cannot drift from the plans /gaushala actually renders. Guarded by
 * __tests__/funnel-inventory-claims.test.tsx.
 */
const RECURRING_TIERS = GAUSHALA_PLANS.filter((p) => p.period !== 'one-time')
  .map((p) => `${p.price}${p.period === '/day' ? ' a day' : p.period === '/month' ? ' a month' : ' a year'}`)
  .join(', ');

const BENEFITS = [
  {
    title: 'Online donations, instant receipts',
    body: 'Devotees donate via Razorpay. 80G PDF receipts auto-emailed within 60 seconds.',
  },
  {
    title: 'Verified-gaushala badge',
    // TC-12: this used to end "Verified badge boosts donor conversion 3-4x".
    // Nobody measured that. The gaushala rail has processed no donations, so
    // no verified cohort has ever been compared with an unverified one — the
    // multiplier was a number typed to make registering look worth it, aimed
    // at trusts that hand over a PAN and an 80G certificate on the strength of
    // it. Same defect as the Rs 500 tier this page also carried, one
    // abstraction up: not a feature that does not exist, but a RESULT that was
    // never obtained. The badge is now described by what it is.
    body: 'Submit registration + 80G certificate once. Donors see a verified badge on your listing.',
  },
  {
    title: 'Cow-count + photo proof',
    body: 'Show the cows your donors are feeding. Monthly photos build long-term donor loyalty.',
  },
  {
    title: 'Recurring cow seva',
    body: `Devotees can subscribe to recurring "feed a cow" plans — ${RECURRING_TIERS}. Predictable income for the gaushala.`,
  },
];

export default function ListGaushalaPage() {
  return (
    <SelfOnboardPageShell
      eyebrow="For Gaushalas"
      title="Receive cow-seva donations from devotees worldwide"
      subtitle="List your gaushala on Darshya. 80G receipts, monthly subscriptions, and a transparent donor dashboard — built for trust."
      benefits={BENEFITS}
      formCard={
        <SelfOnboardForm
          role="GAUSHALA"
          ctaLabel="Apply to list my gaushala"
          extraFields={
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ExtraInput name="gaushalaName" label="Gaushala name" required placeholder="e.g. Shri Krishna Gaushala" />
                <ExtraInput
                  name="cowCount"
                  label="Approx cow count"
                  required
                  type="number"
                  min={0}
                  max={100000}
                  placeholder="e.g. 120"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ExtraInput name="pan" label="Trust PAN (for 80G receipts)" placeholder="e.g. AAATR1234C" />
                <ExtraInput name="regn80G" label="80G registration number" placeholder="e.g. AAATR1234C/12-AA/2024-25" />
              </div>
              <p className="text-xs opacity-70">PAN + 80G number print on every donor's tax receipt. Leave blank if not yet registered — we'll mark you as pending verification.</p>
              <ExtraCheckbox name="has80G" label="Our trust is 80G-registered (we'll verify)" />
            </>
          }
        />
      }
    />
  );
}
