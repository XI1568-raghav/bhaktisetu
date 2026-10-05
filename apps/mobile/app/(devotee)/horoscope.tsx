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
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import {
  RASHI_SIGNS,
  rashiById,
  selectRashiHoroscope,
  hasReading,
} from '../../lib/astrology-directory';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * The horoscope index — pick a rashi, read a preview, open the full reading.
 *
 *   GET /api/v1/astrology/horoscope/:rashi -> { horoscope }
 *
 * THE BUG THIS SCREEN CARRIED
 * ---------------------------
 * It called `useDailyHoroscope(sign)` — `GET /horoscope/daily?sign=` — and then
 * rendered `result.prediction ?? result.general`. Neither key exists on that
 * payload: `DailyHoroscopePayload` (apps/api/src/lib/astrology.ts) carries the
 * text under `reading`. So a healthy 200 produced a card with a heading, a date
 * range and nothing else — no prediction, no career/love/health sections, no
 * lucky number, no lucky colour — and the failure was invisible, because an
 * empty card is also what a genuine miss looks like.
 *
 * `GET /horoscope/:rashi` is the route whose shape this screen renders, and it
 * carries considerably more: prediction, career, love, health, lucky
 * number/colour/direction, the mantra in both scripts, ruling planet, element
 * and a 1-5 rating. The reader lives in lib/astrology-directory.ts so it can be
 * unit-tested — apps/mobile's vitest runner is node-only and renders no React
 * Native, so a shape assumption living inside a screen is one nothing can check.
 *
 * The query key is shared with app/(devotee)/horoscope-rashi.tsx, so opening
 * the full reading for the sign already previewed here costs no second request.
 */

export default function HoroscopeScreen() {
  const [selected, setSelected] = useState<string>(RASHI_SIGNS[0]!.id);
  const [refreshing, setRefreshing] = useState(false);
  const sign = rashiById(selected) ?? RASHI_SIGNS[0]!;

  const query = useQuery<unknown>({
    queryKey: ['astrology', 'horoscope', 'rashi', sign.id],
    queryFn: () => apiFetch<unknown>(`/astrology/horoscope/${encodeURIComponent(sign.id)}`),
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
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const openFull = (rashi: string) =>
    router.push({
      pathname: '/(devotee)/horoscope-rashi' as never,
      params: { rashi },
    } as never);

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
          <Text style={styles.title}>Daily Horoscope</Text>
          <Text style={styles.subtitle}>{today}</Text>
        </View>
        <Ionicons name="star" size={26} color={colors.amber[500]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.signsRow}>
          {RASHI_SIGNS.map((s) => {
            const isActive = selected === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.signChip, isActive && styles.signChipActive]}
                onPress={() => setSelected(s.id)}
                onLongPress={() => openFull(s.id)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${s.english} (${s.hindi})`}
                accessibilityHint="Shows a preview below; long press to open the full reading"
              >
                <Text style={[styles.signSymbol, isActive && styles.signSymbolActive]}>
                  {s.symbol}
                </Text>
                <Text style={[styles.signName, isActive && styles.signNameActive]}>
                  {s.english}
                </Text>
                <Text style={[styles.signHindi, isActive && styles.signHindiActive]}>
                  {s.hindi}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.predictionCard}>
          <Text style={styles.predictionHeading}>
            {sign.english} ({sign.hindi})
          </Text>
          <Text style={styles.predictionRange}>{sign.range}</Text>

          {query.isLoading ? (
            <ActivityIndicator color={colors.saffron[600]} style={{ marginVertical: spacing.lg }} />
          ) : errorText ? (
            <>
              <Text style={styles.errorText}>
                Could not load the {sign.english} reading. {errorText}
              </Text>
              <TouchableOpacity
                style={styles.retryBtn}
                activeOpacity={0.85}
                accessibilityRole="button"
                onPress={() => void query.refetch()}
              >
                <Text style={styles.retryBtnText}>Try again</Text>
              </TouchableOpacity>
            </>
          ) : hasReading(horoscope) ? (
            <>
              {horoscope!.prediction ? (
                <Text style={styles.bodyText}>{horoscope!.prediction}</Text>
              ) : null}

              <View style={styles.metaRow}>
                {horoscope!.rulingPlanet ? (
                  <Chip icon="planet-outline" label={horoscope!.rulingPlanet} />
                ) : null}
                {horoscope!.element ? (
                  <Chip icon="flame-outline" label={horoscope!.element} />
                ) : null}
                {horoscope!.luckyColor ? (
                  <Chip icon="color-palette-outline" label={`Lucky colour ${horoscope!.luckyColor}`} />
                ) : null}
                {horoscope!.luckyNumber !== null ? (
                  <Chip icon="dice-outline" label={`Lucky number ${horoscope!.luckyNumber}`} />
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.fullBtn}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Read the full ${sign.english} reading`}
                accessibilityHint="Opens career, love, health and the rashi mantra in the app"
                onPress={() => openFull(sign.id)}
              >
                <Text style={styles.fullBtnText}>
                  Full {sign.english} reading — career, love, health, mantra
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.white} />
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.bodyText}>
              No reading is published for {sign.english} right now. Nothing is shown rather than a
              guess — pull down to check again.
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.kundliCta}
          onPress={() => router.push('/(devotee)/kundli' as never)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Get your free Kundli"
          accessibilityHint="Opens the kundli generator in the app"
        >
          <Ionicons name="planet" size={22} color={colors.saffron[700]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.kundliTitle}>Get your free Kundli</Text>
            <Text style={styles.kundliSub}>Detailed Vedic chart with planet positions</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.saffron[700]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.kundliCta}
          onPress={() => router.push('/(devotee)/astrologers' as never)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Talk to an astrologer"
          accessibilityHint="Opens the astrologer directory in the app"
        >
          <Ionicons name="chatbubbles" size={22} color={colors.saffron[700]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.kundliTitle}>Talk to an astrologer</Text>
            <Text style={styles.kundliSub}>A reading of your own chart, not the whole rashi</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.saffron[700]} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={13} color={colors.saffron[700]} />
      <Text style={styles.chipText}>{label}</Text>
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
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
  subtitle: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] },
  signsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  signChip: {
    width: '23%',
    minHeight: 64,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.stone[100],
  },
  signChipActive: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[700] },
  signSymbol: { fontSize: 22, color: colors.stone[800] },
  signSymbolActive: { color: colors.white },
  signName: { fontSize: 11, color: colors.stone[800], fontWeight: '700', marginTop: 2 },
  signNameActive: { color: colors.white },
  signHindi: { fontSize: 9, color: colors.stone[500] },
  signHindiActive: { color: colors.saffron[100] },
  predictionCard: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    gap: spacing.sm,
  },
  predictionHeading: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900] },
  predictionRange: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: -spacing.sm + 2 },
  bodyText: { fontSize: fontSize.sm, color: colors.stone[700], lineHeight: 21 },
  errorText: { fontSize: fontSize.sm, color: colors.red[600], lineHeight: 20 },
  retryBtn: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[600],
  },
  retryBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.saffron[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.saffron[100],
  },
  chipText: { fontSize: fontSize.xs, color: colors.saffron[700], fontWeight: '600' },
  fullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[600],
  },
  fullBtnText: { flex: 1, fontSize: fontSize.sm, fontWeight: '700', color: colors.white },
  kundliCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 64,
    backgroundColor: colors.saffron[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.saffron[200],
  },
  kundliTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  kundliSub: { fontSize: fontSize.xs, color: colors.stone[600], marginTop: 2 },
});
