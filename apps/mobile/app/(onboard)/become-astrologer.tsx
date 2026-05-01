import { OnboardScreen, ExtraTextField, ExtraSelectField } from './_form';

const BENEFITS = [
  {
    title: 'Per-minute consultations',
    body: 'Set your own rate from ₹10/min. Devotees pre-pay credits, you only ever talk to paid users.',
  },
  {
    title: 'Chat + video on Jitsi',
    body: 'Built-in chat and HD video calls — no Zoom links, no payment chase. We handle the plumbing.',
  },
  {
    title: 'Daily payouts at scale',
    body: 'Once you cross ₹5,000 lifetime, payouts move from weekly to daily. Earn while you sleep.',
  },
  {
    title: 'Verified profile builds trust',
    body: 'Aadhaar + qualification verified badge. Devotees pay 2-3× more for verified astrologers.',
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
      subtitle="Bring your jyotish practice to Darshya. Vedic, tarot, numerology, palmistry — set your rate, work your hours, get paid daily."
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
