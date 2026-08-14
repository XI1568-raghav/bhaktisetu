import type { Metadata } from 'next';
import SelfOnboardPageShell from '../../components/SelfOnboardPageShell';
import SelfOnboardForm, { ExtraInput } from '../../components/SelfOnboardForm';


export const metadata: Metadata = {
  alternates: { canonical: 'https://darshya.online/list-temple' },
  title: 'List your temple',
  description:
    'Bring your temple online. Live darshan, puja bookings, devotee donations and 80G receipts — all on Darshya.',
};

const BENEFITS = [
  {
    title: 'Live darshan to 10,000+ devotees',
    body: 'Stream daily aarti and special pujas to a verified devotee audience across India and the diaspora.',
  },
  {
    title: 'Online puja bookings',
    body: 'Devotees book pujas at your temple with full sankalp + video proof. Settlements within 7 days.',
  },
  {
    title: '80G donation receipts',
    body: 'If your trust is 80G-registered, devotees can donate online and receive instant tax receipts.',
  },
  {
    title: 'Analytics + devotee CRM',
    body: 'See who watched, who booked, who donated. Send festival nudges to repeat devotees.',
  },
];

export default function ListTemplePage() {
  return (
    <SelfOnboardPageShell
      eyebrow="For Temple Trusts"
      title="Reach 10,000+ devotees on Darshya"
      subtitle="List your temple in minutes. Take live darshan, puja bookings and 80G donations online — with verified devotees and transparent payouts."
      benefits={BENEFITS}
      formCard={
        <SelfOnboardForm
          role="TEMPLE"
          ctaLabel="Apply to list my temple"
          extraFields={
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ExtraInput name="templeName" label="Temple name" required placeholder="e.g. Shri Kashi Vishwanath Mandir" />
              <ExtraInput name="deity" label="Primary deity" required placeholder="e.g. Shiva" />
            </div>
          }
        />
      }
    />
  );
}
