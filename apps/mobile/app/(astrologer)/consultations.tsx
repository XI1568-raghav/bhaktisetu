import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAstrologers } from '@poojly/api-client';
import { PortalScreen, ListRow, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface Session {
  id: string;
  client: string;
  type: 'chat' | 'call' | 'video';
  duration: string;
  amount: number;
  date: string;
  status: 'completed' | 'cancelled' | 'upcoming';
}

const FALLBACK: Session[] = [
  { id: '1', client: 'Anjali S.', type: 'video', duration: '45 min', amount: 1500, date: 'Today, 11:00 AM', status: 'upcoming' },
  { id: '2', client: 'Ramesh K.', type: 'call', duration: '30 min', amount: 1200, date: 'Yesterday', status: 'completed' },
  { id: '3', client: 'Priya M.', type: 'chat', duration: '20 min', amount: 800, date: '2 days ago', status: 'completed' },
  { id: '4', client: 'Vikram B.', type: 'video', duration: '60 min', amount: 2500, date: '3 days ago', status: 'completed' },
  { id: '5', client: 'Meera D.', type: 'call', duration: '15 min', amount: 600, date: '5 days ago', status: 'cancelled' },
];

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLOR: Record<Session['status'], string> = {
  upcoming: colors.saffron[600],
  completed: colors.green[600],
  cancelled: colors.red[600],
};

export default function Consultations() {
  const astrologersQuery = useAstrologers();
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const sessions = FALLBACK;
  const filtered = filter === 'all' ? sessions : sessions.filter((s) => s.status === filter);

  async function onRefresh() {
    setRefreshing(true);
    await astrologersQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Consultations"
      subtitle={`${sessions.length} total sessions`}
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
        <EmptyHint text="No sessions match this filter." />
      ) : (
        filtered.map((s) => (
          <ListRow
            key={s.id}
            primary={`${s.client} • ${s.type.toUpperCase()}`}
            secondary={`${s.duration} • ${s.date}`}
            trailing={`₹${s.amount.toLocaleString('en-IN')}`}
            status={{ label: s.status, color: STATUS_COLOR[s.status] }}
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
