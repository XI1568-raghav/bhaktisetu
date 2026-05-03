import React from 'react';
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

const FALLBACK_DESTINATIONS = [
  { slug: 'char-dham', title: 'Char Dham Yatra', region: 'Uttarakhand', durationDays: 11, priceFromInr: 32000 },
  { slug: 'kashi-vishwanath', title: 'Kashi Vishwanath Tour', region: 'Varanasi', durationDays: 4, priceFromInr: 12000 },
  { slug: 'tirupati-balaji', title: 'Tirupati Balaji Darshan', region: 'Andhra Pradesh', durationDays: 3, priceFromInr: 9500 },
  { slug: 'shirdi-sai', title: 'Shirdi Sai Baba Yatra', region: 'Maharashtra', durationDays: 3, priceFromInr: 8500 },
];

export default function YatraScreen() {
  const packages = useYatraPackages();
  const list = useYatraList();
  const [refreshing, setRefreshing] = React.useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([packages.refetch(), list.refetch()]);
    setRefreshing(false);
  }

  const apiPackages = packages.data?.packages ?? [];
  const apiList = list.data?.yatras ?? [];
  const destinations =
    apiList.length > 0
      ? apiList
      : (FALLBACK_DESTINATIONS as unknown as typeof apiList);

  const isLoading = (packages.isLoading || list.isLoading) && apiPackages.length === 0 && destinations.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
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
        {isLoading ? (
          <ActivityIndicator color={colors.saffron[600]} style={{ marginTop: spacing.xl }} />
        ) : (
          <>
            {apiPackages.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Packages</Text>
                {apiPackages.map((p) => (
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
                  >
                    <View style={styles.cardThumb}>
                      <Ionicons name="map" size={32} color={colors.saffron[600]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.cardMeta} numberOfLines={1}>
                        {p.duration_days} days • {p.destination_slug}
                      </Text>
                      <Text style={styles.cardPrice}>
                        From ₹{Number(p.price_inr).toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.stone[400]} />
                  </TouchableOpacity>
                ))}
              </>
            ) : null}

            <Text style={styles.sectionTitle}>Destinations</Text>
            {destinations.map((d) => (
              <TouchableOpacity
                key={d.slug}
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: '/(devotee)/yatra-detail' as never,
                    params: { slug: d.slug, source: 'destination' },
                  } as never)
                }
                activeOpacity={0.85}
              >
                <View style={[styles.cardThumb, { backgroundColor: colors.amber[400] }]}>
                  <Ionicons name="compass" size={32} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{d.title}</Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {d.region ?? d.state ?? ''}{d.durationDays ? ` • ${d.durationDays} days` : ''}
                  </Text>
                  {d.priceFromInr ? (
                    <Text style={styles.cardPrice}>
                      From ₹{d.priceFromInr.toLocaleString('en-IN')}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.stone[400]} />
              </TouchableOpacity>
            ))}
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
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
  subtitle: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  content: { padding: spacing.md, paddingBottom: spacing['2xl'], gap: spacing.sm },
  sectionTitle: {
    fontSize: fontSize.sm, fontWeight: '800', color: colors.stone[700],
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginTop: spacing.sm, marginBottom: spacing.xs,
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white, padding: spacing.sm, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.stone[100],
  },
  cardThumb: {
    width: 56, height: 56, borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[50],
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  cardMeta: { fontSize: fontSize.xs, color: colors.stone[600], marginTop: 2 },
  cardPrice: { fontSize: fontSize.sm, color: colors.saffron[700], fontWeight: '700', marginTop: 2 },
});
