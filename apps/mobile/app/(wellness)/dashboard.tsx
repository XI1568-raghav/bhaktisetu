import { PortalPlaceholder } from '../../lib/portal-placeholder';

export default function WellnessDashboard() {
  return (
    <PortalPlaceholder
      title="Wellness Portal"
      subtitle="Sessions, students, and instructor profile"
      iconName="leaf"
      accentColor="#16A34A"
      upcomingFeatures={[
        'Session count & student roster size',
        'Yoga / meditation / vipassana class list',
        'Enrolled student progress',
        'Certifications & offering types',
      ]}
    />
  );
}
