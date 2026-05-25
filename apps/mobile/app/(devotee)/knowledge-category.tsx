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

const labels: Record<string, string> = { sanskrit: 'Sanskrit', ved: 'Vedas', sanatan: 'Sanatan Dharma' };

export default function KnowledgeCategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const cat = (category ?? 'sanskrit') as 'sanskrit' | 'ved' | 'sanatan';
  const [items, setItems] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<{ articles: ArticleItem[] }>(`/knowledge/${cat}`)
      .then((d) => { setItems(d.articles ?? []); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [cat]);

  const grouped = items.reduce<Record<string, ArticleItem[]>>((acc, a) => {
    const key = a.subTopic ?? 'General';
    (acc[key] ||= []).push(a);
    return acc;
  }, {});
  const sections = Object.entries(grouped);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.stone[900]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{labels[cat] ?? cat}</Text>
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
                  onPress={() => router.push(`/(devotee)/knowledge-article?category=${cat}&slug=${a.slug}`)}
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
  backBtn: { padding: spacing.xs },
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
