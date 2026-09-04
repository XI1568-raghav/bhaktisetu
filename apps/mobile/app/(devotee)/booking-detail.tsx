/**
 * One puja booking, in full — the screen `darshya://booking/:bn` was always
 * meant to land on.
 *
 * WHAT THIS CLOSES
 * ----------------
 * `app/(devotee)/bookings.tsx` is a list: puja name, temple, date, amount,
 * status pill. Nothing more was reachable. apps/web has `/bookings/view`, which
 * shows the priest, the payment history, the prasad delivery address and the
 * sankalp details (devotee name, gotra, nakshatra) — the fields that tell a
 * devotee whether the puja is actually going to be performed in their name.
 * `lib/deep-link.ts` documents `darshya://booking/{bookingNumber}` →
 * `booking-detail`, and routes to the LIST instead, with the booking number
 * passed as a parameter nothing reads, because no detail screen existed.
 *
 * ENDPOINT. `GET /api/v1/bookings/:id` (apps/api/src/routes/bookings.ts:1098),
 * behind `authenticateUser`. Ownership is enforced in the service —
 * `BookingService.getBookingById` (booking.service.ts:1477-1540) throws when
 * `booking.userId` is not the caller — so this screen never checks it. The
 * include carries temple, pujaType, priest, payments[] and prasadAddress.
 *
 * MONEY IS READ, NEVER DERIVED. Every rupee figure on this screen is a column
 * printed as it arrived: `totalAmount` for the booking, `amount` and
 * `refundAmount` per payment. Nothing is summed, netted, or converted. A
 * booking total that disagrees with the sum of its payments is a real fact
 * about a partially-paid booking, and inventing a reconciliation here would
 * hide it.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { formatInr, toNumber } from '../../lib/api-contracts';
import { bookingStatusLabel, paymentStatusLabel } from '../../lib/enum-labels';
import {
  fetchBooking,
  formatDate,
  formatDateTime,
  selectBookingDetail,
  selectBookingPayments,
  type BookingDetail,
} from '../../lib/account-api';

function text(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function nested(record: unknown, key: string): string | undefined {
  if (typeof record !== 'object' || record === null) return undefined;
  return text((record as Record<string, unknown>)[key]);
}

function statusColor(status: unknown): string {
  const s = String(status ?? '').toLowerCase();
  if (s.includes('cancel') || s.includes('refund')) return colors.red[600];
  if (s.includes('complet') || s.includes('deliver') || s.includes('paid')) return colors.green[600];
  if (s.includes('confirm') || s.includes('priest') || s.includes('progress')) {
    return colors.saffron[600];
  }
  return colors.amber[600];
}

/** A labelled fact. Renders nothing at all when the field is absent. */
function Fact({ label, value }: { label: string; value?: string }) {
  if (value === undefined || value.length === 0) return null;
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

/** Amount as the API sent it, or nothing. Never a confident zero. */
function money(value: unknown): string | undefined {
  const n = toNumber(value);
  return n === null ? undefined : formatInr(n);
}

function scheduleLine(booking: BookingDetail): string | undefined {
  const date = formatDate(booking.scheduledDate);
  const time = text(booking.scheduledTime) ?? text(booking.scheduledTimeSlot) ?? '';
  const joined = `${date} ${time}`.trim();
  return joined.length > 0 ? joined : undefined;
}

function addressLine(address: unknown): string | undefined {
  if (typeof address !== 'object' || address === null) return undefined;
  const a = address as Record<string, unknown>;
  const parts = [a.line1, a.line2, a.city, a.state, a.pincode, a.country]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter((p) => p.length > 0);
  return parts.length > 0 ? parts.join(', ') : undefined;
}

export default function BookingDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const bookingQuery = useQuery({
    queryKey: ['bookings', 'detail', id],
    queryFn: () => fetchBooking(id as string),
    enabled: typeof id === 'string' && id.length > 0,
  });

  const [refreshing, setRefreshing] = useState(false);
  const booking = selectBookingDetail(bookingQuery.data);
  const payments = selectBookingPayments(booking);

  async function onRefresh() {
    setRefreshing(true);
    await bookingQuery.refetch();
    setRefreshing(false);
  }

  function renderBody() {
    if (typeof id !== 'string' || id.length === 0) {
      return (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>No booking to open</Text>
          <Text style={styles.errorText}>
            This screen was opened without a booking reference. Go back to My Bookings and tap one.
          </Text>
        </View>
      );
    }

    if (bookingQuery.isLoading) {
      return (
        <View style={styles.centre}>
          <ActivityIndicator color={colors.saffron[600]} />
          <Text style={styles.centreText}>Loading this booking…</Text>
        </View>
      );
    }

    if (bookingQuery.isError) {
      return (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Could not load this booking</Text>
          <Text style={styles.errorText}>
            {bookingQuery.error instanceof Error
              ? bookingQuery.error.message
              : 'Something went wrong reaching Darshya.'}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => void bookingQuery.refetch()}
            accessibilityRole="button"
            accessibilityLabel="Try loading this booking again"
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (booking === null) {
      return (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Booking not found</Text>
          <Text style={styles.errorText}>
            Darshya answered without a booking in the response. Pull down to try again.
          </Text>
        </View>
      );
    }

    const colour = statusColor(booking.status);
    const pujaName =
      nested(booking.pujaType, 'name') ?? text(booking.bookingNumber) ?? 'Puja booking';
    const templeName = nested(booking.temple, 'name');
    const templePlace = [nested(booking.temple, 'city'), nested(booking.temple, 'state')]
      .filter((p): p is string => typeof p === 'string')
      .join(', ');
    const priestName = nested(booking.priest, 'displayName');
    const total = money(booking.totalAmount ?? booking.priceAmount);
    const prasad = addressLine(booking.prasadAddress);

    return (
      <>
        <View style={styles.hero}>
          <View style={styles.heroHead}>
            <Text style={styles.heroTitle}>{pujaName}</Text>
            <View style={[styles.pill, { backgroundColor: `${colour}1A`, borderColor: colour }]}>
              <Text style={[styles.pillText, { color: colour }]}>
                {bookingStatusLabel(text(booking.status)) || 'Pending'}
              </Text>
            </View>
          </View>
          {text(booking.bookingNumber) ? (
            <Text style={styles.heroRef}>{booking.bookingNumber}</Text>
          ) : null}
          {total !== undefined ? <Text style={styles.heroAmount}>{total}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Schedule</Text>
          <Fact label="Date and time" value={scheduleLine(booking)} />
          <Fact
            label="Duration"
            value={(() => {
              const mins = toNumber(
                typeof booking.pujaType === 'object' && booking.pujaType !== null
                  ? (booking.pujaType as Record<string, unknown>).durationMinutes
                  : undefined,
              );
              return mins === null ? undefined : `${mins} minutes`;
            })()}
          />
          <Fact label="Booked on" value={formatDate(booking.createdAt)} />
        </View>

        {templeName !== undefined || priestName !== undefined ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Where and who</Text>
            <Fact label="Temple" value={templeName} />
            <Fact label="Location" value={templePlace.length > 0 ? templePlace : undefined} />
            <Fact
              label="Pandit"
              value={priestName ?? (templeName !== undefined ? 'Not assigned yet' : undefined)}
            />
            <Fact label="Deity" value={nested(booking.pujaType, 'deity')} />
          </View>
        ) : null}

        {text(booking.devoteeName) !== undefined ||
        text(booking.gotra) !== undefined ||
        text(booking.nakshatra) !== undefined ||
        text(booking.specialInstructions) !== undefined ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sankalp details</Text>
            <Text style={styles.cardHint}>
              The name and lineage the pandit recites during the puja.
            </Text>
            <Fact label="Devotee name" value={text(booking.devoteeName)} />
            <Fact label="Gotra" value={text(booking.gotra)} />
            <Fact label="Nakshatra" value={text(booking.nakshatra)} />
            <Fact label="Special instructions" value={text(booking.specialInstructions)} />
          </View>
        ) : null}

        {prasad !== undefined ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Prasad delivery</Text>
            <Text style={styles.factValue}>{prasad}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payments</Text>
          {payments.length === 0 ? (
            <Text style={styles.cardHint}>
              No payment has been recorded against this booking yet.
            </Text>
          ) : (
            payments.map((p) => {
              const amount = money(p.amount);
              const refund = money(p.refundAmount);
              const pColour = statusColor(p.status);
              return (
                <View key={p.id} style={styles.paymentRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentAmount}>{amount ?? '—'}</Text>
                    <Text style={styles.paymentMeta}>
                      {[
                        text(p.method) ?? text(p.paymentGateway),
                        formatDateTime(p.createdAt) || undefined,
                      ]
                        .filter((v): v is string => typeof v === 'string' && v.length > 0)
                        .join('  ·  ')}
                    </Text>
                    {refund !== undefined ? (
                      <Text style={styles.paymentRefund}>Refunded {refund}</Text>
                    ) : null}
                  </View>
                  <View
                    style={[styles.pill, { backgroundColor: `${pColour}1A`, borderColor: pColour }]}
                  >
                    <Text style={[styles.pillText, { color: pColour }]}>
                      {paymentStatusLabel(text(p.status)) || 'Pending'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Booking</Text>
          <Text style={styles.subtitle}>
            {booking !== null && text(booking.bookingNumber)
              ? booking.bookingNumber
              : 'Your puja booking in full'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {renderBody()}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
  subtitle: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.md },

  centre: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  centreText: { color: colors.stone[500], fontSize: fontSize.base },

  errorBox: {
    backgroundColor: '#FEE2E2',
    borderColor: colors.red[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  errorTitle: { color: colors.red[600], fontSize: fontSize.base, fontWeight: '700' },
  errorText: { color: colors.stone[700], fontSize: fontSize.sm, marginTop: 4 },
  retryBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.red[500],
  },
  retryText: { color: colors.red[600], fontWeight: '700', fontSize: fontSize.sm },

  hero: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[200],
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  heroHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  heroTitle: { flex: 1, fontSize: fontSize['2xl'], fontWeight: '800', color: colors.stone[900] },
  heroRef: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 4 },
  heroAmount: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.saffron[700],
    marginTop: spacing.sm,
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[200],
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.base,
    fontWeight: '800',
    color: colors.stone[800],
    marginBottom: spacing.xs,
  },
  cardHint: { fontSize: fontSize.sm, color: colors.stone[500], marginBottom: spacing.xs },

  fact: { marginTop: spacing.xs },
  factLabel: { fontSize: fontSize.xs, color: colors.stone[500], fontWeight: '600' },
  factValue: { fontSize: fontSize.lg, color: colors.stone[800], marginTop: 1 },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  pillText: { fontSize: fontSize.xs, fontWeight: '700' },

  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.stone[100],
  },
  paymentAmount: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[900] },
  paymentMeta: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
  paymentRefund: { fontSize: fontSize.sm, color: colors.red[600], marginTop: 2, fontWeight: '600' },
});
