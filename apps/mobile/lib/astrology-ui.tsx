import React from 'react';
import {
 View,
 Text,
 StyleSheet,
 TouchableOpacity,
 ScrollView,
 type StyleProp,
 type ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from './theme';

/**
 * The pieces every Vedic-calculator screen needs, written once.
 *
 * Five screens landed together (kundli-milan, numerology, nakshatra-finder,
 * manglik, rahu-kalam) and each needs the same header, the same labelled
 * field, the same chip picker and the same result row. Copying them five times
 * is how touch targets and spacing drift apart between screens that are
 * supposed to look like one feature.
 *
 * Every tappable thing here is at least 44x44.
 */

export const HIT_MIN = 44;

export function ToolHeader({
 title,
 subtitle,
 icon,
}: {
 title: string;
 subtitle: string;
 icon: React.ComponentProps<typeof Ionicons>['name'];
}) {
 return (
  <View style={styles.header}>
   <TouchableOpacity
    onPress={() => router.back()}
    style={styles.backBtn}
    accessibilityRole="button"
    accessibilityLabel="Go back"
   >
    <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
   </TouchableOpacity>
   <View style={{ flex: 1 }}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
   </View>
   <Ionicons name={icon} size={26} color={colors.saffron[600]} />
  </View>
 );
}

export function Card({
 children,
 style,
}: {
 children: React.ReactNode;
 style?: StyleProp<ViewStyle>;
}) {
 return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
 return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Field({
 label,
 hint,
 children,
}: {
 label: string;
 hint?: string;
 children: React.ReactNode;
}) {
 return (
  <View style={{ marginBottom: spacing.md }}>
   <Text style={styles.label}>{label}</Text>
   {children}
   {hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>
 );
}

/** A single-select row of chips. Horizontal scroll when `scroll` is set. */
export function ChipRow<T extends string | number>({
 options,
 value,
 onChange,
 scroll = false,
 label,
}: {
 options: Array<{ value: T; label: string }>;
 value: T;
 onChange: (v: T) => void;
 scroll?: boolean;
 label: string;
}) {
 const chips = options.map((o) => (
  <TouchableOpacity
   key={String(o.value)}
   style={[styles.chip, o.value === value ? styles.chipOn : null]}
   activeOpacity={0.8}
   accessibilityRole="button"
   accessibilityState={{ selected: o.value === value }}
   accessibilityLabel={`${label}: ${o.label}`}
   onPress={() => onChange(o.value)}
  >
   <Text style={[styles.chipText, o.value === value ? styles.chipTextOn : null]}>
    {o.label}
   </Text>
  </TouchableOpacity>
 ));

 if (scroll) {
  return (
   <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.chipStrip}
   >
    {chips}
   </ScrollView>
  );
 }
 return <View style={styles.chipWrap}>{chips}</View>;
}

export function ResultRow({
 label,
 value,
 emphasis,
}: {
 label: string;
 value: string;
 emphasis?: boolean;
}) {
 return (
  <View style={styles.resultRow}>
   <Text style={styles.resultLabel}>{label}</Text>
   <Text style={[styles.resultValue, emphasis ? styles.resultValueStrong : null]}>{value}</Text>
  </View>
 );
}

export function Bullets({ items }: { items: string[] }) {
 return (
  <View style={{ gap: 6 }}>
   {items.map((t, i) => (
    <View key={`b-${i}`} style={styles.bulletRow}>
     <Text style={styles.bulletDot}>•</Text>
     <Text style={styles.bulletText}>{t}</Text>
    </View>
   ))}
  </View>
 );
}

export function Notice({ tone, children }: { tone: 'info' | 'warn'; children: React.ReactNode }) {
 return (
  <View style={[styles.notice, tone === 'warn' ? styles.noticeWarn : styles.noticeInfo]}>
   <Text style={[styles.noticeText, tone === 'warn' ? styles.noticeTextWarn : null]}>
    {children}
   </Text>
  </View>
 );
}

export function Disclaimer({ children }: { children: React.ReactNode }) {
 return <Text style={styles.disclaimer}>{children}</Text>;
}

const styles = StyleSheet.create({
 header: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.sm,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.white,
  borderBottomWidth: 1,
  borderBottomColor: colors.stone[100],
 },
 backBtn: {
  width: HIT_MIN,
  height: HIT_MIN,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: borderRadius.md,
 },
 title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
 subtitle: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },

 card: {
  backgroundColor: colors.white,
  padding: spacing.md,
  borderRadius: borderRadius.lg,
  borderWidth: 1,
  borderColor: colors.stone[100],
 },
 sectionTitle: {
  fontSize: fontSize.base,
  fontWeight: '800',
  color: colors.stone[900],
  marginBottom: spacing.xs,
 },
 label: { fontSize: fontSize.sm, color: colors.stone[700], fontWeight: '700', marginBottom: 6 },
 hint: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 4, lineHeight: 16 },

 chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
 chipStrip: { gap: spacing.xs, paddingRight: spacing.md },
 chip: {
  minHeight: HIT_MIN,
  justifyContent: 'center',
  paddingHorizontal: spacing.md,
  marginRight: spacing.xs,
  marginBottom: spacing.xs,
  borderRadius: borderRadius.full,
  borderWidth: 1,
  borderColor: colors.stone[200],
  backgroundColor: colors.white,
 },
 chipOn: { borderColor: colors.saffron[500], backgroundColor: colors.saffron[50] },
 chipText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.stone[600] },
 chipTextOn: { color: colors.saffron[700], fontWeight: '800' },

 resultRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: spacing.sm,
  paddingVertical: spacing.xs,
  borderBottomWidth: 1,
  borderBottomColor: colors.stone[100],
 },
 resultLabel: { flexShrink: 1, fontSize: fontSize.sm, color: colors.stone[600] },
 resultValue: {
  flexShrink: 1,
  textAlign: 'right',
  fontSize: fontSize.sm,
  color: colors.stone[900],
  fontWeight: '700',
 },
 resultValueStrong: { color: colors.saffron[700], fontWeight: '800' },

 bulletRow: { flexDirection: 'row', gap: spacing.xs },
 bulletDot: { fontSize: fontSize.sm, color: colors.saffron[600], lineHeight: 20 },
 bulletText: { flex: 1, fontSize: fontSize.sm, color: colors.stone[700], lineHeight: 20 },

 notice: {
  borderRadius: borderRadius.md,
  padding: spacing.sm,
  borderWidth: 1,
 },
 noticeInfo: { backgroundColor: colors.stone[50], borderColor: colors.stone[200] },
 noticeWarn: { backgroundColor: colors.amber[50], borderColor: colors.amber[200] },
 noticeText: { fontSize: fontSize.sm, color: colors.stone[700], lineHeight: 20 },
 noticeTextWarn: { color: colors.amber[800] },

 disclaimer: {
  fontSize: fontSize.xs,
  color: colors.stone[500],
  fontStyle: 'italic',
  lineHeight: 18,
 },
});

export const toolStyles = StyleSheet.create({
 screen: { flex: 1, backgroundColor: colors.stone[50] },
 content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] },
 input: {
  minHeight: HIT_MIN,
  backgroundColor: colors.stone[50],
  borderWidth: 1,
  borderColor: colors.stone[200],
  borderRadius: borderRadius.md,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  fontSize: fontSize.base,
  color: colors.stone[900],
 },
 submitBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: spacing.xs,
  minHeight: 48,
  backgroundColor: colors.saffron[600],
  borderRadius: borderRadius.md,
  paddingVertical: spacing.md,
 },
 submitBtnOff: { backgroundColor: colors.stone[300] },
 submitText: { color: colors.white, fontWeight: '800', fontSize: fontSize.base },
});
