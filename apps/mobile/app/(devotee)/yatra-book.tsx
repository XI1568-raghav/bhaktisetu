import React, { useEffect, useMemo, useState } from 'react';
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
import { api, useYatra } from '@poojly/api-client';
import { useAuth } from '../../lib/auth-context';
import { buildYatraInquiry, YatraInquiryError, formatInr } from '../../lib/api-contracts';
import { isPastDate } from '../../lib/booking-flow';
import {
  selectYatra,
  readYatraTier,
  YATRA_TIERS,
  PICKUP_CITIES,
  type YatraTier,
} from '../../lib/yatra-catalogue';
import { useResponsiveGrid } from '../../lib/use-responsive';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * Mobile parity for web `/yatra/book` (and `/yatra/[slug]/book`, which is a
 * redirect into it — apps/web/app/yatra/[slug]/book/page.tsx:57).
 *
 * WHAT THIS SCREEN IS, EXACTLY
 * ----------------------------
 * A REQUEST, not a purchase. `POST /api/v1/yatra-inquiry`
 * (routes/yatra-inquiry.ts:181, public) records the lead, emails the yatra
 * desk and the traveller, and returns a reference id. The desk confirms hotel
 * and transport availability and emails the invoice. That is what the website
 * does too, and its own metadata was corrected to say so under COM-08: "no
 * payment gateway script is loaded anywhere in the yatra flow".
 *
 * So there is deliberately NO payment hand-off here. `lib/booking-flow.ts`'s
 * `resumePaymentUrl` addresses `/bookings/pay?id=<puja booking id>`, which is
 * the puja booking table; a yatra inquiry has no row there and no page on the
 * website can take money for one. Adding a "Pay on darshya.online" button
 * would send a devotee to a page that has never heard of their reference.
 *
 * NO TOTAL IS SHOWN, AND NONE IS SENT
 * -----------------------------------
 * The website computes its quote client-side from `apps/web/lib/yatra-data.ts`
 * — a web-only catalogue with per-tier prices, helicopter/puja/insurance line
 * items and a 5% GST line. This app has no copy of that file and must not grow
 * one. The tier prices that a till would actually charge live in
 * apps/api/src/lib/yatra-pricing.ts and are reachable through exactly one
 * endpoint, `POST /yatra-inquiry/create-order`, which MINTS A RAZORPAY ORDER
 * and a `pending_payment` row as a side effect — so it cannot be used as a
 * price oracle for a screen that is not taking payment.
 *
 * What the API does hand back over GET is `startingPrice`, its own per-person
 * "from" figure. That is displayed, verbatim, through `formatInr`, and nothing
 * multiplies it by the head count. `buildYatraInquiry` leaves `totalInr` at 0
 * when the screen has no server-quoted total — the same choice the destination
 * inquiry on yatra-detail.tsx already makes, and the reason the desk's own
 * email says it will confirm and invoice.
 */

type Gender = 'male' | 'female' | 'other';

interface TravelerRow {
  name: string;
  age: string;
  gender: Gender;
}

const STEPS = ['Trip', 'Package', 'Travellers', 'Review'] as const;

/** Traveller cap on the inquiry schema (routes/yatra-inquiry.ts:43-45). */
const MAX_TRAVELLERS = 50;

const ADD_ON_REQUESTS = [
  {
    id: 'helicopter' as const,
    icon: 'airplane' as const,
    title: 'Helicopter service',
    desc: 'Skip long treks. Applicable for Kedarnath / Vaishno Devi / Amarnath.',
    /** Only offered when the server says this yatra supports it. */
    requiresHelicopter: true,
  },
  {
    id: 'specialPuja' as const,
    icon: 'flame' as const,
    title: 'Special puja at temple',
    desc: 'Sankalpa with your name and gotra by the appointed priest.',
    requiresHelicopter: false,
  },
  {
    id: 'insurance' as const,
    icon: 'shield-checkmark' as const,
    title: 'Travel insurance',
    desc: 'Medical and trip-cancellation cover.',
    requiresHelicopter: false,
  },
];

type AddOnId = (typeof ADD_ON_REQUESTS)[number]['id'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function YatraBookScreen() {
  const params = useLocalSearchParams<{
    slug?: string | string[];
    title?: string | string[];
    tier?: string | string[];
  }>();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const passedTitle = typeof params.title === 'string' ? params.title : '';
  const { user } = useAuth();
  const { width } = useResponsiveGrid();
  const wide = width >= 600;

  const query = useYatra(slug);
  const yatra = useMemo(() => selectYatra(query.data), [query.data]);

  const [step, setStep] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [pickupCity, setPickupCity] = useState('Delhi');
  const [travellerCount, setTravellerCount] = useState(2);
  const [tier, setTier] = useState<YatraTier>(readYatraTier(params.tier) ?? 'standard');
  const [addOns, setAddOns] = useState<Record<AddOnId, boolean>>({
    helicopter: false,
    specialPuja: false,
    insurance: false,
  });
  const [travellers, setTravellers] = useState<TravelerRow[]>([
    { name: '', age: '', gender: 'male' },
    { name: '', age: '', gender: 'female' },
  ]);
  const [buyerName, setBuyerName] = useState(user?.fullName ?? '');
  const [buyerEmail, setBuyerEmail] = useState(user?.email ?? '');
  const [buyerPhone, setBuyerPhone] = useState(user?.phone ?? '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  // Keep the roster the same length as the head count, preserving what has
  // already been typed.
  useEffect(() => {
    setTravellers((rows) => {
      if (rows.length === travellerCount) return rows;
      const next = rows.slice(0, travellerCount);
      while (next.length < travellerCount) {
        next.push({ name: '', age: '', gender: 'male' });
      }
      return next;
    });
  }, [travellerCount]);

  const title = yatra?.title ?? passedTitle ?? slug;

  function stepError(index: number): string | null {
    if (index === 0) {
      if (!DATE_RE.test(startDate)) return 'Choose a start date in YYYY-MM-DD form.';
      if (isPastDate(startDate)) return 'The start date must be today or later.';
      if (!pickupCity.trim()) return 'Choose a pickup city.';
      return null;
    }
    if (index === 2) {
      for (let i = 0; i < travellers.length; i += 1) {
        const t = travellers[i]!;
        if (t.name.trim().length < 2) return `Enter traveller ${i + 1}'s full name as on their ID.`;
        const age = Number(t.age);
        if (!Number.isInteger(age) || age < 1 || age > 120) {
          return `Enter traveller ${i + 1}'s age in whole years.`;
        }
      }
      return null;
    }
    return null;
  }

  function goNext() {
    const problem = stepError(step);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function goBack() {
    setError(null);
    if (step === 0) {
      router.back();
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  }

  async function submit() {
    const requested = ADD_ON_REQUESTS.filter((a) => addOns[a.id]).map((a) => a.title);
    const noteLines = [
      requested.length > 0 ? `Add-on requests: ${requested.join(', ')}` : 'Add-on requests: none',
      notes.trim(),
    ].filter(Boolean);

    let body;
    try {
      body = {
        ...buildYatraInquiry({
          yatraSlug: slug,
          yatraTitle: title,
          packageTier: tier,
          startDate,
          travelersCount: String(travellerCount),
          name: buyerName,
          email: buyerEmail,
          phone: buyerPhone,
          pickupCity,
          notes: noteLines.join('\n'),
          // totalInr deliberately omitted — see the header comment.
        }),
        // `travelers` is on the route's zod body (routes/yatra-inquiry.ts:46)
        // and reaches the desk's email table; `buildYatraInquiry` predates it.
        travelers: travellers.map((t) => ({
          name: t.name.trim(),
          age: t.age.trim(),
          gender: t.gender,
        })),
      };
    } catch (err) {
      setError(
        err instanceof YatraInquiryError ? err.message : 'Please review the form and try again.',
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<{ referenceId?: string; ok?: boolean }>(
        '/api/v1/yatra-inquiry',
        body,
      );
      // Only claim success when the desk hands back its own reference.
      if (!res?.referenceId) {
        setError('The yatra desk did not confirm your request. Please try again.');
        return;
      }
      setReferenceId(res.referenceId);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? `Could not reach the yatra desk. ${err.message}`
          : 'Could not reach the yatra desk. Check your connection and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ─── loading / not-found ──────────────────────────────────────────────────
  if (!slug) {
    return (
      <Shell title="Book a yatra">
        <Centre
          icon="help-circle-outline"
          text="No yatra was selected. Go back and pick one from the yatra list."
        />
      </Shell>
    );
  }

  if (query.isLoading && !yatra) {
    return (
      <Shell title={passedTitle || 'Book a yatra'}>
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colors.saffron[600]} />
          <Text style={styles.centreText}>Loading yatra details…</Text>
        </View>
      </Shell>
    );
  }

  if (query.isError || !yatra) {
    return (
      <Shell title={passedTitle || 'Book a yatra'}>
        <View style={styles.centre}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.stone[300]} />
          <Text style={styles.centreText}>
            {query.isError
              ? 'We could not load this yatra just now.'
              : 'This yatra is no longer listed.'}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => void query.refetch()}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Ionicons name="refresh" size={18} color={colors.white} />
            <Text style={styles.primaryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </Shell>
    );
  }

  // ─── confirmation ─────────────────────────────────────────────────────────
  if (referenceId) {
    return (
      <Shell title="Request received">
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={44} color={colors.green[600]} />
            <Text style={styles.successTitle}>Request received</Text>
            <Text style={styles.successBody}>
              Our yatra desk will confirm hotel and transport availability for {title} and email
              your final invoice to {buyerEmail.trim()} within 24 hours.
            </Text>
            <Text style={styles.refLabel}>Reference</Text>
            <Text style={styles.refValue}>{referenceId}</Text>
            <Text style={styles.successWarn}>
              Nothing has been charged. The desk emails a payment link once availability is
              confirmed.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Browse more yatras"
            onPress={() => router.replace('/(devotee)/yatra' as never)}
          >
            <Text style={styles.secondaryText}>Browse more yatras</Text>
          </TouchableOpacity>
        </ScrollView>
      </Shell>
    );
  }

  // ─── the flow ─────────────────────────────────────────────────────────────
  return (
    <Shell title={title} onBack={goBack}>
      <View style={styles.stepper}>
        {STEPS.map((label, i) => (
          <View key={label} style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                i === step && styles.stepDotActive,
                i < step && styles.stepDotDone,
              ]}
            >
              {i < step ? (
                <Ionicons name="checkmark" size={12} color={colors.white} />
              ) : (
                <Text style={[styles.stepNum, i === step && styles.stepNumActive]}>{i + 1}</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>{label}</Text>
          </View>
        ))}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* The one money figure on this screen, exactly as the server sends it. */}
          {yatra.startingPriceInr !== null ? (
            <View style={styles.quoteCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.quoteLabel}>From, per person</Text>
                <Text style={styles.quoteValue}>{formatInr(yatra.startingPriceInr)}</Text>
              </View>
              <Text style={styles.quoteNote}>
                Final price depends on tier, dates and add-ons. The desk emails your invoice — you
                are not charged here.
              </Text>
            </View>
          ) : null}

          {step === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardHeading}>Trip details</Text>
              <Text style={styles.cardHelp}>When would you like to travel?</Text>

              <Field label="Start date (YYYY-MM-DD)">
                <TextInput
                  style={styles.input}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="2027-05-14"
                  placeholderTextColor={colors.stone[400]}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  accessibilityLabel="Start date"
                />
              </Field>
              {yatra.bestTime ? (
                <Text style={styles.hint}>Best time: {yatra.bestTime}</Text>
              ) : null}

              <Text style={[styles.label, { marginTop: spacing.md }]}>Travellers</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setTravellerCount((n) => Math.max(1, n - 1))}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="One fewer traveller"
                >
                  <Ionicons name="remove" size={20} color={colors.stone[800]} />
                </TouchableOpacity>
                <Text style={styles.counterValue} accessibilityLabel={`${travellerCount} travellers`}>
                  {travellerCount}
                </Text>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setTravellerCount((n) => Math.min(MAX_TRAVELLERS, n + 1))}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="One more traveller"
                >
                  <Ionicons name="add" size={20} color={colors.stone[800]} />
                </TouchableOpacity>
                <Text style={styles.hint}>max {MAX_TRAVELLERS}</Text>
              </View>

              <Text style={[styles.label, { marginTop: spacing.md }]}>Pickup city</Text>
              <View style={styles.chipWrap}>
                {PICKUP_CITIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, pickupCity === c && styles.chipActive]}
                    onPress={() => setPickupCity(c)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityState={{ selected: pickupCity === c }}
                    accessibilityLabel={`Pickup from ${c}`}
                  >
                    <Text style={[styles.chipText, pickupCity === c && styles.chipTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          {step === 1 ? (
            <>
              <View style={styles.card}>
                <Text style={styles.cardHeading}>Choose your package</Text>
                <Text style={styles.cardHelp}>
                  All packages include permits and a tour manager. The desk quotes your tier in the
                  invoice — tier prices are set at booking time and are not published here.
                </Text>
                {YATRA_TIERS.map((t) => {
                  const active = t.tier === tier;
                  return (
                    <TouchableOpacity
                      key={t.tier}
                      style={[styles.tierRow, active && styles.tierRowActive]}
                      onPress={() => setTier(t.tier)}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`${t.label} package`}
                    >
                      <Ionicons
                        name={active ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={active ? colors.saffron[700] : colors.stone[400]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tierLabel}>{t.label}</Text>
                        <Text style={styles.tierBlurb}>{t.blurb}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardHeading}>Add-on requests</Text>
                <Text style={styles.cardHelp}>
                  Optional. Each one is priced into the invoice the desk emails you.
                </Text>
                {ADD_ON_REQUESTS.filter(
                  (a) => !a.requiresHelicopter || yatra.helicopterAvailable,
                ).map((a) => {
                  const active = addOns[a.id];
                  return (
                    <TouchableOpacity
                      key={a.id}
                      style={[styles.tierRow, active && styles.tierRowActive]}
                      onPress={() => setAddOns((s) => ({ ...s, [a.id]: !s[a.id] }))}
                      activeOpacity={0.85}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: active }}
                      accessibilityLabel={a.title}
                    >
                      <Ionicons
                        name={active ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={active ? colors.saffron[700] : colors.stone[400]}
                      />
                      <Ionicons name={a.icon} size={18} color={colors.stone[500]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tierLabel}>{a.title}</Text>
                        <Text style={styles.tierBlurb}>{a.desc}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : null}

          {step === 2 ? (
            <View style={styles.card}>
              <Text style={styles.cardHeading}>Traveller details</Text>
              <Text style={styles.cardHelp}>
                As per government ID — required for permits and temple registration.
              </Text>
              {travellers.map((t, i) => (
                <View key={`traveller-${i}`} style={styles.travellerBox}>
                  <Text style={styles.travellerHeading}>Traveller {i + 1}</Text>
                  <Field label="Full name">
                    <TextInput
                      style={styles.input}
                      value={t.name}
                      onChangeText={(v) =>
                        setTravellers((rows) =>
                          rows.map((r, j) => (j === i ? { ...r, name: v } : r)),
                        )
                      }
                      placeholder="As on ID"
                      placeholderTextColor={colors.stone[400]}
                      accessibilityLabel={`Traveller ${i + 1} full name`}
                    />
                  </Field>
                  <View style={wide ? styles.row2 : undefined}>
                    <View style={wide ? { flex: 1, marginRight: spacing.sm } : undefined}>
                      <Field label="Age">
                        <TextInput
                          style={styles.input}
                          value={t.age}
                          onChangeText={(v) =>
                            setTravellers((rows) =>
                              rows.map((r, j) => (j === i ? { ...r, age: v } : r)),
                            )
                          }
                          keyboardType="number-pad"
                          placeholder="42"
                          placeholderTextColor={colors.stone[400]}
                          accessibilityLabel={`Traveller ${i + 1} age`}
                        />
                      </Field>
                    </View>
                    <View style={wide ? { flex: 1 } : undefined}>
                      <Text style={styles.label}>Gender</Text>
                      <View style={styles.chipWrap}>
                        {(['male', 'female', 'other'] as const).map((g) => (
                          <TouchableOpacity
                            key={g}
                            style={[styles.chip, t.gender === g && styles.chipActive]}
                            onPress={() =>
                              setTravellers((rows) =>
                                rows.map((r, j) => (j === i ? { ...r, gender: g } : r)),
                              )
                            }
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            accessibilityState={{ selected: t.gender === g }}
                            accessibilityLabel={`Traveller ${i + 1} ${g}`}
                          >
                            <Text
                              style={[styles.chipText, t.gender === g && styles.chipTextActive]}
                            >
                              {g === 'male' ? 'Male' : g === 'female' ? 'Female' : 'Other'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {step === 3 ? (
            <>
              <View style={styles.card}>
                <Text style={styles.cardHeading}>Review</Text>
                <SummaryRow label="Yatra" value={title} />
                {yatra.durationDays !== null ? (
                  <SummaryRow label="Duration" value={`${yatra.durationDays} days`} />
                ) : null}
                <SummaryRow label="Start date" value={startDate} />
                <SummaryRow label="Pickup" value={pickupCity} />
                <SummaryRow label="Travellers" value={String(travellerCount)} />
                <SummaryRow
                  label="Package"
                  value={YATRA_TIERS.find((t) => t.tier === tier)?.label ?? tier}
                />
                <SummaryRow
                  label="Add-ons"
                  value={
                    ADD_ON_REQUESTS.filter((a) => addOns[a.id])
                      .map((a) => a.title)
                      .join(', ') || 'None'
                  }
                />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardHeading}>Where should we send the invoice?</Text>
                <Field label="Your name">
                  <TextInput
                    style={styles.input}
                    value={buyerName}
                    onChangeText={setBuyerName}
                    placeholder="Full name"
                    placeholderTextColor={colors.stone[400]}
                    accessibilityLabel="Your name"
                  />
                </Field>
                <Field label="Email">
                  <TextInput
                    style={styles.input}
                    value={buyerEmail}
                    onChangeText={setBuyerEmail}
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
                    value={buyerPhone}
                    onChangeText={setBuyerPhone}
                    keyboardType="phone-pad"
                    placeholder="+91…"
                    placeholderTextColor={colors.stone[400]}
                    accessibilityLabel="Phone"
                  />
                </Field>
                <Field label="Anything else (optional)">
                  <TextInput
                    style={[styles.input, styles.multiline]}
                    multiline
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Wheelchair access, sattvic meals, elderly travellers…"
                    placeholderTextColor={colors.stone[400]}
                    accessibilityLabel="Additional notes"
                  />
                </Field>
                <Text style={styles.disclosure}>
                  Sending this does not charge you. The yatra desk confirms availability and emails
                  your invoice within 24 hours.
                </Text>
              </View>
            </>
          ) : null}

          {error ? (
            <View style={styles.errorBox} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={18} color={colors.red[600]} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.footerBack}
            onPress={goBack}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={step === 0 ? 'Go back' : 'Previous step'}
          >
            <Ionicons name="chevron-back" size={18} color={colors.stone[700]} />
            <Text style={styles.footerBackText}>Back</Text>
          </TouchableOpacity>

          {step < STEPS.length - 1 ? (
            <TouchableOpacity
              style={styles.footerNext}
              onPress={goNext}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Continue"
            >
              <Text style={styles.primaryText}>Continue</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.white} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.footerNext, submitting && styles.btnDisabled]}
              onPress={submit}
              disabled={submitting}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Send booking request"
            >
              {submitting ? (
                <>
                  <ActivityIndicator color={colors.white} />
                  <Text style={styles.primaryText}>Sending…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color={colors.white} />
                  <Text style={styles.primaryText}>Send request</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Shell>
  );
}

function Shell({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack ?? (() => router.back())}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {children}
    </SafeAreaView>
  );
}

function Centre({ icon, text }: { icon: 'help-circle-outline'; text: string }) {
  return (
    <View style={styles.centre}>
      <Ionicons name={icon} size={44} color={colors.stone[300]} />
      <Text style={styles.centreText}>{text}</Text>
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
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
  title: { flex: 1, fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
  stepper: {
    flexDirection: 'row', backgroundColor: colors.white,
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.stone[100],
  },
  stepItem: { flex: 1, alignItems: 'center', gap: 4 },
  stepDot: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.stone[200],
  },
  stepDotActive: { backgroundColor: colors.saffron[600] },
  stepDotDone: { backgroundColor: colors.green[600] },
  stepNum: { fontSize: fontSize.xs, fontWeight: '800', color: colors.stone[600] },
  stepNumActive: { color: colors.white },
  stepLabel: { fontSize: fontSize.xs, color: colors.stone[500], fontWeight: '600' },
  stepLabelActive: { color: colors.saffron[700] },
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  centreText: { color: colors.stone[600], fontSize: fontSize.sm, textAlign: 'center' },
  quoteCard: {
    backgroundColor: colors.saffron[50], padding: spacing.md, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.saffron[200], gap: spacing.xs,
  },
  quoteLabel: { fontSize: fontSize.xs, color: colors.stone[600], fontWeight: '600' },
  quoteValue: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.saffron[800] },
  quoteNote: { fontSize: fontSize.xs, color: colors.stone[600], lineHeight: 16 },
  card: {
    backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.stone[100],
  },
  cardHeading: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900] },
  cardHelp: { fontSize: fontSize.xs, color: colors.stone[600], marginTop: 2, marginBottom: spacing.md, lineHeight: 16 },
  label: { fontSize: fontSize.sm, color: colors.stone[700], fontWeight: '600', marginBottom: 4 },
  hint: { fontSize: fontSize.xs, color: colors.stone[500] },
  input: {
    backgroundColor: colors.stone[50],
    borderWidth: 1, borderColor: colors.stone[200], borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    minHeight: 44,
    fontSize: fontSize.base, color: colors.stone[900],
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  row2: { flexDirection: 'row' },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  counterBtn: {
    width: 44, height: 44, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.stone[100], borderWidth: 1, borderColor: colors.stone[200],
  },
  counterValue: {
    minWidth: 36, textAlign: 'center',
    fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900],
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md, minHeight: 44, justifyContent: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: colors.stone[200], backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[600] },
  chipText: { fontSize: fontSize.sm, color: colors.stone[700], fontWeight: '600' },
  chipTextActive: { color: colors.white },
  tierRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.sm, minHeight: 56, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.stone[200], marginBottom: spacing.sm,
  },
  tierRowActive: { borderColor: colors.saffron[600], backgroundColor: colors.saffron[50] },
  tierLabel: { fontSize: fontSize.base, fontWeight: '800', color: colors.stone[900] },
  tierBlurb: { fontSize: fontSize.xs, color: colors.stone[600], marginTop: 2, lineHeight: 16 },
  travellerBox: {
    borderWidth: 1, borderColor: colors.stone[200], borderRadius: borderRadius.md,
    padding: spacing.sm, marginBottom: spacing.sm,
  },
  travellerHeading: {
    fontSize: fontSize.xs, fontWeight: '800', color: colors.stone[600],
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md,
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.stone[100],
  },
  summaryLabel: { fontSize: fontSize.sm, color: colors.stone[600] },
  summaryValue: { flex: 1, fontSize: fontSize.sm, fontWeight: '700', color: colors.stone[900], textAlign: 'right' },
  disclosure: { fontSize: fontSize.xs, color: colors.stone[500], lineHeight: 16, marginTop: spacing.xs },
  errorBox: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: colors.red[500],
    borderRadius: borderRadius.md, padding: spacing.sm,
  },
  errorText: { flex: 1, color: colors.red[600], fontSize: fontSize.sm, lineHeight: 18 },
  footer: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.stone[100],
  },
  footerBack: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    minHeight: 48, paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.stone[200],
  },
  footerBackText: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[700] },
  footerNext: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    minHeight: 48, borderRadius: borderRadius.md, backgroundColor: colors.saffron[600],
  },
  btnDisabled: { opacity: 0.6 },
  primaryText: { color: colors.white, fontWeight: '800', fontSize: fontSize.base },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    minHeight: 48, paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md, backgroundColor: colors.saffron[600], marginTop: spacing.sm,
  },
  successCard: {
    backgroundColor: colors.white, padding: spacing.lg, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.green[200], alignItems: 'center', gap: spacing.xs,
  },
  successTitle: { fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
  successBody: { fontSize: fontSize.sm, color: colors.stone[700], textAlign: 'center', lineHeight: 19 },
  refLabel: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: spacing.sm },
  refValue: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900] },
  successWarn: { fontSize: fontSize.xs, color: colors.stone[600], textAlign: 'center', marginTop: spacing.xs, lineHeight: 16 },
  secondaryBtn: {
    alignItems: 'center', justifyContent: 'center',
    minHeight: 48, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.saffron[700], backgroundColor: colors.white,
  },
  secondaryText: { color: colors.saffron[800], fontWeight: '800', fontSize: fontSize.base },
});
