import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth-context';
import { useWellnessClass, postWellnessEnrol, wellnessKeys } from '../../lib/wellness-queries';
import {
  selectWellnessClass,
  enrolOutcome,
  formatClassPrice,
  formatClassWhen,
  formatDuration,
  formatSeats,
  isFull,
  isLive,
  wellnessPaymentUrl,
} from '../../lib/wellness';
import { webOrigin, hostOf } from '../../lib/web-origin';
import { openWebHandoff, describeWebHandoff } from '../../lib/in-app-web';
import { WEBVIEW_AVAILABLE } from '../../lib/webview-module';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { wellnessSessionTypeLabel, wellnessSessionStatusLabel } from '../../lib/enum-labels';

/**
 * One class, and the only enrolment surface in the app — the mobile mirror of
 * apps/web/app/wellness/classes/[id].
 *
 * CONTRACT (apps/api/src/routes/wellness-sessions.ts, prefix /api/v1/wellness)
 *   GET  /sessions/:id           `roomUrl` is attached ONLY for the instructor,
 *                                an admin, or a PAID enrollee. Its presence is
 *                                the server's own proof of entitlement, so this
 *                                screen never decides who may join — it renders
 *                                the link it was given, or none.
 *   POST /sessions/:id/enroll    201 {enrollmentId, free:true} for a ₹0 class
 *                                (the row is already PAID), else
 *                                201 {enrollmentId, razorpayOrderId, …} with a
 *                                seat HELD in PENDING_PAYMENT. 409 full /
 *                                cancelled / already enrolled, 403 wrong role.
 *
 * TWO RULES THIS SCREEN WILL NOT BREAK
 *   1. Success is claimed only after the server confirms it. A 201 with no
 *      `enrollmentId` is an error, not an enrolment; a failed call surfaces the
 *      server's own sentence and stops.
 *   2. Nothing is invented. No guessed price, no fabricated seat count, no
 *      instructor credential — `spotsLeft` and `instructorName` are computed by
 *      the API for exactly this reason and a missing field renders as absent.
 *
 * WHY THE PAID PATH LEAVES THE APP
 * The app carries no payment SDK — there is no Razorpay checkout in this
 * bundle and none is being added here. So a paid enrolment does what a paid
 * puja booking does (lib/booking-flow.ts + puja-book.tsx): it creates the REAL
 * order first, so the seat is genuinely held and the enrolment is already
 * visible in My classes, and then hands the devotee to the website to pay,
 * through lib/web-origin.ts so a staging build can never send someone to
 * production to pay for an enrolment production has never heard of.
 *
 * The website's own flow auto-verifies when the API reports `isDemoPayment`
 * (no Razorpay key configured). This screen deliberately does NOT mirror that:
 * a client that can flip its own enrolment to PAID is a client that mints free
 * seats the moment a key is misconfigured in production. The hand-off is
 * unconditional.
 */

type Phase =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'enrolled' }
  | { kind: 'held' }
  | { kind: 'signin' }
  | { kind: 'failed'; message: string };

const WEB = webOrigin();
const HANDOFF_OPTS = { webViewAvailable: WEBVIEW_AVAILABLE, origin: WEB.origin };

export default function WellnessClassScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : undefined;
  const { session } = useAuth();
  const token = session?.accessToken;
  const queryClient = useQueryClient();

  const query = useWellnessClass(id, token);
  const [refreshing, setRefreshing] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });

  const detail = useMemo(() => selectWellnessClass(query.data), [query.data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  async function enrol() {
    if (!id || !detail) return;
    setPhase({ kind: 'working' });
    let result: { status: number; body: unknown };
    try {
      result = await postWellnessEnrol(id, token);
    } catch {
      setPhase({
        kind: 'failed',
        message: 'We could not reach the server. Check your connection and try again.',
      });
      return;
    }
    const outcome = enrolOutcome(result.status, result.body);
    switch (outcome.kind) {
      case 'free-enrolled':
        setPhase({ kind: 'enrolled' });
        // The row is PAID server-side, so the detail read may now be entitled
        // to a roomUrl and My classes has a new row. Neither is assumed here —
        // both are re-read from the server.
        await Promise.all([
          query.refetch(),
          queryClient.invalidateQueries({ queryKey: wellnessKeys.myEnrolments }),
        ]);
        return;
      case 'payment-required':
        setPhase({ kind: 'held' });
        await queryClient.invalidateQueries({ queryKey: wellnessKeys.myEnrolments });
        return;
      case 'sign-in-required':
        setPhase({ kind: 'signin' });
        return;
      default:
        setPhase({ kind: 'failed', message: outcome.message });
    }
  }

  if (!id) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header />
        <View style={styles.centreBox}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.stone[400]} />
          <Text style={styles.centreTitle}>Class not specified</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            accessibilityRole="button"
            accessibilityLabel="Back to all classes"
            onPress={() => router.replace('/(devotee)/wellness-classes' as never)}
          >
            <Text style={styles.primaryBtnText}>Back to all classes</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (query.isPending) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header />
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.saffron[600]} />
          <Text style={styles.stateText}>Loading class…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (query.isError || !detail) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header />
        <View style={styles.centreBox}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.red[600]} />
          <Text style={styles.centreTitle}>Class unavailable</Text>
          <Text style={styles.centreText}>
            {query.error instanceof Error
              ? query.error.message
              : 'This class could not be loaded.'}
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            onPress={() => void query.refetch()}
          >
            <Ionicons name="refresh" size={16} color={colors.white} />
            <Text style={styles.primaryBtnText}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            accessibilityRole="button"
            accessibilityLabel="Back to all classes"
            onPress={() => router.replace('/(devotee)/wellness-classes' as never)}
          >
            <Text style={styles.secondaryBtnText}>Back to all classes</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const seats = formatSeats(detail.spotsLeft);
  const duration = formatDuration(detail.durationMinutes);
  const full = isFull(detail);
  const closed = detail.status === 'CANCELLED' || detail.status === 'COMPLETED';
  const price = formatClassPrice(detail.priceInr);
  const free = detail.priceInr !== null && detail.priceInr <= 0;
  // The server handed us a room link, which means the server has already
  // decided this devotee is entitled to it. That is the whole entitlement check.
  const roomTarget = detail.roomUrl
    ? { url: detail.roomUrl, title: detail.title }
    : null;
  const roomAffordance = roomTarget
    ? describeWebHandoff(roomTarget, HANDOFF_OPTS, hostOf(roomTarget.url))
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header />
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.badgeRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {wellnessSessionTypeLabel(detail.type) || 'Class'}
            </Text>
          </View>
          {isLive(detail) ? (
            <View style={styles.liveBadge}>
              <View style={styles.livePulse} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          ) : null}
          {closed ? (
            <View style={styles.closedBadge}>
              <Text style={styles.closedBadgeText}>
                {wellnessSessionStatusLabel(detail.status)}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.title}>{detail.title}</Text>

        {detail.instructorName ? (
          <TouchableOpacity
            style={styles.instructorRow}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Taught by ${detail.instructorName}`}
            accessibilityHint="Opens this instructor's other upcoming classes"
            onPress={() =>
              router.push({
                pathname: '/(devotee)/wellness-instructor',
                params: {
                  key: detail.instructorId ?? detail.instructorName,
                  name: detail.instructorName,
                },
              } as never)
            }
          >
            <View style={styles.instructorAvatar}>
              <Text style={styles.instructorInitial}>
                {detail.instructorName.trim().charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.instructorLabel}>Taught by</Text>
              <Text style={styles.instructorName}>{detail.instructorName}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.stone[300]} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.factCard}>
          <Fact icon="calendar-outline" label="When" value={formatClassWhen(detail.scheduledAt)} />
          {duration ? <Fact icon="time-outline" label="Duration" value={duration} /> : null}
          {seats ? (
            <Fact
              icon="people-outline"
              label="Seats"
              value={seats}
              tone={full ? 'warn' : undefined}
            />
          ) : null}
          <Fact icon="pricetag-outline" label="Price" value={price} tone="strong" />
        </View>

        {detail.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this class</Text>
            <Text style={styles.description}>{detail.description}</Text>
          </View>
        ) : null}

        {/* ── the entitlement the SERVER granted ───────────────────────────── */}
        {roomTarget && roomAffordance ? (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={22} color={colors.green[600]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.successTitle}>Your seat is confirmed</Text>
              <Text style={styles.successText}>
                The instructor has published the join link for this class.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                activeOpacity={0.85}
                accessibilityRole={roomAffordance.role}
                accessibilityLabel="Join the class"
                accessibilityHint={roomAffordance.hint}
                onPress={() =>
                  openWebHandoff(roomTarget, HANDOFF_OPTS, {
                    push: (r) => router.push(r as never),
                    openExternal: Linking.openURL,
                  })
                }
              >
                <Ionicons name={roomAffordance.icon} size={16} color={colors.white} />
                <Text style={styles.primaryBtnText}>Join the class</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : phase.kind === 'enrolled' ? (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={22} color={colors.green[600]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.successTitle}>You are enrolled</Text>
              <Text style={styles.successText}>
                This class is free, so your seat is confirmed. The join link appears here and in
                My classes once the instructor publishes it.
              </Text>
              <TouchableOpacity
                style={styles.secondaryBtn}
                accessibilityRole="button"
                accessibilityLabel="Go to my classes"
                onPress={() => router.push('/(devotee)/wellness-my-classes' as never)}
              >
                <Text style={styles.secondaryBtnText}>Go to My classes</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : phase.kind === 'held' ? (
          <View style={styles.holdCard}>
            <Text style={styles.holdTitle}>Seat held — not paid yet</Text>
            {/* The one thing this screen must not blur, and the figure the page
                it hands off to will ask for. */}
            <Text style={styles.holdText}>
              {price} is due. Your seat is held while you pay; complete payment to confirm it.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              accessibilityRole="link"
              accessibilityLabel={`Pay on ${hostOf(WEB.origin)}`}
              accessibilityHint={`Opens ${hostOf(
                WEB.origin,
              )} in your browser, where you sign in and then complete payment for this class`}
              onPress={() => Linking.openURL(wellnessPaymentUrl(id, WEB.origin))}
            >
              <Ionicons name="open-outline" size={16} color={colors.white} />
              <Text style={styles.primaryBtnText}>Pay on {hostOf(WEB.origin)}</Text>
            </TouchableOpacity>
            {/* The origin could not be established from this build's API host, so
                it fell back to production. Saying nothing would send the devotee
                to a site that has never heard of the enrolment they just made. */}
            {WEB.matchesEnvironment ? null : (
              <Text style={styles.warnText}>
                This build talks to a different server than {hostOf(WEB.origin)}, so that site
                will not know about this enrolment. Set EXPO_PUBLIC_WEB_URL to the website that
                pairs with this build&apos;s API.
              </Text>
            )}
            <Text style={styles.note}>
              Card payment happens on the website — the app does not carry a card form, and the
              site will ask you to sign in first. Your seat is already held, so you can also pay
              later from My classes.
            </Text>
            <TouchableOpacity
              style={styles.secondaryBtn}
              accessibilityRole="button"
              accessibilityLabel="Go to my classes"
              onPress={() => router.push('/(devotee)/wellness-my-classes' as never)}
            >
              <Text style={styles.secondaryBtnText}>Go to My classes</Text>
            </TouchableOpacity>
          </View>
        ) : phase.kind === 'signin' ? (
          <View style={styles.holdCard}>
            <Text style={styles.holdTitle}>Sign in to enrol</Text>
            <Text style={styles.holdText}>
              Your session has expired. Sign in again and this class will still be here.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              onPress={() => router.push('/(auth)/login' as never)}
            >
              <Text style={styles.primaryBtnText}>Sign in</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                styles.enrolBtn,
                (full || closed || phase.kind === 'working') && styles.disabledBtn,
              ]}
              activeOpacity={0.85}
              disabled={full || closed || phase.kind === 'working'}
              accessibilityRole="button"
              accessibilityState={{ disabled: full || closed || phase.kind === 'working' }}
              accessibilityLabel={
                closed
                  ? 'Enrolment closed'
                  : full
                    ? 'This class is full'
                    : free
                      ? 'Enrol for free'
                      : `Enrol — ${price}`
              }
              accessibilityHint={
                free
                  ? 'Reserves your seat straight away'
                  : 'Holds your seat, then hands you to the website to pay'
              }
              onPress={() => void enrol()}
            >
              {phase.kind === 'working' ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons
                    name={closed || full ? 'lock-closed-outline' : 'checkmark-circle-outline'}
                    size={16}
                    color={colors.white}
                  />
                  <Text style={styles.primaryBtnText}>
                    {closed
                      ? 'Enrolment closed'
                      : full
                        ? 'Class is full'
                        : free
                          ? 'Enrol — free'
                          : `Enrol — ${price}`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {!free && !closed && !full ? (
              <Text style={styles.note}>
                Enrolling holds your seat. Payment is completed on {hostOf(WEB.origin)} — the app
                does not carry a card form.
              </Text>
            ) : null}
            {phase.kind === 'failed' ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.red[600]} />
                <Text style={styles.errorText}>{phase.message}</Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backBtn}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={22} color={colors.stone[700]} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Class</Text>
      <View style={styles.backBtn} />
    </View>
  );
}

function Fact({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  tone?: 'strong' | 'warn';
}) {
  return (
    <View style={styles.factRow}>
      <Ionicons name={icon} size={16} color={colors.stone[400]} />
      <Text style={styles.factLabel}>{label}</Text>
      <Text
        style={[
          styles.factValue,
          tone === 'strong' && styles.factValueStrong,
          tone === 'warn' && styles.factValueWarn,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[200],
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.stone[900],
  },
  body: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  typeBadge: {
    backgroundColor: colors.green[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  typeBadgeText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.green[800] },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.red[600],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white },
  liveBadgeText: { fontSize: fontSize.xs, fontWeight: '800', color: colors.white },
  closedBadge: {
    backgroundColor: colors.stone[200],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  closedBadgeText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.stone[700] },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.stone[900],
    marginTop: spacing.xs,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 64,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[200],
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  instructorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.green[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructorInitial: { fontSize: fontSize.lg, fontWeight: '800', color: colors.green[800] },
  instructorLabel: { fontSize: fontSize.xs, color: colors.stone[400], fontWeight: '600' },
  instructorName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[900] },
  factCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[200],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
  },
  factLabel: { flex: 1, fontSize: fontSize.base, color: colors.stone[500] },
  factValue: { fontSize: fontSize.base, fontWeight: '600', color: colors.stone[800] },
  factValueStrong: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900] },
  factValueWarn: { color: colors.red[600] },
  section: { gap: spacing.xs, marginTop: spacing.xs },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[900] },
  description: { fontSize: fontSize.base, lineHeight: 21, color: colors.stone[600] },
  successCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.green[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.green[200],
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  successTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.green[900] },
  successText: {
    fontSize: fontSize.base,
    lineHeight: 20,
    color: colors.stone[700],
    marginTop: 2,
  },
  holdCard: {
    backgroundColor: colors.amber[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.amber[200],
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  holdTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.amber[900] },
  holdText: { fontSize: fontSize.base, lineHeight: 20, color: colors.stone[700] },
  warnText: {
    fontSize: fontSize.sm,
    lineHeight: 18,
    color: colors.red[600],
    marginTop: spacing.xs,
  },
  note: {
    fontSize: fontSize.sm,
    lineHeight: 18,
    color: colors.stone[500],
    marginTop: spacing.xs,
  },
  enrolBtn: { marginTop: spacing.sm },
  disabledBtn: { backgroundColor: colors.stone[300] },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[600],
  },
  primaryBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone[300],
  },
  secondaryBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[800] },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  errorText: { flex: 1, fontSize: fontSize.base, lineHeight: 19, color: colors.stone[800] },
  stateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  stateText: { fontSize: fontSize.base, color: colors.stone[500] },
  centreBox: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  centreTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.stone[800],
    textAlign: 'center',
  },
  centreText: {
    fontSize: fontSize.base,
    color: colors.stone[500],
    textAlign: 'center',
    lineHeight: 19,
  },
});
