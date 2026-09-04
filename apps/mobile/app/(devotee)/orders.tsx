import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStoreOrders } from '@poojly/api-client';
import { useAuth } from '../../lib/auth-context';
import { formatInr, toNumber } from '../../lib/api-contracts';
import { humanizeEnum } from '../../lib/enum-labels';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * Store order history — the other half of "no store order can be completed".
 *
 * An order the buyer cannot look up afterwards is barely an order: no status,
 * no tracking number, no way to tell whether the parcel is coming. The web has
 * had this page since S-03; the app had nothing, and the Alert-based cart it
 * replaced ended with "Checkout is on the web store for now."
 *
 *   GET /api/v1/store/orders   (routes/store-orders.ts:322)
 *
 * via `useStoreOrders()` from @poojly/api-client, which owns the
 * `["storeOrders"]` query key that checkout.tsx invalidates on a successful
 * placement — so an order appears here the moment it is placed, without this
 * screen knowing anything about checkout.
 *
 * THE SHAPE, READ AS THE SERVER ACTUALLY SENDS IT
 * -----------------------------------------------
 * `{data: [...]}`, each row already enriched by `serializeOrder`
 * (store-orders.ts:118-159): `totalAmount` as a number, `items[].name` resolved
 * from the product table, `items[].quantity` normalised from `qty`, and
 * `subtotalInr` / `deliveryFeeInr` DERIVED (StoreOrder has no fee columns —
 * total minus subtotal is the fee, for legacy rows too). Nothing here
 * recomputes any of that: the charged number is the server's, and a second
 * opinion on this screen is exactly how a display total drifts from a charge.
 * A field that is missing renders as absent, never as zero.
 */

interface OrderItemVM {
  productId: string;
  name: string;
  quantity: number;
  priceAtPurchaseInr: number | null;
}

interface StoreOrderVM {
  id: string;
  orderNumber: string | null;
  status: string;
  createdAt: string | null;
  totalInr: number | null;
  subtotalInr: number | null;
  deliveryFeeInr: number | null;
  trackingNumber: string | null;
  items: OrderItemVM[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

export function selectStoreOrders(payload: unknown): StoreOrderVM[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) return [];
  return payload.data
    .filter(isRecord)
    .map((row): StoreOrderVM | null => {
      const id = str(row.id);
      if (id === null) return null;
      const items = (Array.isArray(row.items) ? row.items : [])
        .filter(isRecord)
        .map((it): OrderItemVM => ({
          productId: str(it.productId) ?? '',
          name: str(it.name) ?? 'Item',
          // serializeOrder normalises `qty` into `quantity`; older rows may
          // carry only `qty`.
          quantity: toNumber(it.quantity) ?? toNumber(it.qty) ?? 1,
          priceAtPurchaseInr: toNumber(it.priceAtPurchase),
        }));
      return {
        id,
        orderNumber: str(row.orderNumber),
        status: str(row.status) ?? 'PENDING',
        createdAt: str(row.createdAt),
        totalInr: toNumber(row.totalAmount),
        subtotalInr: toNumber(row.subtotalInr),
        deliveryFeeInr: toNumber(row.deliveryFeeInr),
        trackingNumber: str(row.trackingNumber),
        items,
      };
    })
    .filter((o): o is StoreOrderVM => o !== null);
}

/** Mirrors apps/web/app/store/orders/page.tsx so both surfaces say the same word. */
const STATUS_META: Record<
  string,
  { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; tint: string; bg: string }
> = {
  PENDING: { label: 'Payment pending', icon: 'time-outline', tint: colors.amber[700], bg: colors.amber[50] },
  CONFIRMED: { label: 'Confirmed', icon: 'checkmark-circle-outline', tint: colors.stone[700], bg: colors.stone[100] },
  PROCESSING: { label: 'Packing', icon: 'cube-outline', tint: colors.stone[700], bg: colors.stone[100] },
  SHIPPED: { label: 'Shipped', icon: 'car-outline', tint: colors.saffron[700], bg: colors.saffron[50] },
  DELIVERED: { label: 'Delivered', icon: 'checkmark-done-outline', tint: colors.green[700], bg: colors.green[50] },
  CANCELLED: { label: 'Cancelled', icon: 'close-circle-outline', tint: colors.red[600], bg: '#FEF2F2' },
  REFUNDED: { label: 'Refunded', icon: 'refresh-outline', tint: colors.stone[600], bg: colors.stone[100] },
};

function formatOrderDate(iso: string | null): string | null {
  if (iso === null) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function OrderCard({ order }: { order: StoreOrderVM }) {
  // A status the map does not know must still not reach the buyer as
  // `PARTIALLY_REFUNDED`. humanizeEnum is the floor every other screen uses.
  const meta = STATUS_META[order.status] ?? {
    label: humanizeEnum(order.status),
    icon: 'ellipse-outline' as const,
    tint: colors.stone[600],
    bg: colors.stone[100],
  };
  const placed = formatOrderDate(order.createdAt);
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.flex}>
          <Text style={styles.orderNumber}>{order.orderNumber ?? 'Order number pending'}</Text>
          {placed === null ? null : <Text style={styles.orderDate}>Placed {placed}</Text>}
        </View>
        <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={13} color={meta.tint} />
          <Text style={[styles.statusText, { color: meta.tint }]}>{meta.label}</Text>
        </View>
      </View>

      {order.items.map((item, index) => (
        <View key={`${order.id}-${item.productId}-${index}`} style={styles.itemRow}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.name}
            <Text style={styles.itemQty}> × {item.quantity}</Text>
          </Text>
          <Text style={styles.itemValue}>
            {item.priceAtPurchaseInr === null
              ? '—'
              : formatInr(item.priceAtPurchaseInr * item.quantity)}
          </Text>
        </View>
      ))}

      <View style={styles.divider} />

      {order.subtotalInr === null ? null : (
        <View style={styles.itemRow}>
          <Text style={styles.metaLabel}>Subtotal</Text>
          <Text style={styles.metaValue}>{formatInr(order.subtotalInr)}</Text>
        </View>
      )}
      {order.deliveryFeeInr === null ? null : (
        <View style={styles.itemRow}>
          <Text style={styles.metaLabel}>Delivery</Text>
          <Text style={styles.metaValue}>
            {order.deliveryFeeInr === 0 ? 'FREE' : formatInr(order.deliveryFeeInr)}
          </Text>
        </View>
      )}
      <View style={styles.itemRow}>
        <Text style={styles.totalLabel}>
          {order.status === 'PENDING' ? 'Total due' : 'Total'}
        </Text>
        <Text style={styles.totalValue}>
          {order.totalInr === null ? '—' : formatInr(order.totalInr)}
        </Text>
      </View>

      {order.trackingNumber !== null ? (
        <View style={styles.trackingRow}>
          <Ionicons name="car-outline" size={14} color={colors.stone[400]} />
          <Text style={styles.trackingText}>
            Tracking number <Text style={styles.trackingNumber}>{order.trackingNumber}</Text>
          </Text>
        </View>
      ) : order.status === 'SHIPPED' ? (
        <Text style={styles.trackingText}>
          A tracking number will appear here as soon as the courier assigns one.
        </Text>
      ) : null}
    </View>
  );
}

export default function StoreOrdersScreen() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const ordersQuery = useStoreOrders();
  const [refreshing, setRefreshing] = useState(false);

  const orders = selectStoreOrders(ordersQuery.data);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await ordersQuery.refetch();
    setRefreshing(false);
  }, [ordersQuery]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconTarget}
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/(devotee)/store' as never)
          }
        >
          <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
        </TouchableOpacity>
        <View style={styles.flex}>
          <Text style={styles.headerTitle}>My Orders</Text>
          <Text style={styles.headerSubtitle}>
            {ordersQuery.isLoading
              ? 'Loading…'
              : ordersQuery.isError
                ? 'Order history unavailable'
                : `${orders.length} order${orders.length === 1 ? '' : 's'} from the Darshya store`}
          </Text>
        </View>
      </View>

      {!isAuthenticated && !authLoading ? (
        <View style={styles.centre}>
          <Ionicons name="log-in-outline" size={48} color={colors.stone[300]} />
          <Text style={styles.centreTitle}>Sign in to see your orders</Text>
          <Text style={styles.centreText}>
            Orders belong to your Darshya account, so they are the same here and on the website.
          </Text>
          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/(auth)/login' as never)}
          >
            <Text style={styles.secondaryBtnText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      ) : ordersQuery.isLoading || authLoading ? (
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colors.saffron[600]} />
          <Text style={styles.centreText}>Loading your orders…</Text>
        </View>
      ) : ordersQuery.isError ? (
        <View style={styles.centre}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.stone[300]} />
          <Text style={styles.centreTitle}>Could not load your orders</Text>
          <Text style={styles.centreText}>
            {ordersQuery.error instanceof Error
              ? ordersQuery.error.message
              : 'The store did not return an order list.'}
          </Text>
          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.85}
            onPress={() => void ordersQuery.refetch()}
          >
            <Text style={styles.secondaryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(order) => order.id}
          renderItem={({ item }) => <OrderCard order={item} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.centre}>
              <Ionicons name="receipt-outline" size={48} color={colors.stone[300]} />
              <Text style={styles.centreTitle}>No orders yet</Text>
              <Text style={styles.centreText}>
                Anything you order from the Darshya store appears here with its status and
                tracking number.
              </Text>
              <TouchableOpacity
                style={styles.secondaryBtn}
                activeOpacity={0.85}
                onPress={() => router.replace('/(devotee)/store' as never)}
              >
                <Text style={styles.secondaryBtnText}>Browse the store</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.stone[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  headerTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.stone[900],
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    marginTop: 1,
  },
  iconTarget: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    padding: spacing.md,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  orderNumber: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.stone[900],
  },
  orderDate: {
    fontSize: fontSize.sm,
    color: colors.stone[400],
    marginTop: 1,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 3,
  },
  itemName: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.stone[700],
  },
  itemQty: {
    color: colors.stone[400],
  },
  itemValue: {
    fontSize: fontSize.base,
    color: colors.stone[600],
  },
  divider: {
    height: 1,
    backgroundColor: colors.stone[100],
    marginVertical: spacing.sm,
  },
  metaLabel: {
    fontSize: fontSize.base,
    color: colors.stone[500],
  },
  metaValue: {
    fontSize: fontSize.base,
    color: colors.stone[600],
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.stone[900],
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.stone[900],
  },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  trackingText: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    marginTop: spacing.xs,
  },
  trackingNumber: {
    fontWeight: '800',
    color: colors.stone[800],
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  centreTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.stone[800],
    textAlign: 'center',
  },
  centreText: {
    fontSize: fontSize.base,
    color: colors.stone[500],
    textAlign: 'center',
  },
  secondaryBtn: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.saffron[600],
    marginTop: spacing.xs,
  },
  secondaryBtnText: {
    color: colors.saffron[700],
    fontSize: fontSize.base,
    fontWeight: '700',
  },
});
