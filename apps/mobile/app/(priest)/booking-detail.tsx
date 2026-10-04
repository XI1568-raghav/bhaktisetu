/**
 * `(priest)/booking-detail?id=<uuid>` — one assigned booking, end to end.
 *
 * Mobile parity for `apps/web/app/priest/bookings/view`. The app's bookings tab
 * could only start, complete and paste a video URL; there was no way to see a
 * booking's sankalp, devotees, price breakdown or review, and — the P0 — no way
 * to ACCEPT or DECLINE, so a pandit had to reach a desktop to take work.
 *
 * Backed by `GET /api/v1/priest/bookings/:id` (priestService.getAssignedBookingById),
 * which is ASSIGNED-ONLY: it answers 403 whenever `booking.priestId !== me`. An
 * offer that has not been accepted has no priestId at all, so an OPEN OFFER can
 * never be opened here — that is what `(priest)/offers` is for. This screen
 * begins at the point the booking already belongs to this pandit.
 *
 * MONEY: `priceAmount`, `platformCommission` and `priestPayout` are read from
 * the server and printed as received. Nothing on this screen derives a payout
 * or a take rate; the ledger's one meaning lives in the API.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth-context';
import { apiBase } from '../../lib/api';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { bookingStatusLabel } from '../../lib/enum-labels';

// ─── Types (the real `assignedBookingSelect` shape) ─────────────────────────

interface DevoteeName {
  name?: string;
  gotra?: string;
  nakshatra?: string;
}

interface PriestBookingDetail {
  id: string;
  bookingNumber: string | null;
  status: string;
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  priceAmount: string | number | null;
  currency: string | null;
  platformCommission: string | number | null;
  priestPayout: string | number | null;
  devoteeNames: DevoteeName[] | null;
  sankalpDetails: string | null;
  specialInstructions: string | null;
  videoProofUrl: string | null;
  videoUploadedAt: string | null;
  rating: number | null;
  reviewText: string | null;
  createdAt: string | null;
  temple: { id: string; name: string; city: string | null; state: string | null } | null;
  pujaType: { id: string; name: string; durationMinutes: number | null } | null;
  user: { id: string; fullName: string | null; phone: string | null } | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Prints what the server sent. An absent or unparseable amount is an em dash,
 *  never a "₹NaN" on the screen where a pandit checks the platform's cut. */
function formatMoney(value: string | number | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return `₹${(n as number).toLocaleString('en-IN')}`;
}

/** scheduledDate is a UTC-midnight DATE; pin the puja's own zone so it never
 *  renders as the previous day for a pandit travelling west of UTC. */
function formatDate(value: string | null): string {
  if (!value) return 'Date to be confirmed';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function formatTime(value: string | null): string {
  if (!value) return 'Time to be confirmed';
  const parts = value.split(':').map(Number);
  const h = parts[0] ?? NaN;
  const m = parts[1] ?? 0;
  if (!Number.isFinite(h)) return value;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** What this status means, and what the pandit is expected to do next. */
const STATUS_HINT: Record<string, string> = {
  confirmed: 'Waiting for you to accept this booking.',
  priest_assigned: 'You have accepted. Start the puja at the scheduled time.',
  in_progress: 'Puja is underway. Mark it complete when done.',
  completed: 'Puja is complete. Video proof is mandatory before payout.',
  video_uploaded: 'Proof filed. Confirm delivery to close the booking.',
  delivered: 'Delivered to the devotee. Nothing further is needed.',
  cancelled: 'This booking was cancelled.',
  refunded: 'This booking was refunded.',
};

function statusColor(status: string): string {
  switch (status) {
    case 'completed':
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

/**
 * The sentence a person can act on, out of either envelope this screen meets.
 *
 * The `/priest/*` transitions answer `{ error: "<sentence>" }`. But
 * `PATCH /bookings/:id` — the ONLY call behind the "Mark Delivered" button —
 * answers `{ error: "<code>", message: "<sentence>" }`, and its codes are the
 * single words `Forbidden`, `Conflict` and `Video proof required`. Reading
 * `error` alone therefore turned
 *
 *   "Video proof is mandatory before a booking can move to \"delivered\".
 *    Upload the recording first…"
 *
 * — the exact instruction the pandit needs, and the most common refusal on
 * this screen, because business rule #1 makes proof mandatory — into the word
 * "Video proof required" with the fix stripped off. `message` wins when both
 * are present.
 *
 * EXCEPT on a 5xx. Fastify's own unhandled-error envelope is
 * `{statusCode, code, error: "Internal Server Error", message: "<the thrown
 * error>"}`, and that `message` is the server's internal text — a stack-adjacent
 * string, sometimes an absolute path (PAR-13 shipped exactly that to the
 * astrologer dashboard). It is not for a pandit, so above 499 neither field is
 * used and the caller's own fallback line is shown instead.
 */
function serverSentence(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const status = (payload as { statusCode?: unknown }).statusCode;
  if (typeof status === 'number' && status >= 500) return '';
  const msg = (payload as { message?: unknown }).message;
  if (typeof msg === 'string' && msg.trim()) return msg.trim();
  const err = (payload as { error?: unknown }).error;
  if (typeof err === 'string' && err.trim()) return err.trim();
  return '';
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function PriestBookingDetail() {
  const { session } = useAuth();
  const token = session?.accessToken ?? '';
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id?: string }>();
  const bookingId = typeof params.id === 'string' ? params.id : '';

  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [replacingProof, setReplacingProof] = useState(false);

  const detailQuery = useQuery<{ booking: PriestBookingDetail }>({
    queryKey: ['priest', 'bookings', bookingId],
    enabled: !!token && !!bookingId,
    queryFn: async () => {
      const res = await fetch(`${apiBase()}/api/v1/priest/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          serverSentence(payload) || 'We could not load this booking. Please try again.'
        );
      }
      const booking = (payload as { booking?: PriestBookingDetail } | null)?.booking;
      if (!booking) throw new Error('We could not find this booking.');
      return { booking };
    },
  });

  const booking = detailQuery.data?.booking ?? null;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await detailQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [detailQuery]);

  /**
   * Refresh everything the transition just invalidated. `['priest','bookings']`
   * is a PREFIX of this screen's own `['priest','bookings',id]`, so one
   * invalidation re-reads the detail, the list behind it and the tab counts.
   */
  async function afterTransition() {
    await qc.invalidateQueries({ queryKey: ['priest', 'bookings'] });
    await qc.invalidateQueries({ queryKey: ['priest', 'dashboard'] });
  }

  /**
   * The four bodyless priest transitions: accept / reject / start / complete.
   *
   * NO Content-Type header and NO body. Declaring application/json on a bodyless
   * request makes Fastify reject it before the handler runs
   * (FST_ERR_CTP_EMPTY_JSON_BODY) — that alone once 400'd every button in the
   * web portal, so no pandit could progress a single booking.
   */
  async function transition(action: 'accept' | 'reject' | 'start' | 'complete') {
    if (!booking || !token) return;
    setBusy(action);
    setActionError(null);
    try {
      const res = await fetch(`${apiBase()}/api/v1/priest/bookings/${booking.id}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setActionError(
          serverSentence(payload) || 'That action did not go through. Please try again.'
        );
        // The server decides what state this booking is in — re-read rather
        // than leaving a stale card the pandit will tap again.
        await detailQuery.refetch();
        return;
      }
      await afterTransition();
    } catch {
      setActionError('Could not reach Darshya. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  /**
   * Declining is destructive from the pandit's side: `rejectBooking` clears
   * priestId, drops the booking back to `confirmed` for re-dispatch, and
   * REVERSES any Commission this booking had already minted for him. It is
   * never a single unguarded tap.
   */
  function confirmRelease(mode: 'decline' | 'release') {
    const title = mode === 'decline' ? 'Decline this booking?' : 'Release this booking?';
    const body =
      mode === 'decline'
        ? 'It goes back to the queue for another pandit, and any earning recorded against it is reversed.'
        : 'You have already accepted this one. Releasing it returns it to the queue and reverses the earning recorded against it.';
    Alert.alert(title, body, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: mode === 'decline' ? 'Decline' : 'Release',
        style: 'destructive',
        onPress: () => {
          void transition('reject');
        },
      },
    ]);
  }

  /** `POST /priest/bookings/:id/video` — the server requires a full URL. */
  async function submitProof() {
    if (!booking || !token) return;
    const trimmed = videoUrl.trim();
    setActionError(null);
    if (!/^https?:\/\/\S+$/i.test(trimmed)) {
      setActionError(
        'That does not look like a valid link. Paste the full https:// URL of the recording.'
      );
      return;
    }
    setBusy('video');
    try {
      const res = await fetch(`${apiBase()}/api/v1/priest/bookings/${booking.id}/video`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoUrl: trimmed }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setActionError(
          serverSentence(payload) || 'We could not save that recording link. Please try again.'
        );
        return;
      }
      setVideoUrl('');
      setReplacingProof(false);
      await afterTransition();
    } catch {
      setActionError('Could not reach Darshya. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  /** `video_uploaded` → `delivered`. Gated server-side on a stored proof URL. */
  async function markDelivered() {
    if (!booking || !token) return;
    setBusy('deliver');
    setActionError(null);
    try {
      const res = await fetch(`${apiBase()}/api/v1/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'delivered' }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setActionError(
          serverSentence(payload) || 'We could not mark this booking delivered. Please try again.'
        );
        return;
      }
      await afterTransition();
    } catch {
      setActionError('Could not reach Darshya. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  const loadError = detailQuery.isError
    ? detailQuery.error instanceof Error
      ? detailQuery.error.message
      : 'We could not load this booking. Please try again.'
    : null;

  const status = booking?.status ?? '';
  const devotees = Array.isArray(booking?.devoteeNames) ? booking!.devoteeNames! : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(priest)/bookings'))}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back to bookings"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.stone[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {booking?.pujaType?.name ?? 'Booking'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!bookingId ? (
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>No booking selected</Text>
            <Text style={styles.emptyHint}>Open a booking from your bookings list.</Text>
          </View>
        ) : !token ? (
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>Sign in to view this booking</Text>
            <Text style={styles.emptyHint}>Your session has ended.</Text>
          </View>
        ) : detailQuery.isLoading ? (
          <View style={styles.centre}>
            <ActivityIndicator size="large" color={colors.saffron[600]} />
            <Text style={styles.centreText}>Loading booking…</Text>
          </View>
        ) : loadError ? (
          <View style={[styles.card, styles.cardError]}>
            <Ionicons name="alert-circle" size={28} color={colors.red[500]} />
            <Text style={styles.errorTitle}>{loadError}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => void detailQuery.refetch()}
              accessibilityRole="button"
            >
              <Ionicons name="refresh" size={16} color={colors.white} />
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : booking ? (
          <>
            {actionError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={colors.red[600]} />
                <Text style={styles.errorBannerText}>{actionError}</Text>
              </View>
            ) : null}

            {/* ── Summary ── */}
            <View style={styles.card}>
              <View style={styles.summaryHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pujaName}>{booking.pujaType?.name ?? 'Puja booking'}</Text>
                  {booking.bookingNumber ? (
                    <Text style={styles.bookingNumber}>{booking.bookingNumber}</Text>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.pill,
                    {
                      backgroundColor: `${statusColor(status)}1A`,
                      borderColor: statusColor(status),
                    },
                  ]}
                >
                  <Text style={[styles.pillText, { color: statusColor(status) }]}>
                    {bookingStatusLabel(status)}
                  </Text>
                </View>
              </View>
              {STATUS_HINT[status] ? (
                <View style={styles.hintBox}>
                  <Text style={styles.hintText}>{STATUS_HINT[status]}</Text>
                </View>
              ) : null}
            </View>

            {/* ── Actions ── */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Actions</Text>

              {status === 'confirmed' ? (
                <>
                  <TouchableOpacity
                    style={[styles.bigBtn, styles.primaryBtn, busy !== null && styles.btnDisabled]}
                    onPress={() => void transition('accept')}
                    disabled={busy !== null}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Accept this booking"
                  >
                    {busy === 'accept' ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                    )}
                    <Text style={styles.primaryBtnText}>Accept booking</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.bigBtn, styles.dangerBtn, busy !== null && styles.btnDisabled]}
                    onPress={() => confirmRelease('decline')}
                    disabled={busy !== null}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Decline this booking"
                  >
                    {busy === 'reject' ? (
                      <ActivityIndicator size="small" color={colors.red[600]} />
                    ) : (
                      <Ionicons name="close-circle-outline" size={20} color={colors.red[600]} />
                    )}
                    <Text style={styles.dangerBtnText}>Decline</Text>
                  </TouchableOpacity>
                </>
              ) : null}

              {status === 'priest_assigned' ? (
                <>
                  <TouchableOpacity
                    style={[styles.bigBtn, styles.primaryBtn, busy !== null && styles.btnDisabled]}
                    onPress={() => void transition('start')}
                    disabled={busy !== null}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Start the puja"
                  >
                    {busy === 'start' ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Ionicons name="play" size={20} color={colors.white} />
                    )}
                    <Text style={styles.primaryBtnText}>Start puja</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.bigBtn, styles.dangerBtn, busy !== null && styles.btnDisabled]}
                    onPress={() => confirmRelease('release')}
                    disabled={busy !== null}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Release this booking back to the queue"
                  >
                    {busy === 'reject' ? (
                      <ActivityIndicator size="small" color={colors.red[600]} />
                    ) : (
                      <Ionicons name="return-up-back-outline" size={20} color={colors.red[600]} />
                    )}
                    <Text style={styles.dangerBtnText}>Release to queue</Text>
                  </TouchableOpacity>
                </>
              ) : null}

              {status === 'in_progress' ? (
                <TouchableOpacity
                  style={[styles.bigBtn, styles.successBtn, busy !== null && styles.btnDisabled]}
                  onPress={() => void transition('complete')}
                  disabled={busy !== null}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Mark the puja complete"
                >
                  {busy === 'complete' ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Ionicons name="checkmark-done" size={20} color={colors.white} />
                  )}
                  <Text style={styles.primaryBtnText}>Mark puja complete</Text>
                </TouchableOpacity>
              ) : null}

              {status === 'completed' || (status === 'video_uploaded' && replacingProof) ? (
                <View style={{ gap: spacing.sm }}>
                  <Text style={styles.fieldHint}>
                    Paste the link to the recording. Video proof is mandatory before payout.
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={videoUrl}
                    onChangeText={setVideoUrl}
                    placeholder="https://…"
                    placeholderTextColor={colors.stone[400]}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    accessibilityLabel="Video proof URL"
                  />
                  <TouchableOpacity
                    style={[styles.bigBtn, styles.primaryBtn, busy !== null && styles.btnDisabled]}
                    onPress={() => void submitProof()}
                    disabled={busy !== null}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                  >
                    {busy === 'video' ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Ionicons name="cloud-upload-outline" size={20} color={colors.white} />
                    )}
                    <Text style={styles.primaryBtnText}>Save video proof</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {status === 'video_uploaded' || status === 'delivered' ? (
                <View style={{ gap: spacing.sm }}>
                  <View style={styles.proofRow}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.green[600]} />
                    <Text style={styles.proofText}>Video proof filed</Text>
                  </View>
                  {booking.videoProofUrl ? (
                    <TouchableOpacity
                      style={styles.linkBtn}
                      onPress={() => {
                        void Linking.openURL(booking.videoProofUrl!);
                      }}
                      accessibilityRole="link"
                    >
                      <Ionicons name="open-outline" size={16} color={colors.saffron[700]} />
                      <Text style={styles.linkText}>View uploaded video</Text>
                    </TouchableOpacity>
                  ) : null}

                  {status === 'video_uploaded' && !replacingProof ? (
                    <>
                      <TouchableOpacity
                        style={styles.linkBtn}
                        onPress={() => setReplacingProof(true)}
                        accessibilityRole="button"
                      >
                        <Text style={styles.linkText}>Wrong link? Replace video proof</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.bigBtn,
                          styles.successBtn,
                          busy !== null && styles.btnDisabled,
                        ]}
                        onPress={() => void markDelivered()}
                        disabled={busy !== null}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                      >
                        {busy === 'deliver' ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <Ionicons name="checkmark-done" size={20} color={colors.white} />
                        )}
                        <Text style={styles.primaryBtnText}>Mark delivered</Text>
                      </TouchableOpacity>
                      <Text style={styles.fieldHint}>
                        Confirms the devotee has received the recording and closes the booking.
                      </Text>
                    </>
                  ) : null}
                </View>
              ) : null}

              {status === 'cancelled' || status === 'refunded' ? (
                <Text style={styles.fieldHint}>
                  No further action is possible on this booking.
                </Text>
              ) : null}
            </View>

            {/* ── Schedule & location ── */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Schedule &amp; location</Text>
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={16} color={colors.stone[400]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.metaPrimary}>
                    {booking.temple?.name ?? 'At the devotee’s home'}
                  </Text>
                  {booking.temple ? (
                    <Text style={styles.metaSecondary}>
                      {[booking.temple.city, booking.temple.state].filter(Boolean).join(', ')}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.stone[400]} />
                <Text style={styles.metaPrimary}>{formatDate(booking.scheduledDate)}</Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={16} color={colors.stone[400]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.metaPrimary}>{formatTime(booking.scheduledTimeSlot)}</Text>
                  {booking.pujaType?.durationMinutes ? (
                    <Text style={styles.metaSecondary}>
                      Duration: {booking.pujaType.durationMinutes} minutes
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>

            {/* ── Devotees ── */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Devotees ({devotees.length})</Text>
              {devotees.length === 0 ? (
                <Text style={styles.emptyHint}>No devotee names were recorded.</Text>
              ) : (
                devotees.map((d, idx) => (
                  <View key={`${d.name ?? 'devotee'}-${idx}`} style={styles.devoteeRow}>
                    <Text style={styles.metaPrimary}>{d.name ?? 'Devotee'}</Text>
                    <Text style={styles.metaSecondary}>
                      {[d.gotra ? `Gotra: ${d.gotra}` : null, d.nakshatra ? `Nakshatra: ${d.nakshatra}` : null]
                        .filter(Boolean)
                        .join('  ·  ')}
                    </Text>
                  </View>
                ))
              )}

              {booking.user?.fullName ? (
                <View style={styles.subBlock}>
                  <Text style={styles.subLabel}>Booked by</Text>
                  <Text style={styles.metaPrimary}>{booking.user.fullName}</Text>
                  {booking.user.phone ? (
                    <Text style={styles.metaSecondary} selectable>
                      {booking.user.phone}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {booking.sankalpDetails ? (
                <View style={styles.subBlock}>
                  <Text style={styles.subLabel}>Sankalp</Text>
                  <Text style={styles.bodyText}>{booking.sankalpDetails}</Text>
                </View>
              ) : null}

              {booking.specialInstructions ? (
                <View style={styles.subBlock}>
                  <Text style={styles.subLabel}>Special instructions</Text>
                  <Text style={styles.bodyText}>{booking.specialInstructions}</Text>
                </View>
              ) : null}
            </View>

            {/* ── Price breakdown (server figures, printed as received) ── */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Price breakdown</Text>
              <View style={styles.moneyRow}>
                <Text style={styles.moneyLabel}>Booking amount</Text>
                <Text style={styles.moneyValue}>{formatMoney(booking.priceAmount)}</Text>
              </View>
              <View style={styles.moneyRow}>
                <Text style={styles.moneyLabel}>Platform commission</Text>
                <Text style={[styles.moneyValue, { color: colors.red[600] }]}>
                  -{formatMoney(booking.platformCommission)}
                </Text>
              </View>
              <View style={[styles.moneyRow, styles.moneyTotal]}>
                <Text style={styles.moneyTotalLabel}>Your payout</Text>
                <Text style={styles.moneyTotalValue}>{formatMoney(booking.priestPayout)}</Text>
              </View>
              <Text style={styles.fieldHint}>
                Payout is released after video proof is filed and delivery is confirmed.
              </Text>
            </View>

            {/* ── Devotee review ── */}
            {booking.rating ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Devotee review</Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons
                      key={s}
                      name={s <= (booking.rating ?? 0) ? 'star' : 'star-outline'}
                      size={16}
                      color={colors.amber[500]}
                    />
                  ))}
                  <Text style={styles.metaSecondary}>{booking.rating}/5</Text>
                </View>
                {booking.reviewText ? (
                  <Text style={styles.bodyText}>{booking.reviewText}</Text>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stone[50] },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  headerTitle: { flex: 1, fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.md },

  centre: { paddingVertical: spacing['2xl'], alignItems: 'center', gap: spacing.sm },
  centreText: { fontSize: fontSize.sm, color: colors.stone[500] },

  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardError: { borderColor: colors.red[500], backgroundColor: '#FEF2F2', alignItems: 'center' },
  errorTitle: {
    fontSize: fontSize.sm,
    color: colors.red[600],
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[600],
    marginTop: spacing.sm,
  },
  retryText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#FEE2E2',
    borderColor: colors.red[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorBannerText: { flex: 1, fontSize: fontSize.sm, color: colors.red[600], lineHeight: 19 },

  summaryHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  pujaName: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.stone[900] },
  bookingNumber: { fontSize: fontSize.sm, color: colors.stone[400], marginTop: 2 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  pillText: { fontSize: fontSize.xs, fontWeight: '700' },
  hintBox: {
    backgroundColor: colors.stone[50],
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  hintText: { fontSize: fontSize.sm, color: colors.stone[600] },

  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.stone[900],
    marginBottom: spacing.sm,
  },

  bigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  primaryBtn: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[600] },
  successBtn: { backgroundColor: colors.green[600], borderColor: colors.green[600] },
  primaryBtnText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '700' },
  dangerBtn: { backgroundColor: colors.white, borderColor: colors.red[500] },
  dangerBtnText: { color: colors.red[600], fontSize: fontSize.lg, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },

  input: {
    borderWidth: 1,
    borderColor: colors.stone[300],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    fontSize: fontSize.base,
    color: colors.stone[900],
    backgroundColor: colors.white,
  },
  fieldHint: { fontSize: fontSize.sm, color: colors.stone[500], lineHeight: 18 },

  proofRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  proofText: { fontSize: fontSize.base, fontWeight: '700', color: colors.green[700] },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
  },
  linkText: { fontSize: fontSize.base, fontWeight: '700', color: colors.saffron[700] },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  metaPrimary: { flex: 1, fontSize: fontSize.base, color: colors.stone[800], fontWeight: '600' },
  metaSecondary: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },

  devoteeRow: {
    backgroundColor: colors.stone[50],
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  subBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.stone[100],
  },
  subLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.stone[500],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.xs,
  },
  bodyText: { fontSize: fontSize.base, color: colors.stone[600], lineHeight: 20 },

  moneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  moneyLabel: { fontSize: fontSize.base, color: colors.stone[500] },
  moneyValue: { fontSize: fontSize.base, color: colors.stone[800], fontWeight: '600' },
  moneyTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.stone[100],
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  moneyTotalLabel: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[900] },
  moneyTotalValue: { fontSize: fontSize.lg, fontWeight: '800', color: colors.green[700] },

  starRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: spacing.xs },

  emptyTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[700] },
  emptyHint: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: spacing.xs },
});
