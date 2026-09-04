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
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import {
  selectGaushalaDetail,
  gaushalaDonability,
  GAUSHALA_SETTLEMENT_NOTICE,
} from '../../lib/gaushala-directory';
import { NO_80G_DISCLOSURE, RECEIPT_NOUN } from '../../lib/eighty-g';
import { useResponsiveGrid } from '../../lib/use-responsive';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * One gaushala — the mobile mirror of apps/web/app/gaushala/profile/[id].
 *
 *   GET /api/v1/gaushala/:id -> { gaushala: { …, source, donationCauseId } }
 *
 * The route resolves an id two ways and SAYS WHICH in `source`: a real,
 * approved GaushalaProfile (`profile`), or a legacy directory fixture
 * (`fixture`). That distinction decides whether a donate control may be drawn
 * at all — `POST /donations/create-order` accepts a profile id or its owner's
 * user id, and refuses anything else with `gaushala_not_onboarded`. The rule
 * lives in lib/gaushala-directory.ts `gaushalaDonability`; this screen renders
 * its answer.
 *
 * NOTHING FABRICATED. The profile branch of that route deliberately returns an
 * EMPTY cow roster — "no fixture cows are grafted onto a real gaushala" — so
 * there is no per-cow adoption UI here, and the absence is stated rather than
 * filled with the eight seed cows from the catalogue. Herd size is the
 * shelter's own `totalCows`, and 0 (the schema default) reads "Not stated".
 *
 * NO VERIFICATION BADGE, EVER. `GaushalaProfile.verified` is written by nothing
 * in the API — every approval path sets `approved` — so the route stopped
 * echoing it (TC-11) and this screen never asks for it. "Approved gaushala" is
 * the claim the product can actually support.
 *
 * MONEY. No amount is shown, computed or totalled here: this screen chooses a
 * DONEE and hands the cause id to (devotee)/donations.tsx, which owns the
 * amount, the validation and the order. The tax position comes from
 * lib/eighty-g.ts, whose HAS_80G is false — so the receipt is named a donation
 * receipt and no deduction is implied.
 */

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && /\b404\b/.test(error.message);
}

export default function GaushalaDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const passedName = typeof params.name === 'string' ? params.name : null;
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useResponsiveGrid();

  const query = useQuery<unknown>({
    queryKey: ['gaushala', 'detail', id],
    queryFn: () => apiFetch<unknown>(`/gaushala/${encodeURIComponent(id)}`),
    enabled: id.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: (count, error) => count < 2 && !isNotFoundError(error),
  });

  const gaushala = useMemo(() => selectGaushalaDetail(query.data), [query.data]);
  const donability = useMemo(() => gaushalaDonability(gaushala), [gaushala]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const openDonation = useCallback(() => {
    if (!gaushala || !donability.canDonate || !donability.causeId) return;
    // The cause id travels into the app's own donation screen, which creates
    // the order against THIS build's API. Nothing is opened in a browser here:
    // an order minted against production from a staging build is the class of
    // bug lib/web-origin.ts exists to prevent.
    router.push({
      pathname: '/(devotee)/donations' as never,
      params: {
        causeKind: 'gaushala',
        causeId: donability.causeId,
        causeName: gaushala.name,
      },
    } as never);
  }, [gaushala, donability]);

  const notFound =
    !id || isNotFoundError(query.error) || (query.isSuccess && gaushala === null);
  const errorText =
    query.isError && !isNotFoundError(query.error)
      ? query.error instanceof Error
        ? query.error.message
        : 'Unknown error'
      : null;

  function Header({ heading }: { heading: string }) {
    return (
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.stone[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {heading}
        </Text>
      </View>
    );
  }

  if (query.isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header heading={passedName ?? 'Gaushala'} />
        <View style={styles.stateBlock}>
          <ActivityIndicator color={colors.saffron[600]} size="large" />
          <Text style={styles.stateBody}>Loading gaushala…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (notFound || !gaushala) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header heading={notFound ? 'Gaushala not found' : (passedName ?? 'Gaushala')} />
        <View style={styles.stateBlock}>
          <Ionicons
            name={notFound ? 'help-circle-outline' : 'cloud-offline-outline'}
            size={48}
            color={colors.stone[300]}
          />
          <Text style={styles.stateTitle}>
            {notFound ? 'This gaushala is not listed' : 'Could not load this gaushala'}
          </Text>
          <Text style={styles.stateBody}>
            {notFound
              ? 'It may not have completed onboarding, or the listing was withdrawn.'
              : (errorText ?? 'The server could not be reached.')}
          </Text>
          <TouchableOpacity
            style={styles.stateBtn}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={notFound ? 'Browse all gaushalas' : 'Try again'}
            onPress={() =>
              notFound ? router.push('/(devotee)/gaushalas' as never) : void query.refetch()
            }
          >
            <Text style={styles.stateBtnText}>{notFound ? 'All gaushalas' : 'Try again'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header heading={gaushala.name} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={[styles.column, width >= 700 && styles.columnWide]}>
          <View style={styles.hero}>
            <Ionicons name="leaf-outline" size={44} color={colors.green[500]} />
          </View>

          <View style={styles.block}>
            <Text style={styles.name}>{gaushala.name}</Text>
            {gaushala.location ? (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={16} color={colors.stone[400]} />
                <Text style={styles.meta}>{gaushala.location}</Text>
              </View>
            ) : null}

            {/* "Approved", not "Verified" — the flag the product actually
                writes. Drawn only for a profile the API returned approved. */}
            {donability.canDonate ? (
              <View style={styles.approvedChip}>
                <Ionicons name="checkmark-circle" size={14} color={colors.green[700]} />
                <Text style={styles.approvedText}>Approved gaushala</Text>
              </View>
            ) : null}
          </View>

          {gaushala.description ? (
            <View style={styles.card}>
              <Text style={styles.cardHeading}>About</Text>
              <Text style={styles.paragraph}>{gaushala.description}</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardHeading}>Shelter details</Text>
            <View style={styles.factRow}>
              <Text style={styles.factLabel}>Cows in care</Text>
              <Text style={styles.factValue}>
                {gaushala.totalCows !== null
                  ? gaushala.totalCows.toLocaleString('en-IN')
                  : 'Not stated'}
              </Text>
            </View>
            {gaushala.address ? (
              <View style={styles.factBlock}>
                <Text style={styles.factLabel}>Address</Text>
                <Text style={styles.factValue}>{gaushala.address}</Text>
              </View>
            ) : null}
          </View>

          {/* Donate — or the reason there is no donate control. */}
          {donability.canDonate ? (
            <>
              <TouchableOpacity
                style={styles.donateBtn}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Donate to ${gaushala.name}`}
                onPress={openDonation}
              >
                <Ionicons name="heart" size={18} color={colors.white} />
                <Text style={styles.donateText}>Donate to this gaushala</Text>
              </TouchableOpacity>
              <View style={styles.card}>
                <Text style={styles.cardHeading}>Where your seva goes</Text>
                <Text style={styles.paragraph}>{GAUSHALA_SETTLEMENT_NOTICE}</Text>
                <Text style={styles.footnote}>
                  You get a numbered {RECEIPT_NOUN} PDF by email for every contribution.
                </Text>
                <Text style={styles.footnote}>{NO_80G_DISCLOSURE}</Text>
              </View>
            </>
          ) : (
            <View style={styles.noticeCard}>
              <Ionicons name="information-circle-outline" size={18} color={colors.amber[700]} />
              <Text style={styles.noticeText}>{donability.reason}</Text>
            </View>
          )}

          {/* The absence the API is explicit about, said rather than filled. */}
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={16} color={colors.stone[400]} />
            <Text style={styles.infoText}>
              This gaushala has not published individual cow profiles on Darshya yet.
            </Text>
          </View>
        </View>
      </ScrollView>
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
  headerTitle: { flex: 1, fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900] },

  scroll: { paddingBottom: spacing.xl },
  column: { padding: spacing.md, gap: spacing.md },
  columnWide: { width: '100%', maxWidth: 700, alignSelf: 'center' },

  hero: {
    height: 140,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
  },

  block: { gap: spacing.xs },
  name: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.stone[900] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { flex: 1, fontSize: fontSize.base, color: colors.stone[500] },
  approvedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.green[50],
  },
  approvedText: { fontSize: fontSize.sm, fontWeight: '800', color: colors.green[700] },

  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    gap: spacing.xs,
  },
  cardHeading: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900] },
  paragraph: { fontSize: fontSize.base, color: colors.stone[600], lineHeight: 21 },
  footnote: { fontSize: fontSize.sm, color: colors.stone[500], lineHeight: 18 },

  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  factBlock: { paddingVertical: 4, gap: 2 },
  factLabel: { fontSize: fontSize.sm, color: colors.stone[400], fontWeight: '700' },
  factValue: { fontSize: fontSize.base, color: colors.stone[800], fontWeight: '600' },

  donateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.green[700],
  },
  donateText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '800' },

  noticeCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.amber[50],
    borderWidth: 1,
    borderColor: colors.amber[200],
  },
  noticeText: { flex: 1, fontSize: fontSize.base, color: colors.amber[900], lineHeight: 20 },

  infoRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: fontSize.sm, color: colors.stone[500], lineHeight: 18 },

  stateBlock: {
    alignItems: 'center',
    paddingTop: spacing['2xl'],
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  stateTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.stone[700], textAlign: 'center' },
  stateBody: { fontSize: fontSize.base, color: colors.stone[500], textAlign: 'center', lineHeight: 20 },
  stateBtn: {
    marginTop: spacing.md,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[600],
  },
  stateBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
});
