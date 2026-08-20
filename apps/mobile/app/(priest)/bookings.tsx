import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { api, usePriestBookings } from '@poojly/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { PortalScreen, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { bookingStatusLabel } from '../../lib/enum-labels';

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

export default function PriestBookings() {
  const bookingsQuery = usePriestBookings();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const all = bookingsQuery.data?.bookings ?? [];
  const filtered =
    filter === 'all'
      ? all
      : all.filter((b) => b.status.toLowerCase().includes(filter));

  async function onRefresh() {
    setRefreshing(true);
    await bookingsQuery.refetch();
    setRefreshing(false);
  }

  async function withBusy(id: string, fn: () => Promise<unknown>, successMsg: string) {
    setBusyId(id);
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ['priest', 'bookings'] });
      Alert.alert('Success', successMsg);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  function handleStart(id: string) {
    withBusy(
      id,
      () => api.patch(`/api/v1/priest/bookings/${id}/start`, {}),
      'Booking marked as in-progress.'
    );
  }

  function handleComplete(id: string) {
    withBusy(
      id,
      () => api.patch(`/api/v1/priest/bookings/${id}/complete`, {}),
      'Booking marked completed.'
    );
  }

  function handleUploadVideo(id: string) {
    Alert.prompt?.(
      'Video proof URL',
      'Paste the uploaded video URL (R2 / S3)',
      async (input?: string) => {
        const videoUrl = (input ?? '').trim();
        if (!videoUrl) return;
        withBusy(
          id,
          () => api.post(`/api/v1/priest/bookings/${id}/video`, { videoUrl }),
          'Video proof uploaded.'
        );
      },
      'plain-text',
      ''
    );
    if (!Alert.prompt) {
      Alert.alert('Upload Video', 'Use the desktop/web portal to upload video proof for now.');
    }
  }

  return (
    <PortalScreen
      title="Bookings"
      subtitle={`${all.length} total`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {bookingsQuery.isError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Could not load bookings:{' '}
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
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {bookingsQuery.isLoading ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : filtered.length === 0 ? (
        <EmptyHint text="No bookings match this filter." />
      ) : (
        filtered.map((b) => {
          const status = b.status.toLowerCase();
          const color = status.includes('complet')
            ? colors.green[600]
            : status.includes('pend')
              ? colors.amber[600]
              : status.includes('cancel')
                ? colors.red[600]
                : colors.saffron[600];
          const canStart = status.includes('confirm') || status.includes('priest_assigned') || status.includes('book');
          const canComplete = status.includes('progress') || status.includes('in_');
          const canUpload = !b.videoUploadedAt && (status.includes('complet') || status.includes('progress'));
          const isBusy = busyId === b.id;
          return (
            <View key={b.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardPrimary}>
                    {b.pujaName} ({b.bookingNumber})
                  </Text>
                  <Text style={styles.cardSecondary}>
                    {b.devoteeName} • {b.scheduledDate}
                    {b.scheduledTime ? ` ${b.scheduledTime}` : ''}
                  </Text>
                  <Text style={styles.cardSecondary}>
                    {b.videoUploadedAt ? 'Video uploaded' : 'Awaiting video upload'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.pill,
                    { backgroundColor: `${color}1A`, borderColor: color },
                  ]}
                >
                  <Text style={[styles.pillText, { color }]}>{bookingStatusLabel(b.status)}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.amount}>₹{b.totalAmount.toLocaleString('en-IN')}</Text>
                <View style={styles.actions}>
                  {canStart ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionPrimary]}
                      onPress={() => handleStart(b.id)}
                      disabled={isBusy}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionPrimaryText}>{isBusy ? '...' : 'Start'}</Text>
                    </TouchableOpacity>
                  ) : null}
                  {canComplete ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionGhost]}
                      onPress={() => handleComplete(b.id)}
                      disabled={isBusy}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionGhostText}>{isBusy ? '...' : 'Complete'}</Text>
                    </TouchableOpacity>
                  ) : null}
                  {canUpload ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionGhost]}
                      onPress={() => handleUploadVideo(b.id)}
                      disabled={isBusy}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionGhostText}>Upload Video</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
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
  cardFooter: { marginTop: spacing.sm },
  amount: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.saffron[700],
    marginBottom: spacing.xs,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
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
});
