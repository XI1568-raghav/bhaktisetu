import React, { useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCreateWeddingInquiry } from '@poojly/api-client';
import { useAuth } from '../../lib/auth-context';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { formatInr } from '../../lib/api-contracts';
import {
  WEDDING_PACKAGES,
  readPackageTier,
  type WeddingPackageTier,
} from '../../lib/wedding-packages';

/**
 * Mobile parity for web `/weddings` + `/weddings/inquiry`
 * (apps/web/app/weddings/page.tsx, apps/web/app/weddings/inquiry/page.tsx).
 *
 * POST /api/v1/weddings/inquiry (routes/weddings.ts:59, auth-gated) is the one
 * write this screen makes; `useCreateWeddingInquiry` attaches the session
 * bearer, which is why the mobile path works where the web page's bare `fetch`
 * does not.
 *
 * Two things changed here:
 *
 *   1. THE PRICES. The tier row was hand-typed as `₹25k / ₹2L+ / ₹10L+`
 *      against the website's `₹15,000 / ₹50,000 / ₹2,00,000`. All three were
 *      wrong; Royal was wrong by 5x. Tiers now come from
 *      lib/wedding-packages.ts, which a test pins to the web page.
 *   2. THE FAILURE SURFACE. Validation and submission errors were
 *      `Alert.alert` only — a modal the devotee dismisses, leaving no trace of
 *      which field was wrong. They render inline now, next to the button that
 *      produced them, and success renders as a state rather than an alert.
 *
 * `?package=<tier>` preselects a tier, mirroring the web page's
 * `/weddings/inquiry?package=` deep link from the packages page.
 */
export default function WeddingsScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ package?: string | string[] }>();
  const presetTier = readPackageTier(params.package);

  const [pkg, setPkg] = useState<WeddingPackageTier>(presetTier ?? 'premium');
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [guests, setGuests] = useState('');
  const [budget, setBudget] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);

  const inquiry = useCreateWeddingInquiry();

  /** Mirrors the route's zod body (routes/weddings.ts:8-22). */
  function validate(): string | null {
    if (!fullName.trim()) return 'Enter your full name so the concierge can reach you.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Enter a valid email address.';
    if (phone.replace(/\D/g, '').length < 10) return 'Enter a valid phone number.';
    if (!city.trim()) return 'Enter the wedding city.';
    if (date.trim()) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
        return 'Wedding date must be YYYY-MM-DD, or leave it blank.';
      }
      // The route refines this to a future date and 400s otherwise.
      if (new Date(`${date.trim()}T00:00:00Z`).getTime() <= Date.now()) {
        return 'The wedding date must be in the future.';
      }
    }
    return null;
  }

  async function onSubmit() {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    try {
      const res = await inquiry.mutateAsync({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        city: city.trim(),
        weddingDate: date.trim() || undefined,
        package: pkg,
        guests: guests ? parseInt(guests, 10) : undefined,
        budget: budget ? parseInt(budget, 10) : undefined,
        message: message.trim() || undefined,
      });
      // Only claim success when the server hands back its own id (it replies
      // 201 {id, status}). Anything else is not an inquiry that exists.
      if (!res?.id) {
        setError('The concierge desk did not confirm your enquiry. Please try again.');
        return;
      }
      setSentId(res.id);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? `We could not send your enquiry. ${err.message}`
          : 'We could not send your enquiry. Please try again.',
      );
    }
  }

  if (sentId) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={44} color={colors.green[600]} />
            <Text style={styles.successTitle}>Enquiry received</Text>
            <Text style={styles.successBody}>
              A Darshya wedding concierge will reach out within 24 hours. A confirmation is on its
              way to {email.trim()}.
            </Text>
            <Text style={styles.successRef}>Reference {sentId}</Text>
          </View>
          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Find your muhurat"
            onPress={() => router.push('/(devotee)/weddings-muhurat' as never)}
          >
            <Ionicons name="calendar" size={18} color={colors.saffron[800]} />
            <Text style={styles.secondaryText}>Find your muhurat</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            style={styles.linkCard}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Find auspicious wedding dates"
            onPress={() => router.push('/(devotee)/weddings-muhurat' as never)}
          >
            <Ionicons name="calendar" size={26} color={colors.saffron[700]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.linkTitle}>Find auspicious dates</Text>
              <Text style={styles.linkSub}>Vedic muhurat from bride + groom nakshatras</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.saffron[700]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkCard}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="See all wedding packages"
            onPress={() => router.push('/(devotee)/weddings-packages' as never)}
          >
            <Ionicons name="albums" size={26} color={colors.saffron[700]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.linkTitle}>See full packages</Text>
              <Text style={styles.linkSub}>What Basic, Premium and Royal each include</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.saffron[700]} />
          </TouchableOpacity>

          <View style={styles.card}>
            <Text style={styles.cardHeading}>Pick a package</Text>
            <View style={styles.pkgRow}>
              {WEDDING_PACKAGES.map((p) => {
                const active = p.tier === pkg;
                return (
                  <TouchableOpacity
                    key={p.tier}
                    style={[styles.pkgChip, active && styles.pkgChipActive]}
                    onPress={() => setPkg(p.tier)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${p.name} package, ${formatInr(p.priceInr)}`}
                  >
                    <Text style={[styles.pkgLabel, active && styles.pkgLabelActive]}>
                      {p.name}
                    </Text>
                    <Text style={[styles.pkgTag, active && styles.pkgTagActive]} numberOfLines={2}>
                      {p.tagline}
                    </Text>
                    {/* Published figure, rendered — never computed here. */}
                    <Text style={[styles.pkgPrice, active && styles.pkgPriceActive]}>
                      {formatInr(p.priceInr)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.pkgNote}>
              Pricing is for ceremonies in India. NRI weddings carry a travel and consultation
              surcharge the concierge quotes.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardHeading}>Inquiry details</Text>
            <Field label="Full name">
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your name"
                placeholderTextColor={colors.stone[400]}
                accessibilityLabel="Full name"
              />
            </Field>
            <Field label="Email">
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="you@example.com"
                placeholderTextColor={colors.stone[400]}
                accessibilityLabel="Email"
              />
            </Field>
            <Field label="Phone">
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+91…"
                placeholderTextColor={colors.stone[400]}
                accessibilityLabel="Phone"
              />
            </Field>
            <Field label="Wedding city">
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="Jaipur, Mumbai…"
                placeholderTextColor={colors.stone[400]}
                accessibilityLabel="Wedding city"
              />
            </Field>
            <Field label="Wedding date (optional)">
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.stone[400]}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                accessibilityLabel="Wedding date"
              />
            </Field>
            <View style={styles.row2}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <Field label="Guests">
                  <TextInput
                    style={styles.input}
                    value={guests}
                    onChangeText={setGuests}
                    keyboardType="number-pad"
                    placeholder="250"
                    placeholderTextColor={colors.stone[400]}
                    accessibilityLabel="Approximate guest count"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Budget (₹)">
                  <TextInput
                    style={styles.input}
                    value={budget}
                    onChangeText={setBudget}
                    keyboardType="number-pad"
                    placeholder="500000"
                    placeholderTextColor={colors.stone[400]}
                    accessibilityLabel="Budget in rupees"
                  />
                </Field>
              </View>
            </View>
            <Field label="Message (optional)">
              <TextInput
                style={[styles.input, styles.multiline]}
                multiline
                value={message}
                onChangeText={setMessage}
                placeholder="Tell us about your vision…"
                placeholderTextColor={colors.stone[400]}
                accessibilityLabel="Message"
              />
            </Field>

            {error ? (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Ionicons name="alert-circle" size={18} color={colors.red[600]} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.submitBtn, inquiry.isPending && styles.btnDisabled]}
              onPress={onSubmit}
              disabled={inquiry.isPending}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Send inquiry"
            >
              {inquiry.isPending ? (
                <>
                  <ActivityIndicator color={colors.white} />
                  <Text style={styles.submitText}>Sending…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color={colors.white} />
                  <Text style={styles.submitText}>Send inquiry</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header() {
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
        <Text style={styles.title}>Darshya Weddings</Text>
        <Text style={styles.subtitle}>One muhurat. One pandit. One wedding.</Text>
      </View>
    </View>
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
  linkCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.saffron[50], padding: spacing.md,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.saffron[200],
    minHeight: 44,
  },
  linkTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  linkSub: { fontSize: fontSize.xs, color: colors.stone[600], marginTop: 2 },
  card: {
    backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.stone[100],
  },
  cardHeading: { fontSize: fontSize.base, fontWeight: '800', color: colors.stone[900], marginBottom: spacing.sm },
  pkgRow: { flexDirection: 'row', gap: spacing.sm },
  pkgChip: {
    flex: 1, padding: spacing.sm, alignItems: 'center', minHeight: 88, justifyContent: 'center',
    backgroundColor: colors.stone[50], borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.stone[200],
  },
  pkgChipActive: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[700] },
  pkgLabel: { fontSize: fontSize.base, fontWeight: '800', color: colors.stone[900] },
  pkgLabelActive: { color: colors.white },
  pkgTag: { fontSize: 10, color: colors.stone[600], marginTop: 2, textAlign: 'center' },
  pkgTagActive: { color: colors.saffron[100] },
  pkgPrice: { fontSize: fontSize.sm, fontWeight: '700', color: colors.saffron[700], marginTop: 4 },
  pkgPriceActive: { color: colors.white },
  pkgNote: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: spacing.sm, lineHeight: 16 },
  label: { fontSize: fontSize.sm, color: colors.stone[700], fontWeight: '600', marginBottom: 4 },
  input: {
    backgroundColor: colors.stone[50],
    borderWidth: 1, borderColor: colors.stone[200], borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    minHeight: 44,
    fontSize: fontSize.base, color: colors.stone[900],
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  row2: { flexDirection: 'row' },
  errorBox: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: colors.red[500],
    borderRadius: borderRadius.md, padding: spacing.sm, marginBottom: spacing.sm,
  },
  errorText: { flex: 1, color: colors.red[600], fontSize: fontSize.sm, lineHeight: 18 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.saffron[600], paddingHorizontal: spacing.md,
    minHeight: 48, borderRadius: borderRadius.md, marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.6 },
  submitText: { color: colors.white, fontWeight: '800', fontSize: fontSize.base },
  successCard: {
    backgroundColor: colors.white, padding: spacing.lg, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.green[200], alignItems: 'center', gap: spacing.xs,
  },
  successTitle: { fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
  successBody: { fontSize: fontSize.sm, color: colors.stone[700], textAlign: 'center', lineHeight: 19 },
  successRef: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: spacing.xs },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    borderWidth: 1, borderColor: colors.saffron[700], backgroundColor: colors.white,
    minHeight: 48, borderRadius: borderRadius.md, paddingHorizontal: spacing.md,
  },
  secondaryText: { color: colors.saffron[800], fontWeight: '800', fontSize: fontSize.base },
});
