import type { Metadata } from 'next';
import SelfOnboardPageShell from '../../components/SelfOnboardPageShell';
import SelfOnboardForm, { ExtraInput, ExtraSelect } from '../../components/SelfOnboardForm';


export const metadata: Metadata = {
  title: 'Become a Darshya astrologer',
  description:
    'Take per-minute consultations on Darshya — kundli, muhurat, gemstone and tarot. Verified astrologers only.',
};

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

export default function BecomeAstrologerPage() {
  return (
    <SelfOnboardPageShell
      eyebrow="For Astrologers"
      title="Consult devotees online — earn per minute"
      subtitle="Bring your jyotish practice to Darshya. Vedic, tarot, numerology, palmistry — set your rate, work your hours, get paid daily."
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
