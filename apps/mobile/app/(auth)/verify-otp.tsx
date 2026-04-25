import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function VerifyOtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { verifyOtp, signInWithOtp } = useAuth();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  function setDigit(idx: number, val: string) {
    const next = [...digits];
    next[idx] = val.replace(/\D/g, '').slice(-1);
    setDigits(next);
    if (next[idx] && idx < OTP_LENGTH - 1) {
      inputs.current[idx + 1]?.focus();
    }
    if (next.every((d) => d.length === 1)) {
      void submit(next.join(''));
    }
  }

  function handleKey(idx: number, key: string) {
    if (key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  }

  async function submit(code: string) {
    if (!phone) {
      Alert.alert('Missing phone', 'Phone number not provided. Go back and try again.');
      return;
    }
    setBusy(true);
    const result = await verifyOtp(phone, code);
    setBusy(false);
    if (!result.success) {
      Alert.alert('Verification failed', result.message);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
      return;
    }
    router.replace('/');
  }

  async function resend() {
    if (resendIn > 0 || !phone) return;
    setBusy(true);
    const result = await signInWithOtp(phone);
    setBusy(false);
    if (!result.success) {
      Alert.alert('Failed to resend', result.message);
      return;
    }
    setResendIn(RESEND_SECONDS);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <View style={styles.container}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.stone[700]} />
        </TouchableOpacity>

        <Text style={styles.title}>Enter verification code</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{' '}
          <Text style={styles.phoneText}>{phone}</Text>
        </Text>

        <View style={styles.otpRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(r) => {
                inputs.current[i] = r;
              }}
              style={[styles.otpBox, d && styles.otpBoxFilled]}
              keyboardType="number-pad"
              maxLength={1}
              value={d}
              onChangeText={(t) => setDigit(i, t)}
              onKeyPress={({ nativeEvent }) => handleKey(i, nativeEvent.key)}
              editable={!busy}
              autoFocus={i === 0}
              textContentType="oneTimeCode"
            />
          ))}
        </View>

        {busy ? <ActivityIndicator color={colors.saffron[600]} /> : null}

        <TouchableOpacity onPress={resend} disabled={resendIn > 0}>
          <Text style={[styles.resendText, resendIn > 0 && styles.resendDisabled]}>
            {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.saffron[50] },
  container: { flex: 1, padding: spacing.lg, paddingTop: spacing['2xl'] },
  back: { width: 40, height: 40, justifyContent: 'center' },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.stone[900],
    marginTop: spacing.lg,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.stone[600],
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  phoneText: { fontWeight: '700', color: colors.stone[800] },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  otpBox: {
    width: 44,
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.stone[200],
    backgroundColor: colors.white,
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.stone[900],
    textAlign: 'center',
  },
  otpBoxFilled: { borderColor: colors.saffron[500], backgroundColor: colors.saffron[50] },
  resendText: {
    fontSize: fontSize.base,
    color: colors.saffron[700],
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  resendDisabled: { color: colors.stone[400] },
});
