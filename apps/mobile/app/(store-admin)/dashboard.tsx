import { PortalPlaceholder } from '../../lib/portal-placeholder';

export default function StoreAdminDashboard() {
  return (
    <PortalPlaceholder
      title="Store Admin"
      subtitle="Manage products, orders, and revenue"
      iconName="storefront"
      accentColor="#7C3AED"
      upcomingFeatures={[
        'Sales overview & low-stock alerts',
        'Product CRUD',
        'Order fulfilment queue',
        'Review moderation',
        'Revenue analytics',
      ]}
    />
  );
}
