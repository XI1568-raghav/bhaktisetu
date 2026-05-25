import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { useAuth } from '../../lib/auth-context';

interface Lesson {
  id: string;
  title: string;
  subtitle?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  minutes: number;
}

interface ProgressResponse {
  lessons: { lessonId: string; score: number; completedAt: string }[];
  streak: { currentDays: number; longestDays: number } | null;
  badges: { id: string; awardedAt: string }[];
}

const STATIC_CATALOG: Lesson[] = [
  { id: 'l01-devanagari-vowels', title: 'Devanagari Vowels (स्वराः)', subtitle: '14 vowel sounds', level: 'beginner', minutes: 8 },
  { id: 'l02-devanagari-consonants', title: 'Devanagari Consonants', subtitle: '33 consonants in 5 vargas', level: 'beginner', minutes: 10 },
  { id: 'l03-namaste', title: 'Your first word: नमस्ते', subtitle: 'Etymology of namaste', level: 'beginner', minutes: 5 },
];

function apiBase(): string {
  const b = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
  return b.replace(/\/$/, '');
}

export default function LearnSanskritScreen() {
  const { session } = useAuth();
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.accessToken) { setLoading(false); return; }
    fetch(`${apiBase()}/api/v1/lessons`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(setProgress)
      .catch(() => setProgress({ lessons: [], streak: null, badges: [] }))
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

  const completed = new Set(progress?.lessons.map((l) => l.lessonId) ?? []);
  const grouped: Record<Lesson['level'], Lesson[]> = { beginner: [], intermediate: [], advanced: [] };
  STATIC_CATALOG.forEach((l) => { grouped[l.level].push(l); });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.stone[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Learn Sanskrit</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {progress?.streak && progress.streak.currentDays > 0 && (
          <View style={styles.streakBox}>
            <Ionicons name="flame" size={24} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.streakDays}>{progress.streak.currentDays} day streak</Text>
              <Text style={styles.streakSub}>Longest: {progress.streak.longestDays} days</Text>
            </View>
          </View>
        )}

        {loading && <ActivityIndicator color={colors.saffron[600]} style={{ marginTop: spacing.lg }} />}

        {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
          grouped[level].length > 0 ? (
            <View key={level} style={styles.section}>
              <Text style={styles.sectionTitle}>{level.charAt(0).toUpperCase() + level.slice(1)}</Text>
              {grouped[level].map((l) => {
                const done = completed.has(l.id);
                return (
                  <TouchableOpacity
                    key={l.id}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/(devotee)/lesson?id=${l.id}`)}
                    style={[styles.lessonRow, done && styles.lessonRowDone]}
                  >
                    <View style={[styles.lessonIcon, { backgroundColor: done ? colors.green[100] : colors.saffron[100] }]}>
                      <Ionicons name={done ? 'checkmark' : 'book'} size={20} color={done ? colors.green[600] : colors.saffron[600]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lessonTitle}>{l.title}</Text>
                      {l.subtitle && <Text style={styles.lessonSubtitle}>{l.subtitle}</Text>}
                      <Text style={styles.lessonMeta}>{l.minutes} min · {done ? 'Completed' : 'Available'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.stone[400]} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null
        ))}

        {progress && progress.badges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Badges earned</Text>
            <View style={styles.badgesWrap}>
              {progress.badges.map((b) => (
                <View key={b.id} style={styles.badge}>
                  <Ionicons name="ribbon" size={16} color={colors.saffron[600]} />
                  <Text style={styles.badgeText}>{b.id}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.white },
  backBtn: { padding: spacing.xs },
  headerTitle: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.stone[900] },
  scroll: { padding: spacing.md },
  streakBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, backgroundColor: colors.saffron[600],
    borderRadius: borderRadius.lg, marginBottom: spacing.md,
  },
  streakDays: { fontSize: fontSize.lg, fontWeight: '800', color: '#fff' },
  streakSub: { fontSize: fontSize.xs, color: '#ffe9c5' },
  section: { marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[800], marginBottom: spacing.xs },
  lessonRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, backgroundColor: colors.white,
    borderRadius: borderRadius.lg, marginBottom: spacing.xs,
    borderWidth: 1, borderColor: colors.stone[100],
  },
  lessonRowDone: { backgroundColor: colors.green[50] ?? '#f0fdf4', borderColor: colors.green[200] ?? '#bbf7d0' },
  lessonIcon: { width: 40, height: 40, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  lessonTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  lessonSubtitle: { fontSize: fontSize.sm, color: colors.stone[600], marginTop: 2 },
  lessonMeta: { fontSize: fontSize.xs, color: colors.stone[400], marginTop: 4 },
  badgesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    backgroundColor: colors.saffron[50], borderRadius: borderRadius.sm,
    borderWidth: 1, borderColor: colors.saffron[200],
  },
  badgeText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.saffron[700] },
});
