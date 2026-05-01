import type { Metadata } from 'next';
import SelfOnboardPageShell from '../../components/SelfOnboardPageShell';
import SelfOnboardForm, { ExtraInput } from '../../components/SelfOnboardForm';

export const runtime = 'edge';

export const metadata: Metadata = {
  title: 'Become a Darshya pandit',
  description:
    'Perform online pujas, ask-pandit consultations and earn weekly payouts. Verified pandits only.',
};

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
    title: 'Weekly payouts',
    body: 'Earn 60-80% of every booking. Money in your bank account every Monday after Aadhaar verification.',
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
      subtitle="Join 200+ verified pandits performing pujas for Darshya devotees. Book in minutes, get paid weekly, build a permanent online reputation."
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
