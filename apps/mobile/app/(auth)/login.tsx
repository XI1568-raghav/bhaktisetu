import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { getRoleDashboardPath } from '../../lib/role-paths';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

type Tab = 'email' | 'phone';

const DEMO_HINTS = [
  { email: 'devotee@demo.com', label: 'Devotee' },
  { email: 'pandit@demo.com', label: 'Pandit' },
  { email: 'store@demo.com', label: 'Store Owner' },
  { email: 'astro@demo.com', label: 'Astrologer' },
  { email: 'wellness@demo.com', label: 'Wellness' },
  { email: 'gaushala@demo.com', label: 'Gaushala' },
  { email: 'temple@demo.com', label: 'Temple' },
  { email: 'admin@demo.com', label: 'Admin' },
];

export default function LoginScreen() {
  const { signInWithCredentials, signInWithOtp } = useAuth();
  const [tab, setTab] = useState<Tab>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(__DEV__ ? 'demo123' : '');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleEmailLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setBusy(true);
    const result = await signInWithCredentials(email, password);
    setBusy(false);
    if (!result.success) {
      Alert.alert('Sign in failed', result.message);
      return;
    }
    // Navigate based on role — auth context updates synchronously, so we need
    // the user from the demo lookup. Easiest: read from the freshly-updated
    // context via a small delay, or just route to root index which redirects.
    // Use root index pattern — index.tsx reads auth state and routes.
    router.replace('/');
  }

  async function handlePhoneSubmit() {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      Alert.alert('Invalid phone', 'Please enter a 10-digit Indian mobile number.');
      return;
    }
    const e164 = `+91${cleaned}`;
    setBusy(true);
    const result = await signInWithOtp(e164);
    setBusy(false);
    if (!result.success) {
      Alert.alert('Failed to send OTP', result.message);
      return;
    }
    router.push({ pathname: '/(auth)/verify-otp' as any, params: { phone: e164 } });
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('demo123');
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.brand}>🕉 Darshya</Text>
            <Text style={styles.tagline}>Your devotional companion</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, tab === 'email' && styles.tabActive]}
                onPress={() => setTab('email')}
              >
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color={tab === 'email' ? colors.saffron[700] : colors.stone[500]}
                />
                <Text style={[styles.tabText, tab === 'email' && styles.tabTextActive]}>
                  Email
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, tab === 'phone' && styles.tabActive]}
                onPress={() => setTab('phone')}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={16}
                  color={tab === 'phone' ? colors.saffron[700] : colors.stone[500]}
                />
                <Text style={[styles.tabText, tab === 'phone' && styles.tabTextActive]}>
                  Phone OTP
                </Text>
              </TouchableOpacity>
            </View>

            {tab === 'email' ? (
              <View>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.stone[400]}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  editable={!busy}
                />
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.stone[400]}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  editable={!busy}
                />
                <TouchableOpacity
                  style={[styles.primaryBtn, busy && styles.btnDisabled]}
                  onPress={handleEmailLogin}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Sign In</Text>
                  )}
                </TouchableOpacity>

                {/* The only entry point to password recovery. Without it both
                    (auth)/forgot-password and (auth)/reset-password are
                    unreachable, and a user who forgets their password has no
                    in-app route back into the account. */}
                <TouchableOpacity
                  style={styles.forgotLink}
                  onPress={() => router.push('/(auth)/forgot-password')}
                  disabled={busy}
                >
                  <Text style={styles.forgotLinkText}>Forgot password?</Text>
                </TouchableOpacity>

                {/* Dev-only. A release build must never advertise demo logins —
                    this block previously shipped an "admin@demo.com" one-tap chip
                    and the password in plain text to every production user. */}
                {__DEV__ ? (
                  <View style={styles.demoBox}>
                    <Text style={styles.demoTitle}>Demo accounts (password: demo123)</Text>
                    <View style={styles.demoChips}>
                      {DEMO_HINTS.map((d) => (
                        <TouchableOpacity
                          key={d.email}
                          style={styles.demoChip}
                          onPress={() => fillDemo(d.email)}
                        >
                          <Text style={styles.demoChipText}>{d.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : (
              <View>
                <Text style={styles.label}>Mobile number</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.phoneInput]}
                    placeholder="9876543210"
                    placeholderTextColor={colors.stone[400]}
                    keyboardType="number-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
                    editable={!busy}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.primaryBtn, busy && styles.btnDisabled]}
                  onPress={handlePhoneSubmit}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send OTP</Text>
                  )}
                </TouchableOpacity>
                <Text style={styles.hint}>
                  We&apos;ll send a 6-digit code to your phone.
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.footerLink}
            onPress={() => router.push('/(auth)/signup' as any)}
          >
            <Text style={styles.footerText}>
              New to Darshya? <Text style={styles.footerTextBold}>Create account</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.saffron[50] },
  scroll: {
    flexGrow: 1,
    padding: spacing.lg,
    // Was spacing['2xl'] + spacing.md (64) — a fixed constant standing in for
    // the status bar. SafeAreaView now supplies the real top inset, so this is
    // the design gap only; leaving 64 here would double-pad the notch.
    paddingTop: spacing.xl,
  },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  brand: {
    fontSize: fontSize['4xl'],
    fontWeight: '800',
    color: colors.saffron[700],
    marginBottom: spacing.xs,
  },
  tagline: { fontSize: fontSize.base, color: colors.stone[600] },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.stone[100],
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  tabActive: { backgroundColor: colors.white },
  tabText: { fontSize: fontSize.base, color: colors.stone[500], fontWeight: '600' },
  tabTextActive: { color: colors.saffron[700] },
  label: {
    fontSize: fontSize.sm,
    color: colors.stone[700],
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.stone[50],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.stone[900],
    borderWidth: 1,
    borderColor: colors.stone[200],
  },
  phoneRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  countryCode: {
    backgroundColor: colors.stone[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone[200],
  },
  countryCodeText: { fontSize: fontSize.base, color: colors.stone[700], fontWeight: '600' },
  phoneInput: { flex: 1 },
  primaryBtn: {
    backgroundColor: colors.saffron[600],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '700' },
  forgotLink: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  forgotLinkText: { color: colors.saffron[600], fontSize: fontSize.base, fontWeight: '600' },
  hint: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  demoBox: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.stone[200],
  },
  demoTitle: {
    fontSize: fontSize.sm,
    color: colors.stone[600],
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  demoChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  demoChip: {
    backgroundColor: colors.saffron[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  demoChipText: { fontSize: fontSize.xs, color: colors.saffron[700], fontWeight: '600' },
  footerLink: { marginTop: spacing.xl, alignItems: 'center' },
  footerText: { fontSize: fontSize.base, color: colors.stone[600] },
  footerTextBold: { fontWeight: '700', color: colors.saffron[700] },
});
