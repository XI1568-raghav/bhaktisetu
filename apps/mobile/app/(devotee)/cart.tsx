import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCart, useUpdateCartItem, useRemoveCartItem } from '@poojly/api-client';
import { useAuth } from '../../lib/auth-context';
import { selectCart, formatInr, type CartItemVM, type CartVM } from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * The store cart, as a screen.
 *
 * WHAT WAS THERE
 * --------------
 * `Alert.alert` with the cart rendered as a joined string (store.tsx:227-247),
 * ending in the line "Checkout is on the web store for now." Nothing could be
 * changed from it — no quantity, no removal — and nothing could be bought,
 * because the app had no checkout at all. The cart itself was already real
 * (GET/PATCH/DELETE /api/v1/store/cart/*, all wired in @poojly/api-client);
 * only the surface was a dialog.
 *
 * WHERE THE CART LIVES
 * --------------------
 * On the SERVER, and nowhere else. `storeService` keeps a per-user cart
 * (apps/api/src/services/store.service.ts) and `useCart` reads it. There is no
 * local mirror in this app and deliberately so: a second copy is a second
 * answer to "what am I buying", and this screen, store.tsx and checkout.tsx all
 * have to agree. No AsyncStorage (not a dependency of this app) and no context
 * — react-query's cache under `storeQueryKeys.cart` IS the single source of
 * truth, and every mutation here invalidates it.
 *
 * WHY THE TOTAL IS COMPUTED HERE AND `cart.total` IS NOT READ
 * -----------------------------------------------------------
 * `store.service.ts` used to add `Math.round(subtotal * 0.05)` as a "5% GST
 * estimate" to `cart.total` — the exact line item COM-06 / S-09 removed from
 * the web in the ₹733-vs-₹698 incident: never charged, never remitted (the
 * business has no GSTIN), and prices are quoted tax-inclusive. `POST
 * /api/v1/store/orders` recomputes the total itself and REFUSES with 409
 * `price_mismatch` when the client's number disagrees (store-orders.ts:243-255),
 * so rendering `cart.total` was not merely a display bug — it made every
 * checkout fail. `buildCart` now calls the same `computeStoreOrderTotals` the
 * order route calls, so the cart and the order agree; this screen keeps its own
 * mirror so the number on the button cannot drift from the number the route
 * will accept.
 *
 * The constants below are therefore a deliberate third copy of the pricing
 * contract, mirroring apps/api/src/lib/store-pricing.ts (the authority) and
 * apps/web/lib/store-pricing.ts, and pinned by the same invariant their tests
 * pin: total === subtotal + delivery, with no tax line anywhere.
 */

/** Mirror of apps/api/src/lib/store-pricing.ts — must not drift. */
export const FREE_DELIVERY_THRESHOLD_INR = 499;
export const DELIVERY_FEE_INR = 49;

export interface StoreOrderTotals {
  subtotalInr: number;
  deliveryFeeInr: number;
  totalInr: number;
}

export function computeDeliveryFeeInr(subtotalInr: number): number {
  return subtotalInr >= FREE_DELIVERY_THRESHOLD_INR ? 0 : DELIVERY_FEE_INR;
}

export function computeStoreOrderTotals(
  items: { qty: number; unitPriceInr: number }[],
): StoreOrderTotals {
  const subtotalInr = items.reduce((sum, it) => sum + it.unitPriceInr * it.qty, 0);
  const deliveryFeeInr = computeDeliveryFeeInr(subtotalInr);
  return { subtotalInr, deliveryFeeInr, totalInr: subtotalInr + deliveryFeeInr };
}

/**
 * The order lines, or `null` when any one of them has no unit price.
 *
 * `selectCart` returns `unitPriceInr: null` when the server sent a cart item
 * with no embedded product — an unknown price, not a free one. Summing it as 0
 * would put a number on the Place-order button that the API would reject, so
 * the whole basket is treated as unpriceable and checkout is blocked with the
 * reason on screen. Never guess a price on a money surface.
 */
export function orderLinesFor(
  cart: CartVM | null,
): { productId: string; qty: number; unitPriceInr: number }[] | null {
  if (!cart || cart.items.length === 0) return null;
  const lines: { productId: string; qty: number; unitPriceInr: number }[] = [];
  for (const item of cart.items) {
    if (item.unitPriceInr === null || item.quantity <= 0) return null;
    lines.push({ productId: item.productId, qty: item.quantity, unitPriceInr: item.unitPriceInr });
  }
  return lines;
}

/** Matches the web cart: one is the floor, ten is the per-line ceiling. */
const MIN_QTY = 1;
const MAX_QTY = 10;

function CartRow({
  item,
  busy,
  onQuantity,
  onRemove,
}: {
  item: CartItemVM;
  busy: boolean;
  onQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}) {
  const lineTotal =
    item.unitPriceInr === null ? null : item.unitPriceInr * item.quantity;
  return (
    <View style={styles.row}>
      <View style={styles.rowThumb}>
        <Ionicons name="bag-handle" size={22} color={colors.saffron[300]} />
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowHead}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <TouchableOpacity
            style={styles.iconTarget}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.title} from cart`}
            disabled={busy}
            onPress={() => onRemove(item.id)}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={busy ? colors.stone[300] : colors.stone[400]}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.rowUnit}>
          {item.unitPriceInr === null ? 'Price unavailable' : `${formatInr(item.unitPriceInr)} each`}
        </Text>

        <View style={styles.rowFoot}>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.iconTarget}
              accessibilityRole="button"
              accessibilityLabel={`Decrease quantity of ${item.title}`}
              disabled={busy || item.quantity <= MIN_QTY}
              onPress={() => onQuantity(item.id, item.quantity - 1)}
            >
              <View
                style={[
                  styles.stepperGlyph,
                  (busy || item.quantity <= MIN_QTY) && styles.stepperGlyphDisabled,
                ]}
              >
                <Ionicons name="remove" size={14} color={colors.stone[600]} />
              </View>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.iconTarget}
              accessibilityRole="button"
              accessibilityLabel={`Increase quantity of ${item.title}`}
              disabled={busy || item.quantity >= MAX_QTY}
              onPress={() => onQuantity(item.id, item.quantity + 1)}
            >
              <View
                style={[
                  styles.stepperGlyph,
                  (busy || item.quantity >= MAX_QTY) && styles.stepperGlyphDisabled,
                ]}
              >
                <Ionicons name="add" size={14} color={colors.stone[600]} />
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.rowTotal}>{lineTotal === null ? '—' : formatInr(lineTotal)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const cartQuery = useCart({ enabled: isAuthenticated });
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  const [refreshing, setRefreshing] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const cart = selectCart(cartQuery.data);
  const lines = orderLinesFor(cart);
  const totals = lines === null ? null : computeStoreOrderTotals(lines);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setMutationError(null);
    await cartQuery.refetch();
    setRefreshing(false);
  }, [cartQuery]);

  async function handleQuantity(id: string, quantity: number) {
    if (quantity < MIN_QTY || quantity > MAX_QTY) return;
    setBusyItemId(id);
    setMutationError(null);
    try {
      const response = await updateItem.mutateAsync({ id, quantity });
      // Confirm against what the SERVER says the cart now holds. A resolved
      // promise whose body is not a cart means the change did not land.
      if (!selectCart(response)) {
        setMutationError('The server did not confirm that change. Pull down to refresh.');
      }
    } catch (err) {
      setMutationError(mutationMessage(err, 'Could not update that item.'));
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleRemove(id: string) {
    setBusyItemId(id);
    setMutationError(null);
    try {
      const response = await removeItem.mutateAsync(id);
      if (!selectCart(response)) {
        setMutationError('The server did not confirm the removal. Pull down to refresh.');
      }
    } catch (err) {
      setMutationError(mutationMessage(err, 'Could not remove that item.'));
    } finally {
      setBusyItemId(null);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconTarget}
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(devotee)/store' as never))}
        >
          <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Your Cart</Text>
          <Text style={styles.headerSubtitle}>
            {cart === null
              ? 'Reading your cart…'
              : `${cart.itemCount} item${cart.itemCount === 1 ? '' : 's'}`}
          </Text>
        </View>
      </View>

      {!isAuthenticated && !authLoading ? (
        <StateBlock
          icon="log-in-outline"
          title="Sign in to see your cart"
          body="Your cart is kept on your Darshya account, so it follows you between the app and the website."
          actionLabel="Sign in"
          onAction={() => router.push('/(auth)/login' as never)}
        />
      ) : cartQuery.isLoading || authLoading ? (
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colors.saffron[600]} />
          <Text style={styles.centreText}>Loading your cart…</Text>
        </View>
      ) : cartQuery.isError || cart === null ? (
        <StateBlock
          icon="cloud-offline-outline"
          title="Could not read your cart"
          body={
            cartQuery.error instanceof Error
              ? cartQuery.error.message
              : 'The server did not return a cart. Nothing has been changed.'
          }
          actionLabel="Try again"
          onAction={() => void cartQuery.refetch()}
        />
      ) : cart.items.length === 0 ? (
        <StateBlock
          icon="bag-outline"
          title="Your cart is empty"
          body="Puja essentials, idols, books and rudraksha — delivered to your door."
          actionLabel="Browse the store"
          onAction={() => router.replace('/(devotee)/store' as never)}
        />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.body}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {mutationError ? <Text style={styles.errorBanner}>{mutationError}</Text> : null}

            {cart.items.map((item) => (
              <CartRow
                key={item.id}
                item={item}
                busy={busyItemId === item.id}
                onQuantity={handleQuantity}
                onRemove={handleRemove}
              />
            ))}

            <View style={styles.summary}>
              <Text style={styles.summaryHeading}>Order summary</Text>
              {totals === null ? (
                <Text style={styles.summaryUnavailable}>
                  One of these items came back without a price, so this basket cannot be
                  totalled. Remove it, or pull down to refresh.
                </Text>
              ) : (
                <>
                  <SummaryLine label="Subtotal" value={formatInr(totals.subtotalInr)} />
                  <SummaryLine
                    label="Delivery"
                    value={totals.deliveryFeeInr === 0 ? 'FREE' : formatInr(totals.deliveryFeeInr)}
                    accent={totals.deliveryFeeInr === 0}
                  />
                  {totals.deliveryFeeInr > 0 ? (
                    <Text style={styles.deliveryHint}>
                      Add {formatInr(FREE_DELIVERY_THRESHOLD_INR - totals.subtotalInr)} more for
                      free delivery.
                    </Text>
                  ) : null}
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryTotalLabel}>Total</Text>
                    <Text style={styles.summaryTotalValue}>{formatInr(totals.totalInr)}</Text>
                  </View>
                  {/* Prices are quoted tax-inclusive and there is no GST line —
                      see the header comment. Saying so is cheaper than a
                      customer wondering where it went. */}
                  <Text style={styles.summaryNote}>
                    Prices include all taxes. Nothing further is added at checkout.
                  </Text>
                </>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.primaryBtn, totals === null && styles.primaryBtnDisabled]}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={
                totals === null
                  ? 'Checkout unavailable while an item has no price'
                  : `Checkout, ${formatInr(totals.totalInr)}`
              }
              disabled={totals === null}
              onPress={() => router.push('/(devotee)/checkout' as never)}
            >
              <Text style={styles.primaryBtnText}>Checkout</Text>
              {totals === null ? null : (
                <Text style={styles.primaryBtnAmount}>{formatInr(totals.totalInr)}</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function mutationMessage(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : '';
  if (message.includes('401')) return 'Your session has expired. Sign in again to change your cart.';
  return message.length > 0 ? message : fallback;
}

function SummaryLine({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, accent && styles.summaryValueAccent]}>{value}</Text>
    </View>
  );
}

function StateBlock({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.centre}>
      <Ionicons name={icon} size={48} color={colors.stone[300]} />
      <Text style={styles.centreTitle}>{title}</Text>
      <Text style={styles.centreText}>{body}</Text>
      <TouchableOpacity
        style={styles.secondaryBtn}
        activeOpacity={0.85}
        accessibilityRole="button"
        onPress={onAction}
      >
        <Text style={styles.secondaryBtnText}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.stone[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  headerText: {
    flex: 1,
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
  /** 44x44 is the floor for anything tappable — quantity and remove included. */
  iconTarget: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    color: colors.red[600],
    fontSize: fontSize.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  // Row
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    padding: spacing.sm,
  },
  rowThumb: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  rowTitle: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.stone[800],
    paddingTop: spacing.xs,
  },
  rowUnit: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
  },
  rowFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperGlyph: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone[200],
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperGlyphDisabled: {
    opacity: 0.4,
  },
  stepperValue: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.stone[800],
  },
  rowTotal: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.stone[900],
  },
  // Summary
  summary: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  summaryHeading: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.stone[900],
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: fontSize.base,
    color: colors.stone[500],
  },
  summaryValue: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.stone[800],
  },
  summaryValueAccent: {
    color: colors.green[600],
    fontWeight: '800',
  },
  deliveryHint: {
    fontSize: fontSize.sm,
    color: colors.saffron[700],
    marginTop: 2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.stone[100],
    marginVertical: spacing.sm,
  },
  summaryTotalLabel: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.stone[900],
  },
  summaryTotalValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.stone[900],
  },
  summaryNote: {
    fontSize: fontSize.xs,
    color: colors.stone[400],
    marginTop: spacing.xs,
  },
  summaryUnavailable: {
    fontSize: fontSize.sm,
    color: colors.red[600],
  },
  // Footer
  footer: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.stone[100],
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 50,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[600],
  },
  primaryBtnDisabled: {
    backgroundColor: colors.stone[300],
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  primaryBtnAmount: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '800',
    opacity: 0.9,
  },
  // Shared states
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
