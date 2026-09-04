import { OnboardScreen, ExtraTextField } from './_form';
import { verifiedNoun } from '../../lib/pandit-vetting';

/**
 * TC-08 (P1, trust) — the mobile copy of the pandit recruitment page.
 *
 * `apps/web/app/become-priest/page.tsx` was corrected in an earlier wave and
 * pinned by `apps/web/__tests__/supply-page-claims.test.ts`. That test walks
 * `apps/web`, so this screen — the same pitch, to the same pandit, in the app
 * he is more likely to be reading it in — kept the original text:
 *
 *   subtitle  "Join 200+ verified pandits performing pujas for Darshya devotees."
 *   benefit   "Weekly payouts … Money in your bank account every Monday
 *              after Aadhaar verification." / "Earn 60-80% of every booking."
 *
 * Measured on production on 2026-09-01:
 *
 *   $ curl -s 'https://api.darshya.online/api/v1/priests?limit=100' \
 *       | python -c "import sys,json;print(len(json.load(sys.stdin)['priests']))"
 *   3
 *
 * Three, not 200+, and all three are seed rows: `Priest.isVerified` is written
 * only by `apps/api/prisma/seed.ts` and `apps/api/scripts/seed-demo-users.ts`,
 * and `routes/priests-public.ts` filters the directory on that column. The
 * "verified" adjective is gated on `lib/pandit-vetting.ts`; the headcount is
 * removed rather than gated, because no code counts it.
 *
 * The payout wording is aligned with the web page's corrected text — uniform
 * 80% provider share, manual transfer on request — so a pandit cannot be
 * recruited on two different promises depending on which client he opened.
 */

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

export default function BecomePriestScreen() {
  return (
    <OnboardScreen
      role="PRIEST"
      eyebrow="For Pandits"
      title="Earn from your dharma — online and offline"
      subtitle={`Perform pujas for Darshya devotees, keep 80% of every booking, and build a permanent online reputation backed by video proof of every ritual. We are early — you would be joining a small group of ${verifiedNoun('pandits')}, not a crowd.`}
      benefits={BENEFITS}
      ctaLabel="Apply to become a Darshya pandit"
      renderExtras={(extras, setExtra) => (
        <>
          <ExtraTextField
            name="yearsExperience"
            label="Years of experience"
            required
            placeholder="e.g. 12"
            keyboardType="numeric"
            value={(extras.yearsExperience as string) ?? ''}
            onChange={(v) => setExtra('yearsExperience', v)}
          />
          <ExtraTextField
            name="specialties"
            label="Specialties"
            required
            placeholder="e.g. Rudrabhishek, Satyanarayan, Graha Shanti"
            value={(extras.specialties as string) ?? ''}
            onChange={(v) => setExtra('specialties', v)}
          />
        </>
      )}
    />
  );
}
