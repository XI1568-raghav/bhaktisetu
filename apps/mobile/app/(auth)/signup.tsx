import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { UserRole } from '@poojly/api-client';
import { useAuth } from '../../lib/auth-context';
import { describePasswordProblem } from '../../lib/signup-contract';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

type Step = 'role' | 'details';

interface RoleOption {
  role: UserRole;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const ROLE_OPTIONS: RoleOption[] = [
  { role: 'devotee', label: 'Devotee', description: 'Book pujas and join darshan', icon: 'flower-outline' },
  { role: 'priest', label: 'Pandit', description: 'Offer puja services', icon: 'person-outline' },
  { role: 'store_owner', label: 'Store Owner', description: 'Sell devotional goods', icon: 'storefront-outline' },
  { role: 'astrologer', label: 'Astrologer', description: 'Offer Jyotish consultations', icon: 'star-outline' },
  { role: 'wellness_instructor', label: 'Wellness Instructor', description: 'Teach yoga & meditation', icon: 'leaf-outline' },
  { role: 'temple_manager', label: 'Temple Manager', description: 'Manage a temple', icon: 'home-outline' },
];

export default function SignupScreen() {
  const { signUpWithCredentials } = useAuth();
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<UserRole>('devotee');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  function pickRole(r: UserRole) {
    setRole(r);
    setStep('details');
  }

  async function handleSubmit() {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    // Mirrors `signupSchema` in apps/api/src/routes/auth.ts one-for-one:
    // min 8, at least one letter, at least one digit. It said 6 and no
    // character classes, so a 6-character password passed here and was
    // rejected by zod at the API — and the auth context's old catch-all then
    // reported that 400 as "Account created successfully".
    const passwordProblem = describePasswordProblem(password);
    if (passwordProblem) {
      Alert.alert('Weak password', passwordProblem);
      return;
    }
    setBusy(true);
    const result = await signUpWithCredentials({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      role,
    });
    setBusy(false);
    if (!result.success) {
      Alert.alert('Sign up failed', result.message);
      return;
    }
    router.replace('/');
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
          <TouchableOpacity
            style={styles.back}
            onPress={() =>
              step === 'role' ? router.back() : setStep('role')
            }
          >
            <Ionicons name="arrow-back" size={24} color={colors.stone[700]} />
          </TouchableOpacity>

          {step === 'role' ? (
            <View>
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>What brings you to Darshya?</Text>
              <View style={styles.roleList}>
                {ROLE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.role}
                    style={styles.roleCard}
                    onPress={() => pickRole(opt.role)}
                  >
                    <View style={styles.roleIcon}>
                      <Ionicons name={opt.icon} size={28} color={colors.saffron[600]} />
                    </View>
                    <View style={styles.roleText}>
                      <Text style={styles.roleLabel}>{opt.label}</Text>
                      <Text style={styles.roleDesc}>{opt.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.stone[400]} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.title}>Tell us about you</Text>
              <Text style={styles.subtitle}>Joining as: {ROLE_OPTIONS.find((r) => r.role === role)?.label}</Text>

              <Text style={styles.label}>Full name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Arjun Sharma"
                placeholderTextColor={colors.stone[400]}
                value={fullName}
                onChangeText={setFullName}
                editable={!busy}
              />

              <Text style={styles.label}>Email</Text>
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

              <Text style={styles.label}>Phone (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="+919876543210"
                placeholderTextColor={colors.stone[400]}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                editable={!busy}
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="8+ characters, with a letter and a digit"
                placeholderTextColor={colors.stone[400]}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!busy}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, busy && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.footerLink}
            onPress={() => router.replace('/(auth)/login' as any)}
          >
            <Text style={styles.footerText}>
              Already have an account?{' '}
              <Text style={styles.footerTextBold}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.saffron[50] },
  // paddingTop was spacing.xl, a fixed stand-in for the status bar. SafeAreaView
  // supplies the real top inset now, so the base padding is enough.
  scroll: { padding: spacing.lg },
  back: { width: 40, height: 40, justifyContent: 'center' },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.stone[900],
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.stone[600],
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  roleList: { gap: spacing.sm },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleText: { flex: 1 },
  roleLabel: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[900] },
  roleDesc: { fontSize: fontSize.sm, color: colors.stone[600], marginTop: 2 },
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
  primaryBtn: {
    backgroundColor: colors.saffron[600],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '700' },
  footerLink: { marginTop: spacing.xl, alignItems: 'center' },
  footerText: { fontSize: fontSize.base, color: colors.stone[600] },
  footerTextBold: { fontWeight: '700', color: colors.saffron[700] },
});
