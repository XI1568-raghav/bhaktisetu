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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWellnessClasses } from '../../lib/wellness-queries';
import {
  selectWellnessClasses,
  buildInstructorIndex,
  formatClassPrice,
  formatClassWhen,
  type WellnessInstructorSummary,
} from '../../lib/wellness';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { wellnessSessionTypeLabel } from '../../lib/enum-labels';

/**
 * The instructor directory — the mobile mirror of
 * apps/web/app/wellness/instructors.
 *
 * IT IS BUILT ON THE LIVE CLASS FEED, NOT ON GET /api/v1/wellness/instructors.
 * That endpoint still serves the eight-person `instructors` fixture in
 * apps/api/src/routes/wellness.ts — invented ratings ("4.9 · 342 reviews"),
 * invented per-session prices, invented review text signed with invented
 * names, and invented CREDENTIALS ("E-RYT 500", "KPJAYI Authorized Level 1",
 * "MBSR Certified (UMass Medical School)"). apps/web refused to consume it for
 * exactly this reason and so does this screen: a certification is a claim about
 * a real person's qualifications, and publishing one the platform never
 * verified is not a UI defect, it is a lie about someone's competence to teach
 * a body practice.
 *
 * So an instructor is listed here because they have a REAL upcoming class,
 * priced at what that class actually costs. No rating, no years of experience,
 * no certification, no stock portrait — the platform holds none of those for
 * these people, and a screen that shows none is the only honest one available.
 */

export default function WellnessInstructorsScreen() {
  const query = useWellnessClasses();
  const [refreshing, setRefreshing] = useState(false);

  const instructors = useMemo(
    () => buildInstructorIndex(selectWellnessClasses(query.data)),
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

  const renderRow = useCallback(({ item }: { item: WellnessInstructorSummary }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={item.name}
        accessibilityHint="Opens this instructor's upcoming classes"
        onPress={() =>
          router.push({
            pathname: '/(devotee)/wellness-instructor',
            params: { key: item.id, name: item.name },
          } as never)
        }
      >
        <View style={styles.avatar}>
          <Text style={styles.initial}>{item.name.trim().charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {item.classCount === 1 ? '1 upcoming class' : `${item.classCount} upcoming classes`}
            {item.types.length > 0
              ? ` · ${item.types.map(wellnessSessionTypeLabel).join(', ')}`
              : ''}
          </Text>
          <Text style={styles.next} numberOfLines={1}>
            Next: {item.nextTitle} · {formatClassWhen(item.nextAt)}
          </Text>
          <Text style={styles.price}>From {formatClassPrice(item.lowestPriceInr)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.stone[300]} />
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
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Instructors</Text>
          <Text style={styles.headerSubtitle} numberOfLines={2}>
            Everyone with a class scheduled on Darshya right now.
          </Text>
        </View>
      </View>

      {query.isPending ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.saffron[600]} />
          <Text style={styles.stateText}>Loading instructors…</Text>
        </View>
      ) : query.isError ? (
        <View style={styles.centreBox}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.red[600]} />
          <Text style={styles.centreTitle}>We couldn&apos;t load the instructors</Text>
          <Text style={styles.centreText}>
            This list is built from the live class schedule, so this is a connection problem
            rather than an empty roster.
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
          data={instructors}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.centreBox}>
              <Ionicons name="people-outline" size={32} color={colors.stone[400]} />
              <Text style={styles.centreTitle}>No instructors are teaching right now</Text>
              <Text style={styles.centreText}>
                Teachers appear here as soon as they schedule a class. Pull down to check again.
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
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.stone[900] },
  headerSubtitle: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 1 },
  listContent: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 76,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[200],
    padding: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.green[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontSize: fontSize.xl, fontWeight: '800', color: colors.green[800] },
  name: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[900] },
  meta: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 1 },
  next: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 1 },
  price: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[800], marginTop: 3 },
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
