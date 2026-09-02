import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { WEDDING_PACKAGES } from '../../lib/wedding-packages';
import { formatInr } from '../../lib/api-contracts';

/**
 * Mobile parity for web `/weddings/packages`
 * (apps/web/app/weddings/packages/page.tsx).
 *
 * There is NO packages endpoint. The wedding routes the API exposes are
 * `POST /api/v1/weddings/muhurat` and `POST /api/v1/weddings/inquiry`
 * (apps/api/src/routes/weddings.ts) — the tier is a `z.enum(['basic',
 * 'premium','royal'])` on the inquiry body and nothing more. So the tier
 * catalogue is published copy, and it lives in ONE module
 * (lib/wedding-packages.ts) that both this screen and weddings.tsx read, pinned
 * by a test against the web page. That is the whole reason this file exists as
 * a screen rather than another hand-typed price list: the two mobile prices
 * that were hand-typed here before ("₹25k", "₹2L+", "₹10L+") contradicted the
 * website's ₹15,000 / ₹50,000 / ₹2,00,000 on every one of the three tiers.
 */
export default function WeddingPackagesScreen() {
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
          <Text style={styles.title}>Wedding packages</Text>
          <Text style={styles.subtitle}>Three end-to-end Vedic wedding plans</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          All packages are end-to-end. Pricing is for ceremonies in India; NRI weddings carry a
          travel and consultation surcharge quoted by the concierge.
        </Text>

        {WEDDING_PACKAGES.map((p) => (
          <View
            key={p.tier}
            style={[styles.card, p.popular ? styles.cardPopular : null]}
          >
            {p.popular ? (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>Most popular</Text>
              </View>
            ) : null}
            <Text style={styles.pkgName}>{p.name}</Text>
            <Text style={styles.pkgTagline}>{p.tagline}</Text>
            {/* Read, never derived — formatInr renders the published figure and
                nothing multiplies or discounts it anywhere in this app. */}
            <Text style={styles.pkgPrice}>{formatInr(p.priceInr)}</Text>

            {p.features.map((f) => (
              <View key={f} style={styles.featureRow}>
                <Ionicons name="checkmark" size={15} color={colors.saffron[700]} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.cta, p.popular ? styles.ctaPrimary : styles.ctaSecondary]}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Enquire about the ${p.name} package`}
              onPress={() =>
                router.push({
                  pathname: '/(devotee)/weddings' as never,
                  params: { package: p.tier },
                } as never)
              }
            >
              <Text style={p.popular ? styles.ctaPrimaryText : styles.ctaSecondaryText}>
                Enquire about {p.name}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.customCard}>
          <Text style={styles.customHeading}>Custom requirements?</Text>
          <Text style={styles.customBody}>
            Multi-day destination wedding, regional customs (Bengali, Tamil, Marwari, Marathi), or
            Mangalik parihara — every package is tailored.
          </Text>
          <TouchableOpacity
            style={[styles.cta, styles.ctaPrimary]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Talk to a planner"
            onPress={() => router.push('/(devotee)/weddings' as never)}
          >
            <Text style={styles.ctaPrimaryText}>Talk to a planner</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.muhuratLink}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Find your wedding muhurat"
          onPress={() => router.push('/(devotee)/weddings-muhurat' as never)}
        >
          <Ionicons name="calendar" size={22} color={colors.saffron[700]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.muhuratTitle}>Find your muhurat first</Text>
            <Text style={styles.muhuratSub}>Auspicious dates from your nakshatras</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.saffron[700]} />
        </TouchableOpacity>
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
  content: { padding: spacing.md, paddingBottom: spacing['2xl'], gap: spacing.md },
  intro: { fontSize: fontSize.sm, color: colors.stone[600], lineHeight: 19 },
  card: {
    backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.stone[100], gap: 2,
  },
  cardPopular: { borderColor: colors.saffron[600], borderWidth: 2 },
  popularBadge: {
    alignSelf: 'flex-start', backgroundColor: colors.saffron[700],
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: borderRadius.full, marginBottom: spacing.xs,
  },
  popularText: {
    color: colors.white, fontSize: fontSize.xs, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  pkgName: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.saffron[900] },
  pkgTagline: { fontSize: fontSize.sm, color: colors.stone[600], marginTop: 2 },
  pkgPrice: {
    fontSize: fontSize['3xl'], fontWeight: '800',
    color: colors.saffron[700], marginTop: spacing.xs, marginBottom: spacing.sm,
  },
  featureRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start', marginBottom: 4 },
  featureText: { flex: 1, fontSize: fontSize.sm, color: colors.stone[800], lineHeight: 18 },
  cta: {
    minHeight: 48, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  ctaPrimary: { backgroundColor: colors.saffron[700] },
  ctaSecondary: { borderWidth: 1, borderColor: colors.saffron[700], backgroundColor: colors.white },
  ctaPrimaryText: { color: colors.white, fontWeight: '800', fontSize: fontSize.base },
  ctaSecondaryText: { color: colors.saffron[800], fontWeight: '800', fontSize: fontSize.base },
  customCard: {
    backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.stone[100],
  },
  customHeading: { fontSize: fontSize.lg, fontWeight: '800', color: colors.saffron[900] },
  customBody: { fontSize: fontSize.sm, color: colors.stone[700], marginTop: 4, lineHeight: 18 },
  muhuratLink: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.saffron[50], padding: spacing.md,
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.saffron[200],
    minHeight: 44,
  },
  muhuratTitle: { fontSize: fontSize.base, fontWeight: '800', color: colors.saffron[900] },
  muhuratSub: { fontSize: fontSize.xs, color: colors.stone[600], marginTop: 2 },
});
