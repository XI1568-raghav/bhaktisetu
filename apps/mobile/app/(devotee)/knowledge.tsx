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

export default function KnowledgeHubScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Knowledge</Text>
        <Text style={styles.headerSubtitle}>Sanskrit, Vedas, and Sanatan Dharma</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {categories.map((c) => (
          <TouchableOpacity
            key={c.key}
            activeOpacity={0.85}
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
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.white },
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
