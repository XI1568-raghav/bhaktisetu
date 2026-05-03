import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCreateWeddingInquiry } from '@poojly/api-client';
import { useAuth } from '../../lib/auth-context';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

const PACKAGES = [
  { id: 'basic', label: 'Basic', tag: 'Pandit + sankalp', price: '₹25k' },
  { id: 'premium', label: 'Premium', tag: 'Decor + photography', price: '₹2L+' },
  { id: 'royal', label: 'Royal', tag: 'Full destination', price: '₹10L+' },
] as const;

type PackageTier = (typeof PACKAGES)[number]['id'];

export default function WeddingsScreen() {
  const { user } = useAuth();
  const [pkg, setPkg] = useState<PackageTier>('premium');
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [guests, setGuests] = useState('');
  const [budget, setBudget] = useState('');
  const [message, setMessage] = useState('');

  const inquiry = useCreateWeddingInquiry();

  async function onSubmit() {
    if (!fullName.trim()) return Alert.alert('Missing name', 'Please enter your full name.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return Alert.alert('Invalid email', 'Enter a valid email.');
    if (phone.replace(/\D/g, '').length < 10) return Alert.alert('Invalid phone', 'Enter a valid phone.');
    if (!city.trim()) return Alert.alert('Missing city', 'Enter the wedding city.');
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Alert.alert('Invalid date', 'Use YYYY-MM-DD or leave blank.');
    }

    try {
      await inquiry.mutateAsync({
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
      Alert.alert(
        'Inquiry sent',
        'Our wedding concierge will contact you within 24 hours.',
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Could not send inquiry.';
      Alert.alert('Failed', m);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Darshya Weddings</Text>
          <Text style={styles.subtitle}>Pandits, decor, muhurats — done right</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          style={styles.muhuratCard}
          activeOpacity={0.85}
          onPress={() => router.push('/(devotee)/weddings-muhurat' as never)}
        >
          <Ionicons name="calendar" size={28} color={colors.saffron[700]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.muhuratTitle}>Find auspicious dates</Text>
            <Text style={styles.muhuratSub}>Vedic muhurat finder for weddings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.saffron[700]} />
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Pick a package</Text>
          <View style={styles.pkgRow}>
            {PACKAGES.map((p) => {
              const active = p.id === pkg;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.pkgChip, active && styles.pkgChipActive]}
                  onPress={() => setPkg(p.id)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.pkgLabel, active && styles.pkgLabelActive]}>{p.label}</Text>
                  <Text style={[styles.pkgTag, active && styles.pkgTagActive]}>{p.tag}</Text>
                  <Text style={[styles.pkgPrice, active && styles.pkgPriceActive]}>{p.price}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Inquiry details</Text>
          <Field label="Full name">
            <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Your name" placeholderTextColor={colors.stone[400]} />
          </Field>
          <Field label="Email">
            <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" placeholderTextColor={colors.stone[400]} />
          </Field>
          <Field label="Phone">
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91…" placeholderTextColor={colors.stone[400]} />
          </Field>
          <Field label="Wedding city">
            <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Jaipur, Mumbai…" placeholderTextColor={colors.stone[400]} />
          </Field>
          <Field label="Wedding date (optional)">
            <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.stone[400]} keyboardType="numbers-and-punctuation" autoCapitalize="none" />
          </Field>
          <View style={styles.row2}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Field label="Guests">
                <TextInput style={styles.input} value={guests} onChangeText={setGuests} keyboardType="number-pad" placeholder="250" placeholderTextColor={colors.stone[400]} />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Budget (₹)">
                <TextInput style={styles.input} value={budget} onChangeText={setBudget} keyboardType="number-pad" placeholder="500000" placeholderTextColor={colors.stone[400]} />
              </Field>
            </View>
          </View>
          <Field label="Message (optional)">
            <TextInput style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]} multiline value={message} onChangeText={setMessage} placeholder="Tell us about your vision…" placeholderTextColor={colors.stone[400]} />
          </Field>

          <TouchableOpacity
            style={[styles.submitBtn, inquiry.isPending && { opacity: 0.6 }]}
            onPress={onSubmit}
            disabled={inquiry.isPending}
            activeOpacity={0.85}
          >
            {inquiry.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color={colors.white} />
                <Text style={styles.submitText}>Send inquiry</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  content: { padding: spacing.md, paddingBottom: spacing['2xl'], gap: spacing.md },
  muhuratCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.saffron[50], padding: spacing.md,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.saffron[200],
  },
  muhuratTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  muhuratSub: { fontSize: fontSize.xs, color: colors.stone[600], marginTop: 2 },
  card: {
    backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.stone[100],
  },
  cardHeading: { fontSize: fontSize.base, fontWeight: '800', color: colors.stone[900], marginBottom: spacing.sm },
  pkgRow: { flexDirection: 'row', gap: spacing.sm },
  pkgChip: {
    flex: 1, padding: spacing.sm, alignItems: 'center',
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
  label: { fontSize: fontSize.sm, color: colors.stone[700], fontWeight: '600', marginBottom: 4 },
  input: {
    backgroundColor: colors.stone[50],
    borderWidth: 1, borderColor: colors.stone[200], borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: fontSize.base, color: colors.stone[900],
  },
  row2: { flexDirection: 'row' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.saffron[600], padding: spacing.md, borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  submitText: { color: colors.white, fontWeight: '800', fontSize: fontSize.base },
});
