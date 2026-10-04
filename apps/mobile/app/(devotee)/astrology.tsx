import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { astrologerSupplyLabel, type AstrologerSupply } from '../../lib/astrologer-supply-label';
import {
  selectAstrologers,
  astrologerInitials,
  ratePerMinuteLabel,
  RASHI_SIGNS,
  type LiveAstrologer,
} from '../../lib/astrology-directory';
import { ASTROLOGY_TOOLS } from '../../lib/astrology-tools';
import { openWebHandoff, describeWebHandoff } from '../../lib/in-app-web';
import { WEBVIEW_AVAILABLE } from '../../lib/webview-module';
import { webOrigin, hostOf } from '../../lib/web-origin';
import { useCarouselCardWidth } from '../../lib/use-responsive';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * The astrology hub.
 *
 * WHAT THIS SCREEN USED TO BE
 * ---------------------------
 * A rashi grid whose horoscope came from the wrong endpoint, and a list of four
 * "services" — Kundli Generation ₹299, Kundli Matching ₹499, Personal
 * Consultation ₹1,499, Annual Prediction ₹999 — with delivery times ("24
 * hours", "45 min session") to match. NONE of those four products exists.
 * Darshya sells exactly one astrology thing: a per-minute consultation with an
 * approved astrologer, priced from `AstrologerProfile.pricePerMinute` and
 * quoted by `POST /consultation/book`. There is no ₹299 kundli SKU, no ₹999
 * annual report, and no 45-minute ₹1,499 session; the four prices were written
 * in the view layer and every one of them was a number this platform will never
 * charge. Tapping any of them opened the website's astrology page, which does
 * not sell them either.
 *
 * They are gone. What replaces them is the supply that does exist — the
 * approved astrologer directory — and the tools that are genuinely free.
 *
 * THE HAND-OFF THAT USED TO COVER SIXTEEN TOOLS, AND WHY IT NOW COVERS TEN
 * ------------------------------------------------------------------------
 * This screen used to send Kundli Milan and the whole Vedic calculator set to
 * the website, because they "are computed ENTIRELY in the browser from
 * apps/web/lib — not a shared package, and the API exposes no endpoint for any
 * of them". The second half is still true and the first half was never a
 * property of the maths, only of the directory it sat in. Pure functions move.
 *
 * They were moved. packages/shared/src/astrology now owns the Ashtakoot
 * scorer, the Meeus moon/Mars longitude series, the Lahiri ayanamsa, the
 * Almanac-for-Computers sunrise solver and the numerology tables;
 * apps/web/lib re-exports them; lib/astrology-tools.ts imports the same
 * functions. Five tools therefore run IN THE APP, offline, and cannot disagree
 * with the website because there is one implementation — see
 * lib/__tests__/astrology-parity.test.ts.
 *
 * `GET /astrology/compatibility` is still not a substitute for any of it: it
 * scores two rashi NAMES with arithmetic over their character codes
 * (astrology.service.ts), which is not an Ashtakoot Gun Milan and must not be
 * dressed up as one. Nothing here calls it.
 *
 * ONE hand-off remains, for the ten tools that did not move: lal kitab, vastu,
 * pitra dosh, pancha pakshi and baby name are editorial lookups over large
 * prose datasets rather than calculations, and sade sati, dasha, hora, shubh
 * muhurat and kaal sarp compute but are not built here yet. It says it leaves
 * the app — `describeWebHandoff` derives the role, hint and glyph from the same
 * call that decides the route, so a control cannot announce a browser hand-off
 * and then stay in the app.
 *
 * Everything else on this screen has a real in-app destination:
 * app/(devotee)/astrologers.tsx, astrologer-detail.tsx, astrologer-book.tsx,
 * horoscope-rashi.tsx, kundli.tsx, astrology-chat.tsx and the five tool
 * screens listed in ASTROLOGY_TOOLS.
 */
const WEB = webOrigin();

// ─── astrologer strip ───────────────────────────────────────────────────────

const STRIP_LIMIT = 6;

function AstrologerStripCard({ a, width }: { a: LiveAstrologer; width: number }) {
  const rate = ratePerMinuteLabel(a.perMinuteRate);
  return (
    <TouchableOpacity
      style={[styles.stripCard, { width }]}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={a.name}
      accessibilityHint="Opens this astrologer's profile in the app"
      onPress={() =>
        router.push({
          pathname: '/(devotee)/astrologer-detail' as never,
          params: { id: a.id, name: a.name },
        } as never)
      }
    >
      <View style={styles.stripHead}>
        <View style={styles.stripAvatarWrap}>
          <View style={styles.stripAvatar}>
            <Text style={styles.stripAvatarText}>{astrologerInitials(a.name)}</Text>
          </View>
          <View
            style={[styles.stripDot, a.isOnline ? styles.stripDotOn : styles.stripDotOff]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.stripName} numberOfLines={1}>
            {a.name}
          </Text>
          <Text style={styles.stripMeta} numberOfLines={1}>
            {a.isOnline ? 'Online now' : 'Offline'}
            {a.experienceYears !== null ? ` · ${a.experienceYears} yrs` : ''}
          </Text>
        </View>
      </View>

      {a.specializations.length > 0 ? (
        <Text style={styles.stripSpec} numberOfLines={1}>
          {a.specializations.slice(0, 2).join(' · ')}
        </Text>
      ) : null}

      <View style={styles.stripFoot}>
        {rate ? (
          <Text style={styles.stripRate}>{rate}</Text>
        ) : (
          <Text style={styles.stripRateUnknown}>Rate not published</Text>
        )}
        {a.rating !== null ? (
          <View style={styles.stripRating}>
            <Ionicons name="star" size={11} color={colors.amber[500]} />
            <Text style={styles.stripRatingText}>{a.rating.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ─── screen ─────────────────────────────────────────────────────────────────

export default function AstrologyScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const cardWidth = useCarouselCardWidth();

  /**
   * `/astrologers/live` rather than `/astrologers`: same rows (AW-02 bound both
   * to `loadApprovedAstrologers`), but unpaginated and ordered online-first,
   * which is what a strip whose first question is "who can talk to me now"
   * needs.
   */
  const astrologersQuery = useQuery<unknown>({
    queryKey: ['astrology', 'astrologers', 'live'],
    queryFn: () => apiFetch<unknown>('/astrology/astrologers/live'),
    staleTime: 60 * 1000,
  });

  const parsed = useMemo(
    () => selectAstrologers(astrologersQuery.data),
    [astrologersQuery.data],
  );
  const astrologers = parsed ?? [];

  /**
   * AW-02: `total` is every APPROVED astrologer, not the online ones, and this
   * screen used to print it as "{n} astrologers online" — the three real
   * profiles all read `isOnline: false`, so the app claimed supply that was not
   * there. The derivation is a pure module so it is actually testable.
   */
  const astrologerSupply = astrologerSupplyLabel(
    astrologersQuery.data as AstrologerSupply | null | undefined,
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await astrologersQuery.refetch();
    setRefreshing(false);
  }, [astrologersQuery]);

  const supplyError = astrologersQuery.isError
    ? astrologersQuery.error instanceof Error
      ? astrologersQuery.error.message
      : 'Unknown error'
    : astrologersQuery.isSuccess && parsed === null
      ? 'The directory answered in a shape this app does not recognise.'
      : null;

  /**
   * PAR-22. Both hand-offs resolve through one options object, so the two
   * controls can never disagree about whether this build can show the website
   * in-app.
   */
  const handoffOpts = { webViewAvailable: WEBVIEW_AVAILABLE, origin: WEB.origin };

  const TOOLS_TARGET = {
    url: `${WEB.origin}/astrology?utm_source=mobile-app&utm_medium=tool-card`,
    title: 'Vedic calculators',
  };
  const toolsAffordance = describeWebHandoff(TOOLS_TARGET, handoffOpts, hostOf(WEB.origin));

  const io = { push: (r: unknown) => router.push(r as never), openExternal: Linking.openURL };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Astrology</Text>
          <Text style={styles.headerSubtitle}>
            Verified astrologers, your kundli, and the daily rashifal
          </Text>
        </View>

        {/* ── Talk to an astrologer ─────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Talk to an astrologer{astrologerSupply}</Text>
            {astrologers.length > 0 ? (
              <TouchableOpacity
                style={styles.seeAll}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="See all astrologers"
                accessibilityHint="Opens the astrologer directory in the app"
                onPress={() => router.push('/(devotee)/astrologers' as never)}
              >
                <Text style={styles.seeAllText}>See all</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.saffron[700]} />
              </TouchableOpacity>
            ) : null}
          </View>

          {astrologersQuery.isLoading ? (
            <View style={styles.supplyBox}>
              <ActivityIndicator color={colors.saffron[600]} />
              <Text style={styles.supplyText}>Loading verified astrologers…</Text>
            </View>
          ) : supplyError ? (
            <View style={styles.supplyBox}>
              <Ionicons name="cloud-offline-outline" size={28} color={colors.stone[300]} />
              <Text style={styles.supplyTitle}>Could not load the directory</Text>
              <Text style={styles.supplyText}>
                {supplyError} Nothing is shown rather than a guess — pull down to retry.
              </Text>
            </View>
          ) : astrologers.length === 0 ? (
            <View style={styles.supplyBox}>
              <Ionicons name="planet-outline" size={28} color={colors.stone[300]} />
              <Text style={styles.supplyTitle}>No astrologers are listed yet</Text>
              <Text style={styles.supplyText}>
                No approved astrologer has gone live on Darshya so far. The free tools below are
                open to everyone in the meantime.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.strip}
            >
              {astrologers.slice(0, STRIP_LIMIT).map((a) => (
                <AstrologerStripCard key={a.id} a={a} width={cardWidth} />
              ))}
              {astrologers.length > STRIP_LIMIT ? (
                <TouchableOpacity
                  style={[styles.stripMore, { width: cardWidth * 0.55 }]}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`See all ${astrologers.length} astrologers`}
                  accessibilityHint="Opens the astrologer directory in the app"
                  onPress={() => router.push('/(devotee)/astrologers' as never)}
                >
                  <Ionicons name="arrow-forward" size={20} color={colors.saffron[700]} />
                  <Text style={styles.stripMoreText}>
                    See all {astrologers.length}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          )}
        </View>

        {/* ── Your rashi ────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Your rashi</Text>
            <TouchableOpacity
              style={styles.seeAll}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Open the daily horoscope"
              accessibilityHint="Opens the horoscope screen in the app"
              onPress={() => router.push('/(devotee)/horoscope' as never)}
            >
              <Text style={styles.seeAllText}>Daily horoscope</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.saffron[700]} />
            </TouchableOpacity>
          </View>

          <View style={styles.rashiGrid}>
            {RASHI_SIGNS.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={styles.rashiCard}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`${r.english} (${r.hindi})`}
                accessibilityHint="Opens this rashi's reading in the app"
                onPress={() =>
                  router.push({
                    pathname: '/(devotee)/horoscope-rashi' as never,
                    params: { rashi: r.id },
                  } as never)
                }
              >
                <Text style={styles.rashiSymbol}>{r.symbol}</Text>
                <Text style={styles.rashiName}>{r.english}</Text>
                <Text style={styles.rashiHindi}>{r.hindi}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Free tools ────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Free Vedic tools</Text>
          <View style={styles.toolList}>
            <ToolRow
              icon="planet"
              title="Kundli"
              body="Your birth chart: lagna, rashi, nakshatra, planetary positions and the current dasha."
              badge="Free"
              accessibilityHint="Opens the kundli generator in the app"
              iconRight="chevron-forward"
              onPress={() => router.push('/(devotee)/kundli' as never)}
            />
            <ToolRow
              icon="sunny"
              title="Daily rashifal"
              body="Today's reading for your rashi — career, love, health, lucky number and mantra."
              badge="Free"
              accessibilityHint="Opens the horoscope screen in the app"
              iconRight="chevron-forward"
              onPress={() => router.push('/(devotee)/horoscope' as never)}
            />
            {/* The calculators that moved into @poojly/shared/astrology. One
                registry, so a screen cannot be built and left unreachable —
                lib/__tests__/astrology-parity.test.ts checks every route here
                against a real file in app/(devotee). */}
            {ASTROLOGY_TOOLS.map((t) => (
              <ToolRow
                key={t.route}
                icon={t.icon as React.ComponentProps<typeof Ionicons>['name']}
                title={t.title}
                body={t.body}
                badge="Free · in app"
                accessibilityHint={`Opens ${t.title} in the app`}
                iconRight="chevron-forward"
                onPress={() => router.push(t.route as never)}
              />
            ))}
            {/* Sade sati, dasha, hora, shubh muhurat and kaal sarp compute but
                are not built here yet; lal kitab, vastu, pitra dosh, pancha
                pakshi and baby name are editorial lookups over prose datasets
                the app would have to bundle whole. All ten stay on the site. */}
            <ToolRow
              icon="calculator"
              title="More Vedic calculators"
              body="Sade sati, dasha, hora, shubh muhurat, kaal sarp, lal kitab, vastu, pitra dosh, pancha pakshi and baby names."
              badge={toolsAffordance.leavesApp ? hostOf(WEB.origin) : 'In app'}
              accessibilityRole={toolsAffordance.role}
              accessibilityHint={toolsAffordance.hint}
              iconRight={toolsAffordance.icon}
              onPress={() => openWebHandoff(TOOLS_TARGET, handoffOpts, io)}
            />
          </View>
        </View>

        {/* ── AI Jyotish ────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.aiCard}>
            <Ionicons name="sparkles" size={28} color={colors.saffron[600]} />
            <Text style={styles.aiCardTitle}>Jyotish assistant</Text>
            <Text style={styles.aiCardDescription}>
              Ask about your birth chart, compatibility, doshas, remedies or muhurat. Add your
              birth details and the answer is worked out against a computed chart.
            </Text>
            <TouchableOpacity
              style={styles.aiButton}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Open the Jyotish assistant"
              accessibilityHint="Opens the assistant chat in the app"
              onPress={() => router.push('/(devotee)/astrology-chat' as never)}
            >
              <Ionicons name="chatbubble-ellipses" size={16} color={colors.white} />
              <Text style={styles.aiButtonText}>Ask the Jyotish assistant</Text>
            </TouchableOpacity>
            <Text style={styles.aiCardNote}>
              Guidance from an AI, not a consultation with an astrologer.
            </Text>
          </View>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ToolRow({
  icon,
  title,
  body,
  badge,
  accessibilityRole,
  accessibilityHint,
  iconRight,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  badge: string;
  accessibilityRole?: 'button' | 'link';
  accessibilityHint: string;
  iconRight: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.toolCard}
      activeOpacity={0.75}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
    >
      <View style={styles.toolIcon}>
        <Ionicons name={icon} size={22} color={colors.saffron[600]} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.toolTitleRow}>
          <Text style={styles.toolTitle}>{title}</Text>
          <View style={styles.toolBadge}>
            <Text style={styles.toolBadgeText} numberOfLines={1}>
              {badge}
            </Text>
          </View>
        </View>
        <Text style={styles.toolBody}>{body}</Text>
      </View>
      <Ionicons name={iconRight} size={18} color={colors.stone[300]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  scrollContent: { paddingBottom: spacing.xl },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  headerTitle: { fontSize: fontSize['3xl'], fontWeight: '800', color: colors.stone[900] },
  headerSubtitle: { fontSize: fontSize.base, color: colors.stone[500], marginTop: 2 },

  section: { marginTop: spacing.md, paddingHorizontal: spacing.md, gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { flex: 1, fontSize: fontSize.xl, fontWeight: '700', color: colors.stone[900] },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 44,
    paddingLeft: spacing.sm,
  },
  seeAllText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.saffron[700] },

  supplyBox: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
  },
  supplyTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[700] },
  supplyText: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    textAlign: 'center',
    lineHeight: 20,
  },

  strip: { gap: spacing.sm, paddingRight: spacing.md },
  stripCard: {
    marginRight: spacing.sm,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
  },
  stripHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stripAvatarWrap: { width: 44, height: 44 },
  stripAvatar: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripAvatarText: { fontSize: fontSize.base, fontWeight: '800', color: colors.saffron[700] },
  stripDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.white,
  },
  stripDotOn: { backgroundColor: colors.green[500] },
  stripDotOff: { backgroundColor: colors.stone[300] },
  stripName: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  stripMeta: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 1 },
  stripSpec: { fontSize: fontSize.xs, color: colors.saffron[700], fontWeight: '600' },
  stripFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  stripRate: { fontSize: fontSize.base, fontWeight: '800', color: colors.stone[900] },
  stripRateUnknown: { fontSize: fontSize.xs, fontWeight: '600', color: colors.stone[400] },
  stripRating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  stripRatingText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.stone[600] },
  stripMore: {
    minHeight: 120,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.saffron[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.saffron[200],
  },
  stripMoreText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.saffron[700],
    textAlign: 'center',
  },

  rashiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rashiCard: {
    width: '22.5%',
    minHeight: 72,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.stone[100],
  },
  rashiSymbol: { fontSize: 24, marginBottom: 2 },
  rashiName: { fontSize: fontSize.xs, fontWeight: '600', color: colors.stone[700] },
  rashiHindi: { fontSize: fontSize.xs, color: colors.stone[400] },

  toolList: { gap: spacing.sm },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.stone[100],
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  toolTitle: { flexShrink: 1, fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  toolBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.stone[100],
    maxWidth: 140,
  },
  toolBadgeText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.stone[500] },
  toolBody: { fontSize: fontSize.sm, color: colors.stone[500], lineHeight: 18, marginTop: 3 },

  aiCard: {
    backgroundColor: colors.stone[900],
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  aiCardTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.white,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  aiCardDescription: {
    fontSize: fontSize.sm,
    color: colors.stone[400],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    backgroundColor: colors.saffron[600],
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  aiButtonText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
  aiCardNote: {
    fontSize: fontSize.xs,
    color: colors.stone[500],
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
