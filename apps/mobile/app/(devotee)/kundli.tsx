import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGenerateKundli } from '@poojly/api-client';
import { selectKundli, type KundliChart } from '../../lib/kundli-chart';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * Free kundli — `POST /api/v1/astrology/kundli` -> `{ kundli }`.
 *
 * THE BUG THIS SCREEN CARRIED
 * ---------------------------
 * It declared a local `KundliResult` whose every field but `signature` was
 * invented — `ascendant`, `moonSign`, `planets`, `summary` are keys the route
 * has never sent (it sends `lagna`, `rashi`, `planetaryPositions`,
 * `interpretation`). Three of the names it guessed at — `sunSign`,
 * `nakshatra`, `dasha` — DO exist and are OBJECTS, and each was passed
 * straight into `<Text>{value}</Text>`. React Native throws "Objects are not
 * valid as a React child" on that, so a healthy 200 crashed the screen on the
 * SUCCESS path. `unknown` + `selectKundli` (lib/kundli-chart.ts) is what stops
 * the compiler agreeing with a guess: the reader is pinned to the route's
 * `KundliPayload` and unit-tested, because vitest here renders no React Native
 * and cannot see a shape assumption that lives in a .tsx file.
 *
 * Nothing on this screen is derived. `degree` is printed as the string the
 * server formatted; `ayanamsa` and the dasha years are printed as sent.
 */
export default function KundliScreen() {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [tob, setTob] = useState('');
  const [location, setLocation] = useState('');
  const generate = useGenerateKundli();

  function isValidDate(s: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
  }
  function isValidTime(s: string) {
    return /^\d{2}:\d{2}$/.test(s.trim());
  }

  async function onSubmit() {
    if (!isValidDate(dob)) {
      Alert.alert('Invalid date', 'Birth date must be YYYY-MM-DD.');
      return;
    }
    if (!isValidTime(tob)) {
      Alert.alert('Invalid time', 'Birth time must be HH:MM (24-hour).');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Missing location', 'Enter birth city or place.');
      return;
    }
    try {
      await generate.mutateAsync({
        dob: dob.trim(),
        tob: tob.trim(),
        location: location.trim(),
        name: name.trim() || undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not generate kundli.';
      Alert.alert('Failed', message);
    }
  }

  const result: KundliChart | null = selectKundli(generate.data);
  // A 2xx whose body this app cannot read is a failure, not an empty chart.
  const unreadable = generate.isSuccess && result === null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Free Kundli</Text>
          <Text style={styles.subtitle}>Vedic birth chart in seconds</Text>
        </View>
        <Ionicons name="planet" size={26} color={colors.saffron[600]} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <FormField label="Full name (optional)">
            <TextInput
              style={styles.input}
              placeholder="Arjun Sharma"
              placeholderTextColor={colors.stone[400]}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </FormField>
          <FormField label="Birth date (YYYY-MM-DD)">
            <TextInput
              style={styles.input}
              placeholder="1995-08-21"
              placeholderTextColor={colors.stone[400]}
              value={dob}
              onChangeText={setDob}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </FormField>
          <FormField label="Birth time (HH:MM, 24-hour)">
            <TextInput
              style={styles.input}
              placeholder="14:32"
              placeholderTextColor={colors.stone[400]}
              value={tob}
              onChangeText={setTob}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </FormField>
          <FormField label="Birth place (city, country)">
            <TextInput
              style={styles.input}
              placeholder="Varanasi, India"
              placeholderTextColor={colors.stone[400]}
              value={location}
              onChangeText={setLocation}
            />
          </FormField>

          <TouchableOpacity
            style={[styles.submitBtn, generate.isPending && { opacity: 0.6 }]}
            onPress={onSubmit}
            disabled={generate.isPending}
            activeOpacity={0.85}
          >
            {generate.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color={colors.white} />
                <Text style={styles.submitText}>Generate Kundli</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {unreadable ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultHeading}>Chart unavailable</Text>
            <Text style={styles.resultSummary}>
              The astrology service replied in a shape this app does not understand. Nothing was
              charged. Please try again.
            </Text>
          </View>
        ) : null}

        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultHeading}>
              {result.name ? `${result.name}'s birth chart` : 'Your birth chart'}
            </Text>
            {result.dob ? (
              <Text style={styles.resultSummary}>
                {result.dob}
                {result.tob ? ` · ${result.tob}` : ''}
                {result.location ? ` · ${result.location}` : ''}
              </Text>
            ) : null}
            {result.warning ? <Text style={styles.warning}>{result.warning}</Text> : null}

            <View style={styles.resultGrid}>
              {result.lagna ? <ResultRow label="Lagna (Ascendant)" value={result.lagna} /> : null}
              {result.rashi ? (
                <ResultRow
                  label="Rashi (Moon sign)"
                  value={result.rashiLord ? `${result.rashi} · lord ${result.rashiLord}` : result.rashi}
                />
              ) : null}
              {result.sunSign ? <ResultRow label="Sun sign" value={result.sunSign} /> : null}
              {result.nakshatra ? (
                <ResultRow
                  label="Nakshatra"
                  value={
                    result.nakshatraPada !== null
                      ? `${result.nakshatra} · pada ${result.nakshatraPada}`
                      : result.nakshatra
                  }
                />
              ) : null}
              {result.currentDasha ? (
                <ResultRow
                  label="Current Dasha"
                  value={
                    result.currentDasha.endDate
                      ? `${result.currentDasha.planet} · to ${result.currentDasha.endDate}`
                      : result.currentDasha.planet
                  }
                />
              ) : null}
              {result.ayanamsa !== null ? (
                <ResultRow label="Ayanamsa" value={`${result.ayanamsa}°`} />
              ) : null}
            </View>

            {result.planets.length > 0 ? (
              <View style={styles.planetsSection}>
                <Text style={styles.planetsHeading}>Planetary positions</Text>
                {result.planets.map((p, idx) => (
                  <View key={`${p.planet}-${idx}`} style={styles.planetRow}>
                    <Text style={styles.planetName}>{p.planet}</Text>
                    <Text style={styles.planetMeta}>
                      {p.sign ?? ''}
                      {p.house !== null ? ` • H${p.house}` : ''}
                      {p.degree !== null ? ` • ${p.degree}°` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {result.interpretation.length > 0 ? (
              <View style={styles.planetsSection}>
                <Text style={styles.planetsHeading}>Reading</Text>
                {result.interpretation.map((para, idx) => (
                  <Text key={`i-${idx}`} style={styles.interpretation}>
                    {para}
                  </Text>
                ))}
              </View>
            ) : null}

            <Text style={styles.disclaimer}>
              Kundli computed using Lahiri ayanamsa. For deep-dive consultation, book an
              astrologer in the Astrology tab.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultValue}>{value}</Text>
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
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] },
  card: {
    backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.stone[100],
  },
  label: { fontSize: fontSize.sm, color: colors.stone[700], fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: colors.stone[50],
    borderWidth: 1, borderColor: colors.stone[200],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: fontSize.base, color: colors.stone[900],
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.saffron[600], borderRadius: borderRadius.md,
    paddingVertical: spacing.md, marginTop: spacing.sm,
  },
  submitText: { color: colors.white, fontWeight: '800', fontSize: fontSize.base },
  resultCard: {
    backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.saffron[200],
  },
  resultHeading: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900] },
  resultSummary: { fontSize: fontSize.sm, color: colors.stone[600], marginTop: spacing.xs, lineHeight: 20 },
  warning: {
    fontSize: fontSize.xs, color: colors.amber[700],
    backgroundColor: colors.amber[50],
    borderRadius: borderRadius.sm, padding: spacing.xs, marginTop: spacing.xs, lineHeight: 18,
  },
  interpretation: {
    fontSize: fontSize.sm, color: colors.stone[700], lineHeight: 22, marginBottom: spacing.xs,
  },
  resultGrid: { marginTop: spacing.sm },
  resultRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1, borderBottomColor: colors.stone[100],
  },
  resultLabel: { fontSize: fontSize.sm, color: colors.stone[600] },
  resultValue: { fontSize: fontSize.sm, color: colors.stone[900], fontWeight: '700' },
  planetsSection: { marginTop: spacing.md },
  planetsHeading: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900], marginBottom: spacing.xs },
  planetRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 4,
  },
  planetName: { fontSize: fontSize.sm, color: colors.stone[800], fontWeight: '600' },
  planetMeta: { fontSize: fontSize.xs, color: colors.stone[600] },
  disclaimer: {
    fontSize: fontSize.xs, color: colors.stone[500], marginTop: spacing.md,
    fontStyle: 'italic',
  },
});
