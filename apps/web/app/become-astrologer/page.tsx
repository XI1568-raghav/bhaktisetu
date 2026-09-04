import type { Metadata } from 'next';
import SelfOnboardPageShell from '../../components/SelfOnboardPageShell';
import SelfOnboardForm, { ExtraInput, ExtraSelect } from '../../components/SelfOnboardForm';


export const metadata: Metadata = {
  alternates: { canonical: 'https://darshya.online/become-astrologer' },
  title: 'Become a Darshya astrologer',
  description:
    'Take per-minute consultations on Darshya — kundli, muhurat, gemstone and tarot. Verified astrologers only.',
};

// TC-02 (P0, trust). PJ-02 stripped three unbackable promises from
// /become-priest and this page — the same supply funnel, one file away — kept
// the identical claim class:
//
//  1. "Daily payouts at scale. Once you cross ₹5,000 lifetime, payouts move
//     from weekly to daily." No such tier exists. payout.service.ts is the only
//     payout engine and it is request-then-admin-approve; the sole cadence in
//     it is WEEKLY_SETTLE_MIN_INR, a floor on a weekly BATCH. The transfer
//     itself is manual — apps/api/src/routes/admin-bookings.ts records that
//     "the actual bank transfer stays owner-gated on RazorpayX/Cashfree", and
//     neither rail is enabled. Nothing keys a payout cadence off cumulative
//     earnings anywhere in the repo.
//  2. "Aadhaar + qualification verified badge. Devotees pay 2-3× more for
//     verified astrologers." AstrologerProfile has no aadhaar_verified column
//     and no verified column at all — only `approved`. The Aadhaar flag lives
//     on Priest and PanditProfile. There is nowhere to record the verification,
//     so there is no badge, and the 2-3× premium is an invented statistic.
//
// Copy below states only what ships today: a flat 80% share (the uniform
// provider rate — ASTROLOGER_PLATFORM_RATE is 20%), a payout you request and we
// release by hand, and approval rather than a verification badge. Restore a
// cadence claim on the day the bank rail is live, and a verification badge on
// the day the column exists.
const BENEFITS = [
  {
    title: 'Per-minute consultations',
    body: 'Set your own per-minute rate. Devotees pay for the session up front through Razorpay, so you only ever talk to paid users.',
  },
  {
    title: 'Chat + video on Jitsi',
    body: 'Built-in chat and HD video calls — no Zoom links, no payment chase. We handle the plumbing.',
  },
  {
    title: 'You keep 80%',
    body: 'You keep 80% of every consultation — Darshya takes 20%, the same rate for every provider on the platform. Once your bank details are verified, request a payout from your dashboard and we transfer it manually while our automated bank rail is being set up.',
  },
  {
    title: 'A reviewed profile builds trust',
    body: 'Every astrologer profile is reviewed and approved before it goes live, so devotees browsing /astrology are only shown practitioners we have actually looked at.',
  },
];

export default function BecomeAstrologerPage() {
  return (
    <SelfOnboardPageShell
      eyebrow="For Astrologers"
      title="Consult devotees online — earn per minute"
      subtitle="Bring your jyotish practice to Darshya. Vedic, tarot, numerology, palmistry — set your rate, work your hours, keep 80% of every consultation."
      benefits={BENEFITS}
      formCard={
        <SelfOnboardForm
          role="ASTROLOGER"
          ctaLabel="Apply to become a Darshya astrologer"
          extraFields={
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ExtraSelect
                name="astrologyType"
                label="Astrology type"
                required
                options={[
                  { value: 'vedic', label: 'Vedic / Jyotish' },
                  { value: 'tarot', label: 'Tarot' },
                  { value: 'numerology', label: 'Numerology' },
                  { value: 'palmistry', label: 'Palmistry' },
                  { value: 'other', label: 'Other' },
                ]}
              />
              <ExtraInput
                name="yearsExperience"
                label="Years of experience"
                type="number"
                min={0}
                max={80}
                placeholder="e.g. 8"
              />
            </div>
          }
        />
      }
    />
  );
}
