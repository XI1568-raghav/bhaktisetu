/**
 * `(priest)/offers` — the pandit-facing surface for the tiered dispatch engine
 * on mobile.
 *
 * The engine (T1 instant / T2 1-hour / T3 senior / T4 scheduled) shipped with
 * three endpoints — `GET /priest/offers`,
 * `POST /priest/offers/:bookingId/accept`, `POST /priest/offers/:bookingId/decline`
 * (apps/api/src/routes/priest.ts). apps/web got a screen over them; the app did
 * not, so a pandit holding only a phone could not take work at all and every
 * instant / 1-hour booking escalated past him to admin.
 *
 * `(priest)/bookings` cannot stand in for this: priestService.getAssignedBookings
 * filters on `{ priestId }` and an OFFERED booking has no priestId until it is
 * accepted, so an open offer is invisible there by construction. `GET /priest/offers`
 * is the only endpoint that can see an offer before it is accepted.
 *
 * Honesty rules, same as the web screen:
 *  - an offer is rendered only if the server returned it;
 *  - a failed load says so and offers a retry rather than an empty list;
 *  - an accept is reported as confirmed only after the server confirms it,
 *    quoting the server's own sentence.
 *
 * NO OPTIMISTIC WRITES. Two pandits can be holding the same T1 offer at the
 * same instant; dispatch.accept resolves that inside one transaction and only
 * one of them wins. Removing the card before the server answers would show the
 * loser a booking he does not have.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth-context';
import { apiBase } from '../../lib/api';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { authedFetch } from '../../lib/authed-fetch';

// ─── Types (the real `GET /priest/offers` shape) ────────────────────────────

interface OfferBooking {
  id: string;
  bookingNumber: string | null;
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  priceAmount: string | number | null;
  pujaType: { name: string } | null;
  temple: { name: string; city: string } | null;
}

interface DispatchOffer {
  id: string;
  bookingId: string;
  sentAt: string;
  expiresAt: string;
  booking: OfferBooking | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * scheduledDate is a Postgres DATE serialised at UTC midnight. Rendering it in
 * the device's own zone shows the previous day to every NRI west of UTC, so the
 * puja's own zone is pinned — same rule the web portal follows.
 */
function formatDate(value: string | null): string {
  if (!value) return 'Date to be confirmed';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Date to be confirmed';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

/** The price the server quoted. Never re-derived, never split into a payout. */
function formatPrice(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

function minutesLeft(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.floor(ms / 60000));
}

/**
 * The offer is gone — expired, superseded, or another pandit got there first.
 * This is a normal outcome of a race, not a fault, and it is the ONE response
 * the pandit must be able to read without feeling something broke.
 */
const GONE = /no longer available|has expired|already been assigned|booking not found/i;

/**
 * The offer is still open; this pandit simply cannot take it — he already holds
 * that date and slot. The card must stay on screen.
 */
const SLOT_CLASH = /another booking at this date and time/i;

/** Fastify's error envelope on these routes is `{ error: "<sentence>" }`. */
function serverSentence(payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const err = (payload as { error?: unknown }).error;
    if (typeof err === 'string' && err.trim()) return err.trim();
  }
  return '';
}

type Notice =
  | { kind: 'confirmed'; text: string; bookingId: string }
  | { kind: 'gone'; text: string }
  | { kind: 'warn'; text: string }
  | { kind: 'error'; text: string }
  | null;

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function PriestOffers() {
  const { session } = useAuth();
  const token = session?.accessToken ?? '';
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ booking?: string }>();
  const deepLinkedBookingId = typeof params.booking === 'string' ? params.booking : undefined;

  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const offersQuery = useQuery<{ offers: DispatchOffer[] }>({
    queryKey: ['priest', 'offers'],
    enabled: !!token,
    // T1 offers live for minutes. A stale list is worse than a slow one here:
    // it is the difference between taking the job and letting it escalate.
    refetchInterval: 30_000,
    staleTime: 0,
    queryFn: async () => {
      const res = await authedFetch(`${apiBase()}/api/v1/priest/offers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(serverSentence(body) || 'Could not load your offers. Please try again.');
      }
      const data = await res.json();
      return { offers: Array.isArray(data?.offers) ? (data.offers as DispatchOffer[]) : [] };
    },
  });

  const offers = offersQuery.data?.offers ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await offersQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [offersQuery]);

  async function respond(bookingId: string, action: 'accept' | 'decline') {
    if (!token) return;
    setBusy(`${bookingId}-${action}`);
    setNotice(null);
    try {
      // NO body and NO Content-Type. Declaring application/json on a bodyless
      // request makes Fastify reject it before the handler runs
      // (FST_ERR_CTP_EMPTY_JSON_BODY) — the exact bug that once 400'd every
      // button in the web portal.
      const res = await authedFetch(`${apiBase()}/api/v1/priest/offers/${bookingId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        const sentence = serverSentence(payload);
        if (res.status === 404 || GONE.test(sentence)) {
          setNotice({
            kind: 'gone',
            text:
              sentence ||
              'That offer is no longer open — it expired or another pandit accepted it first.',
          });
        } else if (SLOT_CLASH.test(sentence)) {
          setNotice({ kind: 'warn', text: sentence });
        } else {
          setNotice({
            kind: 'error',
            text: sentence || `Could not ${action} this offer. Please try again.`,
          });
        }
        // The server is the only thing that knows what is still open. Re-read
        // rather than guessing which card should disappear.
        await offersQuery.refetch();
        return;
      }

      if (action === 'accept') {
        setNotice({
          kind: 'confirmed',
          text:
            (payload && typeof payload === 'object'
              ? ((payload as { message?: string }).message ?? '')
              : '') || 'Booking confirmed. You are assigned.',
          bookingId,
        });
        // The booking now belongs to this pandit, so the assigned list and the
        // dashboard counters are both stale.
        await qc.invalidateQueries({ queryKey: ['priest', 'bookings'] });
        await qc.invalidateQueries({ queryKey: ['priest', 'dashboard'] });
      }
      await offersQuery.refetch();
    } catch {
      setNotice({
        kind: 'error',
        text: 'Could not reach Darshya. Check your connection and try again.',
      });
    } finally {
      setBusy(null);
    }
  }

  /**
   * Declining is not the neighbour of Accept by accident of layout — it lowers
   * the pandit's rolling acceptance rate (dispatch.updateAcceptanceRate) and
   * hands the booking to the escalation sweep. It gets its own confirmation.
   */
  function confirmDecline(offer: DispatchOffer) {
    const name = offer.booking?.pujaType?.name ?? 'this puja';
    Alert.alert(
      'Decline this offer?',
      `${name} will be offered to another pandit. Declining also affects how often you are offered work.`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => {
            void respond(offer.bookingId, 'decline');
          },
        },
      ]
    );
  }

  const deepLinkMissing = useMemo(
    () =>
      !!deepLinkedBookingId &&
      !offersQuery.isLoading &&
      !offersQuery.isError &&
      !offers.some((o) => o.bookingId === deepLinkedBookingId) &&
      !(notice?.kind === 'confirmed' && notice.bookingId === deepLinkedBookingId),
    [deepLinkedBookingId, offers, offersQuery.isLoading, offersQuery.isError, notice]
  );

  const loadError = offersQuery.isError
    ? offersQuery.error instanceof Error
      ? offersQuery.error.message
      : 'Could not load your offers. Please try again.'
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(priest)/bookings'))}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.stone[900]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Puja Offers</Text>
          <Text style={styles.headerSubtitle}>
            Requests sent to you by the dispatch engine. Accept one and the booking is yours.
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!token ? (
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>Sign in to see your offers</Text>
            <Text style={styles.emptyHint}>
              Your session has ended. Sign in again to receive puja requests.
            </Text>
          </View>
        ) : null}

        {notice?.kind === 'confirmed' ? (
          <View style={[styles.banner, styles.bannerOk]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.green[700]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerText, { color: colors.green[800] }]}>{notice.text}</Text>
              <TouchableOpacity
                style={styles.bannerLink}
                onPress={() =>
                  router.push({
                    pathname: '/(priest)/booking-detail',
                    params: { id: notice.bookingId },
                  })
                }
                accessibilityRole="button"
              >
                <Text style={styles.bannerLinkText}>Open the booking</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {notice?.kind === 'gone' ? (
          <View style={[styles.banner, styles.bannerNeutral]}>
            <Ionicons name="time-outline" size={18} color={colors.amber[700]} />
            <Text style={[styles.bannerText, { color: colors.amber[800] }]}>{notice.text}</Text>
          </View>
        ) : null}

        {notice?.kind === 'warn' ? (
          <View style={[styles.banner, styles.bannerNeutral]}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.amber[700]} />
            <Text style={[styles.bannerText, { color: colors.amber[800] }]}>{notice.text}</Text>
          </View>
        ) : null}

        {notice?.kind === 'error' ? (
          <View style={[styles.banner, styles.bannerBad]}>
            <Ionicons name="alert-circle" size={18} color={colors.red[600]} />
            <Text style={[styles.bannerText, { color: colors.red[600] }]}>{notice.text}</Text>
          </View>
        ) : null}

        {deepLinkMissing ? (
          <View style={[styles.banner, styles.bannerNeutral]}>
            <Ionicons name="time-outline" size={18} color={colors.amber[700]} />
            <Text style={[styles.bannerText, { color: colors.amber[800] }]}>
              That offer is no longer open — it either expired or another pandit accepted it first.
            </Text>
          </View>
        ) : null}

        {token && offersQuery.isLoading ? (
          <View style={styles.centre}>
            <ActivityIndicator size="large" color={colors.saffron[600]} />
            <Text style={styles.centreText}>Loading your offers…</Text>
          </View>
        ) : loadError ? (
          // Never fall back to an empty list: "no offers" and "we could not ask"
          // look identical to the pandit, and only one of them means he can stop
          // watching his phone.
          <View style={[styles.card, styles.cardError]}>
            <Ionicons name="alert-circle" size={28} color={colors.red[500]} />
            <Text style={styles.errorTitle}>{loadError}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => void offersQuery.refetch()}
              accessibilityRole="button"
            >
              <Ionicons name="refresh" size={16} color={colors.white} />
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : token && offers.length === 0 ? (
          <View style={styles.card}>
            <Ionicons name="time-outline" size={28} color={colors.stone[300]} />
            <Text style={styles.emptyTitle}>No open offers right now</Text>
            <Text style={styles.emptyHint}>
              Turn on availability from your dashboard to receive instant requests near you.
            </Text>
          </View>
        ) : (
          offers.map((offer) => {
            const b = offer.booking;
            const highlighted = deepLinkedBookingId === offer.bookingId;
            const left = minutesLeft(offer.expiresAt);
            const accepting = busy === `${offer.bookingId}-accept`;
            const declining = busy === `${offer.bookingId}-decline`;
            const anyBusy = busy !== null;
            return (
              <View
                key={offer.id}
                style={[styles.offerCard, highlighted && styles.offerCardHighlight]}
              >
                <View style={styles.offerHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.offerTitle}>{b?.pujaType?.name ?? 'Puja booking'}</Text>
                    {b?.bookingNumber ? (
                      <Text style={styles.offerNumber}>{b.bookingNumber}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.offerPrice}>{formatPrice(b?.priceAmount ?? null)}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={15} color={colors.stone[400]} />
                  <Text style={styles.metaText}>
                    {formatDate(b?.scheduledDate ?? null)}
                    {b?.scheduledTimeSlot ? ` · ${b.scheduledTimeSlot}` : ''}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={15} color={colors.stone[400]} />
                  <Text style={styles.metaText}>
                    {b?.temple ? `${b.temple.name}, ${b.temple.city}` : 'At the devotee’s home'}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="hourglass-outline" size={15} color={colors.stone[400]} />
                  <Text style={styles.metaHint}>
                    {left > 0
                      ? `Expires in about ${left} minute${left === 1 ? '' : 's'}`
                      : 'Expiring now'}
                  </Text>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn, anyBusy && styles.btnDisabled]}
                    onPress={() => void respond(offer.bookingId, 'accept')}
                    disabled={anyBusy}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`Accept ${b?.pujaType?.name ?? 'this puja'}`}
                  >
                    {accepting ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                    )}
                    <Text style={styles.acceptText}>Accept</Text>
                  </TouchableOpacity>

                  {/* Deliberately separated from Accept: a mis-tap here costs
                      the pandit the job and dents his acceptance rate. */}
                  <View style={styles.actionGap} />

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.declineBtn, anyBusy && styles.btnDisabled]}
                    onPress={() => confirmDecline(offer)}
                    disabled={anyBusy}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`Decline ${b?.pujaType?.name ?? 'this puja'}`}
                  >
                    {declining ? (
                      <ActivityIndicator size="small" color={colors.stone[600]} />
                    ) : (
                      <Ionicons name="close-circle-outline" size={18} color={colors.stone[600]} />
                    )}
                    <Text style={styles.declineText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stone[50] },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
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
  headerTitle: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.stone[900] },
  headerSubtitle: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.md },

  centre: { paddingVertical: spacing['2xl'], alignItems: 'center', gap: spacing.sm },
  centreText: { fontSize: fontSize.sm, color: colors.stone[500] },

  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  bannerOk: { backgroundColor: colors.green[50], borderColor: colors.green[200] },
  bannerNeutral: { backgroundColor: colors.amber[50], borderColor: colors.amber[200] },
  bannerBad: { backgroundColor: '#FEE2E2', borderColor: colors.red[500] },
  bannerText: { flex: 1, fontSize: fontSize.sm, lineHeight: 19 },
  bannerLink: { minHeight: 44, justifyContent: 'center' },
  bannerLinkText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.green[800],
    textDecorationLine: 'underline',
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardError: { borderColor: colors.red[500], backgroundColor: '#FEF2F2' },
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
  emptyTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.stone[700],
    marginTop: spacing.xs,
  },
  emptyHint: { fontSize: fontSize.sm, color: colors.stone[500], textAlign: 'center' },

  offerCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  offerCardHighlight: { borderColor: colors.saffron[400], borderWidth: 2 },
  offerHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  offerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[900] },
  offerNumber: { fontSize: fontSize.xs, color: colors.stone[400], marginTop: 2 },
  offerPrice: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900] },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  metaText: { flex: 1, fontSize: fontSize.base, color: colors.stone[600] },
  metaHint: { flex: 1, fontSize: fontSize.sm, color: colors.stone[500] },

  actions: { flexDirection: 'row', marginTop: spacing.md },
  actionGap: { width: spacing.md },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  acceptBtn: { backgroundColor: colors.green[600], borderColor: colors.green[600] },
  acceptText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '700' },
  declineBtn: { backgroundColor: colors.white, borderColor: colors.stone[300] },
  declineText: { color: colors.stone[600], fontSize: fontSize.lg, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
