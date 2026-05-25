import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { apiFetch } from '../../lib/api';

interface Gurukul {
  id: string; slug: string; name: string; description: string;
  city: string; state: string; tradition: string;
  isResidential: boolean; isOnline: boolean; acceptsMinors: boolean;
  isVerified: boolean;
}

export default function GurukulsScreen() {
  const [items, setItems] = useState<Gurukul[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'residential' | 'online' | 'minors'>('all');

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (filter === 'residential') params.set('residential', 'true');
    if (filter === 'online') params.set('online', 'true');
    if (filter === 'minors') params.set('acceptsMinors', 'true');
    setLoading(true);
    apiFetch<{ gurukuls: Gurukul[] }>(`/gurukuls?${params.toString()}`)
      .then((d) => { setItems(d.gurukuls ?? []); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [q, filter]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.stone[900]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Gurukuls</Text>
          <Text style={styles.headerSubtitle}>Traditional schools & admissions</Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.stone[400]} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search by name, tradition..."
          placeholderTextColor={colors.stone[400]}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.chips}>
        {([
          ['all', 'All'],
          ['residential', 'Residential'],
          ['online', 'Online'],
          ['minors', 'Accepts minors'],
        ] as const).map(([k, label]) => (
          <TouchableOpacity
            key={k}
            onPress={() => setFilter(k)}
            style={[styles.chip, filter === k && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === k && styles.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && <View style={styles.center}><ActivityIndicator color={colors.saffron[600]} /></View>}
      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={items}
        keyExtractor={(g) => g.id}
        contentContainerStyle={styles.list}
        renderItem={({ item: g }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push(`/(devotee)/gurukul-detail?slug=${g.slug}`)}
            style={styles.card}
          >
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle} numberOfLines={1}>{g.name}</Text>
              {g.isVerified && <Ionicons name="checkmark-circle" size={16} color={colors.green[600]} />}
            </View>
            <Text style={styles.cardTradition}>{g.tradition}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>{g.description}</Text>
            <View style={styles.cardMeta}>
              <Ionicons name="location" size={12} color={colors.stone[400]} />
              <Text style={styles.cardMetaText}>{g.city}, {g.state}</Text>
              {g.isResidential && <Text style={styles.cardTag}>Residential</Text>}
              {g.isOnline && <Text style={styles.cardTag}>Online</Text>}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No gurukuls match.</Text> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.white },
  backBtn: { padding: spacing.xs },
  headerTitle: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.stone[900] },
  headerSubtitle: { fontSize: fontSize.sm, color: colors.stone[500] },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    marginHorizontal: spacing.md, paddingHorizontal: spacing.sm,
    backgroundColor: colors.white, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.stone[200],
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: fontSize.base, color: colors.stone[900] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: spacing.md, paddingTop: spacing.sm, paddingBottom: 0 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.stone[200], backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[600] },
  chipText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.stone[700] },
  chipTextActive: { color: '#fff' },
  list: { padding: spacing.md, gap: spacing.sm },
  card: { padding: spacing.md, backgroundColor: colors.white, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.stone[100], marginBottom: spacing.xs },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[900], flex: 1 },
  cardTradition: { fontSize: fontSize.xs, fontWeight: '600', color: colors.saffron[700], marginTop: 2 },
  cardDesc: { fontSize: fontSize.sm, color: colors.stone[600], marginTop: spacing.xs },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, flexWrap: 'wrap' },
  cardMetaText: { fontSize: fontSize.xs, color: colors.stone[500] },
  cardTag: { fontSize: fontSize.xs, color: colors.stone[600], paddingHorizontal: 6, paddingVertical: 1, backgroundColor: colors.stone[100], borderRadius: 4 },
  center: { padding: spacing.xl, alignItems: 'center' },
  error: { padding: spacing.md, color: '#dc2626', textAlign: 'center' },
  empty: { padding: spacing.lg, textAlign: 'center', color: colors.stone[400] },
});
