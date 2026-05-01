import { OnboardScreen, ExtraTextField, ExtraCheckboxField } from './_form';

const BENEFITS = [
  {
    title: 'Online donations, instant receipts',
    body: 'Devotees donate via Razorpay. 80G PDF receipts auto-emailed within 60 seconds.',
  },
  {
    title: 'Verified-gaushala badge',
    body: 'Submit registration + 80G certificate once. Verified badge boosts donor conversion 3-4x.',
  },
  {
    title: 'Cow-count + photo proof',
    body: 'Show the cows your donors are feeding. Monthly photos build long-term donor loyalty.',
  },
  {
    title: 'Recurring monthly seva',
    body: 'Devotees can subscribe to Rs.500/month "feed a cow" plans. Predictable income for the gaushala.',
  },
];

export default function ListGaushalaScreen() {
  return (
    <OnboardScreen
      role="GAUSHALA"
      eyebrow="For Gaushalas"
      title="Receive cow-seva donations from devotees worldwide"
      subtitle="List your gaushala on Darshya. 80G receipts, monthly subscriptions, and a transparent donor dashboard — built for trust."
      benefits={BENEFITS}
      ctaLabel="Apply to list my gaushala"
      renderExtras={(extras, setExtra) => (
        <>
          <ExtraTextField
            name="gaushalaName"
            label="Gaushala name"
            required
            placeholder="e.g. Shri Krishna Gaushala"
            value={(extras.gaushalaName as string) ?? ''}
            onChange={(v) => setExtra('gaushalaName', v)}
          />
          <ExtraTextField
            name="cowCount"
            label="Approx cow count"
            required
            placeholder="e.g. 120"
            keyboardType="numeric"
            value={(extras.cowCount as string) ?? ''}
            onChange={(v) => setExtra('cowCount', v)}
          />
          <ExtraCheckboxField
            label="Our trust is 80G-registered (we'll verify)"
            value={extras.has80G === true}
            onChange={(v) => setExtra('has80G', v)}
          />
        </>
      )}
    />
  );
}
