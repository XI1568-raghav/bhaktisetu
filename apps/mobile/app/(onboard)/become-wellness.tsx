import { OnboardScreen, ExtraTextField, ExtraSelectField } from './_form';
import { verifiedNoun } from '../../lib/pandit-vetting';

const BENEFITS = [
  {
    title: 'Host live group sessions',
    body: 'Run yoga, meditation and pranayama classes on Jitsi — devotees pay per session, you keep 80%.',
  },
  {
    title: 'Capacity-priced classes',
    body: 'Set your own price and capacity. We handle bookings, reminders and refunds.',
  },
  {
    // "verified astrologers and pandits" carried the adjective
    // lib/pandit-vetting.ts gates: nothing in apps/api promotes a provider to
    // verified outside two seed scripts, so the word is withheld until the
    // check exists. See become-priest.tsx for the same correction.
    title: 'Built-in audience',
    body: `Listed on the wellness tab beside the ${verifiedNoun('astrologers')} and pandits devotees already come here for.`,
  },
  {
    // WAS: "Sessions can be recorded and resold. Verified reviews build a
    // long-tail revenue stream." There is no recording column on
    // WellnessSession and no resale rail anywhere in apps/api — the only
    // "recordings" in the codebase are strings inside seed copy. An
    // instructor recruited on a revenue stream that does not exist is
    // recruited under false pretences, so the claim is replaced by the one
    // that does run.
    title: 'Reviews that follow you',
    body: 'Attendees review each session, and the rating stays on your profile — so a good class keeps earning you the next booking.',
  },
];

const SESSION_TYPES = [
  { value: 'yoga', label: 'Yoga' },
  { value: 'meditation', label: 'Meditation' },
  { value: 'pranayama', label: 'Pranayama' },
  { value: 'vipassana', label: 'Vipassana' },
  { value: 'other', label: 'Other' },
];

export default function BecomeWellnessScreen() {
  return (
    <OnboardScreen
      role="WELLNESS_INSTRUCTOR"
      eyebrow="For Wellness Instructors"
      title="Teach yoga & meditation to verified devotees"
      subtitle="Bring your yoga, pranayama or meditation practice online. Live group sessions, fair payouts, devotees who actually show up."
      benefits={BENEFITS}
      ctaLabel="Apply to teach on Darshya"
      renderExtras={(extras, setExtra) => (
        <>
          <ExtraSelectField
            label="Primary session type"
            required
            options={SESSION_TYPES}
            value={(extras.sessionType as string) ?? ''}
            onChange={(v) => setExtra('sessionType', v)}
          />
          <ExtraTextField
            name="certifications"
            label="Certifications (optional)"
            placeholder="e.g. RYT 500, Bihar School of Yoga"
            value={(extras.certifications as string) ?? ''}
            onChange={(v) => setExtra('certifications', v)}
          />
        </>
      )}
    />
  );
}
