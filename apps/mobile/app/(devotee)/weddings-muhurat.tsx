import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@poojly/api-client';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * Wedding muhurat finder — POST /api/v1/weddings/muhurat.
 *
 * WHAT WAS WRONG BEFORE
 * ---------------------
 * This screen called `useFindMuhurats()` (packages/api-client wave-5.ts:148),
 * whose `MuhuratInput` is `{fromDate, toDate, brideRashi?, groomRashi?, city?,
 * latitude?, longitude?}`. The route validates with `MuhuratInputSchema`
 * (apps/api/src/lib/muhurat.ts:73) which requires **brideDob, brideTob,
 * groomDob, groomTob, fromDate, toDate** and knows nothing about `city`,
 * `brideRashi` or `groomRashi`. Every submission therefore returned
 * `400 {error:'ValidationError'}` — the feature could not work once, on any
 * device, since it shipped. The screen then read `raw.muhurats`, a key the
 * route has never sent; the real reply is
 * `{bride, groom, mangalikFlag, candidates[]}` (muhurat.ts:327-348).
 *
 * So both halves of the contract were invented. This rewrite posts the shape
 * the zod schema accepts and renders the keys the handler actually returns,
 * verbatim: nakshatra, rashi, tithi, abhijitMuhurat, score, reasons, warnings.
 * The api-client hook is left alone (that package is out of this lane) and
 * simply no longer used here — `api.post` is the same client underneath, minus
 * the wrong type.
 *
 * The route is PUBLIC and rate-limited 10/min per IP (routes/weddings.ts:43),
 * so a signed-out devotee gets dates. `api.post` attaches the bearer when a
 * session exists, which is harmless and keeps a future per-user variant working.
 */

// Verbatim from apps/api/src/lib/muhurat.ts:10-16. The route validates this
// field with `z.enum(NAKSHATRA_NAMES)`, so a spelling that drifts from that
// list is a 400 — the picker must offer these exact strings or nothing.
const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu',
  'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta',
  'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati',
] as const;

interface MuhuratCandidate {
  date: string;
  weekday: string;
  nakshatra: string;
  rashi: string;
  tithi: number;
  abhijitMuhurat: { from: string; to: string };
  score: number;
  reasons: string[];
  warnings: string[];
}

interface MuhuratResponse {
  bride: { nakshatra: string; rashi: string };
  groom: { nakshatra: string; rashi: string };
  mangalikFlag: { brideMangalik: boolean; groomMangalik: boolean };
  candidates: MuhuratCandidate[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Local mirror of MuhuratInputSchema's refinements, so a devotee sees the
 * problem next to the field instead of a flattened zod dump. It never DECIDES
 * anything the server does not — the server re-validates every one of these.
 */
export function muhuratFormError(form: {
  brideDob: string;
  brideTob: string;
  groomDob: string;
  groomTob: string;
  fromDate: string;
  toDate: string;
  location: string;
}): string | null {
  if (!DATE_RE.test(form.brideDob)) return "Bride's date of birth must be YYYY-MM-DD.";
  if (!TIME_RE.test(form.brideTob)) return "Bride's time of birth must be HH:MM (24-hour).";
  if (!DATE_RE.test(form.groomDob)) return "Groom's date of birth must be YYYY-MM-DD.";
  if (!TIME_RE.test(form.groomTob)) return "Groom's time of birth must be HH:MM (24-hour).";
  if (!DATE_RE.test(form.fromDate)) return 'Window start must be YYYY-MM-DD.';
  if (!DATE_RE.test(form.toDate)) return 'Window end must be YYYY-MM-DD.';
  const from = new Date(`${form.fromDate}T00:00:00Z`).getTime();
  const to = new Date(`${form.toDate}T00:00:00Z`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 'That is not a real calendar date.';
  if (from > to) return 'The window must start on or before it ends.';
  if ((to - from) / 86_400_000 > 365) return 'The window cannot be longer than 365 days.';
  if (form.location.trim().length === 0) return 'Enter the wedding city.';
  return null;
}

/** Reads the API's own sentence out of an error, never a bare status code. */
function errorText(err: unknown): string {
  if (err && typeof err === 'object') {
    const body = (err as { body?: unknown }).body;
    if (body && typeof body === 'object') {
      const msg = (body as { message?: unknown }).message;
      if (typeof msg === 'string' && msg.length > 0) return msg;
    }
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && /\b(400|422)\b/.test(message)) {
      return 'Those birth details were not accepted. Check the dates and times and try again.';
    }
    if (typeof message === 'string' && /\b429\b/.test(message)) {
      return 'Too many requests in a minute. Wait a moment and try again.';
    }
  }
  return 'We could not reach the muhurat service. Check your connection and try again.';
}

function dateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default function WeddingMuhuratScreen() {
  const [form, setForm] = useState({
    brideDob: '',
    brideTob: '06:30',
    brideNakshatra: '',
    groomDob: '',
    groomTob: '07:00',
    groomNakshatra: '',
    fromDate: '',
    toDate: '',
    location: 'Delhi',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MuhuratResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  const validationError = useMemo(() => muhuratFormError(form), [form]);

  async function onFind() {
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // Optional nakshatra overrides are OMITTED when blank: the schema types
      // them `z.enum(...).optional()`, and '' is not a member of that enum.
      const body: Record<string, unknown> = {
        brideDob: form.brideDob,
        brideTob: form.brideTob,
        groomDob: form.groomDob,
        groomTob: form.groomTob,
        fromDate: form.fromDate,
        toDate: form.toDate,
        location: form.location.trim(),
      };
      if (form.brideNakshatra) body.brideNakshatra = form.brideNakshatra;
      if (form.groomNakshatra) body.groomNakshatra = form.groomNakshatra;

      const res = await api.post<MuhuratResponse>('/api/v1/weddings/muhurat', body);
      // An unrecognised shape yields nothing rather than a confident empty list.
      if (!res || !Array.isArray(res.candidates)) {
        setResult(null);
        setError('The muhurat service replied in a shape this app does not understand.');
        return;
      }
      setResult(res);
    } catch (err) {
      setResult(null);
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  const mangalik =
    result !== null &&
    (result.mangalikFlag?.brideMangalik === true || result.mangalikFlag?.groomMangalik === true);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
          <Text style={styles.title}>Find your muhurat</Text>
          <Text style={styles.subtitle}>Auspicious wedding dates from your nakshatras</Text>
        </View>
        <Ionicons name="calendar" size={26} color={colors.saffron[600]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            We compute the most auspicious wedding dates from your nakshatras using classical
            Vedic rules (Brihat Samhita, Muhurta Chintamani).
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardHeading}>Bride</Text>
            <Field label="Date of birth (YYYY-MM-DD)">
              <TextInput
                style={styles.input}
                value={form.brideDob}
                onChangeText={(v) => update('brideDob', v)}
                placeholder="1998-04-12"
                placeholderTextColor={colors.stone[400]}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                accessibilityLabel="Bride date of birth"
              />
            </Field>
            <Field label="Time of birth (HH:MM, 24-hour)">
              <TextInput
                style={styles.input}
                value={form.brideTob}
                onChangeText={(v) => update('brideTob', v)}
                placeholder="06:30"
                placeholderTextColor={colors.stone[400]}
                keyboardType="numbers-and-punctuation"
                accessibilityLabel="Bride time of birth"
              />
            </Field>
            <NakshatraPicker
              label="Nakshatra (optional — overrides birth details)"
              value={form.brideNakshatra}
              onChange={(v) => update('brideNakshatra', v)}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardHeading}>Groom</Text>
            <Field label="Date of birth (YYYY-MM-DD)">
              <TextInput
                style={styles.input}
                value={form.groomDob}
                onChangeText={(v) => update('groomDob', v)}
                placeholder="1996-11-03"
                placeholderTextColor={colors.stone[400]}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                accessibilityLabel="Groom date of birth"
              />
            </Field>
            <Field label="Time of birth (HH:MM, 24-hour)">
              <TextInput
                style={styles.input}
                value={form.groomTob}
                onChangeText={(v) => update('groomTob', v)}
                placeholder="07:00"
                placeholderTextColor={colors.stone[400]}
                keyboardType="numbers-and-punctuation"
                accessibilityLabel="Groom time of birth"
              />
            </Field>
            <NakshatraPicker
              label="Nakshatra (optional)"
              value={form.groomNakshatra}
              onChange={(v) => update('groomNakshatra', v)}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardHeading}>Wedding window</Text>
            <Text style={styles.cardHelp}>Up to 365 days. We rank the ten best dates in it.</Text>
            <Field label="From (YYYY-MM-DD)">
              <TextInput
                style={styles.input}
                value={form.fromDate}
                onChangeText={(v) => update('fromDate', v)}
                placeholder="2026-11-01"
                placeholderTextColor={colors.stone[400]}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                accessibilityLabel="Window start date"
              />
            </Field>
            <Field label="To (YYYY-MM-DD)">
              <TextInput
                style={styles.input}
                value={form.toDate}
                onChangeText={(v) => update('toDate', v)}
                placeholder="2027-02-28"
                placeholderTextColor={colors.stone[400]}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                accessibilityLabel="Window end date"
              />
            </Field>
            <Field label="Wedding city">
              <TextInput
                style={styles.input}
                value={form.location}
                onChangeText={(v) => update('location', v)}
                placeholder="Delhi"
                placeholderTextColor={colors.stone[400]}
                accessibilityLabel="Wedding city"
              />
            </Field>

            <TouchableOpacity
              style={[styles.findBtn, loading && styles.btnDisabled]}
              onPress={onFind}
              disabled={loading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Find auspicious dates"
            >
              {loading ? (
                <>
                  <ActivityIndicator color={colors.white} />
                  <Text style={styles.findText}>Computing…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={18} color={colors.white} />
                  <Text style={styles.findText}>Find auspicious dates</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBox} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={18} color={colors.red[600]} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {result ? (
            <>
              <View style={styles.card}>
                <Text style={styles.summaryLine}>
                  Bride nakshatra <Text style={styles.bold}>{result.bride.nakshatra}</Text> (
                  {result.bride.rashi})
                </Text>
                <Text style={styles.summaryLine}>
                  Groom nakshatra <Text style={styles.bold}>{result.groom.nakshatra}</Text> (
                  {result.groom.rashi})
                </Text>
                {mangalik ? (
                  <Text style={styles.mangalik}>
                    Mangalik flag detected — a parihara puja before vivah is recommended. Talk to a
                    Darshya astrologer for the full dosha analysis.
                  </Text>
                ) : null}
              </View>

              {result.candidates.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="calendar-outline" size={36} color={colors.stone[300]} />
                  <Text style={styles.emptyText}>
                    No dates were returned for this window. Try a wider range.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.resultsHeading}>
                    Top {result.candidates.length} muhurat
                    {result.candidates.length === 1 ? '' : 's'}
                  </Text>
                  {result.candidates.map((c) => (
                    <View key={c.date} style={styles.muhuratCard}>
                      <View style={styles.muhuratTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.muhuratDate}>{dateLabel(c.date)}</Text>
                          <Text style={styles.muhuratMeta}>
                            Nakshatra <Text style={styles.bold}>{c.nakshatra}</Text> · Rashi{' '}
                            {c.rashi} · Tithi {c.tithi}
                          </Text>
                        </View>
                        <View style={styles.scoreCol}>
                          <Text style={styles.scoreText}>{c.score}/100</Text>
                          {c.abhijitMuhurat ? (
                            <Text style={styles.abhijit}>
                              Abhijit {c.abhijitMuhurat.from}–{c.abhijitMuhurat.to}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      {Array.isArray(c.reasons) && c.reasons.length > 0
                        ? c.reasons.map((r, i) => (
                            <Text key={`r-${i}`} style={styles.reason}>
                              • {r}
                            </Text>
                          ))
                        : null}
                      {Array.isArray(c.warnings) && c.warnings.length > 0
                        ? c.warnings.map((w, i) => (
                            <Text key={`w-${i}`} style={styles.warning}>
                              ⚠ {w}
                            </Text>
                          ))
                        : null}
                    </View>
                  ))}

                  <TouchableOpacity
                    style={styles.plannerBtn}
                    onPress={() => router.push('/(devotee)/weddings' as never)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Book a wedding planner"
                  >
                    <Ionicons name="chatbubbles" size={18} color={colors.white} />
                    <Text style={styles.findText}>Book a wedding planner</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
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

/**
 * A chip row rather than a native picker: @react-native-picker/picker is not a
 * dependency of this app, and the alternative — a free-text nakshatra field —
 * puts a `z.enum` 400 one typo away.
 */
function NakshatraPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        <TouchableOpacity
          style={[styles.chip, value === '' && styles.chipActive]}
          onPress={() => onChange('')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityState={{ selected: value === '' }}
          accessibilityLabel="Compute nakshatra from birth details"
        >
          <Text style={[styles.chipText, value === '' && styles.chipTextActive]}>
            From birth
          </Text>
        </TouchableOpacity>
        {NAKSHATRAS.map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.chip, value === n && styles.chipActive]}
            onPress={() => onChange(n)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ selected: value === n }}
            accessibilityLabel={n}
          >
            <Text style={[styles.chipText, value === n && styles.chipTextActive]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
  subtitle: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  content: { padding: spacing.md, paddingBottom: spacing['2xl'], gap: spacing.md },
  intro: { fontSize: fontSize.sm, color: colors.stone[600], lineHeight: 19 },
  card: {
    backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.stone[100],
  },
  cardHeading: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900], marginBottom: spacing.sm },
  cardHelp: { fontSize: fontSize.xs, color: colors.stone[600], marginBottom: spacing.sm, marginTop: -4 },
  label: { fontSize: fontSize.sm, color: colors.stone[700], fontWeight: '600', marginBottom: 4 },
  input: {
    backgroundColor: colors.stone[50],
    borderWidth: 1, borderColor: colors.stone[200], borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    minHeight: 44,
    fontSize: fontSize.base, color: colors.stone[900],
  },
  chipRow: { gap: spacing.xs, paddingVertical: 2 },
  chip: {
    paddingHorizontal: spacing.md, minHeight: 44, justifyContent: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: colors.stone[200], backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[600] },
  chipText: { fontSize: fontSize.sm, color: colors.stone[700], fontWeight: '600' },
  chipTextActive: { color: colors.white },
  findBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.saffron[600], paddingHorizontal: spacing.md,
    minHeight: 48, borderRadius: borderRadius.md, marginTop: spacing.sm,
  },
  plannerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.saffron[700], paddingHorizontal: spacing.md,
    minHeight: 48, borderRadius: borderRadius.md, marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.6 },
  findText: { color: colors.white, fontWeight: '800', fontSize: fontSize.base },
  errorBox: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: colors.red[500],
    borderRadius: borderRadius.md, padding: spacing.md,
  },
  errorText: { flex: 1, color: colors.red[600], fontSize: fontSize.sm, lineHeight: 18 },
  emptyBox: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyText: { color: colors.stone[500], fontSize: fontSize.sm, textAlign: 'center' },
  summaryLine: { fontSize: fontSize.sm, color: colors.stone[700], marginBottom: 4 },
  bold: { fontWeight: '800', color: colors.stone[900] },
  mangalik: { fontSize: fontSize.sm, color: colors.amber[700], marginTop: spacing.xs, lineHeight: 18 },
  resultsHeading: {
    fontSize: fontSize.sm, fontWeight: '800', color: colors.stone[700],
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  muhuratCard: {
    backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.stone[100], gap: 4,
  },
  muhuratTop: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  muhuratDate: { fontSize: fontSize.lg, fontWeight: '800', color: colors.saffron[800] },
  muhuratMeta: { fontSize: fontSize.xs, color: colors.stone[700], marginTop: 2 },
  scoreCol: { alignItems: 'flex-end' },
  scoreText: { fontSize: fontSize.xl, fontWeight: '800', color: colors.saffron[700] },
  abhijit: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  reason: { fontSize: fontSize.xs, color: colors.stone[700], lineHeight: 17 },
  warning: { fontSize: fontSize.xs, color: colors.amber[700], lineHeight: 17 },
});
