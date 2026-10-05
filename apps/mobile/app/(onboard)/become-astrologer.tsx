import { OnboardScreen, ExtraTextField, ExtraSelectField } from './_form';
import { verifiedNoun } from '../../lib/pandit-vetting';

/**
 * TC-08 / AW-02 class — the recruitment claims on this page, measured.
 *
 * `become-priest.tsx` was corrected in an earlier wave and its comment states
 * the rule: a provider must not be recruited on two different promises
 * depending on which client they opened. This page still carried four claims
 * the codebase cannot support, and two of them were about MONEY:
 *
 *   "Devotees pre-pay credits, you only ever talk to paid users."
 *     There is no credit or wallet balance anywhere in apps/api or the Prisma
 *     schema. Consultations are paid per booking like every other rail.
 *
 *   "Daily payouts at scale — once you cross ₹5,000 lifetime, payouts move
 *    from weekly to daily."
 *     No payout cadence of any kind exists. `PayoutRequest` is created BY THE
 *     PROVIDER and processed manually by an admin — the same rail
 *     become-priest.tsx already describes honestly, and the same one
 *     `lib/payout-gate.ts` gates on KYC. Neither "weekly" nor "daily" nor the
 *     ₹5,000 threshold is written anywhere.
 *
 *   "Aadhaar + qualification verified badge."
 *     Gated on `lib/pandit-vetting.ts` (`HAS_PANDIT_VETTING = false`, mirrored
 *     from apps/api and pinned by a test). Aadhaar is read as a PAYOUT gate,
 *     not published as a credential.
 *
 *   "Devotees pay 2-3× more for approved astrologers."
 *     A measurement no funnel in this product has ever taken — the same
 *     sentence shape as the "boosts donor conversion 3-4x" already removed
 *     from list-gaushala.tsx. Deleted rather than softened.
 *
 * The take rate is stated explicitly because become-priest.tsx states it and
 * the doctrine is uniform: 20% platform / 80% provider, every role.
 */
const BENEFITS = [
  {
    title: 'Per-minute consultations',
    body: 'Set your own per-minute rate — the floor is ₹1/min and a new profile starts at ₹10. You are paid per consultation; there is no free tier to talk your way out of.',
  },
  {
    title: 'Chat + video on Jitsi',
    body: 'Built-in chat and HD video calls — no Zoom links, no payment chase. We handle the plumbing.',
  },
  {
    title: 'You keep 80%',
    body: 'You keep 80% of every consultation — Darshya takes 20%, the same rate for every provider on the platform. Once your Aadhaar and bank details are verified, request a payout from your dashboard and we transfer it manually while our automated bank rail is being set up.',
  },
  {
    title: 'A profile devotees can judge',
    body: 'Your specialisation, languages, experience and per-minute rate are on one page, next to your reviews. Aadhaar is checked before you are paid; it is a payout gate, not a public badge.',
  },
];

const ASTROLOGY_TYPES = [
  { value: 'vedic', label: 'Vedic / Jyotish' },
  { value: 'tarot', label: 'Tarot' },
  { value: 'numerology', label: 'Numerology' },
  { value: 'palmistry', label: 'Palmistry' },
  { value: 'other', label: 'Other' },
];

export default function BecomeAstrologerScreen() {
  return (
    <OnboardScreen
      role="ASTROLOGER"
      eyebrow="For Astrologers"
      title="Consult devotees online — earn per minute"
      subtitle={`Bring your jyotish practice to Darshya. Vedic, tarot, numerology, palmistry — set your rate and work your hours. We are early: you would be joining a small group of ${verifiedNoun('astrologers')}, not a crowd.`}
      benefits={BENEFITS}
      ctaLabel="Apply to become a Darshya astrologer"
      renderExtras={(extras, setExtra) => (
        <>
          <ExtraSelectField
            label="Astrology type"
            required
            options={ASTROLOGY_TYPES}
            value={(extras.astrologyType as string) ?? ''}
            onChange={(v) => setExtra('astrologyType', v)}
          />
          <ExtraTextField
            name="yearsExperience"
            label="Years of experience"
            placeholder="e.g. 8"
            keyboardType="numeric"
            value={(extras.yearsExperience as string) ?? ''}
            onChange={(v) => setExtra('yearsExperience', v)}
          />
        </>
      )}
    />
  );
}
