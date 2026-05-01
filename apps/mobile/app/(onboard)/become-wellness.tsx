import { OnboardScreen, ExtraTextField, ExtraSelectField } from './_form';

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
    title: 'Built-in audience',
    body: 'Listed on /wellness next to verified astrologers and pandits. Curated audience that already pays.',
  },
  {
    title: 'Recordings + reviews',
    body: 'Sessions can be recorded and resold. Verified reviews build a long-tail revenue stream.',
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
