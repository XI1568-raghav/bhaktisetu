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
    if (filter === 'upcoming') return status.includes('confirm') || status.includes('pend');
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

      {filtered.length === 0 ? (
        <EmptyHint text="No bookings yet — book a puja to get started." />
      ) : (
        filtered.map((b: any) => {
          const status = String(b.status ?? 'pending').toLowerCase();
          const color = status.includes('complet')
            ? colors.green[600]
            : status.includes('cancel')
              ? colors.red[600]
              : status.includes('confirm')
                ? colors.saffron[600]
                : colors.amber[600];
          return (
            <ListRow
              key={b.id}
              primary={b.pujaName ?? b.bookingNumber ?? 'Booking'}
              secondary={`${b.scheduledDate ?? ''} ${b.scheduledTime ?? ''}`.trim() || 'Schedule TBD'}
              trailing={b.totalAmount ? `₹${Number(b.totalAmount).toLocaleString('en-IN')}` : undefined}
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
});
