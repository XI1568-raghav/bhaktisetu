import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { apiFetch } from '../../lib/api';

interface ArticleItem {
  slug: string;
  title: string;
  summary: string;
  subTopic?: string;
  readingMinutes?: number;
}

/**
 * THE LABEL MAP IS GONE — it was the third copy of the category union.
 *
 * This file used to carry
 *
 *     const labels = { sanskrit: 'Sanskrit', ved: 'Vedas', sanatan: 'Sanatan Dharma' };
 *
 * alongside a `cat` narrowed to those same three strings, duplicating the list
 * in knowledge.tsx and the union in apps/api/src/routes/knowledge.ts. A fourth
 * collection would have rendered its raw directory name as the heading here
 * even after the other two files were updated.
 *
 * `GET /api/v1/knowledge/:category` now returns `title` beside `articles`, so
 * the heading comes from the same place the articles do. The header falls back
 * to the raw key only while the request is still in flight.
 */
export default function KnowledgeCategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const cat = category ?? 'sanskrit';
  const [items, setItems] = useState<ArticleItem[]>([]);
  const [title, setTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    apiFetch<{ title?: string; articles: ArticleItem[] }>(`/knowledge/${encodeURIComponent(cat)}`)
      .then((d) => {
        if (!live) return;
        setItems(Array.isArray(d?.articles) ? d.articles : []);
        setTitle(typeof d?.title === 'string' && d.title.length > 0 ? d.title : null);
        setError(null);
      })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [cat]);

  const grouped = items.reduce<Record<string, ArticleItem[]>>((acc, a) => {
    const key = a.subTopic ?? 'General';
    (acc[key] ||= []).push(a);
    return acc;
  }, {});
  const sections = Object.entries(grouped);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
          <Text style={styles.headerTitle}>{title ?? cat}</Text>
          <Text style={styles.headerSubtitle}>{items.length} article{items.length === 1 ? '' : 's'}</Text>
        </View>
      </View>

      {loading && (
        <View style={styles.center}><ActivityIndicator color={colors.saffron[600]} /></View>
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      {!loading && !error && (
        <FlatList
          data={sections}
          keyExtractor={([k]) => k}
          contentContainerStyle={styles.list}
          renderItem={({ item: [topic, articles] }) => (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{topic}</Text>
              {articles.map((a) => (
                <TouchableOpacity
                  key={a.slug}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={a.title}
                  accessibilityHint="Opens the article"
                  onPress={() =>
                    router.push(
                      `/(devotee)/knowledge-article?category=${encodeURIComponent(cat)}&slug=${encodeURIComponent(a.slug)}`,
                    )
                  }
                  style={styles.row}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{a.title}</Text>
                    <Text style={styles.rowSummary} numberOfLines={2}>{a.summary}</Text>
                    {a.readingMinutes ? (
                      <Text style={styles.rowMeta}>{a.readingMinutes} min read</Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.stone[400]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.center}><Text style={styles.empty}>No articles available yet.</Text></View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  backBtn: { width: 44, height: 44, marginLeft: -spacing.xs, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.stone[900] },
  headerSubtitle: { fontSize: fontSize.sm, color: colors.stone[500] },
  list: { padding: spacing.md, gap: spacing.md },
  section: { marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[800], marginBottom: spacing.xs },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white, padding: spacing.md,
    borderRadius: borderRadius.lg, marginBottom: spacing.xs,
    borderWidth: 1, borderColor: colors.stone[100],
  },
  rowTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  rowSummary: { fontSize: fontSize.sm, color: colors.stone[600], marginTop: 2 },
  rowMeta: { fontSize: fontSize.xs, color: colors.stone[400], marginTop: 4 },
  center: { padding: spacing.xl, alignItems: 'center' },
  error: { padding: spacing.md, color: '#dc2626', textAlign: 'center' },
  empty: { color: colors.stone[400] },
});
