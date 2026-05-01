import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useStoreOrders, useUpdateStoreOrderStatus } from '@poojly/api-client';
import { PortalScreen, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface Order {
  id: string;
  orderNumber?: string;
  number?: string;
  customerName?: string;
  customer?: string;
  itemCount?: number;
  items?: number;
  totalAmount?: number | string;
  amount?: number | string;
  status: string;
  createdAt?: string;
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_OPTIONS = ['pending', 'packed', 'shipped', 'delivered', 'cancelled'];

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('cancel')) return colors.red[600];
  if (s.includes('deliver')) return colors.green[600];
  if (s.includes('ship')) return colors.stone[600];
  if (s.includes('pack')) return colors.saffron[600];
  return colors.amber[600];
}

export default function StoreOrders() {
  const ordersQuery = useStoreOrders();
  const updateStatus = useUpdateStoreOrderStatus();
  const [filter, setFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const orders = (ordersQuery.data?.data as Order[] | undefined) ?? [];
  const filtered =
    filter === 'all'
      ? orders
      : orders.filter((o) => String(o.status).toLowerCase() === filter);

  async function onRefresh() {
    setRefreshing(true);
    await ordersQuery.refetch();
    setRefreshing(false);
  }

  function handleChangeStatus(order: Order) {
    const buttons = STATUS_OPTIONS.map((s) => ({
      text: s.charAt(0).toUpperCase() + s.slice(1),
      onPress: async () => {
        try {
          await updateStatus.mutateAsync({ id: order.id, status: s });
        } catch (err) {
          Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update');
        }
      },
    }));
    Alert.alert('Update status', `Order ${order.orderNumber ?? order.number ?? order.id}`, [
      ...buttons,
      { text: 'Dismiss', style: 'cancel' },
    ]);
  }

  const pendingCount = orders.filter((o) => String(o.status).toLowerCase() === 'pending').length;

  return (
    <PortalScreen
      title="Orders"
      subtitle={`${orders.length} total • ${pendingCount} pending`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {ordersQuery.isError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Could not load orders:{' '}
            {ordersQuery.error instanceof Error ? ordersQuery.error.message : 'Unknown error'}
          </Text>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {ordersQuery.isLoading ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : filtered.length === 0 ? (
        <EmptyHint text="No orders match this filter." />
      ) : (
        filtered.map((o) => {
          const number = o.orderNumber ?? o.number ?? o.id;
          const customer = o.customerName ?? o.customer ?? 'Customer';
          const itemCount = o.itemCount ?? o.items ?? 0;
          const amount = Number(o.totalAmount ?? o.amount ?? 0);
          return (
            <View key={o.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardPrimary}>
                    {number} • {customer}
                  </Text>
                  <Text style={styles.cardSecondary}>
                    {itemCount} item{itemCount === 1 ? '' : 's'}
                    {o.createdAt ? ` • ${new Date(o.createdAt).toLocaleDateString('en-IN')}` : ''}
                  </Text>
                </View>
                <View
                  style={[
                    styles.pill,
                    { backgroundColor: `${statusColor(o.status)}1A`, borderColor: statusColor(o.status) },
                  ]}
                >
                  <Text style={[styles.pillText, { color: statusColor(o.status) }]}>{o.status}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.amount}>₹{amount.toLocaleString('en-IN')}</Text>
                <TouchableOpacity
                  style={styles.statusBtn}
                  onPress={() => handleChangeStatus(o)}
                  activeOpacity={0.8}
                  disabled={updateStatus.isPending}
                >
                  <Text style={styles.statusBtnText}>
                    {updateStatus.isPending ? 'Updating...' : 'Change status'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.stone[100],
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.saffron[600] },
  chipText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.stone[600] },
  chipTextActive: { color: colors.white },
  loading: { textAlign: 'center', padding: spacing.lg, color: colors.stone[500] },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: colors.red[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: { color: colors.red[600], fontSize: fontSize.sm },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    marginBottom: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardPrimary: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  cardSecondary: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginLeft: spacing.sm,
  },
  pillText: { fontSize: fontSize.xs, fontWeight: '700' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  amount: { fontSize: fontSize.base, fontWeight: '700', color: colors.saffron[700] },
  statusBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.saffron[600],
    backgroundColor: colors.white,
  },
  statusBtnText: { color: colors.saffron[700], fontSize: fontSize.sm, fontWeight: '700' },
});
