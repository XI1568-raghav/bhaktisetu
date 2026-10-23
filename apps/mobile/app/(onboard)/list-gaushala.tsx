import { OnboardScreen, ExtraTextField, ExtraCheckboxField } from './_form';
import { HAS_80G } from '../../lib/eighty-g';

const BENEFITS = [
  {
    title: 'Online donations, instant receipts',
    body: `Devotees donate via Razorpay. ${HAS_80G ? '80G PDF receipts' : 'Numbered PDF receipts'} auto-emailed within 60 seconds.`,
  },
  {
    // TC-11 / TC-08: "Verified-gaushala badge" named a credential nothing
    // awards — GaushalaProfile.verified exists in the schema and no route
    // writes it (admin.service.ts approves by setting `approved`, and the only
    // `verified: true` in apps/api is a mock fixture in provider.service.ts).
    // "boosts donor conversion 3-4x" is a measurement no funnel in the product
    // has ever taken. Both are replaced by the review step that does run.
    title: 'Live once your profile is complete',
    body: 'Submit your registration certificate once. Donors see the listing once it passes our minimum profile checks (name, description and a full address).',
  },
  {
    title: 'Cow-count + photos',
    body: 'Record the cows in your care on your profile. Photo updates for donors are coming soon.',
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
      subtitle={`List your gaushala on Darshya. ${HAS_80G ? '80G receipts' : 'Numbered donation receipts'}, monthly subscriptions, and a transparent donor dashboard — built for trust.`}
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
