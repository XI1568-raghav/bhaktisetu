import { PortalPlaceholder } from '../../lib/portal-placeholder';

export default function AdminDashboard() {
  return (
    <PortalPlaceholder
      title="Admin Portal"
      subtitle="Platform-wide control and analytics"
      iconName="shield-checkmark"
      accentColor="#1E293B"
      upcomingFeatures={[
        'Platform KPIs (bookings, GMV, active users)',
        'User table with role filter & impersonation',
        'Provider approval queue',
        'Support tickets',
        'Platform-wide revenue & commission breakdown',
        'Exportable analytics reports',
        'Settings & feature flags',
      ]}
    />
  );
}
