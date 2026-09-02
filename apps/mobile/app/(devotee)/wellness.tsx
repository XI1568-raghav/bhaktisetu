import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWellnessClasses } from '../../lib/wellness-queries';
import {
  selectWellnessClasses,
  buildInstructorIndex,
  formatClassPrice,
  formatClassWhen,
  formatDuration,
  formatSeats,
  isFull,
  isLive,
} from '../../lib/wellness';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { wellnessSessionTypeLabel } from '../../lib/enum-labels';
import { useCarouselCardWidth } from '../../lib/use-responsive';

/**
 * The wellness hub — the mobile mirror of apps/web/app/wellness/page.tsx.
 *
 * WHAT WAS DELETED HERE, AND WHY IT HAD TO BE
 * -------------------------------------------
 * This screen used to carry three tabs, and two of them were entirely invented:
 *
 *   · FIVE MEDITATION TRACKS — "Om Meditation (Deep Focus)" guided by "Swami
 *     Vivekanand", "Sleep & Relaxation" with **23.1K plays**, "Chakra Healing"
 *     with 8.9K. There is no meditation-track endpoint anywhere in the API, no
 *     play counter, and none of those guides teach on Darshya. The numbers were
 *     literals in the file, rendered unconditionally to every devotee, and
 *     "play" was an `Alert.alert`. A fabricated play count is a popularity
 *     claim — it is the reason a devotee picks one practice over another — so
 *     it is not decoration, it is a false statement about the platform.
 *   · A "Quick Meditation" row (5/10/15/20 min) whose every button opened an
 *     alert saying a session had started. Nothing started.
 *   · An AYURVEDA tab: a "Discover Your Dosha" quiz CTA that apologised in an
 *     alert ("Quiz coming soon!"), plus four editorial tips the platform does
 *     not publish anywhere else.
 *
 * All of it is gone rather than patched, along with the tab switcher that
 * existed to hold it. What remains is the section the API actually serves: real
 * `wellness_sessions` rows, the instructors who teach them, and the two routes
 * a devotee needs after paying.
 *
 * The earlier "Daily Yoga Challenge — Day 12 of 21" card and four hardcoded
 * classes ("Surya Namaskar Flow with Guru Priya, 340 practising now") were
 * removed by PAR-10; their absence is preserved here.
 *
 * Nothing on this screen is derived. Price, seat count and instructor name are
 * all published by the server (AW-07) precisely so no client re-implements
 * them.
 */

const MAX_CLASSES_ON_HUB = 8;
const MAX_INSTRUCTORS_ON_HUB = 6;

interface HubLink {
  key: string;
  label: string;
  hint: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  route: string;
}

const HUB_LINKS: HubLink[] = [
  {
    key: 'classes',
    label: 'All classes',
    hint: 'Browse every upcoming wellness class',
    icon: 'calendar',
    route: '/(devotee)/wellness-classes',
  },
  {
    key: 'instructors',
    label: 'Instructors',
    hint: 'See the teachers with classes scheduled',
    icon: 'people',
    route: '/(devotee)/wellness-instructors',
  },
  {
    key: 'mine',
    label: 'My classes',
    hint: 'Open the classes you have enrolled in',
    icon: 'bookmark',
    route: '/(devotee)/wellness-my-classes',
  },
];

export default function WellnessScreen() {
  const query = useWellnessClasses();
  const [refreshing, setRefreshing] = useState(false);
  const cardWidth = useCarouselCardWidth();

  const classes = useMemo(
    () => selectWellnessClasses(query.data).slice(0, MAX_CLASSES_ON_HUB),
    [query.data],
  );
  const instructors = useMemo(
    () => buildInstructorIndex(selectWellnessClasses(query.data)).slice(0, MAX_INSTRUCTORS_ON_HUB),
    [query.data],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Wellness</Text>
          <Text style={styles.headerSubtitle}>
            Live yoga, meditation, vipassana and pranayama classes, scheduled by instructors
            on Darshya. Enrol to reserve your seat; the join link appears once your payment is
            confirmed.
          </Text>
        </View>

        <View style={styles.linkRow}>
          {HUB_LINKS.map((link) => (
            <TouchableOpacity
              key={link.key}
              style={styles.linkCard}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={link.label}
              accessibilityHint={link.hint}
              onPress={() => router.push(link.route as never)}
            >
              <View style={styles.linkIcon}>
                <Ionicons name={link.icon} size={18} color={colors.green[700]} />
              </View>
              <Text style={styles.linkLabel}>{link.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Next classes</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="See all classes"
            style={styles.seeAll}
            onPress={() => router.push('/(devotee)/wellness-classes' as never)}
          >
            <Text style={styles.seeAllText}>See all</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.saffron[600]} />
          </TouchableOpacity>
        </View>

        {query.isPending ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={colors.saffron[600]} />
            <Text style={styles.stateText}>Loading classes…</Text>
          </View>
        ) : query.isError ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={colors.red[600]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorText}>
                We couldn&apos;t load the class schedule just now.
              </Text>
              <TouchableOpacity
                style={styles.retryBtn}
                accessibilityRole="button"
                accessibilityLabel="Try loading classes again"
                onPress={() => void query.refetch()}
              >
                <Ionicons name="refresh" size={14} color={colors.white} />
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : classes.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="leaf-outline" size={22} color={colors.stone[400]} />
            <Text style={styles.emptyTitle}>No classes are scheduled right now</Text>
            <Text style={styles.emptyText}>
              Instructors publish their timetable here. Pull down to check again.
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
          >
            {classes.map((item) => {
              const seats = formatSeats(item.spotsLeft);
              const duration = formatDuration(item.durationMinutes);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.classCard, { width: cardWidth }]}
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
                  <View style={styles.classBanner}>
                    <Ionicons name="body" size={26} color={colors.green[600]} />
                    {isLive(item) ? (
                      <View style={styles.liveBadge}>
                        <View style={styles.livePulse} />
                        <Text style={styles.liveBadgeText}>LIVE</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.classBody}>
                    <Text style={styles.classTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.instructorName ? (
                      <Text style={styles.classInstructor} numberOfLines={1}>
                        {item.instructorName}
                      </Text>
                    ) : null}
                    <Text style={styles.classWhen} numberOfLines={1}>
                      {formatClassWhen(item.scheduledAt)}
                      {duration ? ` · ${duration}` : ''}
                    </Text>
                    <View style={styles.classFooter}>
                      <Text style={styles.classPrice}>{formatClassPrice(item.priceInr)}</Text>
                      {seats ? (
                        <Text style={[styles.classSeats, isFull(item) && styles.classSeatsFull]}>
                          {seats}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {instructors.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Teaching this week</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="See all instructors"
                style={styles.seeAll}
                onPress={() => router.push('/(devotee)/wellness-instructors' as never)}
              >
                <Text style={styles.seeAllText}>See all</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.saffron[600]} />
              </TouchableOpacity>
            </View>
            {/* Listed because they have a REAL upcoming class. No rating, no
                years of experience, no certification — the platform holds none
                of those for these people and the fixture that claims otherwise
                (GET /wellness/instructors) is not read anywhere in this app. */}
            {instructors.map((person) => (
              <TouchableOpacity
                key={person.id}
                style={styles.instructorRow}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={person.name}
                accessibilityHint="Opens this instructor's upcoming classes"
                onPress={() =>
                  router.push({
                    pathname: '/(devotee)/wellness-instructor',
                    params: { key: person.id, name: person.name },
                  } as never)
                }
              >
                <View style={styles.instructorAvatar}>
                  <Text style={styles.instructorInitial}>
                    {person.name.trim().charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.instructorName} numberOfLines={1}>
                    {person.name}
                  </Text>
                  <Text style={styles.instructorMeta} numberOfLines={1}>
                    {person.classCount === 1 ? '1 upcoming class' : `${person.classCount} upcoming classes`}
                    {person.types.length > 0
                      ? ` · ${person.types.map(wellnessSessionTypeLabel).join(', ')}`
                      : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.stone[300]} />
              </TouchableOpacity>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  body: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  header: { marginBottom: spacing.xs },
  headerTitle: {
    fontSize: fontSize['3xl'],
    fontWeight: '800',
    color: colors.stone[900],
  },
  headerSubtitle: {
    fontSize: fontSize.base,
    lineHeight: 20,
    color: colors.stone[500],
    marginTop: spacing.xs,
  },
  linkRow: { flexDirection: 'row', gap: spacing.sm },
  linkCard: {
    flex: 1,
    minHeight: 76,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[200],
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  linkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.stone[800],
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.stone[900],
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 44,
    paddingLeft: spacing.sm,
  },
  seeAllText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.saffron[600] },
  carousel: { gap: spacing.sm, paddingVertical: spacing.xs },
  classCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[200],
    overflow: 'hidden',
  },
  classBanner: {
    height: 84,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
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
  classBody: { padding: spacing.sm, gap: 3 },
  classTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[900] },
  classInstructor: { fontSize: fontSize.sm, color: colors.stone[600] },
  classWhen: { fontSize: fontSize.sm, color: colors.stone[500] },
  classFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  classPrice: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  classSeats: { fontSize: fontSize.xs, fontWeight: '600', color: colors.green[700] },
  classSeatsFull: { color: colors.red[600] },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 64,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[200],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
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
  instructorName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[900] },
  instructorMeta: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 1 },
  stateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  stateText: { fontSize: fontSize.base, color: colors.stone[500] },
  errorBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: spacing.sm,
  },
  errorText: { fontSize: fontSize.base, color: colors.stone[800], lineHeight: 19 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[600],
  },
  retryText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
  emptyBox: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[200],
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[800] },
  emptyText: { fontSize: fontSize.sm, color: colors.stone[500], textAlign: 'center' },
});
