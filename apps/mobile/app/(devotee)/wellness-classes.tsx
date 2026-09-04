import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
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
  filterClassesByType,
  availableTypeFilters,
  formatClassPrice,
  formatClassWhen,
  formatDuration,
  formatSeats,
  isFull,
  isLive,
  WELLNESS_TYPE_FILTERS,
  type WellnessClass,
  type WellnessTypeFilter,
} from '../../lib/wellness';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { wellnessSessionTypeLabel } from '../../lib/enum-labels';
import { breakpoints, gridCardWidth, useResponsiveGrid } from '../../lib/use-responsive';

/**
 * The class catalogue — the mobile mirror of apps/web/app/wellness/classes.
 *
 * Every row is a real `wellness_sessions` row from GET /api/v1/wellness/sessions.
 * There is no fixture fallback: an empty API means an empty catalogue and it
 * says so, and a failed fetch says THAT rather than quietly rendering "no
 * classes". Those two sentences are different and only one of them is the
 * devotee's problem.
 *
 * THE TYPE FILTER IS THE HONEST FORM OF /wellness/yoga, /meditation, /vipassana.
 * The website ships three prose landing pages at those paths; none of them
 * reads an endpoint — they are static editorial with no class data behind them.
 * Rebuilding three copies of that prose in the app would add three screens that
 * cannot answer "when is the next one". Filtering the real feed by the API's
 * own `WellnessSessionType` enum answers exactly that, and a filter with no
 * classes behind it is not offered at all.
 */

export default function WellnessClassesScreen() {
  const query = useWellnessClasses();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<WellnessTypeFilter>('ALL');

  const grid = useResponsiveGrid();
  // Class cards carry a title, a teacher, a time, a price and a seat count, so
  // two of them side by side on a phone is unreadable. One column on compact
  // windows; wider windows get the grid's count less one, which lands on 2 for
  // a tablet in Split View and 3 full-screen.
  const columns = grid.width < breakpoints.compact ? 1 : Math.max(1, grid.columns - 1);
  const cardWidth = gridCardWidth(grid.width, columns);

  const all = useMemo(() => selectWellnessClasses(query.data), [query.data]);
  const filters = useMemo(() => availableTypeFilters(all), [all]);
  const visible = useMemo(() => filterClassesByType(all, filter), [all, filter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  const renderCard = useCallback(
    ({ item }: { item: WellnessClass }) => {
      const seats = formatSeats(item.spotsLeft);
      const duration = formatDuration(item.durationMinutes);
      return (
        <TouchableOpacity
          style={[styles.card, { width: cardWidth }]}
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
          {item.instructorName ? (
            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={13} color={colors.stone[400]} />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.instructorName}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color={colors.stone[400]} />
            <Text style={styles.metaText} numberOfLines={1}>
              {formatClassWhen(item.scheduledAt)}
            </Text>
          </View>
          {duration ? (
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={13} color={colors.stone[400]} />
              <Text style={styles.metaText}>{duration}</Text>
            </View>
          ) : null}
          <View style={styles.cardFooter}>
            <Text style={styles.price}>{formatClassPrice(item.priceInr)}</Text>
            {seats ? (
              <Text style={[styles.seats, isFull(item) && styles.seatsFull]}>{seats}</Text>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [cardWidth],
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
          <Text style={styles.headerTitle}>Live classes</Text>
          <Text style={styles.headerSubtitle} numberOfLines={2}>
            Scheduled by instructors on Darshya. Enrol to reserve your seat.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="My classes"
          accessibilityHint="Opens the classes you have enrolled in"
          onPress={() => router.push('/(devotee)/wellness-my-classes' as never)}
        >
          <Ionicons name="bookmark-outline" size={20} color={colors.stone[700]} />
        </TouchableOpacity>
      </View>

      {filters.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {WELLNESS_TYPE_FILTERS.filter((f) => filters.includes(f.key)).map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${f.label} classes`}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {query.isPending ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.saffron[600]} />
          <Text style={styles.stateText}>Loading classes…</Text>
        </View>
      ) : query.isError ? (
        <View style={styles.centreBox}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.red[600]} />
          <Text style={styles.centreTitle}>We couldn&apos;t load the class schedule</Text>
          <Text style={styles.centreText}>
            The catalogue is served live, so this is a connection problem rather than an empty
            timetable.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            accessibilityRole="button"
            accessibilityLabel="Try loading classes again"
            onPress={() => void query.refetch()}
          >
            <Ionicons name="refresh" size={16} color={colors.white} />
            <Text style={styles.primaryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          key={`wellness-classes-${columns}`}
          data={visible}
          keyExtractor={(item) => item.id}
          numColumns={columns}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={columns > 1 ? styles.column : undefined}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.centreBox}>
              <Ionicons name="leaf-outline" size={32} color={colors.stone[400]} />
              <Text style={styles.centreTitle}>
                {filter === 'ALL'
                  ? 'No classes are scheduled right now'
                  : 'No classes of this kind are scheduled'}
              </Text>
              <Text style={styles.centreText}>
                {filter === 'ALL'
                  ? 'Instructors publish their timetable here. Pull down to check again.'
                  : 'Try another kind of class, or pull down to check again.'}
              </Text>
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
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[200],
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  headerTitle: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.stone[900] },
  headerSubtitle: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 1 },
  filterRow: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone[200],
  },
  chipActive: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[600] },
  chipText: { fontSize: fontSize.base, fontWeight: '600', color: colors.stone[600] },
  chipTextActive: { color: colors.white },
  listContent: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  column: { gap: spacing.sm },
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
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.stone[900],
    marginTop: 2,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: fontSize.sm, color: colors.stone[500], flexShrink: 1 },
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
