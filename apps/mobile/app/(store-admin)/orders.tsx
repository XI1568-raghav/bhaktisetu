import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { ApiClientError, useStoreOrders, useUpdateStoreOrderStatus } from '@poojly/api-client';
import { PortalScreen, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { storeOrderStatusLabel } from '../../lib/enum-labels';

/**
 * PAR-24. Three contract defects on one screen.
 *
 * 1. "Change status" sent LOWERCASE values ('pending' | 'packed' | 'shipped' |
 *    'delivered' | 'cancelled') to PATCH /api/v1/store/orders/:id/status, whose
 *    body is `z.enum(['PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED',
 *    'CANCELLED','REFUNDED'])` (store-orders.ts:53). Zod does not coerce case,
 *    so EVERY status change 400'd and the owner saw a generic "Failed to
 *    update". 'packed' was not a member at all — the warehouse state is
 *    PROCESSING, which enum-labels renders as "Packing".
 * 2. The server also enforces a transition table (store-orders.ts:418) and 409s
 *    anything else, with terminal DELIVERED/CANCELLED/REFUNDED. The old menu
 *    offered all five values from every state, so most taps were rejected. The
 *    menu is now exactly the legal next states for THIS order; an order in a
 *    terminal state gets no button rather than one that always fails.
 * 3. `itemCount = o.itemCount ?? o.items ?? 0` — serializeOrder sends no
 *    `itemCount` and `items` is an ARRAY of line objects, so this put an array
 *    of objects inside <Text>, which throws "Objects are not valid as a React
 *    child" and blanks the screen for any owner with at least one order. The
 *    local interface typed `items?: number`, so tsc agreed.
 *
 * Filters were lowercase too and compared against a lowercased status, so
 * 'packed' matched nothing ever and CONFIRMED / PROCESSING / REFUNDED orders
 * were invisible under every filter except All.
 */
interface OrderItem {
  productId?: string;
  name?: string;
  quantity?: number;
}

interface Order {
  id: string;
  orderNumber?: string;
  customerName?: string;
  /** serializeOrder always sends the line array; never a count. */
  items?: OrderItem[];
  totalAmount?: number | string;
  status: string;
  createdAt?: string;
}

/** apps/api/src/routes/store-orders.ts:53 — the exact enum, uppercase. */
const STORE_ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const;

type StoreOrderStatus = (typeof STORE_ORDER_STATUSES)[number];

/**
 * Mirrors ALLOWED_TRANSITIONS in apps/api/src/routes/store-orders.ts:418.
 * Kept identical so the app never offers a move the server will 409.
 */
const ALLOWED_TRANSITIONS: Readonly<Record<StoreOrderStatus, StoreOrderStatus[]>> =
  Object.freeze({
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PROCESSING', 'SHIPPED', 'CANCELLED'],
    PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
    REFUNDED: [],
  });

function nextStatuses(current: string): StoreOrderStatus[] {
  const key = String(current).toUpperCase() as StoreOrderStatus;
  return ALLOWED_TRANSITIONS[key] ?? [];
}

const FILTERS: { key: 'ALL' | StoreOrderStatus; label: string }[] = [
  { key: 'ALL', label: 'All' },
  ...STORE_ORDER_STATUSES.map((s) => ({
    key: s,
    label: storeOrderStatusLabel(s),
  })),
];

function statusColor(status: string): string {
  switch (String(status).toUpperCase()) {
    case 'CANCELLED':
    case 'REFUNDED':
      return colors.red[600];
    case 'DELIVERED':
      return colors.green[600];
    case 'SHIPPED':
      return colors.stone[600];
    case 'PROCESSING':
      return colors.saffron[600];
    default:
      return colors.amber[600];
  }
}

export default function StoreOrders() {
  const ordersQuery = useStoreOrders();
  const updateStatus = useUpdateStoreOrderStatus();
  const [filter, setFilter] = useState<'ALL' | StoreOrderStatus>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const orders = (ordersQuery.data?.data as Order[] | undefined) ?? [];
  const filtered =
    filter === 'ALL'
      ? orders
      : orders.filter((o) => String(o.status).toUpperCase() === filter);

  async function onRefresh() {
    setRefreshing(true);
    await ordersQuery.refetch();
    setRefreshing(false);
  }

  function handleChangeStatus(order: Order) {
    const options = nextStatuses(order.status);
    if (options.length === 0) return;
    const buttons = options.map((next) => ({
      text: storeOrderStatusLabel(next),
      onPress: async () => {
        try {
          await updateStatus.mutateAsync({ id: order.id, status: next });
        } catch (err) {
          // packages/api-client reads ApiClientError.message off
          // `data.error.message`; this route sends a flat `{error}` body, so
          // the message is always "Request failed with status N". Only the
          // status code survives, so say what each one means.
          const code = err instanceof ApiClientError ? err.statusCode : 0;
          Alert.alert(
            'Status not changed',
            code === 409
              ? `This order can no longer move to ${storeOrderStatusLabel(next)}.`
              : code === 403
                ? 'You do not have permission to change this order.'
                : code === 404
                  ? 'This order no longer exists. Pull down to refresh.'
                  : err instanceof Error
                    ? err.message
                    : 'Failed to update',
          );
        }
      },
    }));
    Alert.alert('Update status', `Order ${order.orderNumber ?? order.id}`, [
      ...buttons,
      { text: 'Dismiss', style: 'cancel' },
    ]);
  }

  const pendingCount = orders.filter(
    (o) => String(o.status).toUpperCase() === 'PENDING',
  ).length;

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
          const number = o.orderNumber ?? o.id;
          const customer = o.customerName ?? 'Customer';
          // `items` is the line array serializeOrder sends. Its LENGTH is the
          // item count; the array itself is not renderable.
          const itemCount = Array.isArray(o.items) ? o.items.length : 0;
          const amount = Number(o.totalAmount ?? 0);
          const moves = nextStatuses(o.status);
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
                  <Text style={[styles.pillText, { color: statusColor(o.status) }]}>{storeOrderStatusLabel(o.status)}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.amount}>₹{amount.toLocaleString('en-IN')}</Text>
                {/* A terminal order (DELIVERED / CANCELLED / REFUNDED) has no
                    legal next state, so it gets no button. Shipping one that
                    always answers 409 is worse than not shipping one. */}
                {moves.length === 0 ? (
                  <Text style={styles.terminalNote}>No further changes</Text>
                ) : (
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
                )}
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
  terminalNote: { color: colors.stone[500], fontSize: fontSize.sm, fontWeight: '600' },
});
