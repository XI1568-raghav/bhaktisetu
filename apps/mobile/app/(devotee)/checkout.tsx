import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useCart, useUserAddresses, useRemoveCartItem, storeQueryKeys } from '@poojly/api-client';
import { useAuth } from '../../lib/auth-context';
import { apiBase } from '../../lib/api';
import { fetchWithBudget, isNetworkFailure, type FetchBudgetError } from '../../lib/fetch-budget';
import { webOrigin, hostOf } from '../../lib/web-origin';
import { IN_APP_WEB_ROUTE } from '../../lib/in-app-web';
import { selectCart, selectAddresses, formatInr, type AddressRow } from '../../lib/api-contracts';
import { computeStoreOrderTotals, orderLinesFor } from './cart';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * Store checkout — the screen that was missing, and the reason no store order
 * could be placed from this app at all.
 *
 * THE ENDPOINT, AND WHY THIS ONE AND NOT THE OTHER
 * -----------------------------------------------
 *   POST /api/v1/store/orders   (routes/store-orders.ts:162)
 *
 * `POST /api/v1/store/cart/checkout` also exists and must NOT be used: it
 * returns a summary object with `id: \`ORD-${Date.now()}\`` and persists
 * nothing (routes/store.ts:229-248). Rendering that id would be a fabricated
 * order number on top of a sale that never happened. `/store/orders` writes a
 * real StoreOrder row, decrements stock in the same transaction, and is what
 * the web checkout posts to.
 *
 * WHY A HAND-BUILT FETCH RATHER THAN `useCreateStoreOrder`
 * -------------------------------------------------------
 * The hook exists (hooks/wave-1-4.ts:44) and hits the right path, but it goes
 * through the shared client, which builds its error from
 * `data?.error?.message` (client.ts:209-211). This route sends `error` as a
 * STRING — `{"error":"Insufficient stock for … (have 2, want 5)"}` — so every
 * recoverable, actionable failure would reach the buyer as "Request failed with
 * status 409". That is the same reasoning puja-book.tsx documents for
 * /bookings/book. The query key the hook owns (`["storeOrders"]`) is still
 * invalidated below, so app/(devotee)/orders.tsx refreshes either way.
 *
 * THE TOTAL IS A CONTRACT, NOT A DECORATION
 * -----------------------------------------
 * The route recomputes the total server-side and REFUSES with 409
 * `price_mismatch` when the client's `totalAmountInr` disagrees
 * (store-orders.ts:243-255). That guard exists because a ₹733 button once sat
 * on top of a ₹698 charge for months. So the number on the button is produced
 * by `computeStoreOrderTotals` — a mirror of the API's own store-pricing.ts.
 * `cart.total` used to carry a 5% "GST estimate" the order route does not
 * charge; store.service.ts now builds the cart from that same store-pricing.ts,
 * so the two agree. The local mirror stays because the button must be able to
 * quote a total the route will accept, not because the cart is untrusted. See
 * app/(devotee)/cart.tsx for the full account.
 *
 * PAYMENT — WHAT ACTUALLY HAPPENS, SAID PLAINLY
 * ---------------------------------------------
 * Physical goods are exempt from Apple IAP and Google Play Billing, so card/UPI
 * is the correct rail and no in-app-purchase flow belongs here. But this app
 * has no payment SDK: `react-native-razorpay` is not a dependency and adding a
 * native module changes the EAS build. Every other money path in the app
 * therefore creates the real record and hands the card form to the website
 * (lib/booking-flow.ts:37-44).
 *
 * That hand-off is NOT available for store orders, and pretending otherwise
 * would be the fake success screen this work exists to remove. The website has
 * no page that can resume payment for an existing StoreOrder: `/store/checkout`
 * pays only for an order it created moments earlier in the same browser
 * session, from its own localStorage cart, and `/store/orders` is read-only
 * (there is no "Pay" control on it). `POST /payments/store-orders/:id/razorpay`
 * exists on the API, but nothing outside that one page drives it.
 *
 * So this screen offers the one method it can complete honestly and end to end:
 * Cash on Delivery — which the web checkout offers too, and which needs no
 * payment rail at all. The online option is shown, disabled, with the concrete
 * reason, and points at the web store where a card CAN be used. The order this
 * screen places is real: a StoreOrder row, a real order number, stock
 * decremented, visible under Orders here and on the website.
 */

/** The website this build pairs with. Never the literal darshya.online. */
const WEB = webOrigin();

type PaymentMethod = 'cod';

interface PlacedOrder {
  id: string;
  orderNumber: string | null;
  totalAmountInr: number | null;
}

/** `{data: {...}}` from POST/GET /store/orders. Never invents a number. */
function selectPlacedOrder(payload: unknown): PlacedOrder | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const data = (payload as { data?: unknown }).data;
  if (typeof data !== 'object' || data === null) return null;
  const row = data as Record<string, unknown>;
  const id = typeof row.id === 'string' ? row.id : '';
  if (!id) return null;
  const total = row.totalAmount;
  return {
    id,
    orderNumber: typeof row.orderNumber === 'string' ? row.orderNumber : null,
    totalAmountInr: typeof total === 'number' && Number.isFinite(total) ? total : null,
  };
}

/**
 * The message the buyer sees when the order is refused.
 *
 * `/store/orders` sends `error` as a bare string for every business failure and
 * adds `message` only for the price-mismatch case, so both are read. The raw
 * string is preferred over a generic sentence wherever the API supplies one —
 * "Insufficient stock for … (have 2, want 5)" tells the buyer what to change;
 * "Order failed (409)" does not.
 */
export function orderFailureMessage(status: number, body: unknown): string {
  const row =
    typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const error = typeof row.error === 'string' ? row.error : '';
  const message = typeof row.message === 'string' ? row.message : '';

  if (status === 401) {
    return 'Your session has expired. Sign in again — nothing was ordered and your cart is untouched.';
  }
  if (error === 'price_mismatch') {
    const server = typeof row.serverTotalInr === 'number' ? row.serverTotalInr : null;
    return server === null
      ? message || 'Prices changed while you were checking out. Go back to the cart and try again.'
      : `Prices changed while you were checking out. The store now totals ${formatInr(
          server,
        )}. Go back to the cart to review it — nothing was charged.`;
  }
  if (error.startsWith('Unknown product')) {
    // The shopper-facing catalogue (GET /store/products) is a static seed array
    // with ids like `prod_015`; StoreProduct rows are uuids. An item from that
    // catalogue has no orderable inventory record, and the API says so.
    return `${error}. This item is from the preview catalogue and has no live inventory yet, so it cannot be ordered. Remove it from your cart.`;
  }
  if (error) return error;
  if (message) return message;
  return `The store could not accept this order (${status}). Nothing was charged.`;
}

function addressLine(address: AddressRow): string {
  const line2 = typeof address.line2 === 'string' ? address.line2 : '';
  return [address.line1, line2, address.city, address.state, address.pincode]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join(', ');
}

export default function CheckoutScreen() {
  const { user, session, isAuthenticated, isLoading: authLoading } = useAuth();
  const token = session?.accessToken;
  const queryClient = useQueryClient();

  const cartQuery = useCart({ enabled: isAuthenticated });
  const addressesQuery = useUserAddresses({ enabled: isAuthenticated });
  const removeItem = useRemoveCartItem();

  const cart = selectCart(cartQuery.data);
  const lines = orderLinesFor(cart);
  const totals = useMemo(
    () => (lines === null ? null : computeStoreOrderTotals(lines)),
    [lines],
  );
  const addresses = selectAddresses(addressesQuery.data);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [recipient, setRecipient] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod] = useState<PaymentMethod>('cod');
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  /**
   * One idempotency key per ATTEMPT, held across retries of that attempt so a
   * network-error retry returns the existing order instead of minting a second
   * one (store-orders.ts:168-177). Cleared once an order comes back.
   */
  const idempotencyKeyRef = useRef<string | null>(null);

  // Preselect the default address, and prefill the recipient from the account.
  useEffect(() => {
    if (selectedAddressId !== null || addresses.length === 0) return;
    const preferred = addresses.find((a) => a.isDefault === true) ?? addresses[0];
    if (preferred) setSelectedAddressId(preferred.id);
  }, [addresses, selectedAddressId]);

  useEffect(() => {
    if (recipient === '' && user?.fullName) setRecipient(user.fullName);
  }, [user?.fullName, recipient]);

  useEffect(() => {
    if (phone === '' && user?.phone) setPhone(user.phone);
  }, [user?.phone, phone]);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) ?? null;
  const recipientName = recipient.trim();
  const canPlace =
    !placing &&
    totals !== null &&
    lines !== null &&
    lines.length > 0 &&
    selectedAddress !== null &&
    recipientName.length > 0 &&
    typeof token === 'string' &&
    token.length > 0;

  function openOnWeb(path: string, title: string) {
    // The in-app browser owns every hand-off decision (lib/in-app-web.ts): it
    // frames the page when react-native-webview resolves and offers a browser
    // hand-off when it does not. Routing through it keeps that single place in
    // charge instead of adding another Linking call site here.
    router.push({
      pathname: IN_APP_WEB_ROUTE,
      params: { url: `${WEB.origin}${path}`, title },
    } as never);
  }

  async function handlePlaceOrder() {
    if (!canPlace || totals === null || lines === null || selectedAddress === null) return;
    setPlacing(true);
    setPlaceError(null);
    if (idempotencyKeyRef.current === null) {
      // Hermes has no crypto.randomUUID. The server only needs 8-128 chars that
      // are unique per user per attempt.
      idempotencyKeyRef.current = `mob-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    }
    try {
      const res = await fetchWithBudget(`${apiBase()}/api/v1/store/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: lines.map((line) => ({
            productId: line.productId,
            qty: line.qty,
            priceAtPurchase: line.unitPriceInr,
          })),
          totalAmountInr: totals.totalInr,
          idempotencyKey: idempotencyKeyRef.current,
          shippingAddress: {
            fullName: recipientName,
            line1: typeof selectedAddress.line1 === 'string' ? selectedAddress.line1 : '',
            line2: typeof selectedAddress.line2 === 'string' ? selectedAddress.line2 : null,
            city: typeof selectedAddress.city === 'string' ? selectedAddress.city : '',
            state: typeof selectedAddress.state === 'string' ? selectedAddress.state : '',
            pincode: typeof selectedAddress.pincode === 'string' ? selectedAddress.pincode : '',
            country: 'India',
            phone: phone.trim().length > 0 ? phone.trim() : null,
          },
        }),
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setPlaceError(orderFailureMessage(res.status, body));
        return;
      }
      const order = selectPlacedOrder(body);
      if (order === null) {
        // 2xx with an unreadable body: the row may well exist, and retrying is
        // what would create a second one. Send them to look, never to retry.
        setPlaceError(
          'The store accepted the order but did not return it. Check Orders before trying again — do not re-place it.',
        );
        return;
      }
      idempotencyKeyRef.current = null;
      setPlaced(order);
      // The cart is server-side and there is no clear-cart endpoint; remove the
      // lines one by one. A failure here cannot un-place the order, so it is
      // swallowed — the next cart read is authoritative either way.
      for (const item of cart?.items ?? []) {
        await removeItem.mutateAsync(item.id).catch(() => undefined);
      }
      await queryClient.invalidateQueries({ queryKey: storeQueryKeys.cart });
      await queryClient.invalidateQueries({ queryKey: ['storeOrders'] });
    } catch (err) {
      // A TIMEOUT is not the same as a refused connection. The POST may have
      // landed and only the reply lost, so "nothing was ordered" would be a
      // claim this app cannot make. The idempotency key is deliberately NOT
      // cleared, so a retry returns the same order rather than a second one.
      setPlaceError(
        isNetworkFailure(err) && (err as FetchBudgetError).timedOut
          ? 'The store did not answer in time. Your order may or may not have been placed — check Orders before trying again.'
          : 'Could not reach the store. Nothing was ordered — check your connection and try again.',
      );
    } finally {
      setPlacing(false);
    }
  }

  // ─── placed ────────────────────────────────────────────────────────────────
  if (placed) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={44} color={colors.green[600]} />
            <Text style={styles.successTitle}>
              {placed.orderNumber ?? 'Your order'} is placed
            </Text>
            <Text style={styles.successText}>
              {placed.totalAmountInr === null
                ? 'The store has your order.'
                : `${formatInr(placed.totalAmountInr)} — payable to the courier on delivery.`}
            </Text>
            <Text style={styles.successNote}>
              It sits as <Text style={styles.strong}>Payment pending</Text> until the parcel is
              handed over. Nothing has been charged to any card.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            accessibilityRole="button"
            onPress={() => router.replace('/(devotee)/orders' as never)}
          >
            <Ionicons name="receipt-outline" size={18} color={colors.white} />
            <Text style={styles.primaryBtnText}>View my orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityHint={`Opens your order history on ${hostOf(WEB.origin)}`}
            onPress={() => openOnWeb('/store/orders', 'My orders')}
          >
            <Text style={styles.secondaryBtnText}>Open on {hostOf(WEB.origin)}</Text>
          </TouchableOpacity>

          {WEB.matchesEnvironment ? null : (
            <Text style={styles.errorBanner}>
              This build talks to a different server than {hostOf(WEB.origin)}, so that site will
              not know about this order. Set EXPO_PUBLIC_WEB_URL to the website that pairs with
              this build&apos;s API.
            </Text>
          )}

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.85}
            accessibilityRole="button"
            onPress={() => router.replace('/(devotee)/store' as never)}
          >
            <Text style={styles.secondaryBtnText}>Keep shopping</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── gates ─────────────────────────────────────────────────────────────────
  if (!isAuthenticated && !authLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header />
        <View style={styles.centre}>
          <Ionicons name="log-in-outline" size={48} color={colors.stone[300]} />
          <Text style={styles.centreTitle}>Sign in to check out</Text>
          <Text style={styles.centreText}>
            An order has to belong to an account so you can track it and we can deliver it.
          </Text>
          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/(auth)/login' as never)}
          >
            <Text style={styles.secondaryBtnText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (authLoading || cartQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header />
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colors.saffron[600]} />
          <Text style={styles.centreText}>Loading your order…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (cartQuery.isError || cart === null) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header />
        <View style={styles.centre}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.stone[300]} />
          <Text style={styles.centreTitle}>Could not read your cart</Text>
          <Text style={styles.centreText}>
            {cartQuery.error instanceof Error
              ? cartQuery.error.message
              : 'The server did not return a cart. Nothing was ordered.'}
          </Text>
          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.85}
            onPress={() => void cartQuery.refetch()}
          >
            <Text style={styles.secondaryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (cart.items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header />
        <View style={styles.centre}>
          <Ionicons name="bag-outline" size={48} color={colors.stone[300]} />
          <Text style={styles.centreTitle}>There is nothing to check out</Text>
          <Text style={styles.centreText}>Your cart is empty.</Text>
          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.85}
            onPress={() => router.replace('/(devotee)/store' as never)}
          >
            <Text style={styles.secondaryBtnText}>Browse the store</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── form ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Delivery address */}
          <Text style={styles.sectionHeading}>Deliver to</Text>
          {addressesQuery.isLoading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color={colors.saffron[600]} />
              <Text style={styles.centreText}>Loading your saved addresses…</Text>
            </View>
          ) : addressesQuery.isError ? (
            <View style={styles.card}>
              <Text style={styles.cardError}>
                Could not load your saved addresses. Without one there is nowhere to deliver.
              </Text>
              <TouchableOpacity
                style={styles.secondaryBtn}
                activeOpacity={0.85}
                onPress={() => void addressesQuery.refetch()}
              >
                <Text style={styles.secondaryBtnText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : addresses.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardText}>
                You have no saved addresses. Add one under Profile — it is the same address book
                the website uses, so it only has to be entered once.
              </Text>
              <TouchableOpacity
                style={styles.secondaryBtn}
                activeOpacity={0.85}
                onPress={() => router.push('/(devotee)/profile' as never)}
              >
                <Text style={styles.secondaryBtnText}>Go to Profile</Text>
              </TouchableOpacity>
            </View>
          ) : (
            addresses.map((address) => {
              const active = address.id === selectedAddressId;
              return (
                <TouchableOpacity
                  key={address.id}
                  style={[styles.optionRow, active && styles.optionRowActive]}
                  activeOpacity={0.85}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${address.label ?? 'Address'}: ${addressLine(address)}`}
                  onPress={() => setSelectedAddressId(address.id)}
                >
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={active ? colors.saffron[600] : colors.stone[400]}
                  />
                  <View style={styles.optionBody}>
                    <Text style={styles.optionTitle}>
                      {address.label ?? 'Address'}
                      {address.isDefault === true ? '  ·  Default' : ''}
                    </Text>
                    <Text style={styles.optionText}>{addressLine(address)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {/* Recipient */}
          <Text style={styles.sectionHeading}>Who receives it</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Recipient name</Text>
            <TextInput
              style={styles.input}
              value={recipient}
              onChangeText={setRecipient}
              placeholder="Full name"
              placeholderTextColor={colors.stone[400]}
              autoCapitalize="words"
              returnKeyType="next"
              accessibilityLabel="Recipient name"
            />
            {recipientName.length === 0 ? (
              <Text style={styles.fieldError}>
                The courier needs a name on the parcel.
              </Text>
            ) : null}

            <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
              Contact number (optional)
            </Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone for delivery updates"
              placeholderTextColor={colors.stone[400]}
              keyboardType="phone-pad"
              returnKeyType="done"
              accessibilityLabel="Contact number for delivery"
            />
          </View>

          {/* Payment */}
          <Text style={styles.sectionHeading}>Payment</Text>
          <View style={[styles.optionRow, styles.optionRowActive]}>
            <Ionicons name="radio-button-on" size={20} color={colors.saffron[600]} />
            <View style={styles.optionBody}>
              <Text style={styles.optionTitle}>Cash on Delivery</Text>
              <Text style={styles.optionText}>
                Pay the courier when the parcel arrives. This completes here, in the app.
              </Text>
            </View>
          </View>

          <View style={[styles.optionRow, styles.optionRowDisabled]}>
            <Ionicons name="radio-button-off" size={20} color={colors.stone[300]} />
            <View style={styles.optionBody}>
              <Text style={[styles.optionTitle, styles.optionTitleDisabled]}>
                Card / UPI — not available in the app
              </Text>
              <Text style={styles.optionText}>
                This build carries no payment SDK, and {hostOf(WEB.origin)} can only take a card
                for an order started on the website — it has no page that resumes payment for an
                order placed here. Choose Cash on Delivery, or shop on the website instead.
              </Text>
              <TouchableOpacity
                style={styles.linkBtn}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityHint={`Opens the store on ${hostOf(WEB.origin)}`}
                onPress={() => openOnWeb('/store', 'Darshya Store')}
              >
                <Text style={styles.linkBtnText}>Shop on {hostOf(WEB.origin)}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.saffron[700]} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Summary */}
          <Text style={styles.sectionHeading}>Order summary</Text>
          <View style={styles.card}>
            {cart.items.map((item) => (
              <View key={item.id} style={styles.summaryRow}>
                <Text style={styles.summaryLabel} numberOfLines={1}>
                  {item.title} × {item.quantity}
                </Text>
                <Text style={styles.summaryValue}>
                  {item.unitPriceInr === null ? '—' : formatInr(item.unitPriceInr * item.quantity)}
                </Text>
              </View>
            ))}
            {totals === null ? (
              <Text style={styles.cardError}>
                One item came back without a price, so this order cannot be totalled or placed.
                Remove it from your cart.
              </Text>
            ) : (
              <>
                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>{formatInr(totals.subtotalInr)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Delivery</Text>
                  <Text style={styles.summaryValue}>
                    {totals.deliveryFeeInr === 0 ? 'FREE' : formatInr(totals.deliveryFeeInr)}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryTotalLabel}>Total</Text>
                  <Text style={styles.summaryTotalValue}>{formatInr(totals.totalInr)}</Text>
                </View>
                <Text style={styles.summaryNote}>
                  Prices include all taxes. This is exactly what the courier will collect.
                </Text>
              </>
            )}
          </View>

          {placeError ? <Text style={styles.errorBanner}>{placeError}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          {selectedAddress === null && addresses.length > 0 ? (
            <Text style={styles.footerHint}>Choose a delivery address to continue.</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.primaryBtn, !canPlace && styles.primaryBtnDisabled]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={
              totals === null
                ? 'Place order unavailable'
                : `Place order, ${formatInr(totals.totalInr)}, cash on delivery`
            }
            disabled={!canPlace}
            onPress={handlePlaceOrder}
          >
            {placing ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="bag-check-outline" size={18} color={colors.white} />
            )}
            <Text style={styles.primaryBtnText}>
              {placing ? 'Placing order…' : 'Place order'}
            </Text>
            {totals === null || placing ? null : (
              <Text style={styles.primaryBtnAmount}>{formatInr(totals.totalInr)}</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.footerHint}>
            {paymentMethod === 'cod' ? 'Payable to the courier on delivery.' : ''}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.iconTarget}
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace('/(devotee)/cart' as never)
        }
      >
        <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
      </TouchableOpacity>
      <View style={styles.flex}>
        <Text style={styles.headerTitle}>Checkout</Text>
        <Text style={styles.headerSubtitle}>Delivery, then confirm</Text>
      </View>
    </View>
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
  body: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  sectionHeading: {
    fontSize: fontSize.base,
    fontWeight: '800',
    color: colors.stone[700],
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardText: {
    fontSize: fontSize.base,
    color: colors.stone[600],
  },
  cardError: {
    fontSize: fontSize.sm,
    color: colors.red[600],
  },
  // Option rows (address + payment)
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    padding: spacing.md,
    minHeight: 44,
  },
  optionRowActive: {
    borderColor: colors.saffron[400],
    backgroundColor: colors.saffron[50],
  },
  optionRowDisabled: {
    backgroundColor: colors.stone[100],
  },
  optionBody: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.stone[800],
  },
  optionTitleDisabled: {
    color: colors.stone[500],
  },
  optionText: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    lineHeight: 18,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
  },
  linkBtnText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.saffron[700],
  },
  // Fields
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.stone[600],
  },
  fieldLabelSpaced: {
    marginTop: spacing.sm,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.stone[200],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    fontSize: fontSize.base,
    color: colors.stone[900],
    backgroundColor: colors.white,
  },
  fieldError: {
    fontSize: fontSize.sm,
    color: colors.red[600],
  },
  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 3,
  },
  summaryLabel: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.stone[500],
  },
  summaryValue: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.stone[800],
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
  divider: {
    height: 1,
    backgroundColor: colors.stone[100],
    marginVertical: spacing.xs,
  },
  // Footer
  footer: {
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.stone[100],
  },
  footerHint: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    textAlign: 'center',
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
  errorBanner: {
    backgroundColor: '#FEF2F2',
    color: colors.red[600],
    fontSize: fontSize.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  // Success
  successCard: {
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.green[200],
    padding: spacing.lg,
  },
  successTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.stone[900],
    textAlign: 'center',
  },
  successText: {
    fontSize: fontSize.base,
    color: colors.stone[600],
    textAlign: 'center',
  },
  successNote: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  strong: {
    fontWeight: '800',
    color: colors.stone[700],
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
});
