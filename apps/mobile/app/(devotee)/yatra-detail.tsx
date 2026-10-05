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
import { useYatraPackage, useYatra, useBookYatraPackage } from '@poojly/api-client';
import { useAuth } from '../../lib/auth-context';
import { formatInr, toNumber } from '../../lib/api-contracts';
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

  async function onRefresh() {
    setRefreshing(true);
    await (isPackage ? pkg.refetch() : dest.refetch());
    setRefreshing(false);
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
      // The route replies `{bookingNumber, totalInr, status:'pending_payment'}`
      // and does NOTHING else — no email, no WhatsApp, no payment link
      // (apps/api/src/routes/yatra-packages.ts:125-183, an INSERT and a log).
      // This alert used to say the booking was "confirmed" and that payment
      // instructions would be sent over WhatsApp: one word the server
      // contradicts, and one promise nothing in the codebase keeps. The total
      // is READ off the reply and rendered with `formatInr` like every other
      // rupee figure — never recomputed from price × travellers, which is the
      // multiplication the server does under a row lock.
      const total = toNumber(res.totalInr);
      Alert.alert(
        'Seats held',
        `Reference ${res.bookingNumber} — ${count} traveller(s)${
          total !== null ? `, ${formatInr(total)}` : ''
        }. Payment has NOT been taken and your place is not confirmed until it is. Keep this reference and contact the yatra desk to pay.`,
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
  // `price_inr` is the yatra_packages column (a Decimal, so a STRING over
  // JSON); `startingPrice` is what GET /api/v1/yatra/:slug sends for a curated
  // destination. `priceFromInr` was read here too — it is declared on
  // api-client's `YatraDestination` and the API has never sent it, so it was
  // always undefined. `toNumber` refuses anything unparseable rather than
  // rendering `₹NaN`, which is what `Number(undefined)` produced.
  const price = toNumber(
    (data as { price_inr?: unknown }).price_inr ?? (data as { startingPrice?: unknown }).startingPrice,
  );
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

        {price !== null ? (
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>{isPackage ? 'Per traveller' : 'From, per traveller'}</Text>
            <Text style={styles.priceValue}>{formatInr(price)}</Text>
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
              This is a curated destination, so tier, dates, pickup city, traveller details and
              add-ons are all part of the request. The full booking flow collects them and sends
              one request to the yatra desk, which confirms availability and sends your invoice;
              no reply time is promised.
            </Text>
            {/*
              PAR-18 replaced a wa.me placeholder here with an inline one-shot
              enquiry that hardcoded `packageTier: 'standard'` and collected no
              traveller roster or pickup city — so the desk got a lead it could
              not quote. The full flow (app/(devotee)/yatra-book.tsx, mirroring
              web /yatra/book) posts the same endpoint with all of it. Two
              routes into one inquiry would only be two things to keep in sync,
              so this is now the single door.
            */}
            <TouchableOpacity
              style={styles.bookBtn}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Request a booking for ${typeof title === 'string' ? title : slug}`}
              onPress={() =>
                router.push({
                  pathname: '/(devotee)/yatra-book' as never,
                  params: { slug, title: typeof title === 'string' ? title : slug },
                } as never)
              }
            >
              <Ionicons name="calendar" size={18} color={colors.white} />
              <Text style={styles.bookText}>Request a booking</Text>
            </TouchableOpacity>
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
