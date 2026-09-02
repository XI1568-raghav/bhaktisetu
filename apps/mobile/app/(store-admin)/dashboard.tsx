import React, { useState } from 'react';
import { View } from 'react-native';
import { useProducts, useStoreAdminDashboard } from '@poojly/api-client';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { MessagesEntry } from '../../lib/inbox';
import { colors, spacing } from '../../lib/theme';
import { storeOrderStatusLabel } from '../../lib/enum-labels';

import { useExitConfirm } from '../../lib/use-exit-confirm';
function inr(v: number | undefined): string {
  return `₹${(v ?? 0).toLocaleString('en-IN')}`;
}

export default function StoreDashboard() {
  // Android: guard the app's exit point. This screen is a stack root
  // (index.tsx router.replace()s here), so back would otherwise quit
  // outright with no confirmation. No-op on iOS.
  useExitConfirm();

  const productsQuery = useProducts();
  const dashboardQuery = useStoreAdminDashboard();
  const [refreshing, setRefreshing] = useState(false);

  const products = productsQuery.data?.products ?? [];
  const productCount = products.length;
  const stats = dashboardQuery.data?.stats ?? {};
  const recentOrders = dashboardQuery.data?.recentOrders ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([productsQuery.refetch(), dashboardQuery.refetch()]);
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Store Dashboard"
      subtitle={`${productCount} products in catalogue`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={{ flexDirection: 'row' }}>
        <StatCard
          label="Today Sales"
          value={inr(stats.todaySales)}
          accent={colors.green[600]}
        />
        <View style={{ width: spacing.sm }} />
        <StatCard label="Orders" value={stats.todayOrders ?? 0} hint="today" />
      </View>
      <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
        <StatCard label="This Month" value={inr(stats.monthSales)} />
        <View style={{ width: spacing.sm }} />
        <StatCard
          label="Low Stock"
          value={stats.lowStock ?? 0}
          hint="items"
          accent={colors.red[600]}
        />
      </View>

      <Section title="Messages">
        <MessagesEntry roleGroup="store-admin" />
      </Section>

      <Section title="Recent Orders">
        {dashboardQuery.isLoading ? (
          <EmptyHint text="Loading orders…" />
        ) : recentOrders.length === 0 ? (
          <EmptyHint text="No paid orders yet." />
        ) : (
          recentOrders.slice(0, 5).map((o) => (
            <ListRow
              key={o.id}
              primary={`${o.id} • ${o.customer ?? 'Customer'}`}
              secondary={storeOrderStatusLabel(o.status)}
              trailing={inr(o.amount)}
            />
          ))
        )}
      </Section>

      <Section title="Catalogue Snapshot">
        {productCount === 0 ? (
          <EmptyHint text="No products yet — add some via Products tab." />
        ) : (
          products.slice(0, 5).map((p) => (
            <ListRow
              key={p.id}
              primary={p.title ?? 'Product'}
              secondary={p.handle ?? ''}
              trailing={`#${p.id.slice(0, 6)}`}
            />
          ))
        )}
      </Section>
    </PortalScreen>
  );
}
