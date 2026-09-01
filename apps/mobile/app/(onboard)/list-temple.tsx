import { OnboardScreen, ExtraTextField } from './_form';
import { HAS_80G } from '../../lib/eighty-g';

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
    title: HAS_80G ? '80G donation receipts' : 'Instant donation receipts',
    body: HAS_80G
      ? 'If your trust is 80G-registered, devotees can donate online and receive instant tax receipts.'
      : 'Devotees donate online and receive a numbered receipt PDF by email. It is proof of payment, not a tax-exemption certificate — Darshya cannot issue 80G documents yet.',
  },
  {
    title: 'Analytics + devotee CRM',
    body: 'See who watched, who booked, who donated. Send festival nudges to repeat devotees.',
  },
];

export default function ListTempleScreen() {
  return (
    <OnboardScreen
      role="TEMPLE"
      eyebrow="For Temple Trusts"
      title="Reach 10,000+ devotees on Darshya"
      subtitle={`List your temple in minutes. Take live darshan, puja bookings and ${HAS_80G ? '80G donations' : 'donations'} online — with transparent payouts.`}
      benefits={BENEFITS}
      ctaLabel="Apply to list my temple"
      renderExtras={(extras, setExtra) => (
        <>
          <ExtraTextField
            name="templeName"
            label="Temple name"
            required
            placeholder="e.g. Shri Kashi Vishwanath Mandir"
            value={(extras.templeName as string) ?? ''}
            onChange={(v) => setExtra('templeName', v)}
          />
          <ExtraTextField
            name="deity"
            label="Primary deity"
            required
            placeholder="e.g. Shiva"
            value={(extras.deity as string) ?? ''}
            onChange={(v) => setExtra('deity', v)}
          />
        </>
      )}
    />
  );
}
