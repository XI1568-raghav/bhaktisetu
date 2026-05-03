import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDailyHoroscope } from '@poojly/api-client';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface Sign {
  id: string;
  english: string;
  hindi: string;
  symbol: string;
  range: string;
}

const SIGNS: Sign[] = [
  { id: 'aries', english: 'Aries', hindi: 'Mesh', symbol: '♈', range: 'Mar 21 - Apr 19' },
  { id: 'taurus', english: 'Taurus', hindi: 'Vrishabh', symbol: '♉', range: 'Apr 20 - May 20' },
  { id: 'gemini', english: 'Gemini', hindi: 'Mithun', symbol: '♊', range: 'May 21 - Jun 20' },
  { id: 'cancer', english: 'Cancer', hindi: 'Kark', symbol: '♋', range: 'Jun 21 - Jul 22' },
  { id: 'leo', english: 'Leo', hindi: 'Simha', symbol: '♌', range: 'Jul 23 - Aug 22' },
  { id: 'virgo', english: 'Virgo', hindi: 'Kanya', symbol: '♍', range: 'Aug 23 - Sep 22' },
  { id: 'libra', english: 'Libra', hindi: 'Tula', symbol: '♎', range: 'Sep 23 - Oct 22' },
  { id: 'scorpio', english: 'Scorpio', hindi: 'Vrishchik', symbol: '♏', range: 'Oct 23 - Nov 21' },
  { id: 'sagittarius', english: 'Sagittarius', hindi: 'Dhanu', symbol: '♐', range: 'Nov 22 - Dec 21' },
  { id: 'capricorn', english: 'Capricorn', hindi: 'Makar', symbol: '♑', range: 'Dec 22 - Jan 19' },
  { id: 'aquarius', english: 'Aquarius', hindi: 'Kumbh', symbol: '♒', range: 'Jan 20 - Feb 18' },
  { id: 'pisces', english: 'Pisces', hindi: 'Meen', symbol: '♓', range: 'Feb 19 - Mar 20' },
];

interface HoroscopeBody {
  date?: string;
  prediction?: string;
  general?: string;
  career?: string;
  love?: string;
  health?: string;
  luckyColor?: string;
  luckyNumber?: number | string;
  rating?: number;
}

export default function HoroscopeScreen() {
  const [selected, setSelected] = useState<string>('aries');
  const horoscope = useDailyHoroscope(selected);
  const result = (horoscope.data?.horoscope ?? null) as HoroscopeBody | null;
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Daily Horoscope</Text>
          <Text style={styles.subtitle}>{today}</Text>
        </View>
        <Ionicons name="star" size={26} color={colors.amber[500]} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.signsRow}>
          {SIGNS.map((s) => {
            const isActive = selected === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.signChip, isActive && styles.signChipActive]}
                onPress={() => setSelected(s.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.signSymbol, isActive && styles.signSymbolActive]}>
                  {s.symbol}
                </Text>
                <Text style={[styles.signName, isActive && styles.signNameActive]}>
                  {s.english}
                </Text>
                <Text style={[styles.signHindi, isActive && styles.signHindiActive]}>
                  {s.hindi}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.predictionCard}>
          <Text style={styles.predictionHeading}>
            {SIGNS.find((s) => s.id === selected)?.english} ({SIGNS.find((s) => s.id === selected)?.hindi})
          </Text>
          <Text style={styles.predictionRange}>
            {SIGNS.find((s) => s.id === selected)?.range}
          </Text>

          {horoscope.isLoading && !result ? (
            <ActivityIndicator color={colors.saffron[600]} style={{ marginVertical: spacing.lg }} />
          ) : result ? (
            <>
              {result.prediction || result.general ? (
                <Section title="Today's reading">
                  <Text style={styles.bodyText}>{result.prediction ?? result.general}</Text>
                </Section>
              ) : null}
              {result.career ? (
                <Section title="Career"><Text style={styles.bodyText}>{result.career}</Text></Section>
              ) : null}
              {result.love ? (
                <Section title="Love"><Text style={styles.bodyText}>{result.love}</Text></Section>
              ) : null}
              {result.health ? (
                <Section title="Health"><Text style={styles.bodyText}>{result.health}</Text></Section>
              ) : null}

              <View style={styles.metaRow}>
                {result.luckyColor ? (
                  <Chip icon="color-palette" label={`Lucky color: ${result.luckyColor}`} />
                ) : null}
                {result.luckyNumber !== undefined ? (
                  <Chip icon="dice" label={`Lucky number: ${result.luckyNumber}`} />
                ) : null}
              </View>
            </>
          ) : (
            <Text style={styles.bodyText}>
              No reading available right now. Try another sign or come back later.
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.kundliCta}
          onPress={() => router.push('/(devotee)/kundli' as never)}
          activeOpacity={0.85}
        >
          <Ionicons name="planet" size={22} color={colors.saffron[700]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.kundliTitle}>Get your free Kundli</Text>
            <Text style={styles.kundliSub}>Detailed Vedic chart with planet positions</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.saffron[700]} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Chip({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={14} color={colors.saffron[700]} />
      <Text style={styles.chipText}>{label}</Text>
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
  signsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  signChip: {
    width: '23%',
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.stone[100],
  },
  signChipActive: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[700] },
  signSymbol: { fontSize: 22, color: colors.stone[800] },
  signSymbolActive: { color: colors.white },
  signName: { fontSize: 11, color: colors.stone[800], fontWeight: '700', marginTop: 2 },
  signNameActive: { color: colors.white },
  signHindi: { fontSize: 9, color: colors.stone[500] },
  signHindiActive: { color: colors.saffron[100] },
  predictionCard: {
    backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.stone[100],
  },
  predictionHeading: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900] },
  predictionRange: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.saffron[700], marginBottom: 4 },
  bodyText: { fontSize: fontSize.sm, color: colors.stone[700], lineHeight: 20 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.saffron[50], paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.saffron[100],
  },
  chipText: { fontSize: fontSize.xs, color: colors.saffron[700], fontWeight: '600' },
  kundliCta: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.saffron[50],
    padding: spacing.md, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.saffron[200],
  },
  kundliTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  kundliSub: { fontSize: fontSize.xs, color: colors.stone[600], marginTop: 2 },
});
