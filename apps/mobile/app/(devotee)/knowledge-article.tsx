import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { apiFetch } from '../../lib/api';

interface Frontmatter {
  title: string;
  slug: string;
  subTopic?: string;
  summary: string;
  readingMinutes?: number;
  sources?: string[];
  publishedAt?: string;
}

interface ArticleData {
  frontmatter: Frontmatter;
  body: string;
}

function renderMarkdown(body: string): React.ReactNode[] {
  const lines = body.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let buf: string[] = [];
  const flush = (key: number) => {
    if (buf.length === 0) return;
    blocks.push(<Text key={`p-${key}`} style={styles.p}>{buf.join(' ')}</Text>);
    buf = [];
  };
  lines.forEach((line, i) => {
    const t = line.trim();
    if (!t) { flush(i); return; }
    if (t.startsWith('# ')) { flush(i); blocks.push(<Text key={i} style={styles.h1}>{t.slice(2)}</Text>); return; }
    if (t.startsWith('## ')) { flush(i); blocks.push(<Text key={i} style={styles.h2}>{t.slice(3)}</Text>); return; }
    if (t.startsWith('### ')) { flush(i); blocks.push(<Text key={i} style={styles.h3}>{t.slice(4)}</Text>); return; }
    if (t.startsWith('- ') || t.startsWith('* ')) {
      flush(i);
      blocks.push(<Text key={i} style={styles.li}>•  {t.slice(2)}</Text>);
      return;
    }
    if (t.startsWith('> ')) {
      flush(i);
      blocks.push(<Text key={i} style={styles.quote}>{t.slice(2)}</Text>);
      return;
    }
    buf.push(t);
  });
  flush(lines.length);
  return blocks;
}

export default function KnowledgeArticleScreen() {
  const { category, slug } = useLocalSearchParams<{ category: string; slug: string }>();
  const [data, setData] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!category || !slug) return;
    setLoading(true);
    apiFetch<ArticleData>(`/knowledge/${category}/${slug}`)
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [category, slug]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.stone[900]} />
        </TouchableOpacity>
        <Text style={styles.headerLabel} numberOfLines={1}>
          {data?.frontmatter.subTopic ?? 'Article'}
        </Text>
      </View>

      {loading && <View style={styles.center}><ActivityIndicator color={colors.saffron[600]} /></View>}
      {error && <Text style={styles.error}>{error}</Text>}

      {data && (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>{data.frontmatter.title}</Text>
          <Text style={styles.summary}>{data.frontmatter.summary}</Text>
          {data.frontmatter.readingMinutes ? (
            <Text style={styles.meta}>{data.frontmatter.readingMinutes} min read</Text>
          ) : null}

          <View style={styles.body}>{renderMarkdown(data.body)}</View>

          {data.frontmatter.sources && data.frontmatter.sources.length > 0 && (
            <View style={styles.sourcesBox}>
              <Text style={styles.sourcesTitle}>Sources</Text>
              {data.frontmatter.sources.map((s, i) => (
                <Text key={i} style={styles.source}>• {s}</Text>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.stone[100],
  },
  backBtn: { width: 44, height: 44, marginLeft: -spacing.xs, alignItems: 'center', justifyContent: 'center' },
  headerLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.saffron[700], textTransform: 'uppercase' },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: fontSize['3xl'], fontWeight: '800', color: colors.stone[900] },
  summary: { fontSize: fontSize.base, color: colors.stone[600], marginTop: spacing.xs },
  meta: { fontSize: fontSize.xs, color: colors.stone[400], marginTop: spacing.xs },
  body: { marginTop: spacing.lg, gap: spacing.sm },
  h1: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.stone[900], marginTop: spacing.md },
  h2: { fontSize: fontSize.xl, fontWeight: '700', color: colors.stone[900], marginTop: spacing.md, marginBottom: spacing.xs },
  h3: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[800], marginTop: spacing.sm },
  p: { fontSize: fontSize.base, color: colors.stone[700], lineHeight: 24 },
  li: { fontSize: fontSize.base, color: colors.stone[700], marginLeft: spacing.sm, lineHeight: 22 },
  quote: { fontSize: fontSize.base, color: colors.stone[600], fontStyle: 'italic', borderLeftWidth: 3, borderLeftColor: colors.saffron[400], paddingLeft: spacing.sm },
  sourcesBox: { marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.white, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.stone[100] },
  sourcesTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.stone[800], marginBottom: spacing.xs },
  source: { fontSize: fontSize.xs, color: colors.stone[600], marginTop: 2 },
  center: { padding: spacing.xl, alignItems: 'center' },
  error: { padding: spacing.md, color: '#dc2626', textAlign: 'center' },
});
