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
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { formatInr } from '../../lib/api-contracts';
import { pujaCategoryLabel } from '../../lib/enum-labels';
import { PLATFORM_FEE_INR } from '../../lib/booking-flow';
import {
  selectTempleDetail,
  selectTemplePujaList,
  templeBookability,
  type TemplePujaVM,
} from '../../lib/temple-detail';
import { useResponsiveGrid } from '../../lib/use-responsive';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * Every puja bookable at one temple — the mobile mirror of
 * apps/web/app/temples/[slug]/pujas.
 *
 *   GET /api/v1/temples/:slug/pujas  -> { temple{id,name,slug}, pujas[] }
 *   GET /api/v1/temples/:slug        -> the temple, for `isVerified` ONLY
 *
 * WHY TWO CALLS FOR ONE LIST
 * --------------------------
 * `/temples/:slug/pujas` does not return the temple's `isVerified` flag — its
 * `temple` object is `{id,name,slug}` and nothing else (temple.service.ts
 * getTemplePujas). But whether ANY row here may lead to a booking is decided
 * entirely by that flag: `booking.service.ts` refuses an unverified temple
 * outright and routes/bookings.ts returns 409 TEMPLE_NOT_VERIFIED.
 *
 * A screen that renders "Book now" on twelve rows the server will refuse is
 * the PAR-15 defect moved to a new surface, so the flag is fetched rather than
 * assumed. The detail query uses the SAME react-query key as
 * (devotee)/temple-detail.tsx, so arriving from that screen costs no extra
 * request — the cache already holds it.
 *
 * The gate is FAIL-CLOSED: while the temple read is still in flight, or if it
 * fails, `templeBookability(null)` returns `canBook: false`. Rows render, the
 * booking affordance does not appear until verification is confirmed.
 *
 * PRICE. `priceOverride` where this temple sets one, else the puja's
 * `basePrice`, formatted by the project's `formatInr`. Nothing is derived.
 * The flat platform fee the server folds into every booking is disclosed as a
 * separate line — CM-03: an advertised price that grows on the payment sheet
 * is the defect this footnote exists to prevent. The NRI price is not shown:
 * no booking path charges it (PAR-15).
 */

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && /\b404\b/.test(error.message);
}

const PujaCard = React.memo(function PujaCard({
  puja,
  canBook,
  onOpen,
}: {
  puja: TemplePujaVM;
  canBook: boolean;
  onOpen: (puja: TemplePujaVM) => void;
}) {
  const category = pujaCategoryLabel(puja.category);
  const inner = (
    <>
      <View style={styles.cardTop}>
        {category ? <Text style={styles.category}>{category}</Text> : null}
        {puja.durationMinutes !== null ? (
          <Text style={styles.duration}>{puja.durationMinutes} min</Text>
        ) : null}
      </View>

      <Text style={styles.name}>{puja.name}</Text>
      {puja.nameLocal ? <Text style={styles.nameLocal}>{puja.nameLocal}</Text> : null}
      {puja.deity ? <Text style={styles.deity}>Deity: {puja.deity}</Text> : null}
      {puja.description ? (
        <Text style={styles.description} numberOfLines={3}>
          {puja.description}
        </Text>
      ) : null}

      <View style={styles.cardBottom}>
        {puja.priceInr !== null ? (
          <View>
            <Text style={styles.price}>{formatInr(puja.priceInr)}</Text>
            {puja.priceIsTempleOverride ? (
              <Text style={styles.priceNote}>This temple&apos;s price</Text>
            ) : null}
          </View>
        ) : (
          <Text style={styles.priceMissing}>Price not published</Text>
        )}
        {canBook ? (
          <View style={styles.cta}>
            <Text style={styles.ctaText}>View</Text>
            <Ionicons name="chevron-forward" size={15} color={colors.white} />
          </View>
        ) : null}
      </View>

      {puja.slots.length > 0 ? (
        <Text style={styles.slots} numberOfLines={1}>
          Slots: {puja.slots.join(' · ')}
        </Text>
      ) : null}
    </>
  );

  if (!canBook) {
    return <View style={[styles.card, styles.cardDisabled]}>{inner}</View>;
  }
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${puja.name}, view details`}
      onPress={() => onOpen(puja)}
    >
      {inner}
    </TouchableOpacity>
  );
});

export default function TemplePujasScreen() {
  const params = useLocalSearchParams<{ slug?: string; name?: string }>();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const passedName = typeof params.name === 'string' ? params.name : null;
  const [refreshing, setRefreshing] = useState(false);
  const grid = useResponsiveGrid();

  const pujasQuery = useQuery<unknown>({
    queryKey: ['temples', slug, 'pujas'],
    queryFn: () => apiFetch<unknown>(`/temples/${encodeURIComponent(slug)}/pujas`),
    enabled: slug.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: (count, error) => count < 2 && !isNotFoundError(error),
  });

  // Same key as (devotee)/temple-detail.tsx, so this is a cache hit when the
  // devotee arrived from there. It exists only to answer `isVerified`.
  const templeQuery = useQuery<unknown>({
    queryKey: ['temples', 'detail', slug],
    queryFn: () => apiFetch<unknown>(`/temples/${encodeURIComponent(slug)}`),
    enabled: slug.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: (count, error) => count < 2 && !isNotFoundError(error),
  });

  const list = useMemo(() => selectTemplePujaList(pujasQuery.data), [pujasQuery.data]);
  const temple = useMemo(() => selectTempleDetail(templeQuery.data), [templeQuery.data]);
  // Fail-closed: null temple (still loading, or failed) means no booking
  // affordance is drawn. See lib/temple-detail.ts.
  const gate = useMemo(() => templeBookability(temple), [temple]);

  const templeName = list?.templeName ?? temple?.name ?? passedName ?? 'Temple';

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([pujasQuery.refetch(), templeQuery.refetch()]);
    setRefreshing(false);
  }, [pujasQuery, templeQuery]);

  const openPuja = useCallback((puja: TemplePujaVM) => {
    router.push({
      pathname: '/(devotee)/puja-detail' as never,
      params: { slug: puja.pujaSlug, name: puja.name },
    } as never);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: TemplePujaVM }) => (
      <PujaCard puja={item} canBook={gate.canBook} onOpen={openPuja} />
    ),
    [gate.canBook, openPuja],
  );

  const notFound =
    !slug || isNotFoundError(pujasQuery.error) || (pujasQuery.isSuccess && list === null);
  const errorText =
    pujasQuery.isError && !isNotFoundError(pujasQuery.error)
      ? pujasQuery.error instanceof Error
        ? pujasQuery.error.message
        : 'Unknown error'
      : null;
  const pujas = list?.pujas ?? [];

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
          <Text style={styles.headerTitle} numberOfLines={1}>
            Pujas at {templeName}
          </Text>
          <Text style={styles.headerSub}>
            {pujasQuery.isLoading
              ? 'Loading…'
              : notFound
                ? 'Temple not found'
                : errorText
                  ? 'Could not load pujas'
                  : `${pujas.length} puja${pujas.length === 1 ? '' : 's'} offered here`}
          </Text>
        </View>
      </View>

      {pujasQuery.isLoading ? (
        <View style={styles.stateBlock}>
          <ActivityIndicator color={colors.saffron[600]} size="large" />
          <Text style={styles.stateBody}>Loading pujas…</Text>
        </View>
      ) : (
        <FlatList
          data={pujas}
          key={grid.gridKey}
          numColumns={grid.columns > 2 ? 2 : 1}
          keyExtractor={(item) => item.offeringId}
          renderItem={renderItem}
          columnWrapperStyle={grid.columns > 2 ? styles.columnWrapper : undefined}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            pujas.length > 0 && !gate.canBook ? (
              <View style={styles.noticeCard}>
                <Ionicons name="information-circle-outline" size={18} color={colors.amber[700]} />
                <Text style={styles.noticeText}>{gate.reason}</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            pujas.length > 0 && gate.canBook ? (
              <Text style={styles.footnote}>
                Prices are per puja. A flat {formatInr(PLATFORM_FEE_INR)} platform fee is added at
                checkout, and prasad delivery is charged separately when you ask for it.
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.stateBlock}>
              <Ionicons
                name={notFound ? 'help-circle-outline' : errorText ? 'cloud-offline-outline' : 'flame-outline'}
                size={48}
                color={colors.stone[300]}
              />
              <Text style={styles.stateTitle}>
                {notFound
                  ? 'This temple is not in the catalogue'
                  : errorText
                    ? 'Could not load pujas'
                    : 'No pujas listed here yet'}
              </Text>
              <Text style={styles.stateBody}>
                {notFound
                  ? 'It may have been renamed or withdrawn.'
                  : errorText
                    ? `${errorText} — pull down to retry.`
                    : `${templeName} has not published a puja catalogue on Darshya yet.`}
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
  headerTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900] },
  headerSub: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 1 },

  listContent: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  columnWrapper: { gap: spacing.md },

  noticeCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.amber[50],
    borderWidth: 1,
    borderColor: colors.amber[200],
  },
  noticeText: { flex: 1, fontSize: fontSize.base, color: colors.amber[900], lineHeight: 20 },

  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    gap: 3,
  },
  cardDisabled: { opacity: 0.7 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  category: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: colors.saffron[700],
    textTransform: 'uppercase',
  },
  duration: { fontSize: fontSize.sm, color: colors.stone[400] },
  name: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900], marginTop: 2 },
  nameLocal: { fontSize: fontSize.base, color: colors.stone[500] },
  deity: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
  description: { fontSize: fontSize.base, color: colors.stone[600], lineHeight: 20, marginTop: spacing.xs },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  price: { fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
  priceNote: { fontSize: fontSize.xs, color: colors.stone[400] },
  priceMissing: { fontSize: fontSize.base, color: colors.stone[400] },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[600],
  },
  ctaText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
  slots: { fontSize: fontSize.sm, color: colors.stone[400], marginTop: spacing.xs },

  footnote: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    lineHeight: 18,
    paddingTop: spacing.md,
  },

  stateBlock: { alignItems: 'center', paddingTop: spacing['2xl'], paddingHorizontal: spacing.lg, gap: spacing.sm },
  stateTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.stone[700], textAlign: 'center' },
  stateBody: { fontSize: fontSize.base, color: colors.stone[500], textAlign: 'center' },
});
