import { PortalPlaceholder } from '../../lib/portal-placeholder';

export default function TempleDashboard() {
  return (
    <PortalPlaceholder
      title="Temple Portal"
      subtitle="Darshan streams, pujas, and donations"
      iconName="home"
      accentColor="#B91C1C"
      upcomingFeatures={[
        'Daily darshan viewers & puja bookings',
        'AWS IVS stream controls (web only initially)',
        'Puja type catalogue with priest assignment',
        'Chadhava and cash donation ledger',
      ]}
    />
  );
}
