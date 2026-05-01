import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useBookings } from '@poojly/api-client';
import { PortalScreen, ListRow, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

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

  const all = bookingsQuery.data?.data ?? [];
  const filtered = all.filter((b: any) => {
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

  async function onRefresh() {
    setRefreshing(true);
    await bookingsQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="My Bookings"
      subtitle={`${all.length} total`}
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
        filtered.map((b: any) => {
          const status = String(b.status ?? 'pending').toLowerCase();
          const color = status.includes('complet') || status.includes('deliver')
            ? colors.green[600]
            : status.includes('cancel')
              ? colors.red[600]
              : status.includes('confirm') || status.includes('priest')
                ? colors.saffron[600]
                : colors.amber[600];
          const pujaName =
            b.pujaName ??
            b.pujaType?.name ??
            b.bookingNumber ??
            'Booking';
          const templeName = b.templeName ?? b.temple?.name;
          const dateRaw = b.scheduledDate ?? '';
          const date =
            typeof dateRaw === 'string' && dateRaw.includes('T')
              ? dateRaw.slice(0, 10)
              : dateRaw;
          const time = b.scheduledTime ?? b.scheduledTimeSlot ?? '';
          const amount = b.totalAmount ?? b.priceAmount;
          return (
            <ListRow
              key={b.id}
              primary={pujaName}
              secondary={
                templeName
                  ? `${templeName} • ${date} ${time}`.trim()
                  : `${date} ${time}`.trim() || 'Schedule TBD'
              }
              trailing={amount ? `₹${Number(amount).toLocaleString('en-IN')}` : undefined}
              status={{ label: b.status ?? 'pending', color }}
            />
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
});
