import type { Metadata } from 'next';
import SelfOnboardPageShell from '../../components/SelfOnboardPageShell';
import SelfOnboardForm, { ExtraInput, ExtraSelect } from '../../components/SelfOnboardForm';


export const metadata: Metadata = {
  title: 'Teach yoga & meditation on Darshya',
  description:
    'Host live yoga, meditation, pranayama and vipassana sessions for Darshya devotees. Get paid per session.',
};

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

export default function BecomeWellnessPage() {
  return (
    <SelfOnboardPageShell
      eyebrow="For Wellness Instructors"
      title="Teach yoga & meditation to verified devotees"
      subtitle="Bring your yoga, pranayama or meditation practice online. Live group sessions, fair payouts, devotees who actually show up."
      benefits={BENEFITS}
      formCard={
        <SelfOnboardForm
          role="WELLNESS_INSTRUCTOR"
          ctaLabel="Apply to teach on Darshya"
          extraFields={
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ExtraSelect
                name="sessionType"
                label="Primary session type"
                required
                options={[
                  { value: 'yoga', label: 'Yoga' },
                  { value: 'meditation', label: 'Meditation' },
                  { value: 'pranayama', label: 'Pranayama' },
                  { value: 'vipassana', label: 'Vipassana' },
                  { value: 'other', label: 'Other' },
                ]}
              />
              <ExtraInput
                name="certifications"
                label="Certifications (optional)"
                placeholder="e.g. RYT 500, Bihar School of Yoga"
              />
            </div>
          }
        />
      }
    />
  );
}
