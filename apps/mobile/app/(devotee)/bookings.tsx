import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useBookings } from '@poojly/api-client';
import { PortalScreen, ListRow, EmptyHint } from '../../lib/portal-screen';
import {
  selectBookings,
  selectBookingTotal,
  formatInr,
  toNumber,
  type BookingRow,
} from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { bookingStatusLabel } from '../../lib/enum-labels';

/** Narrow an `unknown` field off a booking row to a non-empty string. */
function text(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function DevoteeBookings() {
  const bookingsQuery = useBookings();
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  /*
   * DEEP LINK. `lib/deep-link.ts` maps `darshya://booking/{bookingNumber}` to
   * this screen with `bn`, because when that map was written there was no
   * detail screen to send it to. There is one now, but the detail endpoint is
   * keyed by the booking's UUID (`GET /api/v1/bookings/:id`) and a push payload
   * carries the human booking NUMBER — so the id has to be resolved off the
   * list before the hand-off. The forward is done here rather than by editing
   * the deep-link map, which is shared navigation and pinned by its own tests.
   *
   * A `bn` that is not on the loaded page is NOT guessed at: the notice below
   * says so plainly and the list stays usable.
   */
  const params = useLocalSearchParams<{ bn?: string | string[] }>();
  const bookingNumber = Array.isArray(params.bn) ? params.bn[0] : params.bn;
  const forwarded = useRef<string | null>(null);
  const [unresolvedRef, setUnresolvedRef] = useState<string | null>(null);

  // PAR-02: the envelope is {success, bookings, pagination} — never {data}.
  const all = selectBookings(bookingsQuery.data);
  // `total` is the account-wide count (81 for the seeded devotee); `all` is one
  // page of it. The subtitle must not report the page length as the total.
  const total = selectBookingTotal(bookingsQuery.data);
  const filtered = all.filter((b: BookingRow) => {
    if (filter === 'all') return true;
    const status = String(b.status ?? '').toLowerCase();
    if (filter === 'upcoming') {
      return (
        status.includes('confirm') ||
        status.includes('pend') ||
        status.includes('book') ||
        status.includes('progress') ||
        status.includes('priest_assigned')
      );
    }
    if (filter === 'completed') {
      return status.includes('complet') || status.includes('deliver') || status.includes('video');
    }
    return status.includes(filter);
  });

  useEffect(() => {
    if (!bookingNumber || forwarded.current === bookingNumber) return;
    if (bookingsQuery.isLoading) return;
    const match = all.find((b) => text(b.bookingNumber) === bookingNumber);
    forwarded.current = bookingNumber;
    if (match) {
      setUnresolvedRef(null);
      router.push({
        pathname: '/(devotee)/booking-detail',
        params: { id: match.id },
      } as never);
    } else {
      setUnresolvedRef(bookingNumber);
    }
  }, [bookingNumber, bookingsQuery.isLoading, all]);

  function openBooking(booking: BookingRow) {
    router.push({ pathname: '/(devotee)/booking-detail', params: { id: booking.id } } as never);
  }

  async function onRefresh() {
    setRefreshing(true);
    await bookingsQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="My Bookings"
      subtitle={
        bookingsQuery.isLoading
          ? 'Loading…'
          : bookingsQuery.isError
            ? 'Could not load bookings'
            : `${total} total${all.length < total ? ` · showing ${all.length}` : ''}`
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {bookingsQuery.isError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Could not load your bookings:{' '}
            {bookingsQuery.error instanceof Error ? bookingsQuery.error.message : 'Unknown error'}
          </Text>
        </View>
      ) : null}

      {unresolvedRef !== null ? (
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeText}>
            Booking {unresolvedRef} is not on this page of your bookings. Pull down to refresh, or
            find it in the list below.
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

      {bookingsQuery.isLoading ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : filtered.length === 0 ? (
        <EmptyHint text="No bookings yet — book a puja to get started." />
      ) : (
        filtered.map((b: BookingRow) => {
          const status = String(b.status ?? 'pending').toLowerCase();
          const color = status.includes('complet') || status.includes('deliver')
            ? colors.green[600]
            : status.includes('cancel')
              ? colors.red[600]
              : status.includes('confirm') || status.includes('priest')
                ? colors.saffron[600]
                : colors.amber[600];
          const pujaName =
            text(b.pujaName) ??
            text(b.pujaType?.name) ??
            text(b.bookingNumber) ??
            'Booking';
          const templeName = text(b.templeName) ?? text(b.temple?.name);
          const dateRaw = text(b.scheduledDate) ?? '';
          const date = dateRaw.includes('T') ? dateRaw.slice(0, 10) : dateRaw;
          const time = text(b.scheduledTime) ?? text(b.scheduledTimeSlot) ?? '';
          const amountNum = toNumber(b.totalAmount ?? b.priceAmount);
          return (
            <TouchableOpacity
              key={b.id}
              onPress={() => openBooking(b)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Open booking ${text(b.bookingNumber) ?? pujaName}`}
              accessibilityHint="Shows the pandit, payments and prasad delivery for this booking"
            >
              <ListRow
                primary={pujaName}
                secondary={
                  templeName
                    ? `${templeName} • ${date} ${time}`.trim()
                    : `${date} ${time}`.trim() || 'Schedule TBD'
                }
                trailing={amountNum === null ? undefined : formatInr(amountNum)}
                status={{ label: bookingStatusLabel(text(b.status)) || 'Pending', color }}
              />
            </TouchableOpacity>
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
  noticeBanner: {
    backgroundColor: colors.amber[50],
    borderColor: colors.amber[600],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  noticeText: { color: colors.amber[800], fontSize: fontSize.sm },
});
