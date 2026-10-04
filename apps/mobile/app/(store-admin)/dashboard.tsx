import React, { useState } from 'react';
import { View } from 'react-native';
import { useStoreAdminDashboard } from '@poojly/api-client';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { MessagesEntry } from '../../lib/inbox';
import {
  selectStoreAdminProducts,
  useStoreAdminProducts,
} from '../../lib/store-admin-catalogue';
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

  // PAR-24: was useProducts() = GET /api/v1/store/products, the PUBLIC
  // storefront served off a hardcoded seed array. The "Catalogue Snapshot"
  // listed demo products the owner has never sold and the header counted them
  // as theirs. Now the role-gated /store-admin/products.
  const productsQuery = useStoreAdminProducts();
  const dashboardQuery = useStoreAdminDashboard();
  const [refreshing, setRefreshing] = useState(false);

  const catalogue = selectStoreAdminProducts(productsQuery.data);
  const products = catalogue?.rows ?? [];
  // `null` = catalogue unknown (403 / error body), which is not zero products.
  const catalogueUnknown = !productsQuery.isLoading && catalogue === null;
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
      subtitle={
        productsQuery.isLoading
          ? 'Loading…'
          : catalogueUnknown
            ? 'Catalogue unavailable'
            : `${catalogue?.total ?? 0} products in catalogue`
      }
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
        {productsQuery.isLoading ? (
          <EmptyHint text="Loading your catalogue…" />
        ) : catalogueUnknown ? (
          <EmptyHint text="Could not load your catalogue. Pull to refresh — this is not a report that you have no products." />
        ) : products.length === 0 ? (
          <EmptyHint text="No products yet — add some via the Products tab." />
        ) : (
          products.slice(0, 5).map((p) => (
            <ListRow
              key={p.id}
              primary={p.name}
              secondary={[p.sku, p.categoryName].filter(Boolean).join(' • ')}
              // A Decimal that did not parse shows a dash. `inr(undefined)`
              // would print ₹0, a claim about what the shop charges.
              trailing={p.priceInr === null ? '—' : inr(p.priceInr)}
              trailingHint={`Stock ${p.stock}`}
            />
          ))
        )}
      </Section>
    </PortalScreen>
  );
}
