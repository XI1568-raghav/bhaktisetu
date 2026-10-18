import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { useMyWellnessEnrolments, postWellnessCancel } from '../../lib/wellness-queries';
import {
  selectMyEnrolments,
  partitionEnrolments,
  enrolmentStatusLabel,
  isPaidEnrolment,
  canCancelEnrolment,
  previewEnrolmentCancel,
  describeCancelOutcome,
  formatClassPrice,
  formatClassWhen,
  formatDuration,
  wellnessPaymentUrl,
  type WellnessEnrolment,
} from '../../lib/wellness';
import { webOrigin, hostOf } from '../../lib/web-origin';
import { openWebHandoff, describeWebHandoff } from '../../lib/in-app-web';
import { WEBVIEW_AVAILABLE } from '../../lib/webview-module';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { wellnessSessionTypeLabel } from '../../lib/enum-labels';

/**
 * "My classes" — the mobile mirror of apps/web/app/wellness/my-classes.
 *
 *   GET /api/v1/wellness/enrollments/mine
 *
 * That route exists because of AW-13: a devotee paid ₹1,000 for a class and the
 * moment they closed the tab it was unreachable — the only way back in was
 * already knowing the session UUID. On mobile there was no wellness enrolment
 * surface at all, so this screen is that route's first app-side reader.
 *
 * WHAT IS AND IS NOT DECIDED HERE
 * `roomUrl` is withheld by the SERVER unless the money actually landed
 * (PAID/ATTENDED). This screen never synthesises one and never infers one from
 * a status: if the server sent no link, the card says the instructor has not
 * published it yet — which is the true statement — and offers nothing to tap.
 *
 * An empty list and a failed read are reported SEPARATELY and deliberately: to
 * someone who has paid, "you have no classes" and "we could not read your
 * classes" are very different sentences, and only one of them is a reason to
 * panic.
 */

const WEB = webOrigin();
// Both inputs are module constants, so the plan is stable for the process's
// lifetime. Recomputing it per render would make `renderRow`'s useCallback a
// no-op and re-render every row on every state change.
const HANDOFF_OPTS = { webViewAvailable: WEBVIEW_AVAILABLE, origin: WEB.origin };

export default function WellnessMyClassesScreen() {
  const { session } = useAuth();
  const token = session?.accessToken;
  const query = useMyWellnessEnrolments(token);
  const [refreshing, setRefreshing] = useState(false);

  const sections = useMemo(() => {
    const rows = selectMyEnrolments(query.data);
    const { upcoming, past } = partitionEnrolments(rows);
    return [
      { title: 'Upcoming', data: upcoming },
      { title: 'Past and cancelled', data: past },
    ].filter((s) => s.data.length > 0);
  }, [query.data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  const cancelEnrolment = useCallback(
    (item: WellnessEnrolment) => {
      const preview = previewEnrolmentCancel({
        status: item.status,
        priceInr: item.session?.priceInr ?? null,
        scheduledAt: item.session?.scheduledAt,
      });
      if (preview.kind === 'none') return;
      if (preview.kind === 'blocked') {
        Alert.alert('Cannot cancel', preview.message);
        return;
      }
      Alert.alert('Cancel this enrolment?', preview.message, [
        { text: 'Keep my seat', style: 'cancel' },
        {
          text: 'Yes, cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const { status, body } = await postWellnessCancel(item.id, token);
              const out = describeCancelOutcome(status, body);
              Alert.alert(out.ok ? 'Cancelled' : 'Could not cancel', out.message);
              if (out.ok) await query.refetch();
            } catch {
              Alert.alert('Could not cancel', 'We could not cancel this enrolment just now. Please try again.');
            }
          },
        },
      ]);
    },
    [token, query],
  );

  const renderRow = useCallback(
    ({ item }: { item: WellnessEnrolment }) => {
      const s = item.session;
      const paid = isPaidEnrolment(item.status);
      const pending = item.status === 'PENDING_PAYMENT';
      const duration = formatDuration(s?.durationMinutes ?? null);
      // Presence of roomUrl IS the server's entitlement decision. Nothing here
      // re-derives it from the status.
      const roomTarget = s?.roomUrl ? { url: s.roomUrl, title: s.title } : null;
      const roomAffordance = roomTarget
        ? describeWebHandoff(roomTarget, HANDOFF_OPTS, hostOf(roomTarget.url))
        : null;

      return (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {s?.type ? wellnessSessionTypeLabel(s.type) : 'Class'}
              </Text>
            </View>
            <View style={[styles.statusBadge, statusStyle(item.status)]}>
              <Text style={[styles.statusText, statusTextStyle(item.status)]}>
                {enrolmentStatusLabel(item.status)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={s?.title ?? 'Class'}
            accessibilityHint="Opens the class details"
            onPress={() =>
              router.push({
                pathname: '/(devotee)/wellness-class',
                params: { id: item.sessionId },
              } as never)
            }
          >
            <Text style={styles.cardTitle} numberOfLines={2}>
              {s?.title ?? 'Class'}
            </Text>
            {s?.instructorName ? (
              <Text style={styles.cardMeta} numberOfLines={1}>
                {s.instructorName}
              </Text>
            ) : null}
            <Text style={styles.cardMeta} numberOfLines={1}>
              {formatClassWhen(s?.scheduledAt)}
              {duration ? ` · ${duration}` : ''}
            </Text>
            <Text style={styles.price}>{formatClassPrice(s?.priceInr ?? null)}</Text>
          </TouchableOpacity>

          {roomTarget && roomAffordance ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              accessibilityRole={roomAffordance.role}
              accessibilityLabel={`Join ${s?.title ?? 'the class'}`}
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
          ) : paid ? (
            <Text style={styles.note}>
              Your seat is confirmed. The join link appears here as soon as the instructor
              publishes it.
            </Text>
          ) : null}

          {pending ? (
            <>
              <TouchableOpacity
                style={styles.primaryBtn}
                activeOpacity={0.85}
                accessibilityRole="link"
                accessibilityLabel={`Complete payment on ${hostOf(WEB.origin)}`}
                accessibilityHint={`Opens ${hostOf(
                  WEB.origin,
                )} in your browser, where you sign in and then complete payment for this class`}
                onPress={() => Linking.openURL(wellnessPaymentUrl(item.sessionId, WEB.origin))}
              >
                <Ionicons name="open-outline" size={16} color={colors.white} />
                <Text style={styles.primaryBtnText}>Pay on {hostOf(WEB.origin)}</Text>
              </TouchableOpacity>
              <Text style={styles.note}>
                Your seat is held but not paid for. Card payment happens on the website — the app
                does not carry a card form.
              </Text>
              {WEB.matchesEnvironment ? null : (
                <Text style={styles.warnText}>
                  This build talks to a different server than {hostOf(WEB.origin)}, so that site
                  will not know about this enrolment. Set EXPO_PUBLIC_WEB_URL to the website that
                  pairs with this build&apos;s API.
                </Text>
              )}
            </>
          ) : null}
          {canCancelEnrolment(item.status) && item.session?.status !== 'CANCELLED' ? (
            <TouchableOpacity
              style={styles.cancelBtn}
              accessibilityRole="button"
              accessibilityLabel={`Cancel enrolment in ${s?.title ?? 'this class'}`}
              onPress={() => cancelEnrolment(item)}
            >
              <Text style={styles.cancelBtnText}>Cancel enrolment</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    },
    [cancelEnrolment],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={colors.stone[700]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My classes</Text>
          <Text style={styles.headerSubtitle} numberOfLines={2}>
            Every wellness class you have enrolled in.
          </Text>
        </View>
      </View>

      {!token ? (
        <View style={styles.centreBox}>
          <Ionicons name="lock-closed-outline" size={32} color={colors.stone[400]} />
          <Text style={styles.centreTitle}>Sign in to see your classes</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            onPress={() => router.push('/(auth)/login' as never)}
          >
            <Text style={styles.primaryBtnText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      ) : query.isPending ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.saffron[600]} />
          <Text style={styles.stateText}>Loading your classes…</Text>
        </View>
      ) : query.isError ? (
        <View style={styles.centreBox}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.red[600]} />
          <Text style={styles.centreTitle}>We couldn&apos;t load your classes</Text>
          <Text style={styles.centreText}>
            This is a connection problem, not an empty list — anything you have enrolled in is
            still enrolled.
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
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.centreBox}>
              <Ionicons name="leaf-outline" size={32} color={colors.stone[400]} />
              <Text style={styles.centreTitle}>You haven&apos;t enrolled in a class yet</Text>
              <Text style={styles.centreText}>
                Browse the live timetable and reserve a seat — free satsang classes confirm
                straight away.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                accessibilityRole="button"
                accessibilityLabel="Browse classes"
                onPress={() => router.push('/(devotee)/wellness-classes' as never)}
              >
                <Text style={styles.primaryBtnText}>Browse classes</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function statusStyle(status: string) {
  switch (status) {
    case 'PAID':
    case 'ATTENDED':
      return { backgroundColor: colors.green[100] };
    case 'PENDING_PAYMENT':
      return { backgroundColor: colors.amber[100] };
    default:
      return { backgroundColor: colors.stone[100] };
  }
}

function statusTextStyle(status: string) {
  switch (status) {
    case 'PAID':
    case 'ATTENDED':
      return { color: colors.green[800] };
    case 'PENDING_PAYMENT':
      return { color: colors.amber[800] };
    default:
      return { color: colors.stone[600] };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[200],
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.stone[900] },
  headerSubtitle: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 1 },
  listContent: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  sectionHeader: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.stone[500],
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[200],
    padding: spacing.md,
    gap: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  typeBadge: {
    backgroundColor: colors.green[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  typeBadgeText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.green[800] },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.full },
  statusText: { fontSize: fontSize.xs, fontWeight: '700' },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[900] },
  cardMeta: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 1 },
  price: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[800], marginTop: 4 },
  note: { fontSize: fontSize.sm, lineHeight: 18, color: colors.stone[500], marginTop: spacing.xs },
  warnText: {
    fontSize: fontSize.sm,
    lineHeight: 18,
    color: colors.red[600],
    marginTop: spacing.xs,
  },
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
  cancelBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  cancelBtnText: { fontSize: fontSize.base, fontWeight: '600', color: colors.red[600] },
  primaryBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
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
