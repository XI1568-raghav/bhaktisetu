import { PortalPlaceholder } from '../../lib/portal-placeholder';

export default function AstrologerDashboard() {
  return (
    <PortalPlaceholder
      title="Astrologer Portal"
      subtitle="Consultations, availability, and earnings"
      iconName="star"
      accentColor="#0891B2"
      upcomingFeatures={[
        'Upcoming consultations & earnings',
        'Chat & call session history',
        'Weekly availability scheduler',
        'Specializations & rate per minute',
      ]}
    />
  );
}
