import { PortalPlaceholder } from '../../lib/portal-placeholder';

export default function PriestDashboard() {
  return (
    <PortalPlaceholder
      title="Priest Portal"
      subtitle="Manage your bookings, services, and payouts"
      iconName="person"
      accentColor="#EA580C"
      upcomingFeatures={[
        "Today's bookings & earnings",
        'Booking management with status updates',
        'Puja services catalogue',
        'Devotee reviews & ratings',
        'Payout history',
        'Profile & verification',
      ]}
    />
  );
}
