import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { apiFetch } from '../../lib/api';

interface Program {
  id: string; name: string; durationMonths: number; modeOfStudy: string;
  ageMin: number; ageMax: number; description: string; feeAnnualInr: number | null;
}

interface GurukulDetail {
  id: string; slug: string; name: string; description: string;
  city: string; state: string; country: string;
  websiteUrl: string | null; contactEmail: string;
  contactPhone: string | null;
  tradition: string; isResidential: boolean; isOnline: boolean;
  acceptsMinors: boolean; isVerified: boolean;
  programs: Program[];
}

export default function GurukulDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [g, setG] = useState<GurukulDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    apiFetch<GurukulDetail>(`/gurukuls/${encodeURIComponent(slug)}`)
      .then((d) => { setG(d); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.stone[900]} />
        </TouchableOpacity>
        <Text style={styles.headerLabel} numberOfLines={1}>{g?.tradition ?? 'Gurukul'}</Text>
      </View>

      {loading && <View style={styles.center}><ActivityIndicator color={colors.saffron[600]} /></View>}
      {error && <Text style={styles.error}>{error}</Text>}

      {g && (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{g.name}</Text>
            {g.isVerified && <Ionicons name="checkmark-circle" size={20} color={colors.green[600]} />}
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="location" size={14} color={colors.stone[500]} />
            <Text style={styles.metaText}>{g.city}, {g.state}</Text>
          </View>
          <View style={styles.tagRow}>
            {g.isResidential && <Text style={styles.tag}>Residential</Text>}
            {g.isOnline && <Text style={styles.tag}>Online</Text>}
            {g.acceptsMinors && <Text style={styles.tag}>Minors welcome</Text>}
          </View>

          <Text style={styles.description}>{g.description}</Text>

          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.contactBox}>
            <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`mailto:${g.contactEmail}`)}>
              <Ionicons name="mail" size={16} color={colors.saffron[600]} />
              <Text style={styles.contactText}>{g.contactEmail}</Text>
            </TouchableOpacity>
            {g.contactPhone && (
              <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`tel:${g.contactPhone}`)}>
                <Ionicons name="call" size={16} color={colors.saffron[600]} />
                <Text style={styles.contactText}>{g.contactPhone}</Text>
              </TouchableOpacity>
            )}
            {g.websiteUrl && (
              <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(g.websiteUrl!)}>
                <Ionicons name="globe" size={16} color={colors.saffron[600]} />
                <Text style={styles.contactText}>Website</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.sectionTitle}>Programs</Text>
          {g.programs.length === 0 && <Text style={styles.empty}>No programs listed yet.</Text>}
          {g.programs.map((p) => (
            <View key={p.id} style={styles.programCard}>
              <View style={styles.programHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.programName}>{p.name}</Text>
                  <Text style={styles.programMeta}>
                    {p.durationMonths} months · {p.modeOfStudy} · Age {p.ageMin}-{p.ageMax}
                    {p.feeAnnualInr ? ` · ₹${p.feeAnnualInr.toLocaleString('en-IN')}/yr` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={() => router.push(`/(devotee)/gurukul-apply?programId=${p.id}`)}
                >
                  <Text style={styles.applyBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.programDesc}>{p.description}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.stone[100] },
  backBtn: { padding: spacing.xs },
  headerLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.saffron[700], textTransform: 'uppercase' },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.stone[900], flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  metaText: { fontSize: fontSize.sm, color: colors.stone[500] },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.xs },
  tag: { fontSize: fontSize.xs, color: colors.stone[600], paddingHorizontal: 8, paddingVertical: 2, backgroundColor: colors.stone[100], borderRadius: 4 },
  description: { fontSize: fontSize.base, color: colors.stone[700], marginTop: spacing.md, lineHeight: 22 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[800], marginTop: spacing.lg, marginBottom: spacing.xs },
  contactBox: { backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.stone[100], gap: spacing.sm },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  contactText: { fontSize: fontSize.sm, color: colors.stone[700] },
  programCard: { backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.stone[100], marginBottom: spacing.sm },
  programHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.xs },
  programName: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  programMeta: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  applyBtn: { paddingHorizontal: spacing.md, paddingVertical: 8, backgroundColor: colors.saffron[600], borderRadius: borderRadius.md },
  applyBtnText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '700' },
  programDesc: { fontSize: fontSize.sm, color: colors.stone[600], lineHeight: 20 },
  center: { padding: spacing.xl, alignItems: 'center' },
  error: { padding: spacing.md, color: '#dc2626', textAlign: 'center' },
  empty: { fontSize: fontSize.sm, color: colors.stone[400], padding: spacing.sm },
});
