import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { usePriestBookings } from '@poojly/api-client';
import { PortalScreen, ListRow, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
];

export default function PriestBookings() {
  const bookingsQuery = usePriestBookings();
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const all = bookingsQuery.data?.bookings ?? [];
  const filtered = filter === 'all'
    ? all
    : all.filter((b) => b.status.toLowerCase().includes(filter));

  async function onRefresh() {
    setRefreshing(true);
    await bookingsQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Bookings"
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
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <EmptyHint text="No bookings match this filter." />
      ) : (
        filtered.map((b) => (
          <ListRow
            key={b.id}
            primary={`${b.pujaName} (${b.bookingNumber})`}
            secondary={`${b.devoteeName} • ${b.scheduledDate}${b.scheduledTime ? ` ${b.scheduledTime}` : ''}`}
            trailing={`₹${b.totalAmount.toLocaleString('en-IN')}`}
            trailingHint={b.videoUploadedAt ? 'Video uploaded' : 'Awaiting upload'}
            status={{
              label: b.status,
              color: b.status.toLowerCase().includes('complet')
                ? colors.green[600]
                : b.status.toLowerCase().includes('pend')
                  ? colors.amber[600]
                  : colors.saffron[600],
            }}
          />
        ))
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
