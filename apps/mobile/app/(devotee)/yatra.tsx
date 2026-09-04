import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useYatraPackages, useYatraList } from '@poojly/api-client';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { formatInr, toNumber } from '../../lib/api-contracts';
import { selectYatraList } from '../../lib/yatra-catalogue';

/**
 * Yatra catalogue — `GET /api/v1/yatra-packages` (owned, bookable tours) and
 * `GET /api/v1/yatra/list` (curated destinations).
 *
 * TWO THINGS THIS SCREEN USED TO DO
 * ---------------------------------
 * 1. It carried a `FALLBACK_DESTINATIONS` constant — four hand-typed rows with
 *    hand-typed prices, rendered whenever `/yatra/list` returned nothing. The
 *    figures contradicted the server on every overlapping row (`char-dham` was
 *    listed at ₹32,000 against the API's ₹38,500), so an outage did not degrade
 *    the screen, it made it lie. A catalogue that cannot load must say so.
 * 2. It read `d.priceFromInr`, a key `packages/api-client`'s `YatraDestination`
 *    declares and the API has never sent — it sends `startingPrice`. So for
 *    every REAL destination the price line rendered nothing, and the only
 *    prices a devotee ever saw here were the invented ones from (1).
 *    `lib/yatra-catalogue.ts` now reads the keys the server actually sends.
 *
 * Both rows also had no booking path: tapping one opened the detail screen,
 * which offered a one-shot enquiry with the tier hardcoded to `standard`. The
 * full request flow is `yatra-book.tsx`, mirroring web `/yatra/book`.
 */
export default function YatraScreen() {
  const packages = useYatraPackages();
  const list = useYatraList();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([packages.refetch(), list.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }

  const apiPackages = packages.data?.packages ?? [];
  const destinations = useMemo(() => selectYatraList(list.data), [list.data]);

  const loading = (packages.isLoading || list.isLoading) && !refreshing;
  const bothFailed = packages.isError && list.isError;
  const empty = !loading && !bothFailed && apiPackages.length === 0 && destinations.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Spiritual Yatras</Text>
          <Text style={styles.subtitle}>Curated pilgrim tours across India</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.centre}>
            <ActivityIndicator size="large" color={colors.saffron[600]} />
            <Text style={styles.centreText}>Loading yatras…</Text>
          </View>
        ) : bothFailed ? (
          <View style={styles.centre}>
            <Ionicons name="cloud-offline-outline" size={44} color={colors.stone[300]} />
            <Text style={styles.centreText}>
              We could not load the yatra catalogue. Pull down to retry.
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={onRefresh}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Try again"
            >
              <Ionicons name="refresh" size={18} color={colors.white} />
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : empty ? (
          <View style={styles.centre}>
            <Ionicons name="map-outline" size={44} color={colors.stone[300]} />
            <Text style={styles.centreText}>
              No yatras are published right now. Check back soon.
            </Text>
          </View>
        ) : (
          <>
            {apiPackages.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Packages</Text>
                {apiPackages.map((p) => {
                  // Decimal columns arrive as strings; `toNumber` refuses
                  // anything else rather than turning null into a confident ₹0.
                  const price = toNumber(p.price_inr);
                  return (
                    <TouchableOpacity
                      key={p.id ?? p.slug}
                      style={styles.card}
                      onPress={() =>
                        router.push({
                          pathname: '/(devotee)/yatra-detail' as never,
                          params: { slug: p.slug, source: 'package' },
                        } as never)
                      }
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={`${p.name}, ${p.duration_days} day package`}
                    >
                      <View style={styles.cardThumb}>
                        <Ionicons name="map" size={32} color={colors.saffron[600]} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {p.name}
                        </Text>
                        <Text style={styles.cardMeta} numberOfLines={1}>
                          {p.duration_days} days • {p.destination_slug}
                        </Text>
                        {price !== null ? (
                          <Text style={styles.cardPrice}>From {formatInr(price)}</Text>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.stone[400]} />
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : null}

            {destinations.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Destinations</Text>
                {destinations.map((d) => (
                  <View key={d.slug} style={styles.destCard}>
                    <TouchableOpacity
                      style={styles.destTop}
                      onPress={() =>
                        router.push({
                          pathname: '/(devotee)/yatra-detail' as never,
                          params: { slug: d.slug, source: 'destination' },
                        } as never)
                      }
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={`${d.title} details`}
                    >
                      <View style={[styles.cardThumb, { backgroundColor: colors.amber[400] }]}>
                        <Ionicons name="compass" size={32} color={colors.white} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {d.title}
                        </Text>
                        <Text style={styles.cardMeta} numberOfLines={1}>
                          {[d.region, d.durationDays ? `${d.durationDays} days` : null]
                            .filter(Boolean)
                            .join(' • ')}
                        </Text>
                        {/* Server figure, rendered. Nothing multiplies it. */}
                        {d.startingPriceInr !== null ? (
                          <Text style={styles.cardPrice}>
                            From {formatInr(d.startingPriceInr)} per person
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.stone[400]} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.bookBtn}
                      onPress={() =>
                        router.push({
                          pathname: '/(devotee)/yatra-book' as never,
                          params: { slug: d.slug, title: d.title },
                        } as never)
                      }
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={`Request a booking for ${d.title}`}
                    >
                      <Ionicons name="calendar" size={16} color={colors.white} />
                      <Text style={styles.bookText}>Request booking</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.stone[100],
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
  subtitle: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  content: { padding: spacing.md, paddingBottom: spacing['2xl'], gap: spacing.sm, flexGrow: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  centreText: { color: colors.stone[600], fontSize: fontSize.sm, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    minHeight: 48, paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md, backgroundColor: colors.saffron[600], marginTop: spacing.sm,
  },
  retryText: { color: colors.white, fontWeight: '800', fontSize: fontSize.base },
  sectionTitle: {
    fontSize: fontSize.sm, fontWeight: '800', color: colors.stone[700],
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginTop: spacing.sm, marginBottom: spacing.xs,
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white, padding: spacing.sm, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.stone[100], minHeight: 72,
  },
  destCard: {
    backgroundColor: colors.white, padding: spacing.sm, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.stone[100], gap: spacing.sm,
  },
  destTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 60 },
  cardThumb: {
    width: 56, height: 56, borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[50],
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  cardMeta: { fontSize: fontSize.xs, color: colors.stone[600], marginTop: 2 },
  cardPrice: { fontSize: fontSize.sm, color: colors.saffron[700], fontWeight: '700', marginTop: 2 },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    minHeight: 44, borderRadius: borderRadius.md, backgroundColor: colors.saffron[600],
  },
  bookText: { color: colors.white, fontWeight: '800', fontSize: fontSize.sm },
});
