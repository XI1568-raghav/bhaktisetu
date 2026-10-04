import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { useAstrologerConsultations, useCompleteConsultation } from '../../lib/provider-queries';
import {
  CONSULTATION_FILTERS,
  canCompleteConsultation,
  canJoinConsultation,
  filterConsultations,
  selectAstrologerConsultations,
  type AstrologerConsultationVM,
} from '../../lib/astrologer-consultations';
import { PortalScreen, EmptyHint } from '../../lib/portal-screen';
import { formatInr } from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { consultationStatusLabel } from '../../lib/enum-labels';

/**
 * The astrologer's real booked consultations.
 *
 * This screen used to read `GET /astrology/consultations`, which answers from
 * an in-memory Map that is empty after every restart — see the header of
 * lib/astrologer-consultations.ts for the full account. Three consequences,
 * all fixed here:
 *
 *   · the list was empty for every astrologer with real, paid bookings;
 *   · "Join Call" and "Mark Completed" addressed that Map, so both 404'd on a
 *     real consultation id;
 *   · "Cancel" had no server behind it at all for this role —
 *     POST /consultation/:id/cancel is devotee-only and 403s the astrologer.
 *     It is deleted rather than left to apologise.
 *
 * The money line says "Devotee paid". `amount_inr` is GROSS; the astrologer's
 * own share is `Commission.amount` and lives on the Earnings tab. This screen
 * derives no payout.
 */
function statusColor(status: string): string {
  switch (status) {
    case 'completed':
      return colors.green[600];
    case 'cancelled':
      return colors.red[600];
    case 'confirmed':
      return colors.saffron[600];
    default:
      return colors.amber[600];
  }
}

function formatWhen(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Consultations() {
  const consultationsQuery = useAstrologerConsultations();
  const completeConsultation = useCompleteConsultation();
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = selectAstrologerConsultations(consultationsQuery.data);
  const filtered = rows === null ? [] : filterConsultations(rows, filter);

  const loadError = consultationsQuery.isError
    ? consultationsQuery.error instanceof Error
      ? consultationsQuery.error.message
      : 'Unknown error'
    : !consultationsQuery.isLoading && rows === null
      ? 'The server returned an unexpected response.'
      : null;

  async function onRefresh() {
    setRefreshing(true);
    await consultationsQuery.refetch();
    setRefreshing(false);
  }

  function handleJoin(c: AstrologerConsultationVM) {
    if (!c.jitsiUrl) return;
    void Linking.openURL(c.jitsiUrl);
  }

  function handleComplete(c: AstrologerConsultationVM) {
    Alert.alert(
      'Mark this consultation completed?',
      `${c.reference ?? 'This consultation'} will be closed. This cannot be undone from the app.`,
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Mark completed',
          onPress: async () => {
            setBusyId(c.id);
            try {
              await completeConsultation.mutateAsync(c.id);
            } catch (err) {
              Alert.alert(
                'Not completed',
                err instanceof Error ? err.message : 'That did not go through.',
              );
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  }

  return (
    <PortalScreen
      title="Consultations"
      subtitle={
        consultationsQuery.isLoading && rows === null
          ? 'Loading…'
          : rows === null
            ? 'Unavailable'
            : `${rows.length} total`
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {loadError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Could not load your consultations: {loadError}
          </Text>
          <Text style={styles.errorHint}>
            This is a load failure, not a report that you have none. Pull down to
            retry.
          </Text>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
        {CONSULTATION_FILTERS.map((f) => {
          const active = filter === f.key;
          const count = rows === null ? null : filterConsultations(rows, f.key).length;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
              accessibilityRole="button"
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f.label}
                {count === null ? '' : ` (${count})`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {consultationsQuery.isLoading && rows === null ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : rows === null ? null : filtered.length === 0 ? (
        <EmptyHint text="No consultations match this filter." />
      ) : (
        filtered.map((c) => {
          const color = statusColor(c.status);
          const when = formatWhen(c.scheduledAt) ?? formatWhen(c.createdAt);
          const isBusy = busyId === c.id;
          const joinable = canJoinConsultation(c.status, c.jitsiUrl);
          const completable = canCompleteConsultation(c.status);
          return (
            <View key={c.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardPrimary}>{c.reference ?? 'Consultation'}</Text>
                  <Text style={styles.cardSecondary}>
                    {[c.minutes === null ? null : `${c.minutes} min`, when]
                      .filter(Boolean)
                      .join(' • ') || 'Not scheduled yet'}
                  </Text>
                </View>
                <View style={[styles.pill, { backgroundColor: `${color}1A`, borderColor: color }]}>
                  <Text style={[styles.pillText, { color }]}>
                    {consultationStatusLabel(c.status)}
                  </Text>
                </View>
              </View>

              {c.grossPaidInr === null ? null : (
                <Text style={styles.amount}>
                  Devotee paid {formatInr(c.grossPaidInr)}
                  <Text style={styles.amountHint}> · your share is on Earnings</Text>
                </Text>
              )}

              {joinable || completable ? (
                <View style={styles.actions}>
                  {joinable ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionPrimary]}
                      onPress={() => handleJoin(c)}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="Open the consultation room"
                    >
                      <Text style={styles.actionPrimaryText}>Open room</Text>
                    </TouchableOpacity>
                  ) : null}
                  {completable ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionGhost, isBusy && styles.btnDisabled]}
                      onPress={() => handleComplete(c)}
                      disabled={isBusy}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="Mark this consultation completed"
                    >
                      <Text style={styles.actionGhostText}>
                        {isBusy ? 'Saving…' : 'Mark Completed'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}

              {c.status === 'confirmed' && !c.jitsiUrl ? (
                <Text style={styles.note}>
                  The room for this consultation has not been created yet.
                </Text>
              ) : null}
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
  errorText: { color: colors.red[600], fontSize: fontSize.sm, fontWeight: '600' },
  errorHint: { color: colors.red[600], fontSize: fontSize.xs, marginTop: 2, lineHeight: 16 },
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
    color: colors.stone[800],
    marginTop: spacing.xs,
  },
  amountHint: { fontSize: fontSize.xs, fontWeight: '500', color: colors.stone[500] },
  note: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  btnDisabled: { opacity: 0.5 },
  actionPrimary: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[600] },
  actionPrimaryText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '700' },
  actionGhost: { backgroundColor: colors.white, borderColor: colors.stone[300] },
  actionGhostText: { color: colors.stone[700], fontSize: fontSize.sm, fontWeight: '700' },
});
