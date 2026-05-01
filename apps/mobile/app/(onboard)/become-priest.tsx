import { OnboardScreen, ExtraTextField } from './_form';

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

export default function BecomePriestScreen() {
  return (
    <OnboardScreen
      role="PRIEST"
      eyebrow="For Pandits"
      title="Earn from your dharma — online and offline"
      subtitle="Join 200+ verified pandits performing pujas for Darshya devotees. Book in minutes, get paid weekly, build a permanent online reputation."
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
