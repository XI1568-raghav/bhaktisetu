import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface CategoryCard {
  key: 'sanskrit' | 'ved' | 'sanatan';
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}

const categories: CategoryCard[] = [
  { key: 'sanskrit', title: 'Sanskrit', subtitle: 'Language of the divine', icon: 'language', color: colors.saffron[600] },
  { key: 'ved', title: 'Vedas', subtitle: 'Eternal wisdom', icon: 'book', color: colors.amber[600] ?? colors.saffron[700] },
  { key: 'sanatan', title: 'Sanatan Dharma', subtitle: 'Living tradition', icon: 'flower', color: colors.green[600] ?? colors.saffron[500] },
];

/**
 * The v1 gate. docs/mobile-v1-scope.md records the hub as an explicit
 * exclusion and lib/__tests__/mobile-v1-scope.par22.test.ts pins this exact
 * comparison, so the flag stays and the shape of the check stays with it.
 *
 * It is no longer off everywhere, which is the point: eas.json sets
 * EXPO_PUBLIC_KNOWLEDGE_ENABLED="true" for the preview, production and
 * testflight profiles, and GET /api/v1/knowledge/:category serves real
 * articles. .env.example keeps it false for local dev. app/(devotee)/index.tsx
 * reads the same env var the same way and only shows its Knowledge entry when
 * this is on, so the home screen can never link to the "launching soon" card.
 *
 * NAV-01 removed a second constant here — `GURUKUL_ENABLED`, read from
 * EXPO_PUBLIC_GURUKUL_ENABLED and then never referenced by anything in app/ or
 * lib/. It could not be adopted retroactively either: this screen's Gurukuls
 * card is the ONLY inbound link to (devotee)/gurukuls.tsx in the whole tree,
 * and the flag is absent from every eas.json profile, so gating on it would
 * have stranded the gurukul screens exactly the way pandits and puja-detail
 * were stranded. Deleted as dead code; the card stays reachable.
 */
const KNOWLEDGE_ENABLED = process.env.EXPO_PUBLIC_KNOWLEDGE_ENABLED === 'true';

/**
 * NAV-01. `headerShown` is false for the whole (devotee) group
 * (_layout.tsx:30), and this screen is now PUSHED — from the home quick
 * actions — rather than only deep-linked into. Every other pushed screen in
 * the group draws its own back control (pandits.tsx:311, gurukuls.tsx:39,
 * kundli.tsx:74, knowledge-category.tsx); this one did not, so on iOS there
 * was no way back out of it. 44x44, labelled.
 */
function Header() {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backBtn}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={24} color={colors.stone[900]} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>Knowledge</Text>
        <Text style={styles.headerSubtitle}>Sanskrit, Vedas, and Sanatan Dharma</Text>
      </View>
    </View>
  );
}

export default function KnowledgeHubScreen() {
  if (!KNOWLEDGE_ENABLED) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header />
        <View style={{ flex: 1, padding: spacing.md, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="construct-outline" size={40} color={colors.stone[400]} />
          <Text style={{ fontSize: fontSize.lg, color: colors.stone[600], marginTop: spacing.sm, textAlign: 'center' }}>
            Knowledge Hub launching soon.
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header />
      <ScrollView contentContainerStyle={styles.content}>
        {categories.map((c) => (
          <TouchableOpacity
            key={c.key}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={c.title}
            accessibilityHint={`Opens ${c.title} articles`}
            onPress={() => router.push(`/(devotee)/knowledge-category?category=${c.key}`)}
            style={[styles.card, { borderLeftColor: c.color }]}
          >
            <View style={[styles.cardIcon, { backgroundColor: `${c.color}18` }]}>
              <Ionicons name={c.icon} size={28} color={c.color} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{c.title}</Text>
              <Text style={styles.cardSubtitle}>{c.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.stone[400]} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Learn Sanskrit"
          accessibilityHint="Opens the Sanskrit lessons"
          onPress={() => router.push('/(devotee)/learn-sanskrit')}
          style={[styles.card, { borderLeftColor: colors.saffron[600] }]}
        >
          <View style={[styles.cardIcon, { backgroundColor: `${colors.saffron[600]}18` }]}>
            <Ionicons name="school" size={28} color={colors.saffron[600]} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Learn Sanskrit</Text>
            <Text style={styles.cardSubtitle}>Lessons, quizzes, streaks</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.stone[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Gurukuls"
          accessibilityHint="Opens the gurukul directory"
          onPress={() => router.push('/(devotee)/gurukuls')}
          style={[styles.card, { borderLeftColor: colors.saffron[500] }]}
        >
          <View style={[styles.cardIcon, { backgroundColor: `${colors.saffron[500]}18` }]}>
            <Ionicons name="business" size={28} color={colors.saffron[500]} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Gurukuls</Text>
            <Text style={styles.cardSubtitle}>Traditional schools and admissions</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.stone[400]} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  backBtn: {
    width: 44,
    height: 44,
    marginLeft: -spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: fontSize['3xl'], fontWeight: '800', color: colors.stone[900] },
  headerSubtitle: { fontSize: fontSize.base, color: colors.stone[500], marginTop: 2 },
  content: { padding: spacing.md, gap: spacing.sm },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white, padding: spacing.md,
    borderRadius: borderRadius.lg, borderLeftWidth: 4,
    borderWidth: 1, borderColor: colors.stone[100],
  },
  cardIcon: { width: 48, height: 48, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[900] },
  cardSubtitle: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
});
