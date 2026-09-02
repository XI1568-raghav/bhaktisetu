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
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import {
  selectApprovedGaushalas,
  selectApprovedGaushalaTotal,
  GAUSHALA_SETTLEMENT_NOTICE,
  type ApprovedGaushalaVM,
} from '../../lib/gaushala-directory';
import { NO_80G_DISCLOSURE } from '../../lib/eighty-g';
import { useResponsiveGrid } from '../../lib/use-responsive';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * Gau seva — the approved-gaushala directory. The mobile mirror of
 * apps/web/app/gaushala's `<ApprovedProvidersStrip type="gaushala">`.
 *
 * THE GAP IT CLOSES
 * -----------------
 * There was no gaushala surface in the app at all. The only way a devotee
 * reached a shelter was the donee picker inside (devotee)/donations.tsx — a
 * bare list of names with no description, no location, no herd size and no way
 * to read anything about the organisation before choosing where money goes.
 * Gau seva is a donation path with real rupees on it; a name in a picker is
 * not enough to decide with.
 *
 *   GET /api/v1/providers/gaushala  -> { providers[], total, page, limit }
 *
 * WHY THAT ENDPOINT AND NOT `GET /api/v1/gaushala`
 * ------------------------------------------------
 * Because the other one is a fixture array whose own service header reads
 * "SAMPLE listings. Nothing here has been verified", and because a donation to
 * a row that is not an approved GaushalaProfile is refused by
 * `POST /donations/create-order` with `gaushala_not_onboarded` AFTER the
 * devotee has chosen an amount. apps/web deleted its hand-written gaushala
 * cards for the first reason (TC-11) and moved to this endpoint; the reasoning
 * is written out once in lib/gaushala-directory.ts.
 *
 * NO VERIFICATION BADGE. `GaushalaProfile.verified` is written by nothing in
 * the product, so it can only ever be false and is never read here. `approved`
 * is the flag the approval paths really set, and "Approved" is the word
 * apps/web settled on for it.
 *
 * NO INVENTED NUMBERS. `totalCows` defaults to 0 in the schema, so a shelter
 * that has not stated its herd size reads "Herd size not stated" — never
 * "0 cows in care", which would be false of every gaushala alive.
 */

const GaushalaCard = React.memo(function GaushalaCard({
  gaushala,
  onOpen,
}: {
  gaushala: ApprovedGaushalaVM;
  onOpen: (g: ApprovedGaushalaVM) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${gaushala.name}, view gaushala`}
      onPress={() => onOpen(gaushala)}
    >
      <View style={styles.cardIcon}>
        <Ionicons name="leaf-outline" size={22} color={colors.green[600]} />
      </View>

      <Text style={styles.name} numberOfLines={2}>
        {gaushala.name}
      </Text>

      {gaushala.city ? (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={13} color={colors.stone[400]} />
          <Text style={styles.meta} numberOfLines={1}>
            {gaushala.city}
          </Text>
        </View>
      ) : null}

      <View style={styles.metaRow}>
        <Ionicons name="albums-outline" size={13} color={colors.stone[400]} />
        <Text style={styles.meta}>
          {gaushala.totalCows !== null
            ? `${gaushala.totalCows.toLocaleString('en-IN')} cows in care`
            : 'Herd size not stated'}
        </Text>
      </View>

      {gaushala.description ? (
        <Text style={styles.description} numberOfLines={3}>
          {gaushala.description}
        </Text>
      ) : null}

      <View style={styles.approvedChip}>
        <Ionicons name="checkmark-circle" size={13} color={colors.green[700]} />
        <Text style={styles.approvedText}>Approved gaushala</Text>
      </View>
    </TouchableOpacity>
  );
});

export default function GaushalasScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const grid = useResponsiveGrid();

  const query = useQuery<unknown>({
    queryKey: ['providers', 'gaushala', 'list'],
    queryFn: () => apiFetch<unknown>('/providers/gaushala?limit=50'),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const gaushalas = useMemo(() => selectApprovedGaushalas(query.data), [query.data]);
  const total = useMemo(
    () => selectApprovedGaushalaTotal(query.data, gaushalas.length),
    [query.data, gaushalas.length],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const openGaushala = useCallback((g: ApprovedGaushalaVM) => {
    router.push({
      pathname: '/(devotee)/gaushala-detail' as never,
      params: { id: g.id, name: g.name },
    } as never);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ApprovedGaushalaVM }) => (
      <GaushalaCard gaushala={item} onOpen={openGaushala} />
    ),
    [openGaushala],
  );

  const errorText = query.isError
    ? query.error instanceof Error
      ? query.error.message
      : 'Unknown error'
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.stone[800]} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Gau Seva</Text>
          <Text style={styles.headerSub}>
            {query.isLoading
              ? 'Loading gaushalas…'
              : errorText
                ? 'Gaushalas unavailable'
                : `${total} approved gaushala${total === 1 ? '' : 's'}`}
          </Text>
        </View>
      </View>

      {query.isLoading ? (
        <View style={styles.stateBlock}>
          <ActivityIndicator color={colors.saffron[600]} size="large" />
          <Text style={styles.stateBody}>Loading gaushalas…</Text>
        </View>
      ) : (
        <FlatList
          data={gaushalas}
          // numColumns cannot change on the fly — the key remounts the list on
          // exactly the renders where the column count differs.
          key={grid.gridKey}
          numColumns={grid.columns}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          columnWrapperStyle={grid.columns > 1 ? styles.columnWrapper : undefined}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View style={styles.introCard}>
              <Text style={styles.introText}>
                Every gaushala listed here was reviewed and approved before being listed.
                {' '}
                {GAUSHALA_SETTLEMENT_NOTICE}
              </Text>
              {/* The tax position, stated once, at the top of the surface that
                  leads to money. lib/eighty-g.ts owns the sentence; HAS_80G is
                  false and this text returns unchanged the day it flips. */}
              <Text style={styles.introFootnote}>{NO_80G_DISCLOSURE}</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.stateBlock}>
              <Ionicons
                name={errorText ? 'cloud-offline-outline' : 'leaf-outline'}
                size={48}
                color={colors.stone[300]}
              />
              <Text style={styles.stateTitle}>
                {errorText ? 'Could not load gaushalas' : 'No gaushalas listed yet'}
              </Text>
              <Text style={styles.stateBody}>
                {errorText
                  ? `${errorText} — pull down to retry.`
                  : 'No gaushala has completed onboarding on Darshya yet, so there is none to support here today.'}
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerTitle: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.stone[900] },
  headerSub: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 1 },

  listContent: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  columnWrapper: { gap: spacing.sm },

  introCard: {
    backgroundColor: colors.green[50],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  introText: { fontSize: fontSize.base, color: colors.green[900], lineHeight: 20 },
  introFootnote: { fontSize: fontSize.sm, color: colors.stone[600], lineHeight: 18 },

  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    gap: 3,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  name: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { flex: 1, fontSize: fontSize.sm, color: colors.stone[500] },
  description: {
    fontSize: fontSize.base,
    color: colors.stone[600],
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  approvedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.green[50],
  },
  approvedText: { fontSize: fontSize.xs, fontWeight: '800', color: colors.green[700] },

  stateBlock: {
    alignItems: 'center',
    paddingTop: spacing['2xl'],
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  stateTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.stone[700], textAlign: 'center' },
  stateBody: { fontSize: fontSize.base, color: colors.stone[500], textAlign: 'center', lineHeight: 20 },
});
