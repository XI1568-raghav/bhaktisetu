import { PortalPlaceholder } from '../../lib/portal-placeholder';

export default function GaushalaDashboard() {
  return (
    <PortalPlaceholder
      title="Gaushala Portal"
      subtitle="Cow welfare, donations, and volunteers"
      iconName="paw"
      accentColor="#92400E"
      upcomingFeatures={[
        'Cow count & monthly donation total',
        'Cow-feeding & adoption donations ledger',
        'Individual cow registry with health status',
        'Volunteer roster & shift scheduling',
      ]}
    />
  );
}
