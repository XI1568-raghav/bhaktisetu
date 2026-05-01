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
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { apiFetch, apiPost } from '../../lib/api';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface WaitlistResponse {
  referralCode?: string;
  error?: string;
}

interface WaitlistStats {
  rank: number;
  total: number;
  referralCount: number;
}

interface SuccessState {
  referralCode: string;
  stats: WaitlistStats | null;
}

export default function WaitlistScreen() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [panchangOptIn, setPanchangOptIn] = useState(true);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  const mutation = useMutation<WaitlistResponse, Error, void>({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        email: email.trim(),
        source: 'mobile_waitlist_screen',
        panchangOptIn,
        whatsappOptIn,
      };
      const trimmedName = fullName.trim();
      if (trimmedName) payload.fullName = trimmedName;
      const trimmedPhone = phone.trim();
      if (trimmedPhone) payload.phone = trimmedPhone;
      const trimmedCity = city.trim();
      if (trimmedCity) payload.city = trimmedCity;
      return apiPost<WaitlistResponse>('/waitlist', payload);
    },
    onSuccess: async (data) => {
      if (!data?.referralCode) {
        setError(data?.error ?? 'Unexpected response from server.');
        return;
      }
      const code = data.referralCode;
      let stats: WaitlistStats | null = null;
      try {
        stats = await apiFetch<WaitlistStats>(
          `/waitlist/stats?code=${encodeURIComponent(code)}`,
        );
      } catch {
        stats = null;
      }
      setSuccess({ referralCode: code, stats });
      setError(null);
    },
    onError: (err) => {
      setError(err.message || 'Network error. Please try again.');
    },
  });

  function handleSubmit() {
    setError(null);
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    mutation.mutate();
  }

  if (success) {
    const { referralCode, stats } = success;
    return (
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.successHero}>
            <View style={styles.successIcon}>
              <Ionicons name="sparkles" size={48} color={colors.saffron[600]} />
            </View>
            <Text style={styles.successTitle}>You're on the list</Text>
            <Text style={styles.successSubtitle}>
              Welcome to Darshya. We'll email when early access opens.
            </Text>
          </View>

          {stats ? (
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>#{stats.rank}</Text>
                <Text style={styles.statLabel}>Your spot</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total.toLocaleString()}</Text>
                <Text style={styles.statLabel}>On waitlist</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.referralCount}</Text>
                <Text style={styles.statLabel}>Referrals</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Your referral code</Text>
            <Text style={styles.codeValue}>{referralCode}</Text>
            <Text style={styles.codeHint}>
              Share with friends. Each signup moves you up the list.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace('/' as any)}
          >
            <Text style={styles.primaryBtnText}>Back to home</Text>
          </TouchableOpacity>
        </ScrollView>
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

          <Text style={styles.eyebrow}>Early access</Text>
          <Text style={styles.title}>Join the Darshya waitlist</Text>
          <Text style={styles.subtitle}>
            India's devotional super-app. Live darshan, verified pujas, 80G donations and
            jyotish — all in one place. Reserve your spot.
          </Text>

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

          <Text style={styles.label}>Full name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.stone[400]}
            value={fullName}
            onChangeText={setFullName}
            editable={!busy}
          />

          <Text style={styles.label}>Phone (optional, for WhatsApp)</Text>
          <TextInput
            style={styles.input}
            placeholder="+91 9XXXXXXXXX"
            placeholderTextColor={colors.stone[400]}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            editable={!busy}
          />

          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Varanasi"
            placeholderTextColor={colors.stone[400]}
            value={city}
            onChangeText={setCity}
            editable={!busy}
          />

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => !busy && setPanchangOptIn(!panchangOptIn)}
            disabled={busy}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, panchangOptIn && styles.checkboxChecked]}>
              {panchangOptIn ? (
                <Ionicons name="checkmark" size={14} color={colors.white} />
              ) : null}
            </View>
            <Text style={styles.checkboxLabel}>
              Email me daily panchang (tithi, muhurat, festivals)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => !busy && setWhatsappOptIn(!whatsappOptIn)}
            disabled={busy}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, whatsappOptIn && styles.checkboxChecked]}>
              {whatsappOptIn ? (
                <Ionicons name="checkmark" size={14} color={colors.white} />
              ) : null}
            </View>
            <Text style={styles.checkboxLabel}>
              Send me WhatsApp updates (rare, opt-out anytime)
            </Text>
          </TouchableOpacity>

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
              <Text style={styles.primaryBtnText}>Reserve my spot</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    marginBottom: spacing.lg,
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
  successHero: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.lg },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.saffron[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: fontSize['3xl'],
    fontWeight: '800',
    color: colors.stone[900],
  },
  successSubtitle: {
    fontSize: fontSize.base,
    color: colors.stone[600],
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.stone[200],
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.saffron[700],
  },
  statLabel: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.stone[200] },
  codeCard: {
    backgroundColor: colors.amber[400],
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  codeLabel: { fontSize: fontSize.xs, color: colors.stone[700], fontWeight: '700' },
  codeValue: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.stone[900],
    marginTop: 4,
    letterSpacing: 2,
  },
  codeHint: {
    fontSize: fontSize.sm,
    color: colors.stone[700],
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
