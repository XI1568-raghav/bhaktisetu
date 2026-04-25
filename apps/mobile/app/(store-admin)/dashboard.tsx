import React, { useState } from 'react';
import { View } from 'react-native';
import { useProducts } from '@poojly/api-client';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { colors, spacing } from '../../lib/theme';

const FALLBACK_STATS = {
  todaySales: 12450,
  todayOrders: 8,
  monthSales: 245600,
  lowStock: 3,
};

export default function StoreDashboard() {
  const productsQuery = useProducts();
  const [refreshing, setRefreshing] = useState(false);

  const products = productsQuery.data?.products ?? [];
  const productCount = products.length;

  async function onRefresh() {
    setRefreshing(true);
    await productsQuery.refetch();
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
          value={`₹${FALLBACK_STATS.todaySales.toLocaleString('en-IN')}`}
          accent={colors.green[600]}
        />
        <View style={{ width: spacing.sm }} />
        <StatCard label="Orders" value={FALLBACK_STATS.todayOrders} hint="today" />
      </View>
      <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
        <StatCard
          label="This Month"
          value={`₹${FALLBACK_STATS.monthSales.toLocaleString('en-IN')}`}
        />
        <View style={{ width: spacing.sm }} />
        <StatCard
          label="Low Stock"
          value={FALLBACK_STATS.lowStock}
          hint="items"
          accent={colors.red[600]}
        />
      </View>

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
