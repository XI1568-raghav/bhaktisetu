import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import {
  useMyConsultations,
  useCancelConsultation,
  type MyConsultation,
} from '@poojly/api-client';
import { PortalScreen, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

// Devotee-side parity for web /profile/consultations (commit 3b56f47).
// Hits the NEW /api/v1/consultation/* endpoints introduced 2026-05-30
// (b71b06c) — NOT the legacy /astrology/consultations route consumed by
// the astrologer-portal screen.

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending_payment', label: 'Payment Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function statusMeta(status: string): { color: string; label: string } {
  switch (status) {
    case 'confirmed':
      return { color: colors.green[600], label: 'Confirmed' };
    case 'completed':
      return { color: colors.saffron[600], label: 'Completed' };
    case 'cancelled':
      return { color: colors.red[600], label: 'Cancelled' };
    case 'pending_payment':
      return { color: colors.amber[600], label: 'Payment Pending' };
    default:
      return { color: colors.stone[500], label: status };
  }
}

export default function DevoteeConsultations() {
  const consultationsQuery = useMyConsultations();
  const cancelConsultation = useCancelConsultation();
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const all: MyConsultation[] = consultationsQuery.data?.consultations ?? [];
  const filtered =
    filter === 'all' ? all : all.filter((c) => c.status === filter);

  async function onRefresh() {
    setRefreshing(true);
    await consultationsQuery.refetch();
    setRefreshing(false);
  }

  function handleJoin(c: MyConsultation) {
    if (!c.jitsiUrl) {
      Alert.alert('Not ready', 'The video room is not active yet.');
      return;
    }
    Linking.openURL(c.jitsiUrl).catch(() =>
      Alert.alert('Error', 'Could not open the video room.'),
    );
  }

  function handleCancel(c: MyConsultation) {
    Alert.alert(
      'Cancel consultation?',
      `Reference ${c.reference}. Refund eligibility follows the 24-hour rule (business rule #5).`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Consultation',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(c.id);
            try {
              const result = await cancelConsultation.mutateAsync(c.id);
              if (result?.alreadyCancelled) {
                Alert.alert('Already cancelled', 'This consultation was already cancelled.');
              } else if (result?.refundEligible) {
                Alert.alert(
                  'Cancellation accepted',
                  result.note ?? 'Refund will be processed in 5-7 business days.',
                );
              } else {
                Alert.alert(
                  'Cancellation accepted',
                  result?.note ?? 'No refund — past the 24-hour cancellation window.',
                );
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Failed to cancel';
              Alert.alert('Cancel failed', msg);
            } finally {
              setCancellingId(null);
            }
          },
        },
      ],
    );
  }

  return (
    <PortalScreen
      title="My Consultations"
      subtitle={`${all.length} total`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {consultationsQuery.isError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Could not load your consultations:{' '}
            {consultationsQuery.error instanceof Error
              ? consultationsQuery.error.message
              : 'Unknown error'}
          </Text>
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: spacing.sm }}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {consultationsQuery.isLoading ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : filtered.length === 0 ? (
        <EmptyHint text="No consultations match this filter. Book a session from the Astrology tab." />
      ) : (
        filtered.map((c) => {
          const meta = statusMeta(c.status);
          const canCancel =
            c.status === 'pending_payment' || c.status === 'confirmed';
          const canJoin = c.status === 'confirmed' && !!c.jitsiUrl;
          const scheduled = c.scheduledAt
            ? new Date(c.scheduledAt).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
            : null;
          const isCancellingThis =
            cancellingId === c.id && cancelConsultation.isPending;
          return (
            <View key={c.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardPrimary}>{c.astrologerName}</Text>
                  <Text style={styles.cardRef}>{c.reference}</Text>
                </View>
                <View
                  style={[
                    styles.pill,
                    { backgroundColor: `${meta.color}1A`, borderColor: meta.color },
                  ]}
                >
                  <Text style={[styles.pillText, { color: meta.color }]}>
                    {meta.label}
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>{c.minutes} min</Text>
                <Text style={styles.metaText}>
                  ₹{Number(c.amountInr).toLocaleString('en-IN')}
                </Text>
                {scheduled ? (
                  <Text style={styles.metaText}>{scheduled}</Text>
                ) : null}
              </View>

              <View style={styles.actions}>
                {canJoin ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionPrimary]}
                    onPress={() => handleJoin(c)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionPrimaryText}>Join Call</Text>
                  </TouchableOpacity>
                ) : null}
                {canCancel ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionDanger]}
                    onPress={() => handleCancel(c)}
                    activeOpacity={0.8}
                    disabled={isCancellingThis}
                  >
                    <Text style={styles.actionDangerText}>
                      {isCancellingThis ? 'Cancelling...' : 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {c.status === 'completed' ? (
                  <Text style={styles.closedNote}>Session closed</Text>
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
  cardRef: {
    fontSize: fontSize.xs,
    color: colors.stone[400],
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginLeft: spacing.sm,
  },
  pillText: { fontSize: fontSize.xs, fontWeight: '700' },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  metaText: { fontSize: fontSize.sm, color: colors.stone[500] },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  actionPrimary: {
    backgroundColor: colors.saffron[600],
    borderColor: colors.saffron[600],
  },
  actionPrimaryText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  actionDanger: { backgroundColor: colors.white, borderColor: colors.red[500] },
  actionDangerText: {
    color: colors.red[600],
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  closedNote: {
    fontSize: fontSize.sm,
    color: colors.green[600],
    fontWeight: '600',
  },
});
