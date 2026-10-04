import { ReactNode, useState } from 'react';
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
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { apiPost } from '../../lib/api';
import { describeOnboardProblem, type OnboardRole } from '../../lib/onboard-contract';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

export type { OnboardRole };

interface SelfOnboardResponse {
  ok?: boolean;
  leadId?: string;
  error?: string;
}

interface OnboardScreenProps {
  role: OnboardRole;
  eyebrow: string;
  title: string;
  subtitle: string;
  benefits: { title: string; body: string }[];
  ctaLabel: string;
  /**
   * Render extra fields. Receives a setter to merge values into the form state.
   * The current draft is exposed via the `extras` argument so the controlled
   * inputs can read their values back.
   */
  renderExtras?: (
    extras: Record<string, string | boolean>,
    setExtra: (key: string, value: string | boolean) => void,
  ) => ReactNode;
}

export function OnboardScreen({
  role,
  eyebrow,
  title,
  subtitle,
  benefits,
  ctaLabel,
  renderExtras,
}: OnboardScreenProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [extras, setExtrasState] = useState<Record<string, string | boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);

  function setExtra(key: string, value: string | boolean) {
    setExtrasState((prev) => ({ ...prev, [key]: value }));
  }

  const mutation = useMutation<SelfOnboardResponse, Error, void>({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        role,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        city: city.trim(),
        state: state.trim(),
      };
      for (const [key, value] of Object.entries(extras)) {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed.length > 0) payload[key] = trimmed;
        } else if (value === true) {
          payload[key] = true;
        }
      }
      return apiPost<SelfOnboardResponse>('/leads/self-onboard', payload);
    },
    onSuccess: (data) => {
      if (data?.ok) {
        setLeadId(data.leadId ?? 'submitted');
        setError(null);
      } else {
        setError(data?.error ?? 'Something went wrong. Please try again.');
      }
    },
    onError: (err) => {
      setError(err.message || 'Network error. Please try again.');
    },
  });

  function handleSubmit() {
    setError(null);
    // `required` on ExtraTextField / ExtraSelectField used to render a `*` and
    // nothing else: only the five base fields were checked, and the payload
    // builder above DROPS an empty extra rather than sending it. So a pandit
    // who left "Years of experience" blank posted a body the route's
    // discriminated union cannot parse, got a 400, and — because the old
    // `apiPost` discarded the response body — read "API error: 400". The rule
    // now lives beside the server's schema in lib/onboard-contract.
    const problem = describeOnboardProblem(
      role,
      { fullName, email, phone, city, state },
      extras,
    );
    if (problem) {
      setError(problem);
      return;
    }
    mutation.mutate();
  }

  if (leadId) {
    return (
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>Application received</Text>
          <Text style={styles.successSubtitle}>
            Welcome to Darshya, {fullName.split(' ')[0] || 'friend'}. Our team will review
            your application and reach out within 48 hours.
          </Text>
          <View style={styles.successCard}>
            <Text style={styles.successLabel}>Reference ID</Text>
            <Text style={styles.successValue}>{leadId}</Text>
          </View>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace('/' as any)}
          >
            <Text style={styles.primaryBtnText}>Back to home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const busy = mutation.isPending;

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.back} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={colors.stone[700]} />
            </TouchableOpacity>
          </View>

          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.benefitsCard}>
            {benefits.map((b) => (
              <View key={b.title} style={styles.benefitRow}>
                <View style={styles.benefitIcon}>
                  <Ionicons name="checkmark" size={16} color={colors.saffron[700]} />
                </View>
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>{b.title}</Text>
                  <Text style={styles.benefitBody}>{b.body}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.formHeading}>Apply now</Text>

          <Text style={styles.label}>Full name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.stone[400]}
            value={fullName}
            onChangeText={setFullName}
            editable={!busy}
            autoComplete="name"
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.stone[400]}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            editable={!busy}
          />

          <Text style={styles.label}>Phone *</Text>
          <TextInput
            style={styles.input}
            placeholder="+91 9XXXXXXXXX"
            placeholderTextColor={colors.stone[400]}
            keyboardType="phone-pad"
            autoComplete="tel"
            value={phone}
            onChangeText={setPhone}
            editable={!busy}
          />

          <View style={styles.row2}>
            <View style={styles.flex1}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Varanasi"
                placeholderTextColor={colors.stone[400]}
                value={city}
                onChangeText={setCity}
                editable={!busy}
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>State *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Uttar Pradesh"
                placeholderTextColor={colors.stone[400]}
                value={state}
                onChangeText={setState}
                editable={!busy}
              />
            </View>
          </View>

          {renderExtras ? renderExtras(extras, setExtra) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryBtn, busy && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryBtnText}>{ctaLabel}</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.fineprint}>
            By applying you agree to Darshya's terms. We'll be in touch within 48 hours.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface ExtraTextInputProps {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  value: string;
  onChange: (v: string) => void;
  busy?: boolean;
}

export function ExtraTextField({
  label,
  placeholder,
  required,
  keyboardType,
  value,
  onChange,
  busy,
}: ExtraTextInputProps) {
  return (
    <>
      <Text style={styles.label}>
        {label} {required ? '*' : ''}
      </Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.stone[400]}
        keyboardType={keyboardType}
        value={value}
        onChangeText={onChange}
        editable={!busy}
      />
    </>
  );
}

interface ExtraSelectProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  busy?: boolean;
}

export function ExtraSelectField({
  label,
  options,
  value,
  onChange,
  required,
  busy,
}: ExtraSelectProps) {
  return (
    <>
      <Text style={styles.label}>
        {label} {required ? '*' : ''}
      </Text>
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              disabled={busy}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onChange(opt.value)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}

interface ExtraCheckboxProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  busy?: boolean;
}

export function ExtraCheckboxField({ label, value, onChange, busy }: ExtraCheckboxProps) {
  return (
    <TouchableOpacity
      style={styles.checkboxRow}
      onPress={() => !busy && onChange(!value)}
      disabled={busy}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, value && styles.checkboxChecked]}>
        {value ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
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
  benefitsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    gap: spacing.md,
  },
  benefitRow: { flexDirection: 'row', gap: spacing.sm },
  benefitIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.saffron[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  benefitText: { flex: 1 },
  benefitTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  benefitBody: { fontSize: fontSize.sm, color: colors.stone[600], marginTop: 2, lineHeight: 18 },
  formHeading: {
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
  row2: { flexDirection: 'row', gap: spacing.sm },
  flex1: { flex: 1 },
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
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  successIcon: { marginBottom: spacing.md },
  successTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.stone[900],
  },
  successSubtitle: {
    fontSize: fontSize.base,
    color: colors.stone[600],
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  successCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.stone[200],
    alignItems: 'center',
    minWidth: 220,
  },
  successLabel: { fontSize: fontSize.xs, color: colors.stone[500], fontWeight: '600' },
  successValue: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.saffron[700],
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.stone[200],
  },
  chipSelected: {
    backgroundColor: colors.saffron[600],
    borderColor: colors.saffron[600],
  },
  chipText: { fontSize: fontSize.sm, color: colors.stone[700], fontWeight: '600' },
  chipTextSelected: { color: colors.white },
  checkboxRow: {
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
  checkboxChecked: {
    backgroundColor: colors.saffron[600],
    borderColor: colors.saffron[600],
  },
  checkboxLabel: { flex: 1, fontSize: fontSize.sm, color: colors.stone[700] },
});
