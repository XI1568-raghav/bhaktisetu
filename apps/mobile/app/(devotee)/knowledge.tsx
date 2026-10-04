import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { apiFetch } from '../../lib/api';

/**
 * THE HARDCODED CATEGORY LIST IS GONE.
 *
 * This screen used to declare
 *
 *     interface CategoryCard { key: 'sanskrit' | 'ved' | 'sanatan'; … }
 *     const categories: CategoryCard[] = [ …three literals… ];
 *
 * and knowledge-category.tsx carried the same three keys again in a label map,
 * and apps/api/src/routes/knowledge.ts carried them a third time in a union
 * that 400'd anything else. Three copies of one fact, in two apps: publishing a
 * fourth body of articles meant editing all three and shipping a new binary,
 * and getting any one of them wrong produced a 400 that read as a missing
 * article rather than a missing edit.
 *
 * The API now discovers categories from the content directory and serves them
 * at `GET /api/v1/knowledge`. This screen asks. A category added to
 * apps/web/content therefore appears here on the next API deploy with no app
 * release at all.
 *
 * WHAT IS STILL LOCAL, AND WHY THAT IS FINE
 * -----------------------------------------
 * `CATEGORY_ICONS` below. An Ionicons glyph name is a property of THIS
 * client's icon font, not of the content, so the server has no business
 * knowing it. An unrecognised category falls back to a book glyph and the
 * saffron accent and is rendered in full — the icon degrades, the article set
 * never disappears. Contrast the old code, where an unrecognised category was
 * simply absent.
 */

interface CategoryCard {
  key: string;
  title: string;
  count: number;
}

const CATEGORY_ICONS: Readonly<
  Record<string, { icon: React.ComponentProps<typeof Ionicons>['name']; color: string }>
> = Object.freeze({
  sanskrit: { icon: 'language', color: colors.saffron[600] },
  ved: { icon: 'book', color: colors.amber[600] },
  sanatan: { icon: 'flower', color: colors.green[600] },
});

const DEFAULT_ICON = { icon: 'book-outline' as const, color: colors.saffron[500] };

function iconFor(key: string) {
  return CATEGORY_ICONS[key] ?? DEFAULT_ICON;
}

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
  const [categories, setCategories] = useState<CategoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!KNOWLEDGE_ENABLED) return;
    let live = true;
    apiFetch<{ categories: CategoryCard[] }>('/knowledge')
      .then((d) => {
        if (!live) return;
        // A row without a key has nothing to route to and is dropped rather
        // than rendered as a dead card.
        const rows = Array.isArray(d?.categories) ? d.categories : [];
        setCategories(
          rows.filter(
            (c): c is CategoryCard =>
              typeof c?.key === 'string' && c.key.length > 0 && typeof c?.title === 'string',
          ),
        );
        setError(null);
      })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  if (!KNOWLEDGE_ENABLED) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.saffron[600]} />
          </View>
        ) : null}

        {/* The error is stated, not swallowed — and the two cards below it are
            local navigation that does not depend on this request, so they stay
            usable while the article rail is unreachable. */}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!loading && !error && categories.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.empty}>No article collections published yet.</Text>
          </View>
        ) : null}

        {categories.map((c) => {
          const { icon, color } = iconFor(c.key);
          return (
            <TouchableOpacity
              key={c.key}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={c.title}
              accessibilityHint={`Opens ${c.title} articles`}
              onPress={() => router.push(`/(devotee)/knowledge-category?category=${encodeURIComponent(c.key)}`)}
              style={[styles.card, { borderLeftColor: color }]}
            >
              <View style={[styles.cardIcon, { backgroundColor: `${color}18` }]}>
                <Ionicons name={icon} size={28} color={color} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                {/* The count is the server's, so it cannot drift from the
                    directory the way a written-in subtitle would. */}
                <Text style={styles.cardSubtitle}>
                  {c.count} article{c.count === 1 ? '' : 's'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.stone[400]} />
            </TouchableOpacity>
          );
        })}

        {/* The sacred calendar. Not an article collection, so it is not in the
            loop above — it reads GET /panchang/{festivals,vrats}, which have
            been live and unreachable from this app since they shipped. */}
        <TouchableOpacity
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Devotional Library"
          accessibilityHint="Opens the scripture and deity collections"
          onPress={() => router.push('/(devotee)/library')}
          style={[styles.card, { borderLeftColor: colors.amber[600] }]}
        >
          <View style={[styles.cardIcon, { backgroundColor: `${colors.amber[600]}18` }]}>
            <Ionicons name="library" size={28} color={colors.amber[600]} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Devotional Library</Text>
            <Text style={styles.cardSubtitle}>
              Vedas, Puranas, deities, chalisas, tirthas and more
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.stone[400]} />
        </TouchableOpacity>


        <TouchableOpacity
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Sacred Calendar"
          accessibilityHint="Opens upcoming festivals and vrats"
          onPress={() => router.push('/(devotee)/festivals')}
          style={[styles.card, { borderLeftColor: colors.green[600] }]}
        >
          <View style={[styles.cardIcon, { backgroundColor: `${colors.green[600]}18` }]}>
            <Ionicons name="calendar" size={28} color={colors.green[600]} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Sacred Calendar</Text>
            <Text style={styles.cardSubtitle}>Festivals and vrats, from the panchang</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.stone[400]} />
        </TouchableOpacity>

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
  center: { padding: spacing.xl, alignItems: 'center' },
  empty: { color: colors.stone[400], fontSize: fontSize.base },
  error: { padding: spacing.md, color: colors.red[600], textAlign: 'center' },
});
