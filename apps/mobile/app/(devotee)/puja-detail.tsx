import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePuja, ApiClientError } from '@poojly/api-client';
import { formatInr } from '../../lib/api-contracts';
import {
  PLATFORM_FEE_INR,
  offeringPriceInr,
  partitionOfferings,
  selectPujaBookingDetail,
} from '../../lib/booking-flow';
import { humanizeEnum } from '../../lib/enum-labels';
import { PANDIT_VETTING_CLAUSE } from '../../lib/pandit-vetting';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * The puja detail page — the mobile mirror of apps/web/app/pujas/[slug].
 *
 * THE GAP
 * -------
 * The app jumped straight from the catalogue card to the booking form. Every
 * fact a devotee might want before committing — what the ritual is, what it is
 * for, what materials are included, which temples offer it and which of those
 * can actually take a booking — existed only on the website. This screen is
 * that step, and it does NOT re-implement booking: it hands off to
 * (devotee)/puja-book.tsx, which already owns temple/day/slot/sankalp and
 * POST /bookings/book.
 *
 *   GET /api/v1/pujas/types/:slug   (via usePuja, @poojly/api-client)
 *
 * The route answers with the puja at the ROOT of the body and a duplicate under
 * `pujaType` (routes/pujas.ts) — so `usePuja(...).data` IS the puja, despite the
 * hook's declared `ApiResponse<PujaType>`. That declared type is the same
 * envelope fiction PAR-07 documents; rather than trust it, the body goes through
 * `selectPujaBookingDetail` — the selector puja-book.tsx already books from, so
 * the two screens cannot disagree about what a puja is or what it costs.
 *
 * PRICE. `basePrice` as returned, formatted by the project's `formatInr`, plus
 * the flat Rs 51 the server folds into every booking. Nothing is computed from
 * a rate here, and the NRI figure is NOT rendered: the catalogue card dropped it
 * (PAR-15) and the web page dropped it (2026-08-12) for the same reason — no
 * booking path charges it, so printing it advertises a premium that is never
 * collected. It returns when a server-QUOTED amount exists.
 *
 * FIELDS OMITTED FOR LACK OF DATA: reviews, ratings, a pandit name, a
 * completed-booking count. `GET /pujas/types/:slug` returns none of them, so no
 * row is drawn for them. `benefits`, `samagriList`/`samagriItems`,
 * `longDescription` and `nameLocal` are rendered only when present — the API
 * returns them null for most rows (P0 #202), which is a missing section, not a
 * placeholder.
 */

// ─── the fields selectPujaBookingDetail does not carry ──────────────────────
// It models exactly what BOOKING needs. This screen also describes the ritual,
// so it reads the descriptive columns off the same body — defensively, and
// with an absent field removing its section rather than filling it in.

interface PujaProse {
  nameLocal: string | null;
  deity: string | null;
  category: string | null;
  longDescription: string | null;
  samagriIncluded: boolean;
  samagri: string[];
  benefits: string[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v : null;
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.length > 0) : [];
}

function selectPujaProse(payload: unknown): PujaProse {
  if (!isRecord(payload)) {
    return {
      nameLocal: null,
      deity: null,
      category: null,
      longDescription: null,
      samagriIncluded: false,
      samagri: [],
      benefits: [],
    };
  }
  return {
    nameLocal: str(payload.nameLocal),
    deity: str(payload.deity),
    category: str(payload.category),
    longDescription: str(payload.longDescription),
    samagriIncluded: payload.samagriIncluded === true,
    // The API sends `samagriItems`; older bodies sent `samagriList`. Accept
    // either, invent neither.
    samagri: [...strList(payload.samagriList), ...strList(payload.samagriItems)],
    benefits: strList(payload.benefits),
  };
}

function isNotFound(err: unknown): boolean {
  return err instanceof ApiClientError && err.statusCode === 404;
}

// ─── screen ─────────────────────────────────────────────────────────────────

export default function PujaDetailScreen() {
  const params = useLocalSearchParams<{ slug?: string; name?: string }>();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const passedName = typeof params.name === 'string' ? params.name : undefined;
  const [refreshing, setRefreshing] = useState(false);

  const query = usePuja(slug, {
    staleTime: 5 * 60 * 1000,
    retry: (count: number, err: unknown) => !isNotFound(err) && count < 2,
  });

  const detail = useMemo(() => selectPujaBookingDetail(query.data), [query.data]);
  const prose = useMemo(() => selectPujaProse(query.data), [query.data]);
  const { bookable, unverified } = useMemo(
    () => partitionOfferings(detail?.offerings ?? []),
    [detail],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  /**
   * Booking lives in ONE screen. This one only decides which puja, and passes
   * the two params puja-book.tsx reads (`slug`, `name`) — the same pair the
   * catalogue card passes and the same pair `darshya://puja/:slug` resolves to
   * in lib/deep-link.ts.
   */
  const openBooking = useCallback(() => {
    if (!detail) return;
    router.push({
      pathname: '/(devotee)/puja-book' as never,
      params: { slug: detail.slug, name: detail.name },
    } as never);
  }, [detail]);

  const notFound = !slug || isNotFound(query.error) || (query.isSuccess && detail === null);
  const errorText =
    query.isError && !isNotFound(query.error)
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
          <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
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
        <Header heading={passedName ?? 'Puja'} />
        <ActivityIndicator color={colors.saffron[600]} style={{ marginTop: spacing['2xl'] }} />
      </SafeAreaView>
    );
  }

  if (notFound || !detail) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header heading={notFound ? 'Puja not found' : (passedName ?? 'Puja')} />
        <View style={styles.stateBlock}>
          <Ionicons
            name={notFound ? 'help-circle-outline' : 'cloud-offline-outline'}
            size={48}
            color={colors.stone[300]}
          />
          <Text style={styles.stateTitle}>
            {notFound ? 'This puja is not in the catalogue' : 'Could not load this puja'}
          </Text>
          <Text style={styles.stateBody}>
            {notFound
              ? 'It may have been renamed or withdrawn.'
              : (errorText ?? 'The server could not be reached.')}
          </Text>
          <TouchableOpacity
            style={styles.stateBtn}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={notFound ? 'Browse all pujas' : 'Try again'}
            onPress={() =>
              notFound ? router.push('/(devotee)/pujas' as never) : void query.refetch()
            }
          >
            <Text style={styles.stateBtnText}>{notFound ? 'All pujas' : 'Try again'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const base = detail.basePriceInr;
  const categoryLabel = prose.category ? humanizeEnum(prose.category) : '';
  const description = prose.longDescription ?? detail.description;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header heading={detail.name} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="flame" size={30} color={colors.saffron[300]} />
          </View>
          <View style={styles.heroChips}>
            {categoryLabel ? (
              <View style={styles.heroChip}>
                <Text style={styles.heroChipText}>{categoryLabel}</Text>
              </View>
            ) : null}
            {prose.deity ? (
              <View style={styles.heroChip}>
                <Text style={styles.heroChipText}>{prose.deity}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.heroTitle}>{detail.name}</Text>
          {prose.nameLocal ? <Text style={styles.heroLocal}>{prose.nameLocal}</Text> : null}
          <View style={styles.heroMetaRow}>
            {detail.durationMinutes !== null ? (
              <View style={styles.heroMeta}>
                <Ionicons name="time-outline" size={13} color={colors.white} />
                <Text style={styles.heroMetaText}>{detail.durationMinutes} min</Text>
              </View>
            ) : null}
            <View style={styles.heroMeta}>
              <Ionicons name="location-outline" size={13} color={colors.white} />
              <Text style={styles.heroMetaText}>
                {detail.offerings.length} temple{detail.offerings.length === 1 ? '' : 's'}
              </Text>
            </View>
            {prose.samagriIncluded ? (
              <View style={styles.heroMeta}>
                <Ionicons name="gift-outline" size={13} color={colors.white} />
                <Text style={styles.heroMetaText}>Samagri included</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Price + the one control that books */}
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Starting from</Text>
          <Text style={styles.priceValue}>
            {base === null ? 'Price on request' : formatInr(base)}
          </Text>
          {/* CM-03: the fee travels with the price so the number does not grow
              between here and the payment sheet — the server adds
              PLATFORM_FEE_INR to every booking. "from" is exact, not hedging:
              a temple may set a priceOverride, resolved on the booking screen. */}
          {base === null ? null : (
            <Text style={styles.priceFee}>
              {'+ '}
              {formatInr(PLATFORM_FEE_INR)} platform fee · from{' '}
              {formatInr(base + PLATFORM_FEE_INR)} total
            </Text>
          )}
          <TouchableOpacity
            style={[styles.primaryBtn, bookable.length === 0 && styles.primaryBtnDisabled]}
            activeOpacity={0.8}
            disabled={bookable.length === 0}
            accessibilityRole="button"
            accessibilityLabel={`Book ${detail.name}`}
            accessibilityState={{ disabled: bookable.length === 0 }}
            accessibilityHint="Choose a temple, day and time slot"
            onPress={openBooking}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.white} />
            <Text style={styles.primaryBtnText}>
              {bookable.length === 0 ? 'Not bookable yet' : 'Book this puja'}
            </Text>
          </TouchableOpacity>
          {bookable.length === 0 ? (
            <Text style={styles.priceNote}>
              {detail.offerings.length === 0
                ? 'No temple has listed this puja yet.'
                : 'Every temple offering this puja is still awaiting verification, so it cannot be booked yet.'}
            </Text>
          ) : null}
        </View>

        {/* What is actually guaranteed */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>What you get</Text>
          <TrustRow
            icon="videocam-outline"
            label="Live video proof"
            desc="The ceremony is recorded and shared with you."
          />
          <TrustRow icon="shield-outline" label="Pandit payout gate" desc={`${PANDIT_VETTING_CLAUSE}.`} />
        </View>

        {description ? (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>About this puja</Text>
            {description.split('\n\n').map((para, i) => (
              <Text key={i} style={styles.cardBody}>
                {para}
              </Text>
            ))}
          </View>
        ) : null}

        {prose.benefits.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Benefits</Text>
            {prose.benefits.map((b) => (
              <View key={b} style={styles.bulletRow}>
                <Ionicons name="checkmark-circle" size={15} color={colors.green[600]} />
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {prose.samagriIncluded && prose.samagri.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Samagri included</Text>
            <Text style={styles.cardSub}>
              The temple arranges these materials. Nothing needs to be sent separately.
            </Text>
            <View style={styles.chipRow}>
              {prose.samagri.map((item) => (
                <View key={item} style={styles.chip}>
                  <Text style={styles.chipText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Temples. Shown, not filtered: a temple visible on the website that
            silently vanished here would be its own defect. The ones the server
            will refuse (booking.service rejects an unverified temple with a 409)
            are listed with the reason instead of being offered. */}
        {detail.offerings.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>
              Offered at {detail.offerings.length} temple
              {detail.offerings.length === 1 ? '' : 's'}
            </Text>
            {bookable.map((o) => {
              const p = offeringPriceInr(detail, o);
              return (
                <View key={o.offeringId} style={styles.templeRow}>
                  <View style={styles.templeText}>
                    <Text style={styles.templeName}>{o.templeName}</Text>
                    <Text style={styles.templeCity}>
                      {[o.city, o.state].filter(Boolean).join(', ') || 'Location not listed'}
                    </Text>
                    <Text style={styles.templeSlots}>
                      {o.slots.length} time slot{o.slots.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <Text style={styles.templePrice}>
                    {p === null ? 'Price on request' : formatInr(p)}
                  </Text>
                </View>
              );
            })}
            {unverified.map((o) => (
              <View
                key={o.offeringId}
                style={[styles.templeRow, styles.templeRowDisabled]}
                accessibilityLabel={`${o.templeName} — not accepting bookings yet, awaiting verification`}
              >
                <View style={styles.templeText}>
                  <Text style={[styles.templeName, styles.templeNameDisabled]}>{o.templeName}</Text>
                  <Text style={styles.templeCity}>
                    {[o.city, o.state].filter(Boolean).join(', ') || 'Location not listed'}
                  </Text>
                  <Text style={styles.templeUnverified}>
                    Awaiting verification — cannot take bookings yet
                  </Text>
                </View>
              </View>
            ))}
            {bookable.length > 0 ? (
              <Text style={styles.templeNote}>
                Pick the temple, day and time slot on the next screen.
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function TrustRow({
  icon,
  label,
  desc,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  desc: string;
}) {
  return (
    <View style={styles.trustRow}>
      <View style={styles.trustIcon}>
        <Ionicons name={icon} size={16} color={colors.saffron[600]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.trustLabel}>{label}</Text>
        <Text style={styles.trustDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  headerTitle: { flex: 1, fontSize: fontSize.xl, fontWeight: '700', color: colors.stone[900] },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  hero: {
    backgroundColor: colors.saffron[600],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[700],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  heroChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: colors.saffron[700],
  },
  heroChipText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.white },
  heroTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.white,
    marginTop: spacing.sm,
  },
  heroLocal: { fontSize: fontSize.base, color: colors.saffron[100], marginTop: 2 },
  heroMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroMetaText: { fontSize: fontSize.sm, color: colors.white },
  priceCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    padding: spacing.md,
  },
  priceLabel: { fontSize: fontSize.sm, color: colors.stone[500] },
  priceValue: {
    fontSize: fontSize['3xl'],
    fontWeight: '800',
    color: colors.saffron[700],
    marginTop: 2,
  },
  priceFee: { fontSize: fontSize.xs, color: colors.stone[400], marginTop: 2 },
  priceNote: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: spacing.sm, lineHeight: 17 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[600],
    marginTop: spacing.md,
  },
  primaryBtnDisabled: { backgroundColor: colors.stone[300] },
  primaryBtnText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    padding: spacing.md,
  },
  cardHeading: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.stone[900],
    marginBottom: spacing.sm,
  },
  cardSub: { fontSize: fontSize.xs, color: colors.stone[500], marginBottom: spacing.sm },
  cardBody: {
    fontSize: fontSize.sm,
    color: colors.stone[600],
    lineHeight: 21,
    marginBottom: spacing.sm,
  },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6 },
  bulletText: { flex: 1, fontSize: fontSize.sm, color: colors.stone[600], lineHeight: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.amber[50],
  },
  chipText: { fontSize: fontSize.xs, color: colors.stone[600] },
  trustRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  trustIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.saffron[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.stone[700] },
  trustDesc: { fontSize: fontSize.xs, color: colors.stone[500], lineHeight: 16, marginTop: 1 },
  templeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.stone[100],
    paddingVertical: spacing.sm,
  },
  templeRowDisabled: { opacity: 0.6 },
  templeText: { flex: 1, minWidth: 0 },
  templeName: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[800] },
  templeNameDisabled: { color: colors.stone[500] },
  templeCity: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 1 },
  templeSlots: { fontSize: fontSize.xs, color: colors.stone[400], marginTop: 1 },
  templeUnverified: { fontSize: fontSize.xs, color: colors.amber[700], marginTop: 2 },
  templePrice: { fontSize: fontSize.lg, fontWeight: '800', color: colors.saffron[700] },
  templeNote: { fontSize: fontSize.xs, color: colors.stone[400], marginTop: spacing.sm },
  stateBlock: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  stateTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[700] },
  stateBody: { fontSize: fontSize.sm, color: colors.stone[500], textAlign: 'center' },
  stateBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[600],
    marginTop: spacing.sm,
  },
  stateBtnText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
});
