import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

function apiBase(): string {
  const b = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
  return b.replace(/\/$/, '');
}

const TRADITIONS = ['Advaita', 'Vishishtadvaita', 'Dvaita', 'Smarta', 'Shaiva', 'Shakta', 'Vaishnava'] as const;
const MODES = ['residential', 'online', 'hybrid'] as const;

interface ProgramDraft {
  name: string;
  durationMonths: string;
  modeOfStudy: typeof MODES[number];
  ageMin: string;
  ageMax: string;
  description: string;
  feeAnnualInr: string;
}

const emptyProgram = (): ProgramDraft => ({
  name: '',
  durationMonths: '12',
  modeOfStudy: 'residential',
  ageMin: '8',
  ageMax: '18',
  description: '',
  feeAnnualInr: '',
});

export default function BecomeGurukulScreen() {
  const { isAuthenticated, session } = useAuth();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [tradition, setTradition] = useState<typeof TRADITIONS[number]>('Advaita');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isResidential, setIsResidential] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [acceptsMinors, setAcceptsMinors] = useState(true);
  const [programs, setPrograms] = useState<ProgramDraft[]>([emptyProgram()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateProgram(idx: number, patch: Partial<ProgramDraft>) {
    setPrograms((arr) => arr.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  function addProgram() {
    setPrograms((arr) => [...arr, emptyProgram()]);
  }

  function removeProgram(idx: number) {
    setPrograms((arr) => arr.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    setError(null);
    if (!isAuthenticated || !session?.accessToken) {
      setError('Please sign in to register a gurukul.');
      return;
    }
    if (!name || !slug || !description || !city || !state || !contactEmail) {
      setError('Please fill all required fields.');
      return;
    }
    if (description.trim().length < 50) {
      setError('Description must be at least 50 characters.');
      return;
    }
    if (programs.length === 0) {
      setError('Add at least one program.');
      return;
    }
    for (const p of programs) {
      if (!p.name || !p.description) {
        setError('Each program needs a name and description.');
        return;
      }
      if (p.description.trim().length < 20) {
        setError('Program description must be at least 20 characters.');
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload = {
        name,
        slug,
        description,
        city,
        state,
        country,
        tradition,
        contactEmail,
        contactPhone: contactPhone || undefined,
        websiteUrl: websiteUrl || undefined,
        isResidential,
        isOnline,
        acceptsMinors,
        programs: programs.map((p) => ({
          name: p.name,
          durationMonths: Number(p.durationMonths),
          modeOfStudy: p.modeOfStudy,
          ageMin: Number(p.ageMin),
          ageMax: Number(p.ageMax),
          description: p.description,
          feeAnnualInr: p.feeAnnualInr ? Number(p.feeAnnualInr) : null,
        })),
      };
      const res = await fetch(`${apiBase()}/api/v1/gurukuls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      Alert.alert('Submitted', 'Your gurukul is pending admin review.', [
        { text: 'OK', onPress: () => router.replace('/gurukul-portal' as any) },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting;

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.back} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={colors.stone[700]} />
            </TouchableOpacity>
          </View>

          <Text style={styles.eyebrow}>For Gurukul founders</Text>
          <Text style={styles.title}>Register your gurukul</Text>
          <Text style={styles.subtitle}>
            List your gurukul to receive admission inquiries from seekers across India and the diaspora.
          </Text>

          {!isAuthenticated && (
            <View style={styles.warnBox}>
              <Text style={styles.warnText}>Please sign in to register.</Text>
            </View>
          )}

          <Text style={styles.section}>Basic details</Text>

          <Text style={styles.label}>Gurukul name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Sampurnanand Sanskrit Vidyalaya"
            placeholderTextColor={colors.stone[400]}
            value={name}
            onChangeText={setName}
            editable={!busy}
          />

          <Text style={styles.label}>URL slug *</Text>
          <TextInput
            style={styles.input}
            placeholder="my-gurukul-varanasi"
            placeholderTextColor={colors.stone[400]}
            value={slug}
            onChangeText={(v) => setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            autoCapitalize="none"
            editable={!busy}
          />

          <Text style={styles.label}>Description * (50-4000 chars)</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={4000}
            editable={!busy}
          />

          <View style={styles.row2}>
            <View style={styles.flex1}>
              <Text style={styles.label}>City *</Text>
              <TextInput style={styles.input} value={city} onChangeText={setCity} editable={!busy} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>State *</Text>
              <TextInput style={styles.input} value={state} onChangeText={setState} editable={!busy} />
            </View>
          </View>

          <Text style={styles.label}>Country</Text>
          <TextInput style={styles.input} value={country} onChangeText={setCountry} editable={!busy} />

          <Text style={styles.label}>Tradition</Text>
          <View style={styles.chipRow}>
            {TRADITIONS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, tradition === t && styles.chipSelected]}
                onPress={() => setTradition(t)}
                disabled={busy}
              >
                <Text style={[styles.chipText, tradition === t && styles.chipTextSelected]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.section}>Contact</Text>

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={contactEmail}
            onChangeText={setContactEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!busy}
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={contactPhone}
            onChangeText={setContactPhone}
            keyboardType="phone-pad"
            editable={!busy}
          />

          <Text style={styles.label}>Website</Text>
          <TextInput
            style={styles.input}
            placeholder="https://..."
            placeholderTextColor={colors.stone[400]}
            value={websiteUrl}
            onChangeText={setWebsiteUrl}
            autoCapitalize="none"
            keyboardType="url"
            editable={!busy}
          />

          <Text style={styles.section}>Mode</Text>

          <CheckRow label="Residential" value={isResidential} onChange={setIsResidential} busy={busy} />
          <CheckRow label="Online" value={isOnline} onChange={setIsOnline} busy={busy} />
          <CheckRow label="Accepts minors" value={acceptsMinors} onChange={setAcceptsMinors} busy={busy} />

          <View style={styles.programHeader}>
            <Text style={styles.section}>Programs</Text>
            <TouchableOpacity onPress={addProgram} disabled={busy}>
              <Text style={styles.addLink}>+ Add program</Text>
            </TouchableOpacity>
          </View>

          {programs.map((p, idx) => (
            <View key={idx} style={styles.programCard}>
              <View style={styles.programHeader}>
                <Text style={styles.programIdx}>Program {idx + 1}</Text>
                {programs.length > 1 && (
                  <TouchableOpacity onPress={() => removeProgram(idx)} disabled={busy}>
                    <Ionicons name="trash-outline" size={18} color="#9a2a0a" />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.label}>Program name *</Text>
              <TextInput
                style={styles.input}
                value={p.name}
                onChangeText={(v) => updateProgram(idx, { name: v })}
                editable={!busy}
              />

              <View style={styles.row2}>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Duration (months) *</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={p.durationMonths}
                    onChangeText={(v) => updateProgram(idx, { durationMonths: v })}
                    editable={!busy}
                  />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Annual fee (INR)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={p.feeAnnualInr}
                    onChangeText={(v) => updateProgram(idx, { feeAnnualInr: v })}
                    editable={!busy}
                  />
                </View>
              </View>

              <Text style={styles.label}>Mode</Text>
              <View style={styles.chipRow}>
                {MODES.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.chip, p.modeOfStudy === m && styles.chipSelected]}
                    onPress={() => updateProgram(idx, { modeOfStudy: m })}
                    disabled={busy}
                  >
                    <Text style={[styles.chipText, p.modeOfStudy === m && styles.chipTextSelected]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.row2}>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Age min *</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={p.ageMin}
                    onChangeText={(v) => updateProgram(idx, { ageMin: v })}
                    editable={!busy}
                  />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Age max *</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={p.ageMax}
                    onChangeText={(v) => updateProgram(idx, { ageMax: v })}
                    editable={!busy}
                  />
                </View>
              </View>

              <Text style={styles.label}>Description * (20-2000 chars)</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={p.description}
                onChangeText={(v) => updateProgram(idx, { description: v })}
                multiline
                numberOfLines={3}
                maxLength={2000}
                editable={!busy}
              />
            </View>
          ))}

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, (busy || !isAuthenticated) && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={busy || !isAuthenticated}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryBtnText}>Register gurukul</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.fineprint}>
            Listings go live after admin review. You'll be notified via email.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CheckRow({
  label,
  value,
  onChange,
  busy,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  busy?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.checkRow}
      onPress={() => !busy && onChange(!value)}
      disabled={busy}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, value && styles.checkboxOn]}>
        {value ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.saffron[50] },
  scroll: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  back: { width: 40, height: 40, justifyContent: 'center' },
  eyebrow: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.saffron[700],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: '800',
    color: colors.stone[900],
    marginTop: spacing.xs,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.stone[600],
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  warnBox: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
  },
  warnText: { color: '#92400e', fontSize: fontSize.sm },
  section: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.stone[900],
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.stone[700],
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.stone[900],
    borderWidth: 1,
    borderColor: colors.stone[200],
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  row2: { flexDirection: 'row', gap: spacing.sm },
  flex1: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.stone[200],
  },
  chipSelected: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[600] },
  chipText: { fontSize: fontSize.sm, color: colors.stone[700], fontWeight: '600' },
  chipTextSelected: { color: colors.white },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.stone[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[600] },
  checkLabel: { flex: 1, fontSize: fontSize.sm, color: colors.stone[700] },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  addLink: {
    color: colors.saffron[700],
    fontWeight: '700',
    fontSize: fontSize.sm,
  },
  programCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[200],
    padding: spacing.md,
    marginTop: spacing.md,
  },
  programIdx: { fontSize: fontSize.sm, fontWeight: '700', color: colors.stone[700] },
  primaryBtn: {
    backgroundColor: colors.saffron[600],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '700' },
  errorBox: {
    backgroundColor: '#fde6df',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
  },
  errorText: { color: '#9a2a0a', fontSize: fontSize.sm },
  fineprint: {
    marginTop: spacing.md,
    fontSize: fontSize.xs,
    color: colors.stone[500],
    textAlign: 'center',
  },
});
