import type { Metadata } from 'next';
import SelfOnboardPageShell from '../../components/SelfOnboardPageShell';
import SelfOnboardForm, { ExtraInput, ExtraCheckbox } from '../../components/SelfOnboardForm';

export const runtime = 'edge';

export const metadata: Metadata = {
  title: 'List your gaushala on Darshya',
  description:
    'Receive 80G donations online for cow seva. Verified gaushalas only. Instant tax receipts to donors.',
};

const BENEFITS = [
  {
    title: 'Online donations, instant receipts',
    body: 'Devotees donate via Razorpay. 80G PDF receipts auto-emailed within 60 seconds.',
  },
  {
    title: 'Verified-gaushala badge',
    body: 'Submit registration + 80G certificate once. Verified badge boosts donor conversion 3-4×.',
  },
  {
    title: 'Cow-count + photo proof',
    body: 'Show the cows your donors are feeding. Monthly photos build long-term donor loyalty.',
  },
  {
    title: 'Recurring monthly seva',
    body: 'Devotees can subscribe to ₹500/month "feed a cow" plans. Predictable income for the gaushala.',
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
              <ExtraCheckbox name="has80G" label="Our trust is 80G-registered (we'll verify)" />
            </>
          }
        />
      }
    />
  );
}
