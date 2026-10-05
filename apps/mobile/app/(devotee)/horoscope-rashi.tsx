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
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import {
  RASHI_SIGNS,
  rashiById,
  selectRashiHoroscope,
  hasReading,
  type RashiHoroscope,
} from '../../lib/astrology-directory';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * One rashi's daily reading — the mobile counterpart of
 * apps/web/app/astrology/horoscope/[rashi].
 *
 *   GET /api/v1/astrology/horoscope/:rashi -> { horoscope } | 404 { error }
 *
 * WHY THIS ROUTE AND NOT `/horoscope/daily`
 * -----------------------------------------
 * They are different payloads and the app was reading the wrong one.
 * `GET /horoscope/daily?sign=` returns `DailyHoroscopePayload` — one paragraph
 * under the key `reading`. `GET /horoscope/:rashi` returns the full editorial
 * record: `prediction`, `career`, `love`, `health`, the lucky number/colour/
 * direction, the mantra in both scripts, the ruling planet and the element.
 *
 * app/(devotee)/horoscope.tsx called the FIRST and rendered
 * `prediction ?? general` off it — neither key exists on that payload — so a
 * perfectly healthy 200 drew a card with a heading and nothing under it, and
 * the failure was invisible because "no reading available right now" is also
 * what a genuine miss looks like. Both screens now read the route whose shape
 * they render.
 *
 * NOTHING IS SUBSTITUTED. Every section below is rendered only when the
 * response carries that field; the rating is printed only inside 1-5 and is
 * never defaulted to a flattering 4. The twelve names and symbols in the
 * picker are route keys the API matches on, not content.
 */

export default function HoroscopeRashiScreen() {
  const params = useLocalSearchParams<{ rashi?: string }>();
  const requested = typeof params.rashi === 'string' ? params.rashi : '';
  const initial = rashiById(requested) ?? RASHI_SIGNS[0]!;
  const [signId, setSignId] = useState<string>(initial.id);
  const [refreshing, setRefreshing] = useState(false);

  const sign = rashiById(signId) ?? initial;

  const query = useQuery<unknown>({
    queryKey: ['astrology', 'horoscope', 'rashi', sign.id],
    queryFn: () => apiFetch<unknown>(`/astrology/horoscope/${encodeURIComponent(sign.id)}`),
    // The route serves a static editorial record; an hour is generous and still
    // picks up a same-day edit without re-fetching on every sign tap.
    staleTime: 60 * 60 * 1000,
  });

  const horoscope = useMemo(() => selectRashiHoroscope(query.data), [query.data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const errorText = query.isError
    ? query.error instanceof Error
      ? query.error.message
      : 'Unknown error'
    : null;

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {sign.english} horoscope
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {sign.hindi} rashifal · {today}
          </Text>
        </View>
        <Text style={styles.headerSymbol}>{sign.symbol}</Text>
      </View>

      {/* The sign switcher stays on screen so a devotee can read a partner's or
          a parent's rashi without going back a level. */}
      <View style={styles.signBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.signScroll}
        >
          {RASHI_SIGNS.map((s) => {
            const active = s.id === sign.id;
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.signChip, active && styles.signChipActive]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${s.english} (${s.hindi})`}
                onPress={() => setSignId(s.id)}
              >
                <Text style={[styles.signSymbol, active && styles.signTextActive]}>{s.symbol}</Text>
                <Text style={[styles.signName, active && styles.signTextActive]}>{s.english}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroSymbol}>{sign.symbol}</Text>
          <Text style={styles.heroName}>
            {horoscope?.rashiEnglish ?? sign.english} ({horoscope?.rashiHindi ?? sign.hindi})
          </Text>
          <Text style={styles.heroRange}>{sign.range}</Text>

          <View style={styles.heroFacts}>
            {horoscope?.element ? <Fact label="Element" value={horoscope.element} /> : null}
            {horoscope?.rulingPlanet ? (
              <Fact label="Ruling planet" value={horoscope.rulingPlanet} />
            ) : null}
          </View>

          <RatingStars rating={horoscope?.overallRating ?? null} />
        </View>

        {query.isLoading ? (
          <View style={styles.centre}>
            <ActivityIndicator color={colors.saffron[600]} />
            <Text style={styles.centreText}>Loading the {sign.english} reading…</Text>
          </View>
        ) : errorText ? (
          <View style={styles.centre}>
            <Ionicons name="cloud-offline-outline" size={44} color={colors.stone[300]} />
            <Text style={styles.centreTitle}>Could not load this reading</Text>
            <Text style={styles.centreText}>{errorText}</Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              accessibilityRole="button"
              onPress={() => void query.refetch()}
            >
              <Text style={styles.primaryBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : !hasReading(horoscope) ? (
          <View style={styles.centre}>
            <Ionicons name="document-text-outline" size={44} color={colors.stone[300]} />
            <Text style={styles.centreTitle}>No reading published for {sign.english}</Text>
            <Text style={styles.centreText}>
              Nothing is shown rather than a guess. Pull down to check again.
            </Text>
          </View>
        ) : (
          <Readings horoscope={horoscope!} />
        )}

        <TouchableOpacity
          style={styles.ctaCard}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Talk to an astrologer"
          accessibilityHint="Opens the astrologer directory in the app"
          onPress={() => router.push('/(devotee)/astrologers' as never)}
        >
          <Ionicons name="chatbubbles-outline" size={22} color={colors.saffron[700]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.ctaTitle}>Want more than a daily reading?</Text>
            <Text style={styles.ctaSub}>
              Talk to an astrologer about your own chart.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.saffron[700]} />
        </TouchableOpacity>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Readings({ horoscope }: { horoscope: RashiHoroscope }) {
  const lucky: Array<{ icon: React.ComponentProps<typeof Ionicons>['name']; text: string }> = [];
  if (horoscope.luckyNumber !== null)
    lucky.push({ icon: 'dice-outline', text: `Lucky number ${horoscope.luckyNumber}` });
  if (horoscope.luckyColor)
    lucky.push({ icon: 'color-palette-outline', text: `Lucky colour ${horoscope.luckyColor}` });
  if (horoscope.luckyDirection)
    lucky.push({ icon: 'compass-outline', text: `Direction ${horoscope.luckyDirection}` });

  return (
    <>
      {horoscope.prediction ? (
        <Section icon="sparkles-outline" title="Today's reading" body={horoscope.prediction} />
      ) : null}
      {horoscope.career ? (
        <Section icon="briefcase-outline" title="Career" body={horoscope.career} />
      ) : null}
      {horoscope.love ? <Section icon="heart-outline" title="Love" body={horoscope.love} /> : null}
      {horoscope.health ? (
        <Section icon="fitness-outline" title="Health" body={horoscope.health} />
      ) : null}

      {lucky.length > 0 ? (
        <View style={styles.luckyRow}>
          {lucky.map((l) => (
            <View key={l.text} style={styles.luckyChip}>
              <Ionicons name={l.icon} size={13} color={colors.saffron[700]} />
              <Text style={styles.luckyText}>{l.text}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {horoscope.mantra || horoscope.mantraHindi ? (
        <View style={styles.mantraCard}>
          <View style={styles.mantraHead}>
            <Ionicons name="flame-outline" size={16} color={colors.saffron[600]} />
            <Text style={styles.mantraLabel}>Mantra for this rashi</Text>
          </View>
          {horoscope.mantraHindi ? (
            <Text style={styles.mantraHindi}>{horoscope.mantraHindi}</Text>
          ) : null}
          {horoscope.mantra ? <Text style={styles.mantraRoman}>{horoscope.mantra}</Text> : null}
        </View>
      ) : null}
    </>
  );
}

function Section({
  icon,
  title,
  body,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHead}>
        <Ionicons name={icon} size={16} color={colors.saffron[600]} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
  );
}

/** Nothing at all when the payload carried no rating — never a default of 4. */
function RatingStars({ rating }: { rating: number | null }) {
  if (rating === null) return null;
  return (
    <View style={styles.starRow} accessibilityLabel={`${rating} out of 5 today`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={14}
          color={colors.amber[500]}
        />
      ))}
      <Text style={styles.starText}>{rating}/5 today</Text>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
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
  headerTitle: { fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
  headerSubtitle: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 1 },
  headerSymbol: { fontSize: 26, color: colors.saffron[600] },

  signBar: {
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  signScroll: { paddingHorizontal: spacing.md, gap: spacing.sm },
  signChip: {
    minWidth: 60,
    minHeight: 52,
    marginRight: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.stone[100],
  },
  signChipActive: { backgroundColor: colors.saffron[600] },
  signSymbol: { fontSize: 18, color: colors.stone[700] },
  signName: { fontSize: fontSize.xs, fontWeight: '700', color: colors.stone[600] },
  signTextActive: { color: colors.white },

  body: { padding: spacing.md, gap: spacing.md },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.saffron[100],
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroSymbol: { fontSize: 44, color: colors.saffron[600] },
  heroName: { fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
  heroRange: { fontSize: fontSize.sm, color: colors.stone[500] },
  heroFacts: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  fact: { alignItems: 'center' },
  factLabel: {
    fontSize: fontSize.xs,
    color: colors.stone[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  factValue: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[800], marginTop: 2 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: spacing.sm },
  starText: { fontSize: fontSize.xs, color: colors.stone[500], marginLeft: spacing.xs },

  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    padding: spacing.md,
    gap: spacing.xs,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  sectionBody: { fontSize: fontSize.sm, color: colors.stone[600], lineHeight: 21 },

  luckyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  luckyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.saffron[50],
    borderWidth: 1,
    borderColor: colors.saffron[100],
  },
  luckyText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.saffron[700] },

  mantraCard: {
    backgroundColor: colors.stone[900],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  mantraHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  mantraLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.saffron[300],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mantraHindi: { fontSize: fontSize.lg, fontWeight: '700', color: colors.white, lineHeight: 26 },
  mantraRoman: { fontSize: fontSize.sm, color: colors.stone[300], lineHeight: 20 },

  centre: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  centreTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[700] },
  centreText: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
  primaryBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[600],
  },
  primaryBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },

  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 64,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.saffron[50],
    borderWidth: 1,
    borderColor: colors.saffron[200],
  },
  ctaTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  ctaSub: { fontSize: fontSize.xs, color: colors.stone[600], marginTop: 2 },
});
