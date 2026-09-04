import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
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
import { formatInr } from '../../lib/api-contracts';
import { humanizeEnum, pujaCategoryLabel } from '../../lib/enum-labels';
import {
  selectTempleDetail,
  selectTempleReviews,
  templeBookability,
  type TemplePujaVM,
} from '../../lib/temple-detail';
import { useResponsiveGrid } from '../../lib/use-responsive';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * The temple detail screen — the mobile mirror of apps/web/app/temples/[slug].
 *
 * THE GAP IT CLOSES
 * -----------------
 * The app had a temple CATALOGUE and no temple. Tapping a card either jumped
 * straight into the darshan player (when the temple happened to be streaming)
 * or called `Linking.openURL('https://darshya.online/temples/<slug>')` and
 * ejected the devotee into Chrome — losing the app session on the one surface
 * that is the supply anchor of the whole product. Both paths are gone: the
 * card now pushes here, and everything the website's temple page renders from
 * the API is rendered from the same API.
 *
 * THE ENDPOINTS. All public, no auth, no invention.
 *   GET /api/v1/temples/:slug          the temple (PUBLIC column whitelist)
 *   GET /api/v1/temples/:slug/reviews  ratings left on completed bookings
 *
 * `/temples/:slug` already embeds `pujaOfferings` (active only), so the puja
 * strip below needs no second call; the full list lives on
 * (devotee)/temple-pujas.tsx, which reads /temples/:slug/pujas.
 *
 * WHAT IS DELIBERATELY NOT HERE
 * -----------------------------
 * · A phone number, an email or a stream URL. P0 #PUB-02/#PUB-08 removed those
 *   from the public detail select; they are not on the wire and are not
 *   substituted.
 * · A trust score or a star rating on the temple itself. `trustScore` is also
 *   off the public select, and PAR-07 deleted the invented five-star rating
 *   the catalogue card used to draw.
 * · Opening hours when `timingInfo` publishes none. No "Open 6 AM - 9 PM", no
 *   "24x7 darshan" — a claim about a real place of worship needs a source.
 * · A photo gallery beyond what `images` contains. An empty array renders the
 *   deity glyph, not a stock photograph of some other temple.
 *
 * VERIFICATION IS A GATE, NOT A BADGE — see lib/temple-detail.ts.
 * `booking.service.ts` refuses a booking at an unverified temple outright
 * (409 TEMPLE_NOT_VERIFIED), so on such a temple this screen draws NO control
 * that leads to a booking form and prints the reason instead. The offerings
 * are still listed: a temple that is visible on the website must not silently
 * vanish from the app.
 */

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && /\b404\b/.test(error.message);
}

// ─── one puja row in the strip ──────────────────────────────────────────────

const PujaRow = React.memo(function PujaRow({
  puja,
  canBook,
  onOpen,
}: {
  puja: TemplePujaVM;
  canBook: boolean;
  onOpen: (puja: TemplePujaVM) => void;
}) {
  const category = pujaCategoryLabel(puja.category);
  const body = (
    <>
      <View style={styles.pujaRowTop}>
        <Text style={styles.pujaName} numberOfLines={1}>
          {puja.name}
        </Text>
        {puja.priceInr !== null ? (
          <Text style={styles.pujaPrice}>{formatInr(puja.priceInr)}</Text>
        ) : null}
      </View>
      <View style={styles.pujaMetaRow}>
        {category ? <Text style={styles.pujaMeta}>{category}</Text> : null}
        {puja.durationMinutes !== null ? (
          <Text style={styles.pujaMeta}>{puja.durationMinutes} min</Text>
        ) : null}
      </View>
    </>
  );

  // An unverified temple gets a plain, non-interactive row. A greyed-out
  // TouchableOpacity that still navigates is the shape of control this audit
  // keeps finding: it looks refused and behaves permitted.
  if (!canBook) {
    return <View style={[styles.pujaRow, styles.pujaRowDisabled]}>{body}</View>;
  }
  return (
    <TouchableOpacity
      style={styles.pujaRow}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${puja.name}, view details`}
      onPress={() => onOpen(puja)}
    >
      {body}
    </TouchableOpacity>
  );
});

// ─── screen ─────────────────────────────────────────────────────────────────

export default function TempleDetailScreen() {
  const params = useLocalSearchParams<{ slug?: string; name?: string }>();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const passedName = typeof params.name === 'string' ? params.name : null;
  const [refreshing, setRefreshing] = useState(false);
  // Live viewport. Never Dimensions.get() at module scope — the value freezes
  // at launch and never survives rotation, Split View or an unfolded device.
  const { width } = useResponsiveGrid();

  const templeQuery = useQuery<unknown>({
    queryKey: ['temples', 'detail', slug],
    queryFn: () => apiFetch<unknown>(`/temples/${encodeURIComponent(slug)}`),
    enabled: slug.length > 0,
    staleTime: 5 * 60 * 1000,
    // A 404 is a fact about this slug, not a transient failure.
    retry: (count, error) => count < 2 && !isNotFoundError(error),
  });

  const temple = useMemo(() => selectTempleDetail(templeQuery.data), [templeQuery.data]);

  // Reviews are a separate, non-blocking read: the temple page must render
  // fully even when the reviews route is unavailable, so this query's failure
  // removes the section rather than the screen.
  const reviewsQuery = useQuery<unknown>({
    queryKey: ['temples', 'reviews', slug],
    queryFn: () => apiFetch<unknown>(`/temples/${encodeURIComponent(slug)}/reviews?limit=5`),
    enabled: slug.length > 0 && temple !== null,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const reviews = useMemo(() => selectTempleReviews(reviewsQuery.data), [reviewsQuery.data]);

  const gate = useMemo(() => templeBookability(temple), [temple]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([templeQuery.refetch(), reviewsQuery.refetch()]);
    setRefreshing(false);
  }, [templeQuery, reviewsQuery]);

  const openDarshan = useCallback(() => {
    if (!temple) return;
    router.push({
      pathname: '/(devotee)/darshan-player' as never,
      // `GET /darshan/:id/stream` resolves a stream id OR a temple slug, so the
      // slug is a real fallback rather than a guess when no stream row came
      // back on the detail payload.
      params: {
        id: temple.darshanStreamId ?? temple.slug,
        title: temple.name,
        deity: temple.deity ?? '',
      },
    } as never);
  }, [temple]);

  const openPujas = useCallback(() => {
    if (!temple) return;
    router.push({
      pathname: '/(devotee)/temple-pujas' as never,
      params: { slug: temple.slug, name: temple.name },
    } as never);
  }, [temple]);

  const openPuja = useCallback((puja: TemplePujaVM) => {
    router.push({
      pathname: '/(devotee)/puja-detail' as never,
      params: { slug: puja.pujaSlug, name: puja.name },
    } as never);
  }, []);

  const openDonation = useCallback(() => {
    if (!temple) return;
    // Native, in-app. The donation screen creates the order against THIS
    // build's API before any hand-off, so the temple id it receives has to be
    // the one this API returned — which is why the id travels rather than a
    // darshya.online URL being opened.
    router.push({
      pathname: '/(devotee)/donations' as never,
      params: { causeKind: 'temple', causeId: temple.id, causeName: temple.name },
    } as never);
  }, [temple]);

  const notFound =
    !slug || isNotFoundError(templeQuery.error) || (templeQuery.isSuccess && temple === null);
  const errorText =
    templeQuery.isError && !isNotFoundError(templeQuery.error)
      ? templeQuery.error instanceof Error
        ? templeQuery.error.message
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

  if (templeQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header heading={passedName ?? 'Temple'} />
        <View style={styles.stateBlock}>
          <ActivityIndicator color={colors.saffron[600]} size="large" />
          <Text style={styles.stateBody}>Loading temple…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (notFound || !temple) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header heading={notFound ? 'Temple not found' : (passedName ?? 'Temple')} />
        <View style={styles.stateBlock}>
          <Ionicons
            name={notFound ? 'help-circle-outline' : 'cloud-offline-outline'}
            size={48}
            color={colors.stone[300]}
          />
          <Text style={styles.stateTitle}>
            {notFound ? 'This temple is not in the catalogue' : 'Could not load this temple'}
          </Text>
          <Text style={styles.stateBody}>
            {notFound
              ? 'It may have been renamed or withdrawn.'
              : (errorText ?? 'The server could not be reached.')}
          </Text>
          <TouchableOpacity
            style={styles.stateBtn}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={notFound ? 'Browse all temples' : 'Try again'}
            onPress={() =>
              notFound
                ? router.push('/(devotee)/temples' as never)
                : void templeQuery.refetch()
            }
          >
            <Text style={styles.stateBtnText}>{notFound ? 'All temples' : 'Try again'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const heroImage = temple.images[0];
  // A wide window gets a shorter, wider hero rather than a 400pt band of
  // photograph; the column itself is capped so lines stay readable on a tablet.
  const heroHeight = width >= 900 ? 240 : width >= 600 ? 220 : 180;
  const deities = temple.deities.filter((d) => d !== temple.deity);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header heading={temple.name} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={[styles.column, width >= 700 && styles.columnWide]}>
          {/* Hero */}
          <View style={[styles.hero, { height: heroHeight }]}>
            {heroImage ? (
              <Image
                source={{ uri: heroImage }}
                style={styles.heroImage}
                resizeMode="cover"
                accessible
                accessibilityLabel={temple.name}
              />
            ) : (
              <Ionicons name="business" size={56} color={colors.saffron[300]} />
            )}
            {temple.liveDarshanEnabled ? (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>LIVE DARSHAN</Text>
              </View>
            ) : null}
          </View>

          {/* Identity */}
          <View style={styles.block}>
            <Text style={styles.templeName}>{temple.name}</Text>
            {temple.nameLocal ? (
              <Text style={styles.templeNameLocal}>{temple.nameLocal}</Text>
            ) : null}

            <View style={styles.chipRow}>
              {/* Rendered ONLY from Temple.isVerified as the API returned it.
                  There is no client-side inference and no default-true. */}
              {gate.showVerifiedBadge ? (
                <View style={[styles.chip, styles.chipVerified]}>
                  <Ionicons name="shield-checkmark" size={13} color={colors.green[700]} />
                  <Text style={[styles.chipText, styles.chipTextVerified]}>Verified temple</Text>
                </View>
              ) : null}
              {temple.tradition ? (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{humanizeEnum(temple.tradition)}</Text>
                </View>
              ) : null}
            </View>

            {temple.deity ? (
              <View style={styles.metaRow}>
                <Ionicons name="flower-outline" size={16} color={colors.saffron[600]} />
                <Text style={styles.metaStrong}>{temple.deity}</Text>
                {deities.length > 0 ? (
                  <Text style={styles.meta} numberOfLines={1}>
                    · {deities.join(', ')}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {temple.addressLine || temple.location ? (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={16} color={colors.stone[400]} />
                <Text style={styles.meta}>
                  {[temple.addressLine, temple.location, temple.pincode]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              </View>
            ) : null}
          </View>

          {/* The verification gate, said out loud. */}
          {!gate.canBook ? (
            <View style={styles.noticeCard}>
              <Ionicons name="information-circle-outline" size={18} color={colors.amber[700]} />
              <Text style={styles.noticeText}>{gate.reason}</Text>
            </View>
          ) : null}

          {/* Actions */}
          <View style={styles.actionsRow}>
            {temple.liveDarshanEnabled ? (
              <TouchableOpacity
                style={[styles.action, styles.actionPrimary]}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Watch live darshan at ${temple.name}`}
                onPress={openDarshan}
              >
                <Ionicons name="videocam" size={18} color={colors.white} />
                <Text style={styles.actionPrimaryText}>Live darshan</Text>
              </TouchableOpacity>
            ) : null}
            {/* Only where a booking can actually be placed. On an unverified
                temple this control is REMOVED, not disabled with an apology. */}
            {gate.canBook && temple.offerings.length > 0 ? (
              <TouchableOpacity
                style={styles.action}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Browse pujas at ${temple.name}`}
                onPress={openPujas}
              >
                <Ionicons name="flame-outline" size={18} color={colors.saffron[700]} />
                <Text style={styles.actionText}>Pujas</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.action}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Donate to ${temple.name}`}
              onPress={openDonation}
            >
              <Ionicons name="gift-outline" size={18} color={colors.saffron[700]} />
              <Text style={styles.actionText}>Donate</Text>
            </TouchableOpacity>
          </View>

          {/* About */}
          {temple.description ? (
            <View style={styles.card}>
              <Text style={styles.cardHeading}>About</Text>
              <Text style={styles.paragraph}>{temple.description}</Text>
            </View>
          ) : null}

          {/* Timings — only what timingInfo.regularHours actually publishes. */}
          {temple.timings.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardHeading}>Published timings</Text>
              {temple.timings.map((t) => (
                <View key={`${t.label}-${t.window}`} style={styles.timingRow}>
                  <Text style={styles.timingLabel}>{t.label}</Text>
                  <Text style={styles.timingWindow}>{t.window}</Text>
                </View>
              ))}
              <Text style={styles.footnote}>
                Times as published by the temple, in IST.
              </Text>
            </View>
          ) : null}

          {/* Pujas offered here */}
          {temple.offerings.length > 0 ? (
            <View style={styles.card}>
              <View style={styles.cardHeadingRow}>
                <Text style={styles.cardHeading}>
                  Pujas at this temple ({temple.offerings.length})
                </Text>
                {gate.canBook ? (
                  <TouchableOpacity
                    onPress={openPujas}
                    style={styles.linkBtn}
                    accessibilityRole="button"
                    accessibilityLabel="See all pujas at this temple"
                  >
                    <Text style={styles.linkText}>See all</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.saffron[700]} />
                  </TouchableOpacity>
                ) : null}
              </View>
              {temple.offerings.slice(0, 4).map((puja) => (
                <PujaRow
                  key={puja.offeringId}
                  puja={puja}
                  canBook={gate.canBook}
                  onOpen={openPuja}
                />
              ))}
            </View>
          ) : null}

          {/* Priests. Self-declared profile facts — no credential is implied:
              nothing in the product writes Priest.isVerified outside the seed
              (TC-08), so no verification mark is drawn on a person here. */}
          {temple.priests.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardHeading}>Priests at this temple</Text>
              {temple.priests.map((p) => (
                <View key={p.id} style={styles.priestRow}>
                  <View style={styles.priestAvatar}>
                    <Ionicons name="person" size={18} color={colors.saffron[600]} />
                  </View>
                  <View style={styles.priestBody}>
                    <Text style={styles.priestName}>{p.name}</Text>
                    <Text style={styles.priestMeta} numberOfLines={2}>
                      {[
                        p.experienceYears !== null ? `${p.experienceYears} yrs experience` : null,
                        p.languages.length > 0 ? p.languages.join(', ') : null,
                        p.specializations.length > 0 ? p.specializations.join(', ') : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* Reviews. `averageRating` is `_avg ?? 0` server-side, so a temple
              with no reviews reports 0 — which the selector turns into null so
              nothing here can draw a zero-star score. */}
          {reviews.total > 0 ? (
            <View style={styles.card}>
              <View style={styles.cardHeadingRow}>
                <Text style={styles.cardHeading}>Devotee reviews ({reviews.total})</Text>
                {reviews.average !== null ? (
                  <View style={styles.ratingPill}>
                    <Ionicons name="star" size={13} color={colors.amber[600]} />
                    <Text style={styles.ratingText}>{reviews.average.toFixed(1)}</Text>
                  </View>
                ) : null}
              </View>
              {reviews.reviews.map((r) => (
                <View key={r.id} style={styles.reviewRow}>
                  <View style={styles.reviewTop}>
                    <Text style={styles.reviewAuthor}>{r.authorName ?? 'A devotee'}</Text>
                    <View style={styles.ratingPill}>
                      <Ionicons name="star" size={12} color={colors.amber[600]} />
                      <Text style={styles.ratingText}>{r.rating}</Text>
                    </View>
                  </View>
                  {r.pujaName ? <Text style={styles.reviewPuja}>{r.pujaName}</Text> : null}
                  {r.text ? <Text style={styles.reviewText}>{r.text}</Text> : null}
                </View>
              ))}
            </View>
          ) : null}
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
  // 44x44 — the minimum comfortable target on both platforms.
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900] },

  scroll: { paddingBottom: spacing.xl },
  column: { padding: spacing.md, gap: spacing.md },
  // Keeps measure readable on a tablet or an unfolded device instead of
  // stretching a phone layout across the full width.
  columnWide: { width: '100%', maxWidth: 700, alignSelf: 'center' },

  hero: {
    width: '100%',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.saffron[50],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroImage: { width: '100%', height: '100%' },
  liveBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.red[600],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white },
  liveBadgeText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '800', letterSpacing: 0.5 },

  block: { gap: spacing.xs },
  templeName: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.stone[900] },
  templeNameLocal: { fontSize: fontSize.lg, color: colors.stone[500] },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.stone[100],
  },
  chipVerified: { backgroundColor: colors.green[50] },
  chipText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.stone[600] },
  chipTextVerified: { color: colors.green[700] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  meta: { flex: 1, fontSize: fontSize.base, color: colors.stone[500] },
  metaStrong: { fontSize: fontSize.base, fontWeight: '700', color: colors.saffron[700] },

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

  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: {
    flexGrow: 1,
    flexBasis: 120,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.saffron[200],
  },
  actionText: { fontSize: fontSize.base, fontWeight: '700', color: colors.saffron[700] },
  actionPrimary: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[600] },
  actionPrimaryText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },

  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    gap: spacing.sm,
  },
  cardHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardHeading: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900] },
  paragraph: { fontSize: fontSize.base, color: colors.stone[600], lineHeight: 21 },
  footnote: { fontSize: fontSize.sm, color: colors.stone[400] },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, paddingLeft: spacing.sm },
  linkText: { fontSize: fontSize.base, fontWeight: '700', color: colors.saffron[700] },

  timingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  timingLabel: { fontSize: fontSize.base, color: colors.stone[700], fontWeight: '600' },
  timingWindow: { fontSize: fontSize.base, color: colors.stone[500] },

  pujaRow: {
    paddingVertical: spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.stone[100],
  },
  pujaRowDisabled: { opacity: 0.6 },
  pujaRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  pujaName: { flex: 1, fontSize: fontSize.base, fontWeight: '700', color: colors.stone[800] },
  pujaPrice: { fontSize: fontSize.base, fontWeight: '800', color: colors.stone[900] },
  pujaMetaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 2 },
  pujaMeta: { fontSize: fontSize.sm, color: colors.stone[500] },

  priestRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingVertical: 6 },
  priestAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.saffron[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  priestBody: { flex: 1 },
  priestName: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[800] },
  priestMeta: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 1 },

  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: colors.amber[50],
  },
  ratingText: { fontSize: fontSize.sm, fontWeight: '800', color: colors.amber[700] },
  reviewRow: { paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.stone[100], gap: 2 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewAuthor: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[800] },
  reviewPuja: { fontSize: fontSize.sm, color: colors.saffron[700], fontWeight: '600' },
  reviewText: { fontSize: fontSize.base, color: colors.stone[600], lineHeight: 20 },

  stateBlock: { alignItems: 'center', paddingTop: spacing['2xl'], paddingHorizontal: spacing.lg, gap: spacing.sm },
  stateTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.stone[700], textAlign: 'center' },
  stateBody: { fontSize: fontSize.base, color: colors.stone[500], textAlign: 'center' },
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
