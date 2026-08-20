import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import {
  useAstrologyConsultations,
  useUpdateConsultation,
  useStartConsultationCall,
} from '@poojly/api-client';
import { PortalScreen, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { consultationStatusLabel, consultationTypeLabel } from '../../lib/enum-labels';

interface Consultation {
  id: string;
  clientName?: string;
  devoteeName?: string;
  type?: string;
  durationMinutes?: number;
  amount?: number | string;
  scheduledAt?: string;
  status: string;
  roomUrl?: string | null;
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'scheduled', label: 'Upcoming' },
  { key: 'in_progress', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('complet')) return colors.green[600];
  if (s.includes('cancel')) return colors.red[600];
  if (s.includes('progress')) return colors.amber[600];
  return colors.saffron[600];
}

export default function Consultations() {
  const consultationsQuery = useAstrologyConsultations({ role: 'astrologer' });
  const startCall = useStartConsultationCall();
  const updateConsultation = useUpdateConsultation();
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const consultations = (consultationsQuery.data?.consultations as Consultation[] | undefined) ?? [];
  const filtered =
    filter === 'all'
      ? consultations
      : consultations.filter((c) => String(c.status).toLowerCase().includes(filter));

  async function onRefresh() {
    setRefreshing(true);
    await consultationsQuery.refetch();
    setRefreshing(false);
  }

  async function handleJoin(c: Consultation) {
    if (c.roomUrl) {
      Linking.openURL(c.roomUrl);
      return;
    }
    try {
      const result = await startCall.mutateAsync(c.id);
      if (result?.roomUrl) {
        Linking.openURL(result.roomUrl);
      } else {
        Alert.alert('Could not start call', 'No room URL returned.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start call';
      Alert.alert('Error', msg);
    }
  }

  function handleEnd(c: Consultation) {
    Alert.alert('Mark consultation completed?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Completed',
        onPress: async () => {
          try {
            await updateConsultation.mutateAsync({ id: c.id, status: 'COMPLETED' });
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed');
          }
        },
      },
    ]);
  }

  function handleCancel(c: Consultation) {
    Alert.alert('Cancel consultation?', '', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateConsultation.mutateAsync({ id: c.id, status: 'CANCELLED' });
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed');
          }
        },
      },
    ]);
  }

  return (
    <PortalScreen
      title="Consultations"
      subtitle={`${consultations.length} total`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {consultationsQuery.isError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Could not load consultations:{' '}
            {consultationsQuery.error instanceof Error ? consultationsQuery.error.message : 'Unknown error'}
          </Text>
        </View>
      ) : null}

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

      {consultationsQuery.isLoading ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : filtered.length === 0 ? (
        <EmptyHint text="No consultations match this filter." />
      ) : (
        filtered.map((c) => {
          const status = String(c.status ?? '').toLowerCase();
          const canJoin = status.includes('schedul') || status.includes('progress');
          const canEnd = status.includes('progress') || status.includes('schedul');
          const canCancel = !status.includes('cancel') && !status.includes('complet');
          const clientName = c.clientName ?? c.devoteeName ?? 'Client';
          const date = c.scheduledAt
            ? new Date(c.scheduledAt).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '—';
          return (
            <View key={c.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardPrimary}>
                    {[clientName, consultationTypeLabel(c.type)].filter(Boolean).join(' • ')}
                  </Text>
                  <Text style={styles.cardSecondary}>
                    {c.durationMinutes ? `${c.durationMinutes} min • ` : ''}
                    {date}
                  </Text>
                </View>
                <View
                  style={[
                    styles.pill,
                    { backgroundColor: `${statusColor(c.status)}1A`, borderColor: statusColor(c.status) },
                  ]}
                >
                  <Text style={[styles.pillText, { color: statusColor(c.status) }]}>{consultationStatusLabel(c.status)}</Text>
                </View>
              </View>

              {c.amount ? (
                <Text style={styles.amount}>₹{Number(c.amount).toLocaleString('en-IN')}</Text>
              ) : null}

              <View style={styles.actions}>
                {canJoin ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionPrimary]}
                    onPress={() => handleJoin(c)}
                    disabled={startCall.isPending}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionPrimaryText}>
                      {startCall.isPending ? 'Starting...' : 'Join Call'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {canEnd ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionGhost]}
                    onPress={() => handleEnd(c)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionGhostText}>Mark Completed</Text>
                  </TouchableOpacity>
                ) : null}
                {canCancel ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionDanger]}
                    onPress={() => handleCancel(c)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionDangerText}>Cancel</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
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
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    marginBottom: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardPrimary: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  cardSecondary: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginLeft: spacing.sm,
  },
  pillText: { fontSize: fontSize.xs, fontWeight: '700' },
  amount: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.saffron[700],
    marginTop: spacing.xs,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  actionPrimary: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[600] },
  actionPrimaryText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '700' },
  actionGhost: { backgroundColor: colors.white, borderColor: colors.stone[300] },
  actionGhostText: { color: colors.stone[700], fontSize: fontSize.sm, fontWeight: '700' },
  actionDanger: { backgroundColor: colors.white, borderColor: colors.red[500] },
  actionDangerText: { color: colors.red[600], fontSize: fontSize.sm, fontWeight: '700' },
});
