import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFindMuhurats, type WeddingMuhurat } from '@poojly/api-client';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

export default function WeddingMuhuratScreen() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [city, setCity] = useState('');

  const find = useFindMuhurats();

  function valid(s: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
  }

  async function onFind() {
    if (!valid(fromDate)) return Alert.alert('Invalid date', 'From date must be YYYY-MM-DD.');
    if (!valid(toDate)) return Alert.alert('Invalid date', 'To date must be YYYY-MM-DD.');
    if (new Date(toDate) < new Date(fromDate)) {
      return Alert.alert('Invalid range', 'To date must be on or after From date.');
    }
    try {
      await find.mutateAsync({
        fromDate: fromDate.trim(),
        toDate: toDate.trim(),
        city: city.trim() || undefined,
      });
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Could not load muhurats.';
      Alert.alert('Failed', m);
    }
  }

  const raw = find.data;
  const muhurats: WeddingMuhurat[] = Array.isArray(raw)
    ? (raw as WeddingMuhurat[])
    : raw && typeof raw === 'object' && Array.isArray((raw as { muhurats?: WeddingMuhurat[] }).muhurats)
      ? ((raw as { muhurats: WeddingMuhurat[] }).muhurats)
      : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Wedding Muhurat</Text>
          <Text style={styles.subtitle}>Auspicious dates by Vedic tradition</Text>
        </View>
        <Ionicons name="calendar" size={26} color={colors.saffron[600]} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Date range</Text>
          <Text style={styles.cardHelp}>Pick a 30-90 day window. We will rank shubh dates.</Text>
          <Field label="From (YYYY-MM-DD)">
            <TextInput
              style={styles.input}
              value={fromDate}
              onChangeText={setFromDate}
              placeholder="2026-06-01"
              placeholderTextColor={colors.stone[400]}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
            />
          </Field>
          <Field label="To (YYYY-MM-DD)">
            <TextInput
              style={styles.input}
              value={toDate}
              onChangeText={setToDate}
              placeholder="2026-08-31"
              placeholderTextColor={colors.stone[400]}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
            />
          </Field>
          <Field label="Wedding city (optional)">
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="Jaipur, Mumbai…"
              placeholderTextColor={colors.stone[400]}
            />
          </Field>
          <TouchableOpacity
            style={[styles.findBtn, find.isPending && { opacity: 0.6 }]}
            onPress={onFind}
            disabled={find.isPending}
            activeOpacity={0.85}
          >
            {find.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color={colors.white} />
                <Text style={styles.findText}>Find auspicious dates</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {muhurats.length > 0 ? (
          <View style={styles.results}>
            <Text style={styles.resultsHeading}>Top muhurats</Text>
            {muhurats.map((m, idx) => (
              <View key={`${m.date}-${idx}`} style={styles.muhuratItem}>
                <View style={styles.muhuratLeft}>
                  <Text style={styles.muhuratDate}>{m.date}</Text>
                  {m.weekday ? <Text style={styles.muhuratDay}>{m.weekday}</Text> : null}
                </View>
                <View style={{ flex: 1 }}>
                  {m.tithi ? <Text style={styles.muhuratLine}>Tithi: {m.tithi}</Text> : null}
                  {m.nakshatra ? <Text style={styles.muhuratLine}>Nakshatra: {m.nakshatra}</Text> : null}
                  {m.yoga ? <Text style={styles.muhuratLine}>Yoga: {m.yoga}</Text> : null}
                  {m.reason ? <Text style={styles.muhuratReason}>{m.reason}</Text> : null}
                </View>
                {typeof m.score === 'number' ? (
                  <View style={[styles.scoreBadge, m.isShubh ? styles.scoreShubh : styles.scoreOk]}>
                    <Text style={styles.scoreText}>{Math.round(m.score)}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {find.isSuccess && muhurats.length === 0 ? (
          <Text style={styles.empty}>No shubh dates in this range. Try a wider window.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.stone[100],
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
  subtitle: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  content: { padding: spacing.md, paddingBottom: spacing['2xl'], gap: spacing.md },
  card: {
    backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.stone[100],
  },
  cardHeading: { fontSize: fontSize.base, fontWeight: '800', color: colors.stone[900] },
  cardHelp: { fontSize: fontSize.xs, color: colors.stone[600], marginBottom: spacing.sm, marginTop: 2 },
  label: { fontSize: fontSize.sm, color: colors.stone[700], fontWeight: '600', marginBottom: 4 },
  input: {
    backgroundColor: colors.stone[50],
    borderWidth: 1, borderColor: colors.stone[200], borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: fontSize.base, color: colors.stone[900],
  },
  findBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.saffron[600], padding: spacing.md, borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  findText: { color: colors.white, fontWeight: '800', fontSize: fontSize.base },
  results: { gap: spacing.sm },
  resultsHeading: { fontSize: fontSize.sm, fontWeight: '800', color: colors.stone[700], textTransform: 'uppercase', letterSpacing: 0.5 },
  muhuratItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white, padding: spacing.sm, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.stone[100],
  },
  muhuratLeft: { width: 78 },
  muhuratDate: { fontSize: fontSize.sm, fontWeight: '800', color: colors.saffron[700] },
  muhuratDay: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  muhuratLine: { fontSize: fontSize.xs, color: colors.stone[700] },
  muhuratReason: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2, fontStyle: 'italic' },
  scoreBadge: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreShubh: { backgroundColor: colors.green[500] },
  scoreOk: { backgroundColor: colors.amber[400] },
  scoreText: { color: colors.white, fontWeight: '800', fontSize: fontSize.sm },
  empty: { textAlign: 'center', color: colors.stone[500], padding: spacing.lg },
});
