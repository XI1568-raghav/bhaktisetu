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
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, useYatraPackage, useYatra, useBookYatraPackage } from '@poojly/api-client';
import { useAuth } from '../../lib/auth-context';
import { buildYatraInquiry, YatraInquiryError } from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

export default function YatraDetailScreen() {
  const params = useLocalSearchParams<{ slug?: string; source?: string }>();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const source = typeof params.source === 'string' ? params.source : 'package';
  const { user } = useAuth();

  const pkg = useYatraPackage(slug);
  const dest = useYatra(slug);
  const book = useBookYatraPackage();

  const isPackage = source === 'package';
  const data = isPackage ? pkg.data : dest.data?.yatra;
  const isLoading = isPackage ? pkg.isLoading : dest.isLoading;

  const [travelers, setTravelers] = useState('1');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [notes, setNotes] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  // Destination-enquiry fields (PAR-18).
  const [name, setName] = useState(user?.fullName ?? '');
  const [startDate, setStartDate] = useState('');
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquiryRef, setInquiryRef] = useState<string | null>(null);

  async function onRefresh() {
    setRefreshing(true);
    await (isPackage ? pkg.refetch() : dest.refetch());
    setRefreshing(false);
  }

  /**
   * PAR-18. For a destination (as opposed to a package) the only booking path
   * was `Linking.openURL('https://wa.me/919999999999?…')` — a placeholder
   * number, not a business line, with no env var behind it. A high-intent
   * yatra lead tapped Plan My Yatra, WhatsApp opened on a number that does not
   * exist, and the lead was gone with no server-side trace. The sibling
   * "Talk to concierge" button was worse: it fired no request at all and said
   * "Our team will contact you within 24 hours."
   *
   * Both are replaced by POST /api/v1/yatra-inquiry (public, registered at
   * server.ts:434), which persists the lead, emails the yatra desk and the
   * traveller, and returns a reference id — which is now what the traveller is
   * shown, so the confirmation is evidence rather than a promise.
   */
  async function submitInquiry() {
    let body;
    try {
      body = buildYatraInquiry({
        yatraSlug: slug,
        yatraTitle: typeof title === 'string' ? title : slug,
        packageTier: 'standard',
        startDate,
        travelersCount: travelers,
        name: name.trim() || user?.fullName || '',
        email,
        phone,
        notes,
      });
    } catch (err) {
      Alert.alert(
        'Check your details',
        err instanceof YatraInquiryError ? err.message : 'Please review the form.',
      );
      return;
    }
    setInquirySubmitting(true);
    try {
      const res = await api.post<{ referenceId?: string; ok?: boolean }>(
        '/api/v1/yatra-inquiry',
        body,
      );
      // Only claim success when the server hands back its own reference.
      if (!res?.referenceId) {
        Alert.alert(
          'Not submitted',
          'The yatra desk did not confirm your enquiry. Please try again.',
        );
        return;
      }
      setInquiryRef(res.referenceId);
      Alert.alert(
        'Enquiry received',
        `Reference ${res.referenceId}. The yatra desk will email ${body.buyer.email} within 24 hours.`,
      );
    } catch (err) {
      Alert.alert(
        'Could not send',
        err instanceof Error ? err.message : 'Could not reach the yatra desk. Please retry.',
      );
    } finally {
      setInquirySubmitting(false);
    }
  }

  async function onBook() {
    const count = Math.max(1, Math.min(20, parseInt(travelers, 10) || 1));
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      Alert.alert('Invalid phone', 'Enter a valid phone number.');
      return;
    }
    try {
      const res = await book.mutateAsync({
        slug,
        body: {
          travelersCount: count,
          contactEmail: email.trim(),
          contactPhone: phone.trim(),
          specialRequests: notes.trim() || undefined,
        },
      });
      Alert.alert(
        'Yatra reserved',
        `Booking ${res.bookingNumber} confirmed for ${count} traveller(s). Total ₹${Number(res.totalInr).toLocaleString('en-IN')}. We will WhatsApp payment instructions to ${phone.trim()}.`,
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not book yatra.';
      Alert.alert('Booking failed', message);
    }
  }

  if (isLoading && !data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator color={colors.saffron[600]} style={{ marginTop: spacing['2xl'] }} />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
          </TouchableOpacity>
          <Text style={styles.title}>Yatra not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const title = (data as { name?: string; title?: string }).name ?? (data as { title?: string }).title ?? slug;
  const description = (data as { short_description?: string; description?: string }).short_description ?? (data as { description?: string }).description ?? '';
  const price = (data as { price_inr?: string | number; priceFromInr?: number }).price_inr ?? (data as { priceFromInr?: number }).priceFromInr;
  const duration = (data as { duration_days?: number; durationDays?: number }).duration_days ?? (data as { durationDays?: number }).durationDays;
  const region = (data as { destination_slug?: string; region?: string; state?: string }).destination_slug
    ?? (data as { region?: string }).region
    ?? (data as { state?: string }).state;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.hero}>
          <Ionicons name="map" size={56} color={colors.white} />
          <Text style={styles.heroTitle}>{title}</Text>
          {region ? <Text style={styles.heroMeta}>{region}{duration ? ` • ${duration} days` : ''}</Text> : null}
        </View>

        {description ? (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>About this yatra</Text>
            <Text style={styles.cardBody}>{description}</Text>
          </View>
        ) : null}

        {price !== undefined ? (
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Per traveller</Text>
            <Text style={styles.priceValue}>₹{Number(price).toLocaleString('en-IN')}</Text>
          </View>
        ) : null}

        {isPackage ? (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Reserve your spot</Text>
            <Field label="Travellers (1-20)">
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={travelers}
                onChangeText={setTravelers}
              />
            </Field>
            <Field label="Contact email">
              <TextInput
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.stone[400]}
              />
            </Field>
            <Field label="Contact phone">
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                placeholder="+91…"
                placeholderTextColor={colors.stone[400]}
              />
            </Field>
            <Field label="Special requests (optional)">
              <TextInput
                style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                multiline
                value={notes}
                onChangeText={setNotes}
                placeholder="Veg meals, wheelchair…"
                placeholderTextColor={colors.stone[400]}
              />
            </Field>
            <TouchableOpacity
              style={[styles.bookBtn, book.isPending && { opacity: 0.6 }]}
              onPress={onBook}
              disabled={book.isPending}
              activeOpacity={0.85}
            >
              {book.isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                  <Text style={styles.bookText}>Reserve yatra</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Plan this yatra</Text>
            <Text style={styles.cardBody}>
              This is a curated destination, so dates, add-ons and pickup points are
              planned with you. Send an enquiry and the yatra desk replies by email
              within 24 hours.
            </Text>
            {inquiryRef ? (
              <View style={styles.refBox}>
                <Ionicons name="checkmark-circle" size={18} color={colors.green[600]} />
                <Text style={styles.refText}>
                  Enquiry {inquiryRef} received. The yatra desk has your details.
                </Text>
              </View>
            ) : (
              <>
                <Field label="Your name">
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Full name"
                    placeholderTextColor={colors.stone[400]}
                  />
                </Field>
                <Field label="Email">
                  <TextInput
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.stone[400]}
                  />
                </Field>
                <Field label="Phone (optional)">
                  <TextInput
                    style={styles.input}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+91…"
                    placeholderTextColor={colors.stone[400]}
                  />
                </Field>
                <Field label="Approximate start date">
                  <TextInput
                    style={styles.input}
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="e.g. Sept 2026 or 10 Sept 2026"
                    placeholderTextColor={colors.stone[400]}
                  />
                </Field>
                <Field label="Travellers (1-50)">
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={travelers}
                    onChangeText={setTravelers}
                  />
                </Field>
                <Field label="Anything we should know (optional)">
                  <TextInput
                    style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                    multiline
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Veg meals, elderly travellers, pickup city…"
                    placeholderTextColor={colors.stone[400]}
                  />
                </Field>
                <TouchableOpacity
                  style={[styles.bookBtn, inquirySubmitting && { opacity: 0.6 }]}
                  activeOpacity={0.85}
                  disabled={inquirySubmitting}
                  onPress={submitInquiry}
                >
                  {inquirySubmitting ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <Ionicons name="chatbubbles" size={18} color={colors.white} />
                      <Text style={styles.bookText}>Send enquiry</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
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
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900], flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing['2xl'], gap: spacing.md },
  hero: {
    backgroundColor: colors.saffron[600], padding: spacing.lg, alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  heroTitle: { color: colors.white, fontSize: fontSize.xl, fontWeight: '800', marginTop: spacing.sm, textAlign: 'center' },
  heroMeta: { color: colors.saffron[100], fontSize: fontSize.sm, marginTop: 4 },
  card: {
    backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.stone[100],
  },
  cardHeading: { fontSize: fontSize.base, fontWeight: '800', color: colors.stone[900], marginBottom: spacing.xs },
  cardBody: { fontSize: fontSize.sm, color: colors.stone[700], lineHeight: 20 },
  priceCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.amber[400], padding: spacing.md, borderRadius: borderRadius.md,
  },
  refBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.green[50], borderColor: colors.green[600], borderWidth: 1,
    borderRadius: borderRadius.md, padding: spacing.sm, marginTop: spacing.sm,
  },
  refText: { flex: 1, fontSize: fontSize.sm, color: colors.stone[800], fontWeight: '600' },
  priceLabel: { color: colors.stone[900], fontWeight: '700' },
  priceValue: { color: colors.stone[900], fontWeight: '900', fontSize: fontSize.lg },
  label: { fontSize: fontSize.sm, color: colors.stone[700], fontWeight: '600', marginBottom: 4 },
  input: {
    backgroundColor: colors.stone[50],
    borderWidth: 1, borderColor: colors.stone[200], borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: fontSize.base, color: colors.stone[900],
  },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.saffron[600], padding: spacing.md, borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  bookText: { color: colors.white, fontWeight: '800', fontSize: fontSize.base },
});
