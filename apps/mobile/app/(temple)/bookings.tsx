import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { useTemplePortalBookings } from '../../lib/portal-queries';
import { selectTempleBookings, formatInr } from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * PAR-22. GET /api/v1/temple-portal/bookings shipped with the web temple-manager
 * revamp (#231) and the app never got a screen for it, so a manager on a phone
 * could not see who had booked a puja at their temple — only the five most
 * recent rows the dashboard happens to embed.
 *
 * Field names are the endpoint's, not the dashboard's: this route sends
 * `priceAmount` (a Decimal string) and `devoteeName`, where the dashboard's
 * recentBookings send `priceInr` and `devotee`. Reading the dashboard's names
 * here is exactly the PAR-02..PAR-07 failure — every row would render a blank
 * name and a missing price while the request succeeded.
 */
type Filter = 'upcoming' | 'all';

export default function TempleBookings() {
  const bookingsQuery = useTemplePortalBookings();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('upcoming');

  const rows = selectTempleBookings(bookingsQuery.data);
  const unavailable = !bookingsQuery.isLoading && rows === null;

  const { upcoming, revenueInr, unpriced } = useMemo(() => {
    const all = rows ?? [];
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const up = all.filter((b) => {
      if (!b.scheduledDate) return false;
      const d = new Date(b.scheduledDate);
      return !Number.isNaN(d.getTime()) && d >= startOfToday;
    });
    // Cancelled and refunded bookings are not revenue. Summing every row is how
    // a "total earned" figure ends up larger than the money that ever arrived.
    const earning = all.filter(
      (b) => b.status !== 'cancelled' && b.status !== 'refunded',
    );
    return {
      upcoming: up,
      revenueInr: earning.reduce((s, b) => s + (b.priceInr ?? 0), 0),
      // Rows whose Decimal failed to parse are excluded from the sum above, so
      // the screen says how many, rather than quietly under-reporting.
      unpriced: earning.filter((b) => b.priceInr === null).length,
    };
  }, [rows]);

  const visible = filter === 'upcoming' ? upcoming : (rows ?? []);

  async function onRefresh() {
    setRefreshing(true);
    await bookingsQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Bookings"
      subtitle={
        bookingsQuery.isLoading
          ? 'Loading…'
          : unavailable
            ? 'Unavailable'
            : `${rows?.length ?? 0} at your temple`
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {unavailable ? (
        <Text style={styles.errorBanner}>
          Your bookings could not be loaded, so nothing is listed. This is a
          server or permission error — it is not a report that no one has booked
          a puja. Pull down to retry.
        </Text>
      ) : null}

      {rows ? (
        <>
          <View style={{ flexDirection: 'row' }}>
            <StatCard label="Upcoming" value={upcoming.length} hint="Today onwards" />
            <View style={{ width: spacing.sm }} />
            <StatCard
              label="Booked value"
              value={formatInr(revenueInr)}
              accent={colors.saffron[700]}
              hint={
                unpriced > 0
                  ? `${unpriced} row${unpriced === 1 ? '' : 's'} with no price`
                  : 'Excludes cancelled'
              }
            />
          </View>

          <View style={styles.filterRow}>
            {(['upcoming', 'all'] as Filter[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.chip, filter === f && styles.chipActive]}
                onPress={() => setFilter(f)}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
                  {f === 'upcoming' ? `Upcoming (${upcoming.length})` : `All (${rows.length})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Section title={filter === 'upcoming' ? 'Upcoming bookings' : 'All bookings'}>
            {visible.length === 0 ? (
              <EmptyHint
                text={
                  filter === 'upcoming'
                    ? 'No bookings scheduled from today onwards.'
                    : 'No bookings at your temple yet.'
                }
              />
            ) : (
              visible.map((b) => (
                <ListRow
                  key={b.id}
                  primary={b.pujaName ?? 'Puja'}
                  secondary={[
                    b.devoteeName,
                    formatDay(b.scheduledDate),
                    b.scheduledTimeSlot,
                    b.priestName ? `Pandit ${b.priestName}` : 'Pandit not assigned',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  trailing={b.priceInr === null ? '—' : formatInr(b.priceInr)}
                  trailingHint={b.bookingNumber ?? undefined}
                  status={{ label: b.status, color: statusColor(b.status) }}
                />
              ))
            )}
          </Section>
        </>
      ) : null}
    </PortalScreen>
  );
}

function statusColor(status: string): string {
  if (status === 'completed' || status === 'delivered') return colors.green[600];
  if (status === 'cancelled' || status === 'refunded') return colors.red[600];
  if (status === 'pending_payment') return colors.amber[600];
  return colors.saffron[600];
}

function formatDay(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleDateString('en-IN');
}

const styles = StyleSheet.create({
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: colors.red[500],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.red[600],
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.stone[100],
  },
  chipActive: { backgroundColor: colors.saffron[600] },
  chipText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.stone[500] },
  chipTextActive: { color: colors.white },
});
