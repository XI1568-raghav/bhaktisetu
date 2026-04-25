import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { PortalScreen, Section, ListRow } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface Ticket {
  id: string;
  subject: string;
  user: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
}

const TICKETS: Ticket[] = [
  { id: 'T-1041', subject: 'Booking refund not received', user: 'Anjali S.', priority: 'high', status: 'open', createdAt: '2h ago' },
  { id: 'T-1040', subject: 'Cannot upload Aadhaar (priest)', user: 'Pandit Sharma', priority: 'medium', status: 'in_progress', createdAt: '4h ago' },
  { id: 'T-1039', subject: 'NRI payment failed for puja', user: 'Ramesh K. (US)', priority: 'high', status: 'open', createdAt: '6h ago' },
  { id: 'T-1038', subject: 'Profile photo not updating', user: 'Priya M.', priority: 'low', status: 'resolved', createdAt: '1 day ago' },
  { id: 'T-1037', subject: 'Stream buffering on iOS', user: 'Vikram B.', priority: 'medium', status: 'in_progress', createdAt: '1 day ago' },
];

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
];

const STATUS_COLOR: Record<Ticket['status'], string> = {
  open: colors.red[600],
  in_progress: colors.amber[600],
  resolved: colors.green[600],
};

export default function AdminSupport() {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? TICKETS : TICKETS.filter((t) => t.status === filter);

  return (
    <PortalScreen title="Support" subtitle={`${TICKETS.filter((t) => t.status !== 'resolved').length} unresolved`}>
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

      <Section title="Tickets">
        {filtered.map((t) => (
          <ListRow
            key={t.id}
            primary={`${t.id} • ${t.subject}`}
            secondary={`${t.user} • ${t.createdAt}`}
            status={{ label: t.status.replace('_', ' '), color: STATUS_COLOR[t.status] }}
          />
        ))}
      </Section>
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
