import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { apiBase } from '../../lib/api';
import {
  selectPujaBookingDetail,
  resolveSlotAvailability,
  createBookingOutcome,
  buildCreateBookingBody,
  bookingErrorMessage,
  resumePaymentUrl,
  offeringPriceInr,
  bookingPriceBreakdown,
  isSlotBookable,
  upcomingDateKeys,
  BookingInputError,
  type PujaBookingDetail,
  type TempleOfferingOption,
  type BookableSlot,
  type SlotAvailability,
  type DevoteeEntry,
  type CreatedBooking,
} from '../../lib/booking-flow';
import { webOrigin, hostOf } from '../../lib/web-origin';
import { formatInr } from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * PAR-15 — booking a puja, in the app.
 *
 * Until now the app had no booking flow at all: the Book control called
 * Linking.openURL and handed the devotee to the mobile browser. This screen is
 * the flow — temple, date, slot, sankalp names — and it creates a real
 * PujaBooking through POST /api/v1/bookings/book.
 *
 * WHAT STILL LEAVES THE APP, AND WHY IT IS SAID OUT LOUD
 * -----------------------------------------------------
 * The card form. Razorpay checkout needs the native SDK
 * (`react-native-razorpay`, not a dependency here — adding a native module
 * changes the EAS build) or an untestable WebView redirect contract. So after
 * the booking is created the screen opens `/bookings/pay?id=<id>`, the web page
 * built precisely to resume payment for an existing booking. That page is
 * documented as never re-posting /create-order, so the hand-off cannot mint a
 * second booking or a second slot hold.
 *
 * The booking is real either way: it exists, it is listed under My Bookings,
 * and it can be paid later. What the screen must never do is imply the payment
 * happened here — so the button says where it goes, and the confirmation says
 * the booking is held and unpaid.
 *
 * Auth: this route is authenticateUser-gated. The screen builds its own
 * bearer-carrying fetch (the pattern lib/api.ts documents and gurukul-apply.tsx
 * and lesson.tsx already use) rather than going through the shared client,
 * because the shared client reads `data?.error?.message` and this route sends
 * `error` as a STRING — so every recoverable failure, including a lost slot
 * race, would reach the devotee as "Request failed with status 409".
 */
/**
 * Nothing has been asked for yet (no temple, or no day). Deliberately NOT
 * `none` — `none` is a statement that the temple published nothing, and the
 * screen has not asked the server anything at this point.
 */
const IDLE_SLOTS: SlotAvailability = { kind: 'unreadable', slots: [] };

/**
 * The website this build pays on. Resolved from EXPO_PUBLIC_WEB_URL, else from
 * the API host, else production with `matchesEnvironment: false`. It used to be
 * the literal darshya.online, which sent a devotee on a LAN or staging build to
 * production to pay for a booking that only exists on the server they booked
 * against. Module scope: env is baked at build time and cannot change while the
 * app runs.
 */
const WEB = webOrigin();

export default function PujaBookScreen() {
  const params = useLocalSearchParams<{ slug?: string; name?: string }>();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const passedName = typeof params.name === 'string' ? params.name : undefined;
  const { session, user } = useAuth();
  const token = session?.accessToken;

  const [detail, setDetail] = useState<PujaBookingDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [offering, setOffering] = useState<TempleOfferingOption | null>(null);
  const [date, setDate] = useState<string | null>(null);
  /**
   * The availability READ, not just its result.
   *
   * This was a bare `BookableSlot[]`, so a fetch that threw and a temple that
   * publishes nothing arrived at the renderer as the same empty array — and the
   * renderer printed the second meaning: "This temple has published no slots
   * for that day. Try another day." A dropped connection is not a fact about
   * the temple, and "try another day" is advice that cannot work. The four
   * outcomes are kept apart in booking-flow.ts and only `none` is allowed to
   * make a claim about the temple.
   */
  const [slotView, setSlotView] = useState<SlotAvailability>(IDLE_SLOTS);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slot, setSlot] = useState<string | null>(null);
  /**
   * Bumped whenever the server tells us the availability we are showing is
   * stale — today only the 409 slot race. It exists because the obvious
   * "refresh" (re-setting `date` to the value it already holds) is a no-op:
   * React compares with Object.is, bails out, and the effect below never
   * re-runs because its dependencies are referentially unchanged.
   */
  const [availabilityNonce, setAvailabilityNonce] = useState(0);
  const [devotees, setDevotees] = useState<DevoteeEntry[]>([
    { name: user?.fullName ?? '', gotra: '' },
  ]);
  const [sankalp, setSankalp] = useState('');
  const [instructions, setInstructions] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedBooking | null>(null);

  const dates = useMemo(() => upcomingDateKeys(21), []);

  // ─── load the catalogue entry ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    if (!slug) {
      setLoading(false);
      setLoadError('No puja was selected.');
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${apiBase()}/api/v1/pujas/types/${encodeURIComponent(slug)}`,
        );
        const body: unknown = await res.json().catch(() => null);
        if (cancelled) return;
        const parsed = selectPujaBookingDetail(body);
        if (!parsed) {
          setLoadError(
            res.ok
              ? 'This puja could not be loaded for booking.'
              : bookingErrorMessage(body, res.status),
          );
        } else {
          setDetail(parsed);
          // One temple offers it — pre-select rather than make it a chore.
          const only = parsed.offerings.length === 1 ? parsed.offerings[0] : undefined;
          if (only) setOffering(only);
        }
      } catch {
        if (!cancelled) setLoadError('Could not reach the server. Check your connection.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // ─── load real per-slot capacity whenever temple or date changes ──────────
  useEffect(() => {
    let cancelled = false;
    setSlot(null);
    if (!offering || !date) {
      setSlotView(IDLE_SLOTS);
      return;
    }
    setSlotsLoading(true);
    (async () => {
      let reply: { ok: boolean; body: unknown } | null = null;
      try {
        // The `templeId` query name is a legacy misnomer — the handler resolves
        // an OFFERING id first (bookings.ts:1807), which is what we send.
        const res = await fetch(
          `${apiBase()}/api/v1/bookings/slots?templeId=${encodeURIComponent(
            offering.offeringId,
          )}&date=${encodeURIComponent(date)}`,
        );
        reply = { ok: res.ok, body: await res.json().catch(() => null) };
      } catch {
        // `reply` stays null, which resolveSlotAvailability reads as the
        // transport failure it is. It must NOT become an empty slot list.
        reply = null;
      }
      if (cancelled) return;
      setSlotView(resolveSlotAvailability(reply, offering.slots));
      setSlotsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [offering, date, availabilityNonce]);

  const slots = slotView.slots;
  /**
   * The CHARGED amount, not the puja price.
   *
   * This was `offeringPriceInr(detail, offering)` printed under the word
   * "Total". createBooking charges `pujaPrice + PLATFORM_FEE_INR` and the
   * Razorpay order is minted from that sum, so the very next screen — the web
   * `/bookings/pay` page this one hands off to — asked for ₹1,151 against a
   * "Total" of ₹1,100. That gap is CM-03, which the web wizard was fixed for;
   * moving checkout into the app re-created it here.
   *
   * `prasadDeliveryRequested` is false because buildCreateBookingBody sends
   * false — the app has no address picker, and the route rejects the flag
   * without an address. When that changes, pass it here and the prasad row
   * below appears on its own.
   */
  const price = bookingPriceBreakdown(detail, offering, {
    prasadDeliveryRequested: false,
  });

  async function onSubmit() {
    setSubmitError(null);
    if (!detail) return;
    if (!token) {
      Alert.alert('Sign in to book', 'You need to be signed in to book a puja.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/(auth)/login' as never) },
      ]);
      return;
    }

    let body;
    try {
      body = buildCreateBookingBody({
        pujaTypeId: detail.pujaTypeId,
        offering,
        scheduledDate: date,
        scheduledTimeSlot: slot,
        devotees,
        sankalpDetails: sankalp,
        specialInstructions: instructions,
      });
    } catch (err) {
      setSubmitError(
        err instanceof BookingInputError ? err.message : 'Please complete the form.',
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase()}/api/v1/bookings/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const replyBody: unknown = await res.json().catch(() => null);
      // Three outcomes, not two. A 2xx whose body does not parse into a booking
      // means a `pending_payment` row EXISTS and is holding a seat, so the
      // devotee must be sent to look rather than to retry — retrying is what
      // mints the second hold. See createBookingOutcome.
      const outcome = createBookingOutcome({ ok: res.ok, status: res.status, body: replyBody });
      if (outcome.kind === 'created') {
        setCreated(outcome.booking);
        return;
      }
      setSubmitError(outcome.message);
      if (outcome.kind === 'failed' && res.status === 409 && offering && date) {
        // A lost slot race is recoverable in-page: re-ask for capacity so the
        // devotee picks a slot that still exists instead of retrying the taken
        // one. It has to go through the nonce — `setDate(date)` re-assigns the
        // value the state already holds, React bails out on Object.is, and the
        // availability effect never re-runs. The grid would keep showing the
        // slot as free underneath an error saying it was taken.
        setAvailabilityNonce((n) => n + 1);
      }
    } catch {
      setSubmitError('Could not reach the server. Your booking was not created.');
    } finally {
      setSubmitting(false);
    }
  }

  // ─── confirmation ─────────────────────────────────────────────────────────
  if (created) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header title="Booking created" />
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={44} color={colors.green[600]} />
            <Text style={styles.successTitle}>
              {created.bookingNumber ?? 'Your booking'} is held
            </Text>
            <Text style={styles.successText}>
              {detail?.name ?? 'Your puja'} at {offering?.templeName ?? 'the temple'} on{' '}
              {formatDateLabel(date)} · {slotLabelFor(slots, slot)}.
            </Text>
            {/* The one thing this screen must not blur — and the amount, because
                the page it hands off to will ask for exactly this figure. */}
            <Text style={styles.successWarn}>
              Not paid yet
              {price.totalInr === null ? '' : ` — ${formatInr(price.totalInr)} due`}. The
              seat is held for a short while; complete payment to confirm it.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            accessibilityRole="link"
            accessibilityLabel={`Pay on ${hostOf(WEB.origin)}`}
            accessibilityHint={`Opens ${hostOf(
              WEB.origin,
            )} in your browser, where you sign in and then complete payment for this booking`}
            onPress={() => Linking.openURL(resumePaymentUrl(created.id, WEB.origin))}
          >
            <Ionicons name="open-outline" size={18} color={colors.white} />
            <Text style={styles.primaryBtnText}>Pay on {hostOf(WEB.origin)}</Text>
          </TouchableOpacity>
          {/* The origin could not be established from this build's API host, so
              it fell back to production. Saying nothing would send the devotee
              to a site that has never heard of the booking they just made. */}
          {WEB.matchesEnvironment ? null : (
            <Text style={styles.submitError}>
              This build talks to a different server than {hostOf(WEB.origin)}, so
              that site will not know about this booking. Set EXPO_PUBLIC_WEB_URL
              to the website that pairs with this build&apos;s API.
            </Text>
          )}
          {/* The sign-in step is real and must not be a surprise: the app's
              session lives in secure storage and the browser does not share
              it, so the website will ask who you are before it will take a
              card. The link goes to the login page carrying the booking id,
              because the payment page's own guard drops it. */}
          <Text style={styles.note}>
            Card payment happens on the website — the app does not carry a card
            form yet, and the site will ask you to sign in first. Your booking
            is already saved, so you can also pay later from My Bookings.
          </Text>

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.85}
            onPress={() => router.replace('/(devotee)/bookings' as never)}
          >
            <Text style={styles.secondaryBtnText}>Go to My Bookings</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── form ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title={detail?.name ?? passedName ?? 'Book a puja'} />

      {loading ? (
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colors.saffron[600]} />
        </View>
      ) : loadError || !detail ? (
        <View style={styles.centre}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.stone[300]} />
          <Text style={styles.errorTitle}>Booking unavailable</Text>
          <Text style={styles.errorText}>{loadError ?? 'This puja could not be loaded.'}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* 1 — temple */}
          <Text style={styles.step}>1. Where should the puja be performed?</Text>
          {detail.offerings.length === 0 ? (
            <Text style={styles.emptyNote}>
              No temple currently offers this puja. Nothing can be booked for it
              yet.
            </Text>
          ) : (
            detail.offerings.map((o) => {
              const active = offering?.offeringId === o.offeringId;
              const p = offeringPriceInr(detail, o);
              return (
                <TouchableOpacity
                  key={o.offeringId}
                  style={[styles.option, active && styles.optionActive]}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => setOffering(o)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>{o.templeName}</Text>
                    <Text style={styles.optionSub}>
                      {[o.city, o.state].filter(Boolean).join(', ') || 'Location not listed'}
                      {o.isVerified ? ' · Verified' : ''}
                    </Text>
                  </View>
                  <Text style={styles.optionPrice}>
                    {p === null ? 'Price on request' : formatInr(p)}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}

          {/* 2 — date */}
          <Text style={styles.step}>2. Which day?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {dates.map((d) => {
              const active = date === d;
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.dateChip, active && styles.dateChipActive]}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => setDate(d)}
                >
                  <Text style={[styles.dateChipDay, active && styles.chipTextActive]}>
                    {shortDay(d)}
                  </Text>
                  <Text style={[styles.dateChipNum, active && styles.chipTextActive]}>
                    {d.slice(8)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 3 — slot */}
          <Text style={styles.step}>3. What time?</Text>
          {!offering || !date ? (
            <Text style={styles.emptyNote}>Choose a temple and a day first.</Text>
          ) : slotsLoading ? (
            <Text style={styles.emptyNote}>Checking availability…</Text>
          ) : slotView.kind === 'unreadable' ? (
            /* The read failed. Say that, and say nothing about the temple —
               the old code rendered the empty-answer copy here, which told the
               devotee the temple publishes no slots and advised them to try
               another day, where the same failure repeats. */
            <Text style={styles.submitError}>
              Slot availability could not be loaded, so no times are shown. This
              is a network or server problem, not a report that the temple is
              closed that day.
            </Text>
          ) : slotView.kind === 'none' ? (
            /* The only branch entitled to make a claim about the temple: the
               server answered, and the answer was that nothing is published. */
            <Text style={styles.emptyNote}>
              This temple has published no slots for that day. Try another day.
            </Text>
          ) : (
            <View style={styles.slotWrap}>
              {slots.map((s) => {
                const bookable = isSlotBookable(s);
                const active = slot === s.time;
                return (
                  <TouchableOpacity
                    key={s.time}
                    style={[
                      styles.slotChip,
                      active && styles.slotChipActive,
                      !bookable && styles.slotChipDisabled,
                    ]}
                    disabled={!bookable}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active, disabled: !bookable }}
                    onPress={() => setSlot(s.time)}
                  >
                    <Text
                      style={[
                        styles.slotChipText,
                        active && styles.chipTextActive,
                        !bookable && styles.slotChipTextDisabled,
                      ]}
                    >
                      {s.label}
                    </Text>
                    {/* Say what the server said. "Full" and "unknown" are
                        different facts and are not merged into one word. */}
                    <Text
                      style={[
                        styles.slotChipHint,
                        active && styles.chipTextActive,
                        !bookable && styles.slotChipTextDisabled,
                      ]}
                    >
                      {s.remaining === null
                        ? 'availability unknown'
                        : s.remaining === 0
                          ? 'full'
                          : `${s.remaining} left`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* The catalogue's own slots, shown because the server resolved no
              capacity for them. They are deliberately unselectable — an unknown
              seat count is not an available seat — so the reason has to be on
              screen next to them or the grid just looks broken. */}
          {offering && date && !slotsLoading && slotView.kind === 'published' ? (
            <Text style={styles.emptyNote}>
              These are the times this temple publishes, but live availability
              could not be confirmed for this day, so none can be selected yet.
            </Text>
          ) : null}

          {/* One retry, for both failure shapes. A disabled grid or an error
              with no way to ask again is a dead end — the whole screen ends
              there. It bumps the nonce because that is the only dependency of
              the availability effect a tap can actually change: re-assigning
              `date` to itself is a no-op React bails out of. */}
          {offering && date && !slotsLoading &&
          (slotView.kind === 'unreadable' || slotView.kind === 'published') ? (
            <TouchableOpacity
              style={styles.retryBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Retry availability"
              accessibilityHint="Checks slot availability for this temple and day again"
              onPress={() => setAvailabilityNonce((n) => n + 1)}
            >
              <Ionicons name="refresh" size={16} color={colors.saffron[600]} />
              <Text style={styles.retryBtnText}>Check availability again</Text>
            </TouchableOpacity>
          ) : null}

          {/* 4 — sankalp names */}
          <Text style={styles.step}>4. In whose name?</Text>
          <Text style={styles.stepHint}>
            The sankalp is taken in these names. Gotra is optional.
          </Text>
          {devotees.map((d, i) => (
            <View key={i} style={styles.devoteeRow}>
              <TextInput
                style={[styles.input, { flex: 2 }]}
                placeholder="Full name"
                placeholderTextColor={colors.stone[400]}
                value={d.name}
                onChangeText={(t) =>
                  setDevotees((prev) => prev.map((p, j) => (j === i ? { ...p, name: t } : p)))
                }
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Gotra"
                placeholderTextColor={colors.stone[400]}
                value={d.gotra}
                onChangeText={(t) =>
                  setDevotees((prev) => prev.map((p, j) => (j === i ? { ...p, gotra: t } : p)))
                }
              />
              {devotees.length > 1 ? (
                <TouchableOpacity
                  onPress={() => setDevotees((prev) => prev.filter((_, j) => j !== i))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove devotee ${i + 1}`}
                  style={styles.removeBtn}
                >
                  <Ionicons name="close" size={18} color={colors.stone[500]} />
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            onPress={() => setDevotees((prev) => [...prev, { name: '', gotra: '' }])}
          >
            <Ionicons name="add" size={16} color={colors.saffron[600]} />
            <Text style={styles.addBtnText}>Add another name</Text>
          </TouchableOpacity>

          {/* 5 — optional detail */}
          <Text style={styles.step}>5. Anything else? (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Sankalp details — the intention behind the puja"
            placeholderTextColor={colors.stone[400]}
            value={sankalp}
            onChangeText={setSankalp}
            multiline
          />
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Instructions for the pandit"
            placeholderTextColor={colors.stone[400]}
            value={instructions}
            onChangeText={setInstructions}
            multiline
          />

          {/* summary + submit.
              Itemised, because the total is not the puja price: the server
              adds a flat platform fee to every booking and mints the Razorpay
              order from the sum. Printing the puja price alone under "Total"
              is what made the pay page quote a bigger number than this screen
              had promised. */}
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Puja</Text>
            <Text style={styles.feeValue}>
              {price.pujaPriceInr === null
                ? 'Price on request'
                : formatInr(price.pujaPriceInr)}
            </Text>
          </View>
          {price.pujaPriceInr === null ? null : (
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Platform fee</Text>
              <Text style={styles.feeValue}>{formatInr(price.platformFeeInr)}</Text>
            </View>
          )}
          {price.pujaPriceInr !== null && price.prasadFeeInr > 0 ? (
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Prasad delivery</Text>
              <Text style={styles.feeValue}>{formatInr(price.prasadFeeInr)}</Text>
            </View>
          ) : null}
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>
              {price.totalInr === null ? 'Price on request' : formatInr(price.totalInr)}
            </Text>
          </View>

          {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
            activeOpacity={0.85}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityState={{ disabled: submitting }}
            onPress={onSubmit}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.white} />
            <Text style={styles.primaryBtnText}>
              {submitting ? 'Booking…' : 'Confirm booking'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.note}>
            This reserves your slot. Payment is the next step and happens on{' '}
            {hostOf(WEB.origin)}.
          </Text>

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Header({ title }: { title: string }) {
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
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

function shortDay(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { weekday: 'short' });
}

function formatDateLabel(key: string | null): string {
  if (!key) return 'the chosen day';
  const d = new Date(`${key}T00:00:00`);
  return Number.isNaN(d.getTime()) ? key : d.toLocaleDateString('en-IN');
}

function slotLabelFor(slots: BookableSlot[], time: string | null): string {
  if (!time) return 'the chosen time';
  return slots.find((s) => s.time === time)?.label ?? time;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  errorTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.stone[700] },
  errorText: { fontSize: fontSize.sm, color: colors.stone[500], textAlign: 'center' },
  body: { padding: spacing.md },
  step: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.stone[900],
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  stepHint: { fontSize: fontSize.sm, color: colors.stone[500], marginBottom: spacing.sm },
  emptyNote: { fontSize: fontSize.sm, color: colors.stone[500], paddingVertical: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone[200],
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionActive: { borderColor: colors.saffron[600], borderWidth: 2 },
  optionTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  optionSub: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  optionPrice: { fontSize: fontSize.base, fontWeight: '800', color: colors.saffron[700] },
  chipScroll: { marginBottom: spacing.xs },
  dateChip: {
    width: 56,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone[200],
    marginRight: spacing.sm,
  },
  dateChipActive: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[600] },
  dateChipDay: { fontSize: fontSize.xs, color: colors.stone[500], fontWeight: '600' },
  dateChipNum: { fontSize: fontSize.lg, color: colors.stone[900], fontWeight: '800' },
  chipTextActive: { color: colors.white },
  slotWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slotChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone[200],
  },
  slotChipActive: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[600] },
  slotChipDisabled: { backgroundColor: colors.stone[100], borderColor: colors.stone[200] },
  slotChipText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.stone[800] },
  slotChipHint: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  slotChipTextDisabled: { color: colors.stone[400] },
  devoteeRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone[200],
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: fontSize.base,
    color: colors.stone[900],
  },
  multiline: { minHeight: 72, textAlignVertical: 'top', marginBottom: spacing.sm },
  removeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing.xs },
  addBtnText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.saffron[600] },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.saffron[600],
  },
  retryBtnText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.saffron[600] },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  feeLabel: { fontSize: fontSize.sm, color: colors.stone[600] },
  feeValue: { fontSize: fontSize.sm, color: colors.stone[700], fontWeight: '600' },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.stone[200],
  },
  summaryLabel: { fontSize: fontSize.base, color: colors.stone[600], fontWeight: '600' },
  summaryValue: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.saffron[700] },
  submitError: {
    marginTop: spacing.sm,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: colors.red[500],
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    color: colors.red[600],
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: colors.saffron[600],
    borderRadius: borderRadius.md,
    paddingVertical: 14,
  },
  primaryBtnDisabled: { backgroundColor: colors.stone[300] },
  primaryBtnText: { color: colors.white, fontWeight: '800', fontSize: fontSize.base },
  secondaryBtn: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone[300],
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { color: colors.stone[700], fontWeight: '700', fontSize: fontSize.base },
  note: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.stone[500],
    lineHeight: 19,
  },
  successCard: {
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    padding: spacing.lg,
  },
  successTitle: { fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
  successText: { fontSize: fontSize.sm, color: colors.stone[600], textAlign: 'center', lineHeight: 20 },
  successWarn: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.amber[700],
    textAlign: 'center',
  },
});
