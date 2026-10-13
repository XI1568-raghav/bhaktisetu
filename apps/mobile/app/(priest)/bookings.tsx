/**
 * `(priest)/bookings` — the pandit's assigned book.
 *
 * Three things changed here beyond the original start / complete / video trio:
 *
 * 1. ACCEPT AND DECLINE (the P0). `PATCH /priest/bookings/:id/accept` and
 *    `/reject` have existed since the assignment queue shipped, and apps/web
 *    renders both. The app rendered neither, so a `confirmed` booking — the
 *    status the web portal labels "Pending Accept" — was a dead card on the
 *    phone and the pandit had to find a desktop to take his own work.
 *
 * 2. STATUS GATING BY EXACT VALUE. The old card asked
 *    `status.includes('confirm') || status.includes('book')` before showing
 *    Start, so a `confirmed` booking offered "Start" — and
 *    booking.service.VALID_TRANSITIONS has no `confirmed → in_progress` edge,
 *    so that button could only ever 400. An action the API will reject is worse
 *    than no action: the pandit taps, nothing happens, and he stops trusting
 *    the screen.
 *
 * 3. THE ROW SHAPE. `usePriestBookings` is typed `{ pujaName, devoteeName,
 *    totalAmount, scheduledTime }`, but `GET /priest/bookings` answers with
 *    priest.service's `assignedBookingSelect` — `pujaType.name`, `user.fullName`,
 *    `priceAmount`, `scheduledTimeSlot`. Every one of those four reads was
 *    `undefined` at runtime, which is why the card said "undefined (undefined)"
 *    and `totalAmount.toLocaleString` was one render away from throwing. The
 *    hook's type lives in packages/api-client and is not this screen's to fix,
 *    so the rows are normalised here and both shapes are accepted.
 *
 * Open OFFERS are deliberately not in this list and cannot be: getAssignedBookings
 * filters on `{ priestId }`, and a dispatch offer has no priestId until someone
 * accepts it. Those live on `(priest)/offers`, linked at the top of this screen.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { usePriestBookings } from '@poojly/api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PortalScreen, EmptyHint } from '../../lib/portal-screen';
import { useAuth } from '../../lib/auth-context';
import { apiBase } from '../../lib/api';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { bookingStatusLabel } from '../../lib/enum-labels';
import { authedFetch } from '../../lib/authed-fetch';

// ─── Views ──────────────────────────────────────────────────────────────────

/** Mirrors the API's PRIEST_BOOKING_VIEWS so a tab here means what it means there. */
const VIEWS: { key: string; label: string; statuses: string[] | null }[] = [
  { key: 'all', label: 'All', statuses: null },
  { key: 'confirmed', label: 'To accept', statuses: ['confirmed'] },
  { key: 'priest_assigned', label: 'Accepted', statuses: ['priest_assigned'] },
  { key: 'in_progress', label: 'In progress', statuses: ['in_progress'] },
  { key: 'completed', label: 'Completed', statuses: ['completed', 'video_uploaded', 'delivered'] },
];

// ─── Row normalisation ──────────────────────────────────────────────────────

/** Both the declared api-client shape and the shape the API actually returns. */
interface RawBookingRow {
  id: string;
  status?: string | null;
  bookingNumber?: string | null;
  videoUploadedAt?: string | null;
  videoProofUrl?: string | null;
  scheduledDate?: string | null;
  // real
  scheduledTimeSlot?: string | null;
  priceAmount?: string | number | null;
  pujaType?: { name?: string | null } | null;
  user?: { fullName?: string | null } | null;
  // as declared by packages/api-client's PriestBooking
  scheduledTime?: string | null;
  totalAmount?: string | number | null;
  pujaName?: string | null;
  devoteeName?: string | null;
}

interface BookingRow {
  id: string;
  status: string;
  bookingNumber: string;
  pujaName: string;
  devoteeName: string;
  scheduledDate: string | null;
  scheduledTime: string;
  amount: number | null;
  hasVideo: boolean;
}

function normalise(raw: RawBookingRow): BookingRow {
  const rawAmount = raw.priceAmount ?? raw.totalAmount ?? null;
  const amount = rawAmount === null ? null : Number(rawAmount);
  return {
    id: raw.id,
    status: (raw.status ?? '').toLowerCase(),
    bookingNumber: raw.bookingNumber ?? '',
    pujaName: raw.pujaType?.name ?? raw.pujaName ?? 'Puja booking',
    devoteeName: raw.user?.fullName ?? raw.devoteeName ?? 'Devotee',
    scheduledDate: raw.scheduledDate ?? null,
    scheduledTime: raw.scheduledTimeSlot ?? raw.scheduledTime ?? '',
    amount: amount !== null && Number.isFinite(amount) ? amount : null,
    hasVideo: !!raw.videoUploadedAt || !!raw.videoProofUrl,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** UTC-midnight DATE pinned to the puja's own zone — never the previous day. */
function formatDate(value: string | null): string {
  if (!value) return 'Date to be confirmed';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function formatMoney(value: number | null): string {
  if (value === null) return '—';
  return `₹${value.toLocaleString('en-IN')}`;
}

function statusColor(status: string): string {
  switch (status) {
    case 'completed':
    case 'video_uploaded':
    case 'delivered':
      return colors.green[600];
    case 'confirmed':
      return colors.amber[600];
    case 'cancelled':
    case 'refunded':
      return colors.red[600];
    default:
      return colors.saffron[600];
  }
}

/** Fastify's error envelope on the priest routes is `{ error: "<sentence>" }`. */
function serverSentence(payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const err = (payload as { error?: unknown }).error;
    if (typeof err === 'string' && err.trim()) return err.trim();
  }
  return '';
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function PriestBookings() {
  const { session } = useAuth();
  const token = session?.accessToken ?? '';
  const bookingsQuery = usePriestBookings();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  /**
   * Offer count for the banner. Shares the `['priest','offers']` cache with
   * `(priest)/offers`, so opening that screen is instant and accepting there
   * updates this number without a second request.
   */
  const offersQuery = useQuery<{ offers: unknown[] }>({
    queryKey: ['priest', 'offers'],
    enabled: !!token,
    // Byte-identical to the fetcher on `(priest)/offers`: one query key must
    // mean one request AND one error. A shortcut like `throw new Error('offers
    // unavailable')` here would become the sentence that screen shows, because
    // whichever fetcher runs first owns the cached error.
    queryFn: async () => {
      const res = await authedFetch(`${apiBase()}/api/v1/priest/offers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(serverSentence(body) || 'Could not load your offers. Please try again.');
      }
      const data = await res.json();
      return { offers: Array.isArray(data?.offers) ? data.offers : [] };
    },
  });

  const all = useMemo(
    () => ((bookingsQuery.data?.bookings ?? []) as unknown as RawBookingRow[]).map(normalise),
    [bookingsQuery.data]
  );

  const activeView = VIEWS.find((v) => v.key === filter) ?? VIEWS[0]!;
  const filtered = activeView.statuses
    ? all.filter((b) => activeView.statuses!.includes(b.status))
    : all;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([bookingsQuery.refetch(), offersQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [bookingsQuery, offersQuery]);

  /**
   * The four bodyless priest transitions.
   *
   * NO Content-Type header and NO body: declaring application/json on a bodyless
   * request makes Fastify reject it before the handler runs
   * (FST_ERR_CTP_EMPTY_JSON_BODY). Raw fetch rather than the api-client because
   * these routes answer `{ error: "<sentence>" }` and the client's error mapper
   * reads `data.error.message`, so the server's own sentence — including
   * "This booking has already been assigned." — is otherwise replaced with
   * "Request failed with status 400".
   */
  async function transition(id: string, action: 'accept' | 'reject' | 'start' | 'complete') {
    if (!token) return;
    setBusyId(id);
    setActionError(null);
    try {
      const res = await authedFetch(`${apiBase()}/api/v1/priest/bookings/${id}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setActionError(
          serverSentence(payload) || 'That action did not go through. Please try again.'
        );
      }
      // Success or failure, the server is the authority on this booking's state
      // and on the tab it now belongs to. Re-read rather than patching locally.
      await bookingsQuery.refetch();
      await qc.invalidateQueries({ queryKey: ['priest', 'dashboard'] });
    } catch {
      setActionError('Could not reach Darshya. Check your connection and try again.');
    } finally {
      setBusyId(null);
    }
  }

  /**
   * Declining is never one unguarded tap next to Accept: `rejectBooking` clears
   * priestId, returns the booking to the queue for re-dispatch, and reverses any
   * Commission already minted against it.
   */
  function confirmReject(b: BookingRow) {
    const accepted = b.status === 'priest_assigned';
    Alert.alert(
      accepted ? 'Release this booking?' : 'Decline this booking?',
      `${b.pujaName} on ${formatDate(b.scheduledDate)} goes back to the queue for another pandit, and any earning recorded against it is reversed.`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: accepted ? 'Release' : 'Decline',
          style: 'destructive',
          onPress: () => {
            void transition(b.id, 'reject');
          },
        },
      ]
    );
  }

  function openDetail(id: string) {
    router.push({ pathname: '/(priest)/booking-detail', params: { id } });
  }

  const offerCount = offersQuery.data?.offers.length ?? null;

  return (
    <PortalScreen
      title="Bookings"
      subtitle={bookingsQuery.isError ? undefined : `${all.length} total`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Open offers are invisible to this list by construction — they have no
          priestId yet — so the entry point has to be explicit. */}
      <TouchableOpacity
        style={styles.offersBanner}
        onPress={() => router.push('/(priest)/offers')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Open puja offers"
      >
        <Ionicons name="flash" size={20} color={colors.saffron[700]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.offersTitle}>Puja offers</Text>
          <Text style={styles.offersHint}>
            {offersQuery.isLoading
              ? 'Checking for new requests…'
              : offersQuery.isError
                ? 'Tap to check for new requests'
                : offerCount === 0
                  ? 'No open offers right now'
                  : `${offerCount} offer${offerCount === 1 ? '' : 's'} waiting for your answer`}
          </Text>
        </View>
        {offerCount ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{offerCount}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={colors.stone[400]} />
      </TouchableOpacity>

      {bookingsQuery.isError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Could not load bookings:{' '}
            {bookingsQuery.error instanceof Error ? bookingsQuery.error.message : 'Unknown error'}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => void bookingsQuery.refetch()}
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={16} color={colors.white} />
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {actionError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{actionError}</Text>
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: spacing.sm }}
      >
        {VIEWS.map((v) => {
          const active = filter === v.key;
          const count = v.statuses ? all.filter((b) => v.statuses!.includes(b.status)).length : all.length;
          return (
            <TouchableOpacity
              key={v.key}
              onPress={() => setFilter(v.key)}
              activeOpacity={0.7}
              accessibilityRole="button"
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {v.label}
                {bookingsQuery.isError ? '' : ` (${count})`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {bookingsQuery.isLoading ? (
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colors.saffron[600]} />
          <Text style={styles.centreText}>Loading your bookings…</Text>
        </View>
      ) : bookingsQuery.isError ? null : filtered.length === 0 ? (
        <EmptyHint text="No bookings match this filter." />
      ) : (
        filtered.map((b) => {
          const color = statusColor(b.status);
          const isBusy = busyId === b.id;
          const canAccept = b.status === 'confirmed';
          const canStart = b.status === 'priest_assigned';
          const canRelease = b.status === 'confirmed' || b.status === 'priest_assigned';
          const canComplete = b.status === 'in_progress';
          // Video proof is filed on the detail screen — it needs a real text
          // field, and `Alert.prompt` does not exist on Android at all.
          const needsVideo = b.status === 'completed' && !b.hasVideo;

          return (
            <TouchableOpacity
              key={b.id}
              style={styles.card}
              onPress={() => openDetail(b.id)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Open ${b.pujaName} booking`}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardPrimary}>
                    {b.pujaName}
                    {b.bookingNumber ? ` (${b.bookingNumber})` : ''}
                  </Text>
                  <Text style={styles.cardSecondary}>
                    {b.devoteeName} • {formatDate(b.scheduledDate)}
                    {b.scheduledTime ? ` ${b.scheduledTime}` : ''}
                  </Text>
                  <Text style={styles.cardSecondary}>
                    {b.hasVideo ? 'Video uploaded' : 'Awaiting video upload'}
                  </Text>
                </View>
                <View style={[styles.pill, { backgroundColor: `${color}1A`, borderColor: color }]}>
                  <Text style={[styles.pillText, { color }]}>{bookingStatusLabel(b.status)}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.amount}>{formatMoney(b.amount)}</Text>
                <View style={styles.actions}>
                  {canAccept ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionAccept, isBusy && styles.btnDisabled]}
                      onPress={() => void transition(b.id, 'accept')}
                      disabled={isBusy}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={`Accept ${b.pujaName}`}
                    >
                      {isBusy ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <Ionicons name="checkmark-circle" size={16} color={colors.white} />
                      )}
                      <Text style={styles.actionPrimaryText}>Accept</Text>
                    </TouchableOpacity>
                  ) : null}

                  {canStart ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionPrimary, isBusy && styles.btnDisabled]}
                      onPress={() => void transition(b.id, 'start')}
                      disabled={isBusy}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={`Start ${b.pujaName}`}
                    >
                      {isBusy ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <Ionicons name="play" size={16} color={colors.white} />
                      )}
                      <Text style={styles.actionPrimaryText}>Start</Text>
                    </TouchableOpacity>
                  ) : null}

                  {canComplete ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionPrimary, isBusy && styles.btnDisabled]}
                      onPress={() => void transition(b.id, 'complete')}
                      disabled={isBusy}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={`Mark ${b.pujaName} complete`}
                    >
                      {isBusy ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <Ionicons name="checkmark-done" size={16} color={colors.white} />
                      )}
                      <Text style={styles.actionPrimaryText}>Complete</Text>
                    </TouchableOpacity>
                  ) : null}

                  {needsVideo ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionGhost]}
                      onPress={() => openDetail(b.id)}
                      disabled={isBusy}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={`Upload video proof for ${b.pujaName}`}
                    >
                      <Ionicons name="videocam-outline" size={16} color={colors.stone[700]} />
                      <Text style={styles.actionGhostText}>Upload video</Text>
                    </TouchableOpacity>
                  ) : null}

                  {canRelease ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionDanger, isBusy && styles.btnDisabled]}
                      onPress={() => confirmReject(b)}
                      disabled={isBusy}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={
                        canStart ? `Release ${b.pujaName}` : `Decline ${b.pujaName}`
                      }
                    >
                      <Ionicons name="close-circle-outline" size={16} color={colors.red[600]} />
                      <Text style={styles.actionDangerText}>{canStart ? 'Release' : 'Decline'}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  offersBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.saffron[50],
    borderColor: colors.saffron[200],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 64,
    marginBottom: spacing.sm,
  },
  offersTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  offersHint: { fontSize: fontSize.sm, color: colors.stone[600], marginTop: 2 },
  badge: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.saffron[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '800' },

  chip: {
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: colors.stone[100],
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.saffron[600] },
  chipText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.stone[600] },
  chipTextActive: { color: colors.white },

  centre: { paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.sm },
  centreText: { fontSize: fontSize.sm, color: colors.stone[500] },

  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: colors.red[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  errorText: { color: colors.red[600], fontSize: fontSize.sm, lineHeight: 19 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[600],
    marginTop: spacing.sm,
  },
  retryText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },

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
    marginBottom: spacing.sm,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
    minWidth: 96,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  actionAccept: { backgroundColor: colors.green[600], borderColor: colors.green[600] },
  actionPrimary: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[600] },
  actionPrimaryText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
  actionGhost: { backgroundColor: colors.white, borderColor: colors.stone[300] },
  actionGhostText: { color: colors.stone[700], fontSize: fontSize.base, fontWeight: '700' },
  actionDanger: { backgroundColor: colors.white, borderColor: colors.red[500] },
  actionDangerText: { color: colors.red[600], fontSize: fontSize.base, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
