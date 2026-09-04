import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import {
  selectAstrologerDetail,
  astrologerInitials,
  ratePerMinuteLabel,
  consultationBookingUrl,
  MINUTE_PRESETS,
  MIN_CONSULTATION_INR,
} from '../../lib/astrology-directory';
import { RATE_MODE_NOTE } from '../../lib/astrologer-rate-card';
import { formatInr } from '../../lib/api-contracts';
import { webOrigin, hostOf } from '../../lib/web-origin';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * Booking a paid consultation — and the one thing this screen must be honest
 * about: the app does not take the money, and it does not pretend to.
 *
 * WHY NOTHING IS CREATED HERE
 * ---------------------------
 * The obvious flow — POST /consultation/book in the app, then hand the devotee
 * to the website to pay — CANNOT BE FINISHED, and finishing it wrong costs real
 * money. That route inserts an `astrologer_consultations` row at
 * `pending_payment` and mints a Razorpay order, and the only page that can
 * settle one is apps/web/app/astrology/[id]/book/page.tsx — which always
 * creates a NEW order of its own. There is no `/consultation/pay?id=`
 * counterpart to `/bookings/pay?id=`; that page is puja-only (it reads
 * `/bookings/{id}` and posts `/payments/create-order` with a `bookingId`). So
 * an order created here is an order nobody can pay, and the devotee's only way
 * forward charges a second one.
 *
 * PAR-15 hit the same wall on pujas and solved it by creating the booking and
 * handing off to the page built to resume it. That page exists for pujas. It
 * does not exist for consultations. So this screen gathers nothing, holds
 * nothing and charges nothing: it states who, at what published rate, what the
 * next page will ask, and hands the whole booking step to the page that owns
 * the Razorpay checkout.
 *
 * NO DURATION PICKER, for the same reason. The web page reads only `params.id`
 * and initialises `minutes` to 15 on its own; a value passed in the query
 * string is dropped on the floor. A picker here would look like it carried the
 * choice over and would not. The durations that page offers are listed instead,
 * so the devotee knows what is coming.
 *
 * NO TOTAL IS COMPUTED. `amountInr` is the server's number — `POST
 * /consultation/book` reads `perMinuteRate` off the profile row and returns the
 * figure it will charge. Multiplying a rate by minutes in a mobile screen is
 * how the two sides of a marketplace start quoting different prices; PM-10
 * documents exactly that failure in lib/astrologer-rate-card.ts.
 */
const WEB = webOrigin();

export default function AstrologerBookScreen() {
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const passedName = typeof params.name === 'string' ? params.name : null;

  const query = useQuery<unknown>({
    queryKey: ['astrology', 'astrologer', id],
    queryFn: () => apiFetch<unknown>(`/astrology/astrologers/${encodeURIComponent(id)}`),
    enabled: id.length > 0,
    staleTime: 60 * 1000,
    retry: (count, error) =>
      count < 2 && !(error instanceof Error && /\b40[0-9]\b/.test(error.message)),
  });

  const astrologer = useMemo(() => selectAstrologerDetail(query.data), [query.data]);

  const notFound =
    id.length === 0 ||
    (query.isError && query.error instanceof Error && /\b404\b/.test(query.error.message)) ||
    (query.isSuccess && astrologer === null);

  const errorText =
    !notFound && query.isError
      ? query.error instanceof Error
        ? query.error.message
        : 'Unknown error'
      : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {astrologer?.name ? `Book ${astrologer.name}` : 'Book a consultation'}
        </Text>
      </View>

      {query.isLoading ? (
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colors.saffron[600]} />
          <Text style={styles.centreText}>Loading this astrologer…</Text>
        </View>
      ) : notFound ? (
        <View style={styles.centre}>
          <Ionicons name="person-remove-outline" size={48} color={colors.stone[300]} />
          <Text style={styles.centreTitle}>Not available for booking</Text>
          <Text style={styles.centreText}>
            Darshya only sells consultations with approved astrologers, and this profile is not
            one of them{passedName ? ` (${passedName})` : ''}.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            accessibilityRole="button"
            onPress={() => router.replace('/(devotee)/astrologers' as never)}
          >
            <Text style={styles.primaryBtnText}>Browse astrologers</Text>
          </TouchableOpacity>
        </View>
      ) : errorText || !astrologer ? (
        <View style={styles.centre}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.stone[300]} />
          <Text style={styles.centreTitle}>Could not load this astrologer</Text>
          <Text style={styles.centreText}>{errorText ?? 'Please try again.'}</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            accessibilityRole="button"
            onPress={() => void query.refetch()}
          >
            <Text style={styles.primaryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* ── who ────────────────────────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.who}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{astrologerInitials(astrologer.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.whoName} numberOfLines={1}>
                  {astrologer.name}
                </Text>
                {astrologer.specializations.length > 0 ? (
                  <Text style={styles.whoMeta} numberOfLines={1}>
                    {astrologer.specializations.slice(0, 3).join(' · ')}
                  </Text>
                ) : null}
                <Text style={styles.whoMeta}>
                  {astrologer.isOnline ? 'Online now' : 'Offline right now'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {astrologer.perMinuteRate !== null ? (
                  <Text style={styles.rate}>{ratePerMinuteLabel(astrologer.perMinuteRate)}</Text>
                ) : (
                  <Text style={styles.rateUnknown}>Rate not published</Text>
                )}
              </View>
            </View>
            <Text style={styles.rateNote}>{RATE_MODE_NOTE}</Text>
          </View>

          {/* ── what the next page will ask ────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How booking works</Text>
            <View style={styles.card}>
              <Step
                n={1}
                title="Choose how long you want"
                body={`Consultations are sold by the minute. The payment page offers ${MINUTE_PRESETS.slice(
                  0,
                  MINUTE_PRESETS.length - 1,
                ).join(', ')} and ${MINUTE_PRESETS[MINUTE_PRESETS.length - 1]} minutes, and an optional preferred slot.`}
              />
              <Step
                n={2}
                title="Darshya quotes the total"
                body={`The amount is worked out on Darshya's side from the rate above — nothing here estimates it. The smallest consultation Darshya sells is ${formatInr(
                  MIN_CONSULTATION_INR,
                )}.`}
              />
              <Step
                n={3}
                title="Pay, and the astrologer is notified"
                body="Payment is taken by Razorpay on the website. Your consultation then appears under Consultations in this app."
              />
            </View>
          </View>

          {/* ── the durations, stated rather than picked ───────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Durations offered</Text>
            <View style={styles.chipRow}>
              {MINUTE_PRESETS.map((m) => (
                <View key={m} style={styles.chip}>
                  <Text style={styles.chipText}>{m} min</Text>
                </View>
              ))}
            </View>
            <Text style={styles.hint}>
              You pick one on the next page — this app cannot carry the choice across, so it does
              not pretend to.
            </Text>
          </View>

          {/* ── the hand-off ───────────────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.payBtn}
            activeOpacity={0.85}
            accessibilityRole="link"
            accessibilityLabel={`Continue booking on ${hostOf(WEB.origin)}`}
            accessibilityHint={`Opens ${hostOf(
              WEB.origin,
            )} in your browser, where you sign in and then pay for this consultation`}
            onPress={() => Linking.openURL(consultationBookingUrl(astrologer.id, WEB.origin))}
          >
            <Ionicons name="open-outline" size={18} color={colors.white} />
            <Text style={styles.payBtnText}>Continue on {hostOf(WEB.origin)}</Text>
          </TouchableOpacity>

          {/* The origin could not be established from this build's API host, so
              it fell back to production. Saying nothing would send the devotee
              to a site that has never heard of this astrologer id. */}
          {WEB.matchesEnvironment ? null : (
            <Text style={styles.warn}>
              This build talks to a different server than {hostOf(WEB.origin)}, so that site may
              not know this astrologer. Set EXPO_PUBLIC_WEB_URL to the website that pairs with
              this build&apos;s API.
            </Text>
          )}

          <Text style={styles.note}>
            Nothing has been booked or charged yet, and nothing is held while you decide. The app
            carries no card form, and the website keeps its own sign-in — so it will ask who you
            are before it will take a payment.
          </Text>

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  headerTitle: { flex: 1, fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },

  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  centreTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.stone[800] },
  centreText: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryBtn: {
    minHeight: 44,
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[600],
  },
  primaryBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },

  body: { padding: spacing.md, gap: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    padding: spacing.md,
    gap: spacing.sm,
  },
  who: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.lg, fontWeight: '800', color: colors.saffron[700] },
  whoName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[900] },
  whoMeta: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 1 },
  rate: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900] },
  rateUnknown: { fontSize: fontSize.sm, fontWeight: '700', color: colors.stone[400] },
  rateNote: { fontSize: fontSize.xs, color: colors.stone[500], lineHeight: 16 },

  section: { gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },

  step: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.saffron[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontSize: fontSize.xs, fontWeight: '800', color: colors.saffron[700] },
  stepTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[800] },
  stepBody: { fontSize: fontSize.sm, color: colors.stone[600], lineHeight: 20, marginTop: 2 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone[200],
  },
  chipText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.stone[700] },
  hint: { fontSize: fontSize.xs, color: colors.stone[500], lineHeight: 16 },

  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.saffron[600],
  },
  payBtnText: { fontSize: fontSize.lg, fontWeight: '800', color: colors.white },
  warn: {
    fontSize: fontSize.sm,
    color: colors.red[600],
    lineHeight: 20,
  },
  note: { fontSize: fontSize.xs, color: colors.stone[500], lineHeight: 18 },
});
