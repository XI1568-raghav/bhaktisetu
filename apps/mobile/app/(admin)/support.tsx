import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAdminPendingApprovals, useSupportTickets } from '@poojly/api-client';
import { PortalScreen, Section, ListRow, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { supportTicketStatusLabel } from '../../lib/enum-labels';

// Server's SupportTicketStatus enum is UPPER_SNAKE (OPEN/IN_PROGRESS/RESOLVED/CLOSED).
// We translate to the lower-snake variant the UI uses so existing
// chip/colour wiring keeps working.
type UiStatus = 'open' | 'in_progress' | 'resolved';
type UiPriority = 'low' | 'medium' | 'high';

interface Ticket {
  id: string;
  subject: string;
  user: string;
  priority: UiPriority;
  status: UiStatus;
  createdAt: string;
}

interface RawTicket {
  id: string;
  ticketNumber?: string | null;
  subject: string;
  status?: string;
  priority?: string;
  createdAt: string;
  userId?: string;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function normalizeStatus(raw: string | undefined): UiStatus {
  const s = (raw ?? '').toUpperCase();
  if (s === 'IN_PROGRESS' || s === 'WAITING_ON_USER') return 'in_progress';
  if (s === 'RESOLVED' || s === 'CLOSED') return 'resolved';
  return 'open';
}

function normalizePriority(raw: string | undefined): UiPriority {
  const s = (raw ?? '').toUpperCase();
  if (s === 'HIGH' || s === 'URGENT') return 'high';
  if (s === 'LOW') return 'low';
  return 'medium';
}

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
  const approvalsQuery = useAdminPendingApprovals();
  const ticketsQuery = useSupportTickets({ all: true });
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const tickets: Ticket[] = ((ticketsQuery.data?.data as RawTicket[] | undefined) ?? []).map((t) => ({
    id: t.ticketNumber ?? t.id.slice(0, 8),
    subject: t.subject,
    user: t.userId ? `User ${t.userId.slice(0, 6)}` : '—',
    priority: normalizePriority(t.priority),
    status: normalizeStatus(t.status),
    createdAt: relativeTime(t.createdAt),
  }));
  const filtered = filter === 'all' ? tickets : tickets.filter((t) => t.status === filter);
  const pendingApprovals = approvalsQuery.data?.total ?? 0;
  const unresolvedCount = tickets.filter((t) => t.status !== 'resolved').length;

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([approvalsQuery.refetch(), ticketsQuery.refetch()]);
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Support"
      subtitle={ticketsQuery.isLoading
        ? 'Loading tickets…'
        : `${unresolvedCount} unresolved • ${pendingApprovals} provider approvals pending`}
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

      <Section title="Tickets">
        {ticketsQuery.isLoading ? (
          <EmptyHint text="Loading tickets…" />
        ) : ticketsQuery.isError ? (
          <EmptyHint text="Could not load tickets. Pull to refresh." />
        ) : filtered.length === 0 ? (
          <EmptyHint text={tickets.length === 0 ? 'No support tickets yet.' : 'No tickets match this filter.'} />
        ) : (
          filtered.map((t) => (
            <ListRow
              key={t.id}
              primary={`${t.id} • ${t.subject}`}
              secondary={`${t.user} • ${t.createdAt}`}
              status={{ label: supportTicketStatusLabel(t.status), color: STATUS_COLOR[t.status] }}
            />
          ))
        )}
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
