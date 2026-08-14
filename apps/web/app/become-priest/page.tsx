import type { Metadata } from 'next';
import SelfOnboardPageShell from '../../components/SelfOnboardPageShell';
import SelfOnboardForm, { ExtraInput } from '../../components/SelfOnboardForm';


export const metadata: Metadata = {
  alternates: { canonical: 'https://darshya.online/become-priest' },
  title: 'Become a Darshya pandit',
  description:
    'Perform online pujas and ask-pandit consultations, and keep 80% of every booking. Verified pandits only.',
};

// PJ-02 (P0, trust). This page carried three claims the product cannot honour.
//
//  1. "Money in your bank account every Monday after Aadhaar verification."
//     There is no transfer rail. payout.service.processPayout is a bookkeeping
//     state flip that records a reference; RazorpayX/Cashfree are not
//     integrated (owner-gated). A pandit recruited on this promise performs
//     pujas, is paid nothing, and cannot see why.
//  2. "Earn 60-80% of every booking." The shipped doctrine is a uniform 80%
//     provider share across every role, and the schema default was corrected
//     from 0.70 to 0.80. A range that starts at 60% understates what he gets
//     and contradicts the payout docs.
//  3. "Join 200+ verified pandits." There are 3 in the database, all seed rows.
//     Same fabricated-social-proof class as the "500+ pujas completed" claim.
//
// The GTM plan puts pandit acquisition cost at Rs 2,500-4,500 and warns that
// one wronged pandit poisons an entire temple network, so over-promising here
// is the most expensive possible lie. Copy below states only what is true
// TODAY. Restore a weekly-bank-credit claim only once the rail is live.

const BENEFITS = [
  {
    title: 'Steady puja bookings',
    body: 'Devotees book pujas with you directly — daily, special-occasion and festival pujas at your temple or via video.',
  },
  {
    title: 'Video proof = instant trust',
    body: 'Upload short video proof of each puja. Devotees love it; you build a permanent reputation.',
  },
  {
    title: 'You keep 80%',
    body: 'You keep 80% of every booking — Darshya takes 20%, the same rate for every provider on the platform. Once your Aadhaar and bank details are verified, request a payout from your dashboard and we transfer it manually while our automated bank rail is being set up.',
  },
  {
    title: 'Ask-Pandit consultations',
    body: 'Charge per-minute for muhurat, kundli and ritual queries via chat or video call on Darshya.',
  },
];

export default function BecomePriestPage() {
  return (
    <SelfOnboardPageShell
      eyebrow="For Pandits"
      title="Earn from your dharma — online and offline"
      subtitle="Perform pujas for Darshya devotees, keep 80% of every booking, and build a permanent online reputation backed by video proof of every ritual."
      benefits={BENEFITS}
      formCard={
        <SelfOnboardForm
          role="PRIEST"
          ctaLabel="Apply to become a Darshya pandit"
          extraFields={
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ExtraInput
                name="yearsExperience"
                label="Years of experience"
                required
                type="number"
                min={0}
                max={80}
                placeholder="e.g. 12"
              />
              <ExtraInput
                name="specialties"
                label="Specialties"
                required
                placeholder="e.g. Rudrabhishek, Satyanarayan, Graha Shanti"
              />
            </div>
          }
        />
      }
    />
  );
}
