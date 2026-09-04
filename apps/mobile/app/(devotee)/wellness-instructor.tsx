import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWellnessClasses } from '../../lib/wellness-queries';
import {
  selectWellnessClasses,
  classesByInstructor,
  formatClassPrice,
  formatClassWhen,
  formatDuration,
  formatSeats,
  isFull,
  isLive,
  type WellnessClass,
} from '../../lib/wellness';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { wellnessSessionTypeLabel } from '../../lib/enum-labels';

/**
 * One instructor — the mobile counterpart of
 * apps/web/app/wellness/instructors/[id].
 *
 * WHAT THIS SCREEN DELIBERATELY DOES NOT SHOW, AND WHY
 * ----------------------------------------------------
 * The website's profile page is prerendered from eight HARDCODED instructor
 * records carrying a rating, a review count, a years-of-experience figure,
 * verbatim testimonials attributed to named devotees, and a certifications
 * list ("E-RYT 500", "Bihar School of Yoga Diploma", "KPJAYI Authorized").
 * None of it is stored, none of it is verified, and the same fiction shipped
 * inside this app once already — app/(wellness)/profile.tsx published
 * "RYT-500 Yoga Alliance" for every instructor who signed up, as a hardcoded
 * fallback.
 *
 * A credential is a claim about a real person's qualification to teach a
 * physical practice. It is not decoration and it is not mirrored here. What the
 * platform genuinely knows about a wellness instructor is what they have
 * scheduled, so that is what this profile is: their real upcoming classes, from
 * the same live feed the catalogue reads, with the enrolment route the website's
 * profile page did not have until CI-05.
 *
 * The name comes in as a route param because the class feed is the only place
 * it exists — there is no per-instructor endpoint outside the fixture. It is
 * therefore treated as a LABEL, not as a fact to be trusted: the classes shown
 * are matched on `instructorId` (or the normalised name for pre-join rows), and
 * an unmatched key renders as empty rather than as someone else's timetable.
 */

export default function WellnessInstructorScreen() {
  const params = useLocalSearchParams<{ key?: string; name?: string }>();
  const key = typeof params.key === 'string' ? params.key : '';
  const name = typeof params.name === 'string' && params.name.length > 0 ? params.name : null;

  const query = useWellnessClasses();
  const [refreshing, setRefreshing] = useState(false);

  const classes = useMemo(
    () => classesByInstructor(selectWellnessClasses(query.data), key),
    [query.data, key],
  );

  // Prefer the name the live feed carries over the one the caller passed: a
  // param can be stale, the feed cannot.
  const displayName = classes.find((c) => c.instructorName)?.instructorName ?? name;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  const renderClass = useCallback(({ item }: { item: WellnessClass }) => {
    const seats = formatSeats(item.spotsLeft);
    const duration = formatDuration(item.durationMinutes);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={item.title}
        accessibilityHint="Opens the class details, where you can enrol"
        onPress={() =>
          router.push({
            pathname: '/(devotee)/wellness-class',
            params: { id: item.id },
          } as never)
        }
      >
        <View style={styles.cardTop}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {wellnessSessionTypeLabel(item.type) || 'Class'}
            </Text>
          </View>
          {isLive(item) ? (
            <View style={styles.liveBadge}>
              <View style={styles.livePulse} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {formatClassWhen(item.scheduledAt)}
          {duration ? ` · ${duration}` : ''}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.price}>{formatClassPrice(item.priceInr)}</Text>
          {seats ? (
            <Text style={[styles.seats, isFull(item) && styles.seatsFull]}>{seats}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }, []);

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
        <Text style={styles.headerTitle} numberOfLines={1}>
          Instructor
        </Text>
        <View style={styles.backBtn} />
      </View>

      {query.isPending ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.saffron[600]} />
          <Text style={styles.stateText}>Loading classes…</Text>
        </View>
      ) : query.isError ? (
        <View style={styles.centreBox}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.red[600]} />
          <Text style={styles.centreTitle}>We couldn&apos;t load this instructor</Text>
          <Text style={styles.centreText}>
            This profile is built from the live class schedule, so this is a connection problem
            rather than an empty timetable.
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
        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          renderItem={renderClass}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View style={styles.profile}>
              <View style={styles.avatar}>
                <Text style={styles.initial}>
                  {(displayName ?? '?').trim().charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.name}>{displayName ?? 'This instructor'}</Text>
              <Text style={styles.profileMeta}>
                {classes.length === 0
                  ? 'No upcoming classes'
                  : classes.length === 1
                    ? '1 upcoming class on Darshya'
                    : `${classes.length} upcoming classes on Darshya`}
              </Text>
              {/* Deliberately no rating, no experience figure, no certification
                  and no testimonials — see the header of this file. */}
              <Text style={styles.sectionTitle}>Upcoming classes</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.centreBox}>
              <Ionicons name="calendar-outline" size={32} color={colors.stone[400]} />
              <Text style={styles.centreTitle}>Nothing scheduled right now</Text>
              <Text style={styles.centreText}>
                This instructor has no upcoming class on Darshya. Browse everyone else who does.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                accessibilityRole="button"
                accessibilityLabel="Browse all classes"
                onPress={() => router.push('/(devotee)/wellness-classes' as never)}
              >
                <Text style={styles.primaryBtnText}>Browse all classes</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
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
  listContent: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  profile: { alignItems: 'center', gap: 4, paddingBottom: spacing.sm },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.green[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontSize: fontSize['3xl'], fontWeight: '800', color: colors.green[800] },
  name: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.stone[900],
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  profileMeta: { fontSize: fontSize.base, color: colors.stone[500] },
  sectionTitle: {
    alignSelf: 'flex-start',
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.stone[900],
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[200],
    padding: spacing.md,
    gap: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  typeBadge: {
    backgroundColor: colors.green[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  typeBadgeText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.green[800] },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.red[600],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white },
  liveBadgeText: { fontSize: fontSize.xs, fontWeight: '800', color: colors.white },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[900], marginTop: 2 },
  cardMeta: { fontSize: fontSize.sm, color: colors.stone[500] },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.stone[100],
  },
  price: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900] },
  seats: { fontSize: fontSize.sm, fontWeight: '600', color: colors.green[700] },
  seatsFull: { color: colors.red[600] },
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
});
