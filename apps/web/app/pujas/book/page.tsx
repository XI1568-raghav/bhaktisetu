'use client';

import { Suspense, useState, useEffect, useCallback, useId, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
 ChevronRight,
 ChevronLeft,
 ChevronDown,
 ChevronUp,
 Flame,
 Clock,
 MapPin,
 Calendar,
 Users,
 Plus,
 Trash2,
 CheckCircle2,
 CreditCard,
 Shield,
 Video,
 Gift,
 Loader2,
 AlertCircle,
 Home,
 Package,
 Star,
 BadgeCheck,
 IndianRupee,
 Sun,
 Sunrise,
 Sunset,
 Check,
 X,
 ArrowRight,
 PartyPopper,
 Copy,
 ExternalLink,
 Sparkles,
 RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import { DateInput } from '../../../components/ui/DateInput';
import { formatTrustScoreOutOf, hasMeaningfulTrustScore } from '../../../lib/trust-score';

// PostHog never throws on capture, but its singleton may not be initialised
// in preview/demo (no NEXT_PUBLIC_POSTHOG_KEY). We gate every call on
// __loaded and wrap in try/catch so analytics can never break checkout.
function safeCapture(event: string, props: Record<string, string | number | boolean | undefined>) {
 try {
  if (typeof window === 'undefined' || !window.posthog) return;
  const cleaned: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
   if (v !== undefined) cleaned[k] = v;
  }
  window.posthog.capture(event, cleaned);
 } catch {
  // never block the user
 }
}

// ─── Types ──────────────────────────────────────────────────────

interface MuhuratWindow {
 from: string;
 to: string;
 label: string;
}
interface PujaMuhuratDay {
 date: string;
 grade: 'shubh' | 'neutral' | 'avoid';
 score: number;
 windows: MuhuratWindow[];
 rahuKaal: string;
 flags: string[];
}

// Puja slugs that map to a classical muhurat ruleset. Everything else keeps a
// muhurat-blind picker (no fabricated auspiciousness).
const PUJA_TYPE_BY_SLUG: Record<string, 'GRIHA_PRAVESH' | 'SATYANARAYAN'> = {
 'griha-pravesh': 'GRIHA_PRAVESH',
 'griha-pravesh-puja': 'GRIHA_PRAVESH',
 'griha-pravesam': 'GRIHA_PRAVESH',
 'satyanarayan': 'SATYANARAYAN',
 'satyanarayan-puja': 'SATYANARAYAN',
 'satyanarayan-katha': 'SATYANARAYAN',
 'satyanarayana-puja': 'SATYANARAYAN',
};

interface TempleOption {
 id: string;
 templeName: string;
 templeSlug: string;
 templeCity: string;
 templeState: string;
 priceOverride: string | null;
 availableSlots: { time: string; label: string }[];
 isActive: boolean;
 trustScore: number;
 isVerified: boolean;
}

interface PujaInfo {
 id: string;
 name: string;
 slug: string;
 deity: string;
 durationMinutes: number;
 basePrice: string;
 nriPrice: string;
 category: string;
 samagriIncluded: boolean;
 temples: TempleOption[];
}

interface Devotee {
 id: string;
 name: string;
 gotra: string;
 nakshatra: string;
}

interface SlotAvailability {
 time: string;
 label: string;
 remaining: number;
 total: number;
}

// ─── Constants ──────────────────────────────────────────────────

const NAKSHATRAS = [
 'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira',
 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha',
 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati',
 'Vishakha', 'Anuradha', 'Jyeshtha', 'Moola', 'Purva Ashadha',
 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha',
 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

const PLATFORM_FEE = 51;
const PRASAD_DELIVERY_FEE = 150;

const STEP_LABELS = ['Temple & Date', 'Devotee Details', 'Review & Prasad', 'Payment'];

// ─── Fallback puja data ─────────────────────────────────────────

function getFallbackPuja(slug: string): PujaInfo {
 const name = slug
 .split('-')
 .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
 .join(' ');

 const fallbackMap: Record<string, Partial<PujaInfo>> = {
 rudrabhishek: {
 id: '1',
 name: 'Rudrabhishek Puja',
 deity: 'Lord Shiva',
 durationMinutes: 120,
 basePrice: '1100',
 nriPrice: '5100',
 category: 'Abhishekam',
 samagriIncluded: true,
 },
 'satyanarayan-katha': {
 id: '2',
 name: 'Satyanarayan Katha',
 deity: 'Lord Vishnu',
 durationMinutes: 90,
 basePrice: '751',
 nriPrice: '3001',
 category: 'Path / Paath',
 samagriIncluded: true,
 },
 'maha-mrityunjay-jaap': {
 id: '4',
 name: 'Maha Mrityunjay Jaap',
 deity: 'Lord Shiva',
 durationMinutes: 180,
 basePrice: '1500',
 nriPrice: '5001',
 category: 'Jaap',
 samagriIncluded: true,
 },
 };

 const base = fallbackMap[slug] || {
 id: 'default',
 name: `${name} Puja`,
 deity: 'Lord Shiva',
 durationMinutes: 90,
 basePrice: '751',
 nriPrice: '3501',
 category: 'Special Puja',
 samagriIncluded: true,
 };

 return {
 slug,
 temples: [
 {
 id: 'to-1',
 templeName: 'Shri Kashi Vishwanath Temple',
 templeSlug: 'kashi-vishwanath',
 templeCity: 'Varanasi',
 templeState: 'Uttar Pradesh',
 priceOverride: null,
 availableSlots: [
 { time: '06:00', label: 'Early Morning (6:00 AM)' },
 { time: '09:00', label: 'Morning (9:00 AM)' },
 { time: '14:00', label: 'Afternoon (2:00 PM)' },
 { time: '17:00', label: 'Evening (5:00 PM)' },
 ],
 isActive: true,
 trustScore: 4.9,
 isVerified: true,
 },
 {
 id: 'to-2',
 templeName: 'Trimbakeshwar Temple',
 templeSlug: 'trimbakeshwar',
 templeCity: 'Nashik',
 templeState: 'Maharashtra',
 priceOverride: null,
 availableSlots: [
 { time: '07:00', label: 'Morning (7:00 AM)' },
 { time: '10:00', label: 'Mid-Morning (10:00 AM)' },
 { time: '16:00', label: 'Afternoon (4:00 PM)' },
 ],
 isActive: true,
 trustScore: 4.8,
 isVerified: true,
 },
 {
 id: 'to-3',
 templeName: 'Siddhivinayak Temple',
 templeSlug: 'siddhivinayak',
 templeCity: 'Mumbai',
 templeState: 'Maharashtra',
 priceOverride: null,
 availableSlots: [
 { time: '07:30', label: 'Morning (7:30 AM)' },
 { time: '11:00', label: 'Late Morning (11:00 AM)' },
 ],
 isActive: true,
 trustScore: 4.75,
 isVerified: true,
 },
 ],
 ...base,
 } as PujaInfo;
}

// ─── Helpers ────────────────────────────────────────────────────

// S2C-07 (2026-08-11): the booking window is a CALENDAR window in IST — every
// temple slot is an IST wall-clock time (scheduledTimeSlot) and the API compares
// against an IST calendar day. The old helpers mutated a local-time Date and then
// serialised with toISOString(), which converts to UTC *before* slicing the date:
// for an IST user between 00:00 and 05:29 the "tomorrow" floor resolved to TODAY
// (so the picker both defaulted to and permitted a same-day booking, and an
// already-past early slot became reachable) and the advertised 30-day ceiling was
// silently 29 days. Shifting the instant by the fixed IST offset and then reading
// the UTC calendar fields yields exactly the IST calendar date. IST has no DST,
// so a constant offset is correct year-round.
//
// M-003 (2026-08-11): these are also read once per mount now (see
// bookingWindowMin/Max) rather than on every render. A clock read during render
// is non-deterministic between the SSR pass and the first client pass whenever
// the two straddle a date boundary — the hazard class behind React hydration
// error #418. (Measured: at 02:00 IST the old helpers returned min=TODAY and a
// 29-day span; the new ones return min=tomorrow and the full 30-day span, and
// the result no longer depends on the runtime's timezone at all.)
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function istDatePlusDays(days: number, now: Date = new Date()): string {
 const shifted = new Date(now.getTime() + IST_OFFSET_MS + days * DAY_MS);
 return shifted.toISOString().split('T')[0] as string;
}

function getTomorrow(): string {
 return istDatePlusDays(1);
}

function getMaxDate(): string {
 return istDatePlusDays(30);
}

function formatDate(dateStr: string): string {
 const d = new Date(dateStr + 'T00:00:00');
 return d.toLocaleDateString('en-IN', {
 weekday: 'long',
 day: 'numeric',
 month: 'long',
 year: 'numeric',
 });
}

function getSlotPeriod(time: string): 'morning' | 'afternoon' | 'evening' {
 const hour = parseInt(time.split(':')[0] ?? '0', 10);
 if (hour < 12) return 'morning';
 if (hour < 17) return 'afternoon';
 return 'evening';
}

function getSlotPeriodIcon(period: string) {
 switch (period) {
 case 'morning':
 return Sunrise;
 case 'afternoon':
 return Sun;
 case 'evening':
 return Sunset;
 default:
 return Clock;
 }
}

// S2C-05 (2026-08-11): generateBookingNumber() was deleted. It minted a
// client-side `BS-YYYYMMDD-XXXXX` string that was then rendered as the headline
// confirmation number with a Copy button whenever the server did not return one.
// That is a fabricated financial reference: no PujaBooking row can ever match it
// (real numbers are server-generated with a uniqueness loop over an alphanumeric
// charset, so an all-digit suffix is provably not server-issued), and support
// cannot reconcile a payment from it. The booking number now comes only from the
// API — see handlePayment below.

// ─── Load Razorpay ──────────────────────────────────────────────

// Razorpay's checkout.js attaches a constructor to window; we don't ship its
// types so describe just the surface we use.
type RazorpayInstance = {
 open: () => void;
 on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
};
type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;
type RazorpayWindow = typeof window & { Razorpay?: RazorpayConstructor };

const loadRazorpay = (): Promise<RazorpayConstructor | undefined> => {
 return new Promise((resolve) => {
 const w = window as RazorpayWindow;
 if (w.Razorpay) {
 resolve(w.Razorpay);
 return;
 }
 const script = document.createElement('script');
 script.src = 'https://checkout.razorpay.com/v1/checkout.js';
 script.onload = () => resolve((window as RazorpayWindow).Razorpay);
 document.body.appendChild(script);
 });
};

// The literal placeholder the API ships when RAZORPAY_KEY_ID is unset. A real
// Razorpay *test* key (rzp_test_<random>) is a valid key and is left alone —
// only this exact sentinel means "no gateway is configured".
const RAZORPAY_PLACEHOLDER_KEY = 'rzp_test_demo';
const DEMO_PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_ALLOW_DEMO_PAYMENTS === 'true';

// Resolve the publishable Razorpay key from the API's /payments/config, so the
// client uses the SAME key the server minted the order with. KEY_SECRET never
// touches the browser.
//
// S2C-08 (2026-08-11): this used to fall through to
// `process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_demo'` on BOTH the catch
// and the non-ok path, with nothing surfaced to the user. One blip opened LIVE
// checkout with a placeholder key against a real order_id — Razorpay rejects the
// pairing, the devotee gets an opaque gateway error, and the pending_payment
// booking that create-order already wrote is stranded holding slot capacity.
// Three changes: (1) never substitute a fake key — resolve to null and let the
// caller abort loudly; (2) never memoise a failure — this promise is module
// scoped and survives client-side navigations, so a cached null would poison
// checkout for the whole module lifetime; (3) drop the build-time env fallback,
// which can silently disagree with the server that minted the order (the very
// failure this finding is about) and is redundant now that create-order returns
// razorpayKeyId directly — see handlePayment.
let razorpayKeyPromise: Promise<string | null> | null = null;
const getRazorpayKey = (): Promise<string | null> => {
 if (razorpayKeyPromise) return razorpayKeyPromise;
 const pending = (async (): Promise<string | null> => {
 try {
 const res = await fetch(`${API_BASE_URL}/payments/config`);
 if (res.ok) {
 const j = (await res.json()) as { keyId?: string | null };
 if (j.keyId) return j.keyId;
 }
 } catch {
 // no placeholder key is ever substituted — fall through to null
 }
 return null;
 })();
 razorpayKeyPromise = pending;
 void pending.then((key) => {
 if (!key && razorpayKeyPromise === pending) razorpayKeyPromise = null;
 });
 return pending;
};

// A key is usable only if it exists and is not the "no gateway configured"
// sentinel. The sentinel is accepted only when this build is explicitly in demo
// mode, where no real money can move.
function isUsableRazorpayKey(key: string | null | undefined): key is string {
 if (!key) return false;
 if (key === RAZORPAY_PLACEHOLDER_KEY) return DEMO_PAYMENTS_ENABLED;
 return true;
}

// ─── Component ──────────────────────────────────────────────────

function PujaBookingInner() {
 const searchParams = useSearchParams();
 // M-001 (2026-08-11): a bare /pujas/book (or one carrying the wrong param, e.g.
 // ?puja=) yields an empty slug. That used to be fetched as `/pujas/types/` and
 // reported as "check your connection", blaming the network for a missing
 // parameter. Catalogue slugs are lowercase kebab-case; anything else is a bad
 // link, not an outage — so a malformed value is answered as "not in the
 // catalogue" without a pointless round trip, and only the validated form is
 // ever fetched or echoed back to the user.
 const rawSlug = (searchParams.get('slug') ?? '').trim();
 const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rawSlug.toLowerCase())
 ? rawSlug.toLowerCase()
 : '';
 const preselectedTemple = searchParams.get('temple') || '';
 const { user, session, isAuthenticated } = useAuth();

 // Data state
 const [puja, setPuja] = useState<PujaInfo | null>(null);
 const [loading, setLoading] = useState(true);
 // PBO-7 (2026-07-09): honest load-failure state. Previously a fetch failure
 // silently substituted hardcoded mock puja data (getFallbackPuja) + fake slot
 // availability, then submitted the mock templeOfferingId — a real booking
 // against fabricated catalog data. Now we surface the failure + a retry.
 //
 // M-001 (2026-08-11): the flag became a kind so the three genuinely different
 // causes stop sharing one misleading message —
 //   'missing-slug' no puja was specified in the URL (nothing to retry)
 //   'not-found'    the catalog answered, and has no such puja (nothing to retry)
 //   'network'      we could not reach the catalog (retry is the right advice)
 type LoadErrorKind = 'missing-slug' | 'not-found' | 'network';
 const [loadError, setLoadError] = useState<LoadErrorKind | null>(null);

 // Wizard state
 const [currentStep, setCurrentStep] = useState(0);

 // Step 1
 const [selectedTempleId, setSelectedTempleId] = useState('');
 const [selectedDate, setSelectedDate] = useState(getTomorrow);
 const [selectedSlot, setSelectedSlot] = useState('');
 // S2C-07: the picker floor/ceiling are read once per mount instead of on every
 // render, so the window cannot shift under the user mid-session (and cannot
 // disagree with the `selectedDate` default that was seeded from the same clock).
 const bookingWindowMin = useMemo(() => getTomorrow(), []);
 const bookingWindowMax = useMemo(() => getMaxDate(), []);
 const [slotAvailability, setSlotAvailability] = useState<SlotAvailability[]>([]);
 const [loadingSlots, setLoadingSlots] = useState(false);
 // PBO-7: honest slot-load failure flag (no mock availability fallback).
 const [slotsError, setSlotsError] = useState(false);

 // Muhurat guidance (per-puja shubh-window layer). Populated only for puja
 // types with a classical scoring ruleset (Griha Pravesh + Satyanarayan); the
 // rest of the catalog keeps a muhurat-blind picker. Drives green shubh badges,
 // disabled avoid-days, and the day's bookable-window hint chips.
 const [muhuratDays, setMuhuratDays] = useState<PujaMuhuratDay[]>([]);

 // Step 2
 // M-003 (2026-08-11): devotee ids used to be Math.random() evaluated inside the
 // useState initialiser, i.e. during render — the server pass and the first client
 // pass produced different values on every single load. Today these ids only ever
 // surface as React keys (never as DOM text or attributes), so this was the
 // hydration-error-#418 hazard class rather than a proven trigger; removing it
 // makes the component deterministic on first render either way. useId() is stable
 // across both passes and a ref counter keeps later ids unique without touching
 // Math.random or the clock. Ids are internal only — they are never submitted.
 const idBase = useId();
 const devoteeSeq = useRef(1);
 const [devotees, setDevotees] = useState<Devotee[]>(() => [
 { id: `${idBase}-d0`, name: '', gotra: '', nakshatra: '' },
 ]);
 const [sankalp, setSankalp] = useState('');
 const [specialInstructions, setSpecialInstructions] = useState('');

 // AI Sankalp Generator
 const [aiSankalpLoading, setAiSankalpLoading] = useState(false);
 const [aiSankalpError, setAiSankalpError] = useState(false);
 const [aiSankalpResult, setAiSankalpResult] = useState<{
 sanskrit: string;
 transliteration: string;
 englishTranslation: string;
 hindiTranslation: string;
 } | null>(null);
 const [aiSankalpExpanded, setAiSankalpExpanded] = useState(true);

 // Step 3
 const [wantsPrasad, setWantsPrasad] = useState(false);
 const [address, setAddress] = useState({
 fullName: '',
 line1: '',
 line2: '',
 city: '',
 state: '',
 pincode: '',
 phone: '',
 });
 const [agreedTerms, setAgreedTerms] = useState(false);

 // Step 4 / Success
 const [paymentLoading, setPaymentLoading] = useState(false);
 const [paymentError, setPaymentError] = useState('');
 const [bookingSuccess, setBookingSuccess] = useState(false);
 // P0 #PBO-16 (2026-07-09): in-flight create-order guard. paymentLoading is
 // state (async re-render) so a rapid double-click before the spinner paints
 // can fire create-order twice -> two booking rows + two Razorpay orders
 // (slot overbooking + orphan pending bookings). This ref is set synchronously
 // on entry and reset only on terminal failure (NOT on Razorpay modal dismiss,
 // so a dismiss + re-click doesn't create a second order for the same attempt).
 const creatingOrderRef = useRef(false);
 const [bookingNumber, setBookingNumber] = useState('');

 // The INR/USD toggle was removed 2026-08-10 with the Stripe rail: it defaulted
 // to USD for any browser outside Asia/Kolkata and paid via a now-deleted route.
 // Razorpay is the only gateway; NRI premium pricing returns with PayPal.

 // ─── Validation errors ──────────────────────────────────────
 const [errors, setErrors] = useState<Record<string, string>>({});

 // ─── Fetch puja data ────────────────────────────────────────
 // PBO-7 (2026-07-09): on fetch failure show an honest "could not load" state
 // with a retry — do NOT substitute mock catalog data (getFallbackPuja), which
 // previously led to submitting a fabricated templeOfferingId. retryTick lets
 // the user re-trigger the fetch without a full page reload.
 const [retryTick, setRetryTick] = useState(0);
 useEffect(() => {
 // M-001: nothing usable to fetch. An absent param and a malformed one are
 // different mistakes, and neither is a network problem — so neither fires
 // `/pujas/types/` nor gets the "check your connection" screen.
 if (!slug) {
 setLoadError(rawSlug ? 'not-found' : 'missing-slug');
 setLoading(false);
 return;
 }
 let cancelled = false;
 async function fetchPuja() {
 try {
 const res = await fetch(`${API_BASE_URL}/pujas/types/${encodeURIComponent(slug)}`);
 if (res.ok) {
 const data = await res.json();
 if (!cancelled) { setPuja(data); setLoadError(null); }
 } else {
 // M-001: a 404 is the catalog answering "no such puja" — it proves the
 // network is fine, so never blame the connection or offer a retry.
 if (!cancelled) { setLoadError(res.status === 404 ? 'not-found' : 'network'); }
 }
 } catch {
 if (!cancelled) { setLoadError('network'); }
 } finally {
 if (!cancelled) { setLoading(false); }
 }
 }
 fetchPuja();
 return () => { cancelled = true; };
 }, [slug, rawSlug, retryTick]);

 // Pre-select temple from URL param
 useEffect(() => {
 if (puja && preselectedTemple) {
 // S2C-11: ?temple= must not be able to preselect a deactivated offering.
 const temple = puja.temples.find(
 (t) => t.templeSlug === preselectedTemple && t.isActive !== false,
 );
 if (temple) setSelectedTempleId(temple.id);
 }
 }, [puja, preselectedTemple]);

 // ─── Derived ────────────────────────────────────────────────
 // S2C-11 (2026-08-11): only offerings that are actually bookable may be shown
 // or selected. The API already filters templeOfferings on isActive, so this is
 // defence in depth on a field the client contract declares (TempleOption.isActive)
 // — `!== false` keeps a response that omits the flag from emptying the list.
 const bookableTemples = useMemo(
 () => (puja?.temples ?? []).filter((t) => t.isActive !== false),
 [puja],
 );

 const selectedTemple = useMemo(
 () => bookableTemples.find((t) => t.id === selectedTempleId) ?? null,
 [bookableTemples, selectedTempleId],
 );

 const basePrice = useMemo(() => {
 if (!puja || !selectedTemple) return 0;
 return Number(selectedTemple.priceOverride || puja.basePrice);
 }, [puja, selectedTemple]);

 const totalPrice = useMemo(() => {
 let total = basePrice + PLATFORM_FEE;
 if (wantsPrasad) total += PRASAD_DELIVERY_FEE;
 return total;
 }, [basePrice, wantsPrasad]);

 // USD price comes straight from PujaType.nriPrice — already encodes
 // the 9-10x diaspora multiplier configured per puja type. We do not
 // add platform/prasad surcharges to NRI orders to keep the headline
 // price simple at the diaspora segment.
 const nriUsdPrice = useMemo(() => {
 if (!puja) return 0;
 return Number(puja.nriPrice || 0);
 }, [puja]);

 // ─── Fetch slot availability ────────────────────────────────
 useEffect(() => {
 if (!selectedTemple || !selectedDate) {
 setSlotAvailability([]);
 return;
 }

 async function fetchSlots() {
 setLoadingSlots(true);
 setSlotsError(false);
 try {
 const res = await fetch(
 `${API_BASE_URL}/bookings/slots?templeId=${selectedTemple!.id}&date=${selectedDate}`,
 );
 if (res.ok) {
 const data = await res.json();
 setSlotAvailability(data.slots);
 } else {
 throw new Error('API unavailable');
 }
 } catch {
 // PBO-7 (2026-07-09): do NOT fabricate mock slot availability. The old
 // fallback generated random `remaining` counts, letting the user "book" a
 // slot that may not exist. Surface the failure so the user can retry.
 setSlotAvailability([]);
 setSlotsError(true);
 } finally {
 setLoadingSlots(false);
 }
 }
 fetchSlots();
 setSelectedSlot('');
 }, [selectedTemple, selectedDate]);

 // ─── Fetch per-puja muhurat guidance (shubh-window layer) ──────
 useEffect(() => {
 if (!puja) return;
 const pujaType = PUJA_TYPE_BY_SLUG[puja.slug];
 if (!pujaType) {
 setMuhuratDays([]);
 return;
 }
 let cancelled = false;
 (async () => {
 try {
 const res = await fetch(
 `${API_BASE_URL}/panchang/puja-muhurat?pujaType=${pujaType}&days=60`,
 );
 if (!res.ok) throw new Error('muhurat unavailable');
 const data = await res.json();
 if (!cancelled) setMuhuratDays(data.results ?? []);
 } catch {
 // Muhurat guidance is advisory — never block the picker on it.
 if (!cancelled) setMuhuratDays([]);
 }
 })();
 return () => {
 cancelled = true;
 };
 }, [puja]);

 const muhuratMarkers = useMemo(() => {
 const m: Record<string, 'shubh' | 'neutral' | 'avoid'> = {};
 for (const d of muhuratDays) m[d.date] = d.grade;
 return m;
 }, [muhuratDays]);

 const avoidDates = useMemo(
 () => new Set(muhuratDays.filter((d) => d.grade === 'avoid').map((d) => d.date)),
 [muhuratDays],
 );

 const selectedDayMuhurat = useMemo(
 () => muhuratDays.find((d) => d.date === selectedDate),
 [muhuratDays, selectedDate],
 );

 // ─── Validation ─────────────────────────────────────────────

 const validateStep = useCallback(
 (step: number): boolean => {
 const errs: Record<string, string> = {};

 if (step === 0) {
 if (!selectedTempleId) errs.temple = 'Please select a temple';
 if (!selectedDate) errs.date = 'Please select a date';
 if (!selectedSlot) errs.slot = 'Please select a time slot';
 }

 if (step === 1) {
 devotees.forEach((d, i) => {
 if (!d.name.trim()) errs[`devotee_${i}_name`] = 'Name is required';
 });
 }

 if (step === 2) {
 if (!agreedTerms) errs.terms = 'Please agree to the terms & conditions';
 if (wantsPrasad) {
 if (!address.fullName.trim()) errs.addr_name = 'Name is required';
 if (!address.line1.trim()) errs.addr_line1 = 'Address line 1 is required';
 if (!address.city.trim()) errs.addr_city = 'City is required';
 if (!address.state.trim()) errs.addr_state = 'State is required';
 if (!address.pincode.trim()) errs.addr_pincode = 'Pincode is required';
 else if (!/^\d{6}$/.test(address.pincode.trim()))
 errs.addr_pincode = 'Enter valid 6-digit pincode';
 if (!address.phone.trim()) errs.addr_phone = 'Phone is required';
 else if (!/^[6-9]\d{9}$/.test(address.phone.trim()))
 errs.addr_phone = 'Enter valid 10-digit phone number';
 }
 }

 setErrors(errs);
 return Object.keys(errs).length === 0;
 },
 [selectedTempleId, selectedDate, selectedSlot, devotees, agreedTerms, wantsPrasad, address],
 );

 // ─── Navigation ─────────────────────────────────────────────

 const goNext = useCallback(() => {
 if (validateStep(currentStep)) {
 setCurrentStep((prev) => Math.min(prev + 1, 3));
 window.scrollTo({ top: 0, behavior: 'smooth' });
 }
 }, [currentStep, validateStep]);

 const goBack = useCallback(() => {
 setCurrentStep((prev) => Math.max(prev - 1, 0));
 setErrors({});
 window.scrollTo({ top: 0, behavior: 'smooth' });
 }, []);

 // ─── Devotee management ─────────────────────────────────────

 const addDevotee = () => {
 if (devotees.length < 5) {
 const id = `${idBase}-d${devoteeSeq.current++}`;
 setDevotees([...devotees, { id, name: '', gotra: '', nakshatra: '' }]);
 }
 };

 const removeDevotee = (id: string) => {
 if (devotees.length > 1) {
 setDevotees(devotees.filter((d) => d.id !== id));
 }
 };

 const updateDevotee = (id: string, field: keyof Devotee, value: string) => {
 setDevotees(devotees.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
 };

 // ─── Payment ────────────────────────────────────────────────

 const handlePayment = async () => {
 // P0 #PBO-16: block a second create-order while one is in flight (double-
 // click, or dismiss + re-click). Reset only on a real failure below.
 if (creatingOrderRef.current) return;
 creatingOrderRef.current = true;

 if (!isAuthenticated) {
 creatingOrderRef.current = false;
 window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`;
 return;
 }

 safeCapture('booking_started', {
 pujaSlug: slug,
 templeSlug: selectedTemple?.templeSlug,
 priceInr: totalPrice,
 });

 setPaymentLoading(true);
 setPaymentError('');

 try {
 // Step 1: Create order on backend. If this fails (network, 4xx, 5xx,
 // malformed body) we surface the error and abort. The previous
 // synthetic-orderId fallback was a money bug: it sent the user to
 // Razorpay with a fake order_id, which would either fail late or —
 // worse — bind to someone else's order on the gateway side.
 let orderId: string;
 let razorpayOrderId: string;
 let amount: number;
 // S2C-05 / S2C-08 (2026-08-11): create-order already returns the authoritative,
 // server-generated bookingNumber and the razorpayKeyId the order was minted
 // with. Both used to be discarded here, which forced the success screen to
 // fabricate a booking number and forced checkout to re-fetch (and then fake)
 // the key. Keep them.
 let orderBookingNumber = '';
 let orderRazorpayKeyId = '';

 const res = await fetch(`${API_BASE_URL}/bookings/create-order`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 Authorization: `Bearer ${session?.accessToken}`,
 },
 body: JSON.stringify({
 pujaSlug: slug,
 templeOfferingId: selectedTempleId,
 scheduledDate: selectedDate,
 scheduledTime: selectedSlot,
 devotees: devotees.map((d) => ({
 name: d.name,
 gotra: d.gotra || undefined,
 nakshatra: d.nakshatra || undefined,
 })),
 sankalp: sankalp || undefined,
 specialInstructions: specialInstructions || undefined,
 prasadDelivery: wantsPrasad,
 deliveryAddress: wantsPrasad ? address : undefined,
 }),
 }).catch(() => null);

 if (!res || !res.ok) {
 const message = res
 ? `Could not create your booking (${res.status}). Please try again or contact support at ${'support@darshya.online'}.`
 : 'Network error reaching the booking service. Check your connection and try again.';
 setPaymentError(message);
 setPaymentLoading(false);
 creatingOrderRef.current = false;
 return;
 }

 const data = await res.json().catch(() => null);
 if (!data?.orderId || !data?.razorpayOrderId || !data?.amount) {
 setPaymentError('Booking service returned an unexpected response. Please try again.');
 setPaymentLoading(false);
 creatingOrderRef.current = false;
 return;
 }
 orderId = data.orderId;
 razorpayOrderId = data.razorpayOrderId;
 amount = data.amount;
 orderBookingNumber = typeof data.bookingNumber === 'string' ? data.bookingNumber : '';
 orderRazorpayKeyId = typeof data.razorpayKeyId === 'string' ? data.razorpayKeyId : '';

 // Step 2: Open Razorpay checkout
 const Razorpay = await loadRazorpay();
 if (!Razorpay) {
 setPaymentError('Could not load Razorpay checkout. Please retry.');
 setPaymentLoading(false);
 creatingOrderRef.current = false;
 return;
 }

 // S2C-08: prefer the key create-order minted this very order with; only fall
 // back to /payments/config (same API, same env var) when the response omitted
 // it. If neither yields a usable key we STOP — opening checkout with the
 // 'rzp_test_demo' placeholder against a live order_id only produces an opaque
 // gateway error and a stranded pending_payment booking.
 const razorpayKey = isUsableRazorpayKey(orderRazorpayKeyId)
 ? orderRazorpayKeyId
 : await getRazorpayKey();
 if (!isUsableRazorpayKey(razorpayKey)) {
 setPaymentError(
 'Payments are temporarily unavailable — the payment gateway is not configured, ' +
 'so we did not open checkout. You have NOT been charged. Please try again in a ' +
 'few minutes, or email support@darshya.online and we will complete this booking ' +
 'for you.',
 );
 setPaymentLoading(false);
 creatingOrderRef.current = false;
 return;
 }

 const options = {
 key: razorpayKey,
 amount,
 currency: 'INR',
 name: 'Darshya',
 description: `${puja?.name} at ${selectedTemple?.templeName}`,
 order_id: razorpayOrderId,
 prefill: {
 name: user?.fullName || '',
 contact: user?.phone || '',
 email: user?.email || '',
 },
 theme: {
 color: '#ea580c',
 },
 handler: async (response: any) => {
 // Step 3: Verify payment server-side. Razorpay's client-side handler
 // fires even on signature-mismatch attacks; the backend's HMAC check
 // is the source of truth. If verify-payment returns non-200, do NOT
 // show booking success — surface a "payment received but verification
 // pending" message and prompt the user to contact support with the
 // razorpay_payment_id so we can reconcile manually.
 const verifyRes = await fetch(`${API_BASE_URL}/bookings/verify-payment`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 Authorization: `Bearer ${session?.accessToken}`,
 },
 body: JSON.stringify({
 orderId,
 razorpayPaymentId: response.razorpay_payment_id,
 razorpayOrderId: response.razorpay_order_id,
 razorpaySignature: response.razorpay_signature,
 }),
 }).catch(() => null);

 if (!verifyRes || !verifyRes.ok) {
 setPaymentError(
 `Payment received (id: ${response.razorpay_payment_id}) but we could not confirm your booking. ` +
 `Please email support@darshya.online with this payment ID and we'll reconcile within 24 hours.`,
 );
 setPaymentLoading(false);
 creatingOrderRef.current = false;
 return;
 }

 // S2C-05 (2026-08-11): use only server-issued booking numbers. First choice
 // is verify-payment's; if its body was truncated or unparseable, fall back to
 // the one create-order returned for this same booking (also server-issued and
 // collision-checked). We never synthesise one — a fabricated BS- reference
 // matches no PujaBooking row, so support cannot reconcile the payment from it.
 const verifyData = await verifyRes.json().catch(() => null);
 const verifiedNumber =
 typeof verifyData?.bookingNumber === 'string' ? verifyData.bookingNumber : '';
 const bkNum = verifiedNumber || orderBookingNumber;
 if (!bkNum) {
 // Payment IS captured and the booking IS confirmed server-side at this
 // point — we simply cannot name it. Show the payment id (which support can
 // reconcile against) rather than inventing a booking number.
 setPaymentError(
 `Payment received (id: ${response.razorpay_payment_id}) and your booking is confirmed, ` +
 `but we could not read back its booking number. Please check My Bookings, or email ` +
 `support@darshya.online with this payment ID and we'll send it within 24 hours.`,
 );
 setPaymentLoading(false);
 // S2C-05: deliberately do NOT release creatingOrderRef here. The payment is
 // already captured and the booking confirmed; re-clicking Pay would POST
 // create-order again, and with no 'initiated' payment left to reuse the
 // server would mint a second Razorpay order — a second charge for one puja.
 return;
 }
 safeCapture('payment_success', {
 bookingId: bkNum,
 amountInr: totalPrice,
 currency: 'INR',
 });
 setBookingNumber(bkNum);
 setBookingSuccess(true);
 setPaymentLoading(false);
 creatingOrderRef.current = false;
 },
 modal: {
 ondismiss: () => {
 setPaymentLoading(false);
 // P0 #PBO-16: release the in-flight guard so the user can retry. A retry
 // re-POSTs create-order, but the server reuses the existing initiated
 // payment for the same bookingId (payment.service idempotency), so no
 // duplicate booking/order is created.
 creatingOrderRef.current = false;
 },
 },
 };

 const rzp = new Razorpay(options);

 rzp.on('payment.failed', (response: any) => {
 setPaymentError(
 response.error?.description ||
 'Payment failed. Please try again or use a different payment method.',
 );
 setPaymentLoading(false);
 creatingOrderRef.current = false;
 });

 rzp.open();
 } catch (err: any) {
 setPaymentError(err.message || 'Something went wrong. Please try again.');
 setPaymentLoading(false);
 creatingOrderRef.current = false;
 }
 };

 // handleStripePayment removed 2026-08-10 — Stripe is no longer a payment rail

 // ─── AI Sankalp Generation ──────────────────────────────────
 const generateAiSankalp = async () => {
 setAiSankalpLoading(true);
 setAiSankalpError(false);
 setAiSankalpResult(null);

 try {
 const firstDevotee = devotees[0];
 const body = {
 devoteeName: firstDevotee?.name || '',
 gotra: firstDevotee?.gotra || undefined,
 nakshatra: firstDevotee?.nakshatra || undefined,
 pujaName: puja?.name || '',
 deity: puja?.deity || '',
 };

 const headers: Record<string, string> = {
 'Content-Type': 'application/json',
 };
 if (session?.accessToken) {
 headers.Authorization = `Bearer ${session.accessToken}`;
 }

 const res = await fetch(`${API_BASE_URL}/ai/generate-sankalp`, {
 method: 'POST',
 headers,
 body: JSON.stringify(body),
 });

 if (res.ok) {
 const data = await res.json();
 setAiSankalpResult({
 sanskrit: data.sanskrit || '',
 transliteration: data.transliteration || '',
 englishTranslation: data.englishTranslation || '',
 hindiTranslation: data.hindiTranslation || '',
 });
 setAiSankalpExpanded(true);
 } else {
 throw new Error('API error');
 }
 } catch {
 setAiSankalpError(true);
 } finally {
 setAiSankalpLoading(false);
 }
 };

 const useAiSankalp = () => {
 if (aiSankalpResult) {
 const fullSankalp = `${aiSankalpResult.sanskrit}\n\n${aiSankalpResult.transliteration}\n\n(${aiSankalpResult.englishTranslation})`;
 setSankalp(fullSankalp);
 setAiSankalpExpanded(false);
 }
 };

 // Demo payment for testing without Razorpay
 const handleDemoPayment = () => {
 // P0 #PBO-9 (2026-07-09): hard block unless the app is in demo mode. The
 // button is also gated in the render below, but this is the real gate — a
 // production build must never simulate a successful payment.
 if (!DEMO_PAYMENTS_ENABLED) return;
 safeCapture('booking_started', {
 pujaSlug: slug,
 templeSlug: selectedTemple?.templeSlug,
 priceInr: totalPrice,
 });
 setPaymentLoading(true);
 setTimeout(() => {
 // S2C-05: a simulated payment must never mint a `BS-` reference — that is the
 // real, server-issued booking-number format, and a fake one would be
 // indistinguishable to the devotee and unresolvable for support. The DEMO-
 // prefix makes it obvious that no booking row exists.
 const bkNum = `DEMO-${Date.now().toString(36).toUpperCase()}`;
 safeCapture('payment_success', {
 bookingId: bkNum,
 amountInr: totalPrice,
 currency: 'INR',
 });
 setBookingNumber(bkNum);
 setBookingSuccess(true);
 setPaymentLoading(false);
 }, 2000);
 };

 // ─── Loading state ──────────────────────────────────────────

 if (loading) {
 return (
 <div className="flex min-h-[100dvh] items-center justify-center bg-saffron-50">
 <div className="text-center">
 <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-saffron-200 border-t-saffron-600" />
 <p className="text-sm text-surface-500">Loading puja details...</p>
 </div>
 </div>
 );
 }

 // M-001 (2026-08-11): three distinct causes, three distinct screens. Only the
 // genuine transport failure mentions the connection or offers a Retry — a
 // missing/unknown slug is a bad link, and retrying it can only fail again.
 if (loadError === 'missing-slug') {
 return (
 <div className="flex min-h-[100dvh] items-center justify-center bg-saffron-50 px-4">
 <div className="text-center">
 <Flame className="mx-auto mb-4 h-12 w-12 text-surface-300" />
 <h2 className="mb-2 text-xl font-bold text-surface-700">No puja selected</h2>
 <p className="mb-4 max-w-sm text-surface-500">
 This booking page needs to know which puja you want. Pick one from the catalogue
 and we&apos;ll bring you straight back here.
 </p>
 <Link
 href="/pujas"
 className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-6 py-3 font-medium text-white hover:bg-saffron-700"
 >
 <Flame className="h-4 w-4" />
 Browse all pujas
 </Link>
 </div>
 </div>
 );
 }

 if (loadError === 'not-found') {
 return (
 <div className="flex min-h-[100dvh] items-center justify-center bg-saffron-50 px-4">
 <div className="text-center">
 <Flame className="mx-auto mb-4 h-12 w-12 text-surface-300" />
 <h2 className="mb-2 text-xl font-bold text-surface-700">We don&apos;t offer that puja</h2>
 <p className="mb-4 max-w-sm text-surface-500">
 {slug
 ? `Nothing in our catalogue matches “${slug}”. The link may be out of date.`
 : 'That link doesn’t point at a puja we offer. It may be out of date.'}
 </p>
 <Link
 href="/pujas"
 className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-6 py-3 font-medium text-white hover:bg-saffron-700"
 >
 <Flame className="h-4 w-4" />
 Browse all pujas
 </Link>
 </div>
 </div>
 );
 }

 if (loadError === 'network') {
 return (
 <div className="flex min-h-[100dvh] items-center justify-center bg-saffron-50">
 <div className="text-center">
 <Flame className="mx-auto mb-4 h-12 w-12 text-surface-300" />
 <h2 className="mb-2 text-xl font-bold text-surface-700">Could not load puja details</h2>
 <p className="mb-4 text-surface-500">We couldn&apos;t reach the catalog. Please check your connection and retry.</p>
 <div className="flex flex-col items-center gap-3">
 <button
 type="button"
 onClick={() => { setLoading(true); setLoadError(null); setRetryTick((t) => t + 1); }}
 className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-6 py-3 font-medium text-white hover:bg-saffron-700"
 >
 Retry
 </button>
 <Link href="/pujas" className="text-sm text-surface-500 hover:text-saffron-600">
 ← Browse all pujas
 </Link>
 </div>
 </div>
 </div>
 );
 }

 if (!puja) {
 return (
 <div className="flex min-h-[100dvh] items-center justify-center bg-saffron-50">
 <div className="text-center">
 <Flame className="mx-auto mb-4 h-12 w-12 text-surface-300" />
 <h2 className="mb-2 text-xl font-bold text-surface-700">Puja Not Found</h2>
 <p className="mb-4 text-surface-500">We could not find the puja you are looking for.</p>
 <Link
 href="/pujas"
 className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-6 py-3 font-medium text-white hover:bg-saffron-700"
 >
 Browse Pujas
 </Link>
 </div>
 </div>
 );
 }

 // ─── Success Screen ─────────────────────────────────────────

 if (bookingSuccess) {
 return (
 <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-saffron-50 to-white px-4">
 <div className="w-full max-w-lg text-center">
 {/* Success animation */}
 <div className="relative mx-auto mb-6 h-24 w-24">
 <div className="absolute inset-0 animate-ping rounded-full bg-tulsi-green/20" />
 <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-tulsi-green">
 <CheckCircle2 className="h-12 w-12 text-white" />
 </div>
 </div>

 <h1 className="mb-2 text-3xl font-bold text-surface-800">Booking Confirmed!</h1>
 <p className="mb-6 text-surface-500">
 Your puja has been booked successfully. The temple will assign a priest shortly.
 </p>

 <div className="mb-8 rounded-xl border border-surface-100 bg-white p-6 text-left shadow-lg">
 <div className="mb-4 flex items-center justify-between">
 <span className="text-sm text-surface-500">Booking Number</span>
 <button
 onClick={() => navigator.clipboard?.writeText(bookingNumber)}
 className="flex items-center gap-1 text-sm font-medium text-saffron-600 hover:text-saffron-700"
 >
 <Copy className="h-3.5 w-3.5" />
 Copy
 </button>
 </div>
 <p className="mb-4 text-center text-2xl font-bold tracking-wider text-saffron-600">
 {bookingNumber}
 </p>

 <div className="space-y-3 border-t border-surface-100 pt-4">
 <div className="flex justify-between text-sm">
 <span className="text-surface-500">Puja</span>
 <span className="font-medium text-surface-700">{puja.name}</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-surface-500">Temple</span>
 <span className="font-medium text-surface-700">{selectedTemple?.templeName}</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-surface-500">Date</span>
 <span className="font-medium text-surface-700">{formatDate(selectedDate)}</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-surface-500">Time</span>
 <span className="font-medium text-surface-700">
 {slotAvailability.find((s) => s.time === selectedSlot)?.label || selectedSlot}
 </span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-surface-500">Amount Paid</span>
 <span className="font-bold text-tulsi-green">
 ₹{totalPrice.toLocaleString('en-IN')}
 </span>
 </div>
 </div>
 </div>

 <div className="mb-4 rounded-xl border border-saffron-200 bg-saffron-50 p-4">
 <div className="flex items-start gap-3">
 <Video className="mt-0.5 h-5 w-5 shrink-0 text-saffron-600" />
 <p className="text-sm text-surface-600">
 You will receive <strong>video proof</strong> after the puja is performed. A
 notification will be sent to your registered phone number.
 </p>
 </div>
 </div>

 <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
 <Link
 href="/bookings"
 className="inline-flex items-center justify-center gap-2 rounded-lg bg-saffron-600 px-6 py-3 font-medium text-white hover:bg-saffron-700"
 >
 View Booking
 <ExternalLink className="h-4 w-4" />
 </Link>
 <Link
 href="/pujas"
 className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-saffron-200 px-6 py-3 font-semibold text-saffron-600 hover:bg-saffron-50"
 >
 <Flame className="h-4 w-4" />
 Book Another Puja
 </Link>
 <Link
 href="/"
 className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-surface-600 hover:bg-surface-100"
 >
 <Home className="h-4 w-4" />
 Go Home
 </Link>
 </div>
 </div>
 </div>
 );
 }

 // ─── Main Booking Form ──────────────────────────────────────

 return (
 <div className="min-h-[100dvh] bg-surface-50">
 {/* Breadcrumb */}
 <div className="border-b border-surface-100 bg-white">
 <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6">
 <nav className="flex items-center gap-2 text-sm text-surface-500">
 <Link href="/" className="hover:text-orange-600">Home</Link>
 <ChevronRight className="h-3.5 w-3.5" />
 <Link href="/pujas" className="hover:text-orange-600">Pujas</Link>
 <ChevronRight className="h-3.5 w-3.5" />
 <Link href={`/pujas/${slug}`} className="hover:text-orange-600">{puja.name}</Link>
 <ChevronRight className="h-3.5 w-3.5" />
 <span className="font-medium text-surface-700">Book</span>
 </nav>
 </div>
 </div>

 <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
 {/* Page title */}
 <div className="mb-8 text-center">
 <h1 className="mb-1 text-2xl font-bold text-surface-800 md:text-3xl">
 Book {puja.name}
 </h1>
 <p className="text-surface-500">
 {puja.deity} &middot; {puja.durationMinutes} min &middot; {puja.category}
 </p>
 </div>

 {/* Step Indicator */}
 <div className="mb-10">
 <div className="flex items-center justify-between">
 {STEP_LABELS.map((label, i) => {
 const isCompleted = i < currentStep;
 const isCurrent = i === currentStep;
 return (
 <div key={label} className="flex flex-1 flex-col items-center">
 <div className="relative flex w-full items-center">
 {/* Connector line (left side) */}
 {i > 0 && (
 <div
 className={`h-0.5 flex-1 ${
 i <= currentStep ? 'bg-saffron-500' : 'bg-surface-200'
 }`}
 />
 )}
 {i === 0 && <div className="flex-1" />}

 {/* Step circle */}
 <div
 className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
 isCompleted
 ? 'border-tulsi-green bg-tulsi-green text-white'
 : isCurrent
 ? 'border-saffron-500 bg-saffron-500 text-white shadow-lg'
 : 'border-surface-200 bg-white text-surface-400'
 }`}
 >
 {isCompleted ? <Check className="h-5 w-5" /> : i + 1}
 </div>

 {/* Connector line (right side) */}
 {i < STEP_LABELS.length - 1 && (
 <div
 className={`h-0.5 flex-1 ${
 i < currentStep ? 'bg-saffron-500' : 'bg-surface-200'
 }`}
 />
 )}
 {i === STEP_LABELS.length - 1 && <div className="flex-1" />}
 </div>
 <span
 className={`mt-2 text-xs font-medium ${
 isCurrent ? 'text-saffron-600' : isCompleted ? 'text-tulsi-green' : 'text-surface-400'
 }`}
 >
 <span className="hidden sm:inline">{label}</span>
 <span className="sm:hidden">{i + 1}</span>
 </span>
 </div>
 );
 })}
 </div>
 </div>

 {/* ─── STEP 1: Temple, Date & Time ─────────────────── */}
 {currentStep === 0 && (
 <div className="space-y-6">
 {/* Temple Selection */}
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-surface-800">
 <MapPin className="h-5 w-5 text-saffron-500" />
 Select Temple
 </h2>
 {errors.temple && bookableTemples.length > 0 && (
 <p className="mb-3 flex items-center gap-1 text-sm text-red-500">
 <AlertCircle className="h-4 w-4" /> {errors.temple}
 </p>
 )}
 {/* S2C-11 (2026-08-11): a puja type can be live with zero bookable temple
   offerings (none approved yet, or the last one deactivated in the temple
   portal). This grid used to render an empty array into blank space under
   the heading, and Continue then failed with "Please select a temple" —
   pointing at a control with nothing in it, with no explanation and no way
   out. Say so explicitly and offer a route back to the catalogue. */}
 {bookableTemples.length === 0 ? (
 <div className="rounded-xl border border-dashed border-surface-200 bg-surface-50 p-6 text-center">
 <MapPin className="mx-auto mb-3 h-8 w-8 text-surface-300" />
 <p className="mb-1 font-semibold text-surface-700">
 No temple is offering this puja right now
 </p>
 <p className="mx-auto mb-4 max-w-sm text-sm text-surface-500">
 We only list temples that have completed verification, and none of them
 currently has {puja.name} open for booking. Please pick another puja, or
 check back shortly.
 </p>
 <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
 <Link
 href="/pujas"
 className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-saffron-700"
 >
 <Flame className="h-4 w-4" />
 Browse other pujas
 </Link>
 <Link
 href="/temples"
 className="text-sm text-surface-500 hover:text-saffron-600"
 >
 Explore temples
 </Link>
 </div>
 </div>
 ) : (
 <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
 {bookableTemples.map((temple) => {
 const isSelected = selectedTempleId === temple.id;
 const price = temple.priceOverride || puja.basePrice;
 return (
 <button
 key={temple.id}
 onClick={() => setSelectedTempleId(temple.id)}
 className={`relative rounded-xl border-2 p-4 text-left transition-all ${
 isSelected
 ? 'border-saffron-500 bg-saffron-50 shadow-md'
 : 'border-surface-100 bg-white hover:border-saffron-200 hover:bg-saffron-50/30'
 }`}
 >
 {isSelected && (
 <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-saffron-500">
 <Check className="h-3.5 w-3.5 text-white" />
 </div>
 )}
 <div className="mb-1 flex items-center gap-1.5">
 <h3 className="text-sm font-semibold text-surface-800">
 {temple.templeName}
 </h3>
 {temple.isVerified && (
 <BadgeCheck className="h-4 w-4 text-tulsi-green" />
 )}
 </div>
 <p className="mb-2 flex items-center gap-1 text-xs text-surface-500">
 <MapPin className="h-3 w-3" />
 {temple.templeCity}, {temple.templeState}
 </p>
 <div className="flex items-center justify-between">
 <span className="text-lg font-bold text-saffron-600">
 ₹{Number(price).toLocaleString('en-IN')}
 </span>
 {/* trustScore is 0-5 (see lib/trust-score.ts). The 2026-08-03 note here
   claimed 0-100 — taken from this file's own MOCK fixtures, which used 98/96/95
   while the API served 4.9. That made the `>= 20` guard hide the badge on every
   REAL temple. Scale and threshold now come from one shared module. */}
 {hasMeaningfulTrustScore(temple.trustScore) && (
 <span className="flex items-center gap-1 text-xs text-surface-400">
 <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
 {formatTrustScoreOutOf(temple.trustScore)}
 </span>
 )}
 </div>
 </button>
 );
 })}
 </div>
 )}
 </div>

 {/* S2C-11: with nothing bookable there is no date, no slot and nothing to
   continue to — showing those controls would only lead back to the same
   dead end. */}
 {bookableTemples.length > 0 && (
 <>
 {/* Date Selection */}
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-surface-800">
 <Calendar className="h-5 w-5 text-saffron-500" />
 Select Date
 </h2>
 {errors.date && (
 <p className="mb-3 flex items-center gap-1 text-sm text-red-500">
 <AlertCircle className="h-4 w-4" /> {errors.date}
 </p>
 )}
 <DateInput
 value={selectedDate}
 min={bookingWindowMin}
 max={bookingWindowMax}
 onChange={(v) => setSelectedDate(v)}
 dateMarkers={muhuratMarkers}
 disabledDates={avoidDates}
 />
 {selectedDate && (
 <p className="mt-2 text-sm text-surface-500">{formatDate(selectedDate)}</p>
 )}
 {selectedDayMuhurat && selectedDayMuhurat.windows.length > 0 && (
 <div className="mt-3 rounded-lg border border-green-100 bg-green-50/60 p-3">
 <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-green-800">
 <Sparkles className="h-3.5 w-3.5 text-green-600" />
 Shubh muhurat windows
 {selectedDayMuhurat.grade === 'shubh' && (
 <span className="ml-1 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
 Shubh
 </span>
 )}
 </p>
 <div className="flex flex-wrap gap-1.5">
 {selectedDayMuhurat.windows.map((w) => (
 <span
 key={`${w.from}-${w.to}`}
 className="rounded-full border border-green-200 bg-white px-2.5 py-1 text-xs font-medium text-green-800"
 >
 {w.from}–{w.to}
 </span>
 ))}
 </div>
 <p className="mt-2 text-[11px] text-surface-500">
 Rahu Kaal {selectedDayMuhurat.rahuKaal} avoided.
 </p>
 </div>
 )}
 {muhuratDays.length > 0 && !selectedDayMuhurat && (
 <p className="mt-3 text-xs text-surface-500">
 Green dates are shubh muhurat for this puja.
 </p>
 )}
 </div>

 {/* Time Slot Selection */}
 {selectedTemple && (
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-surface-800">
 <Clock className="h-5 w-5 text-saffron-500" />
 Select Time Slot
 </h2>
 {errors.slot && (
 <p className="mb-3 flex items-center gap-1 text-sm text-red-500">
 <AlertCircle className="h-4 w-4" /> {errors.slot}
 </p>
 )}

 {slotsError ? (
 <div className="flex flex-col items-center justify-center py-8 text-center">
 <AlertCircle className="h-6 w-6 text-surface-300" />
 <p className="mt-2 text-sm text-surface-500">Couldn&apos;t load slot availability.</p>
 <button
 type="button"
 onClick={() => { setSlotsError(false); setRetryTick((t) => t + 1); }}
 className="mt-2 text-sm font-medium text-saffron-600 hover:text-saffron-700"
 >
 Retry
 </button>
 </div>
 ) : loadingSlots ? (
 <div className="flex items-center justify-center py-8">
 <Loader2 className="h-6 w-6 animate-spin text-saffron-500" />
 <span className="ml-2 text-sm text-surface-500">Checking availability...</span>
 </div>
 ) : (
 <>
 {['morning', 'afternoon', 'evening'].map((period) => {
 const periodSlots = slotAvailability.filter(
 (s) => getSlotPeriod(s.time) === period,
 );
 if (periodSlots.length === 0) return null;
 const PeriodIcon = getSlotPeriodIcon(period);
 return (
 <div key={period} className="mb-4 last:mb-0">
 <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium capitalize text-surface-600">
 <PeriodIcon className="h-4 w-4 text-saffron-400" />
 {period}
 </h3>
 <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
 {periodSlots.map((slot) => {
 const isFull = slot.remaining === 0;
 const isSelected = selectedSlot === slot.time;
 return (
 <button
 key={slot.time}
 disabled={isFull}
 onClick={() => setSelectedSlot(slot.time)}
 className={`relative rounded-lg border-2 p-3 text-center transition-all ${
 isFull
 ? 'cursor-not-allowed border-surface-100 bg-surface-50 opacity-50'
 : isSelected
 ? 'border-saffron-500 bg-saffron-50 shadow-md'
 : 'border-surface-100 hover:border-saffron-200'
 }`}
 >
 <p className="text-sm font-semibold text-surface-700">
 {slot.label}
 </p>
 <p
 className={`mt-1 text-xs ${
 isFull
 ? 'text-red-400'
 : slot.remaining <= 3
 ? 'text-amber-500 font-medium'
 : 'text-tulsi-green'
 }`}
 >
 {isFull
 ? 'Full'
 : `${slot.remaining} spot${slot.remaining !== 1 ? 's' : ''} left`}
 </p>
 {isSelected && (
 <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-saffron-500">
 <Check className="h-3 w-3 text-white" />
 </div>
 )}
 </button>
 );
 })}
 </div>
 </div>
 );
 })}
 </>
 )}
 </div>
 )}

 {/* Next Button */}
 <div className="flex justify-end">
 <button
 onClick={goNext}
 className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-8 py-3 font-medium text-white transition-colors hover:bg-saffron-700"
 >
 Continue
 <ChevronRight className="h-4 w-4" />
 </button>
 </div>
 </>
 )}
 </div>
 )}

 {/* ─── STEP 2: Devotee Details ─────────────────────── */}
 {currentStep === 1 && (
 <div className="space-y-6">
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-surface-800">
 <Users className="h-5 w-5 text-saffron-500" />
 Devotee Details
 </h2>
 <p className="mb-6 text-sm text-surface-500">
 Add details of the devotees for whom this puja will be performed (1-5 devotees).
 </p>

 <div className="space-y-4">
 {devotees.map((devotee, index) => (
 <div
 key={devotee.id}
 className="rounded-xl border border-surface-100 bg-surface-50/50 p-4"
 >
 <div className="mb-3 flex items-center justify-between">
 <span className="text-sm font-semibold text-surface-600">
 Devotee {index + 1}
 </span>
 {devotees.length > 1 && (
 <button
 onClick={() => removeDevotee(devotee.id)}
 className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
 >
 <Trash2 className="h-3.5 w-3.5" />
 Remove
 </button>
 )}
 </div>

 <div className="grid gap-3 sm:grid-cols-3">
 {/* Name */}
 <div>
 <label className="mb-1 block text-xs font-medium text-surface-600">
 Full Name <span className="text-red-400">*</span>
 </label>
 <input
 type="text"
 value={devotee.name}
 onChange={(e) => updateDevotee(devotee.id, 'name', e.target.value)}
 placeholder="Enter full name"
 className={`w-full rounded-lg border px-3 py-2 text-sm text-surface-700 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-saffron-200 ${
 errors[`devotee_${index}_name`]
 ? 'border-red-300 bg-red-50'
 : 'border-surface-200'
 }`}
 />
 {errors[`devotee_${index}_name`] && (
 <p className="mt-1 text-xs text-red-500">
 {errors[`devotee_${index}_name`]}
 </p>
 )}
 </div>

 {/* Gotra */}
 <div>
 <label className="mb-1 block text-xs font-medium text-surface-600">
 Gotra <span className="text-surface-400">(optional)</span>
 </label>
 <input
 type="text"
 value={devotee.gotra}
 onChange={(e) => updateDevotee(devotee.id, 'gotra', e.target.value)}
 placeholder="e.g., Kashyap"
 className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm text-surface-700 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-saffron-200"
 />
 </div>

 {/* Nakshatra */}
 <div>
 <label className="mb-1 block text-xs font-medium text-surface-600">
 Nakshatra <span className="text-surface-400">(optional)</span>
 </label>
 <select
 value={devotee.nakshatra}
 onChange={(e) => updateDevotee(devotee.id, 'nakshatra', e.target.value)}
 className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm text-surface-700 focus:outline-none focus:ring-2 focus:ring-saffron-200"
 >
 <option value="">Select nakshatra</option>
 {NAKSHATRAS.map((n) => (
 <option key={n} value={n}>
 {n}
 </option>
 ))}
 </select>
 </div>
 </div>
 </div>
 ))}
 </div>

 {devotees.length < 5 && (
 <button
 onClick={addDevotee}
 className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-saffron-600 hover:text-saffron-700"
 >
 <Plus className="h-4 w-4" />
 Add Another Devotee
 </button>
 )}
 </div>

 {/* Sankalp */}
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-surface-800">
 <Flame className="h-5 w-5 text-saffron-500" />
 Sankalp (Prayer Intention)
 </h2>
 <textarea
 value={sankalp}
 onChange={(e) => setSankalp(e.target.value)}
 rows={3}
 placeholder="Describe your prayer intention (e.g., For the good health and prosperity of my family...)"
 className="w-full rounded-xl border border-surface-200 px-4 py-3 text-sm text-surface-700 placeholder:text-surface-400 focus:border-saffron-400 focus:outline-none focus:ring-2 focus:ring-saffron-200"
 />

 {/* AI Sankalp Generator */}
 <div className="mt-4 rounded-xl border border-dashed border-saffron-200 bg-saffron-50/50 p-4">
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-2">
 <Sparkles className="h-4 w-4 text-temple-gold" />
 <span className="text-sm font-semibold text-surface-700">AI Sankalp Generator</span>
 </div>
 {!aiSankalpLoading && (
 <button
 onClick={generateAiSankalp}
 className="inline-flex items-center gap-1.5 rounded-lg bg-saffron-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-saffron-700 transition-colors"
 >
 <Sparkles className="h-3 w-3" />
 {aiSankalpResult ? 'Regenerate' : 'Generate Sankalp with AI'}
 </button>
 )}
 </div>
 <p className="text-xs text-surface-500 mb-3">
 Generate a traditional Sanskrit sankalp based on devotee details, puja type, and deity.
 </p>

 {/* Loading */}
 {aiSankalpLoading && (
 <div className="flex items-center justify-center py-6">
 <div className="flex items-center gap-2 text-sm text-saffron-600">
 <Loader2 className="h-4 w-4 animate-spin" />
 <span>Generating sankalp...</span>
 </div>
 </div>
 )}

 {/* Error */}
 {aiSankalpError && (
 <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-center">
 <AlertCircle className="mx-auto mb-1 h-5 w-5 text-red-400" />
 <p className="text-xs font-medium text-red-700">AI sankalp generation unavailable</p>
 <p className="text-xs text-red-500 mt-0.5">Please write your own sankalp above.</p>
 </div>
 )}

 {/* Result */}
 {aiSankalpResult && !aiSankalpLoading && (
 <div className="rounded-lg border border-saffron-200 bg-white overflow-hidden">
 {/* Toggle header */}
 <button
 onClick={() => setAiSankalpExpanded((prev) => !prev)}
 className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-50 transition-colors"
 >
 <span className="text-sm font-semibold text-surface-700">Generated Sankalp</span>
 {aiSankalpExpanded ? (
 <ChevronUp className="h-4 w-4 text-surface-400" />
 ) : (
 <ChevronDown className="h-4 w-4 text-surface-400" />
 )}
 </button>

 {aiSankalpExpanded && (
 <div className="border-t border-surface-100 px-4 py-3 space-y-3">
 {/* Sanskrit */}
 {aiSankalpResult.sanskrit && (
 <div>
 <p className="text-xs font-semibold text-saffron-600 mb-1">Sanskrit</p>
 <p className="text-sm text-surface-700 font-medium leading-relaxed">
 {aiSankalpResult.sanskrit}
 </p>
 </div>
 )}

 {/* Transliteration */}
 {aiSankalpResult.transliteration && (
 <div>
 <p className="text-xs font-semibold text-purple-600 mb-1">Transliteration</p>
 <p className="text-sm text-surface-600 italic leading-relaxed">
 {aiSankalpResult.transliteration}
 </p>
 </div>
 )}

 {/* English Translation */}
 {aiSankalpResult.englishTranslation && (
 <div>
 <p className="text-xs font-semibold text-blue-600 mb-1">English Translation</p>
 <p className="text-sm text-surface-600 leading-relaxed">
 {aiSankalpResult.englishTranslation}
 </p>
 </div>
 )}

 {/* Hindi Translation */}
 {aiSankalpResult.hindiTranslation && (
 <div>
 <p className="text-xs font-semibold text-green-600 mb-1">Hindi Translation</p>
 <p className="text-sm text-surface-600 leading-relaxed">
 {aiSankalpResult.hindiTranslation}
 </p>
 </div>
 )}

 {/* Action buttons */}
 <div className="flex gap-2 pt-2">
 <button
 onClick={useAiSankalp}
 className="inline-flex items-center gap-1.5 rounded-lg bg-saffron-600 px-4 py-2 text-xs font-medium text-white hover:bg-saffron-700 transition-colors"
 >
 <Check className="h-3.5 w-3.5" />
 Use This Sankalp
 </button>
 <button
 onClick={generateAiSankalp}
 className="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 bg-white px-4 py-2 text-xs font-semibold text-surface-600 hover:bg-surface-50 transition-colors"
 >
 <RefreshCw className="h-3.5 w-3.5" />
 Regenerate
 </button>
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 </div>

 {/* Special Instructions */}
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <h2 className="mb-4 text-lg font-bold text-surface-800">Special Instructions</h2>
 <textarea
 value={specialInstructions}
 onChange={(e) => setSpecialInstructions(e.target.value)}
 rows={2}
 placeholder="Any special requests or instructions for the priest (optional)"
 className="w-full rounded-xl border border-surface-200 px-4 py-3 text-sm text-surface-700 placeholder:text-surface-400 focus:border-saffron-400 focus:outline-none focus:ring-2 focus:ring-saffron-200"
 />
 </div>

 {/* Navigation */}
 <div className="flex justify-between">
 <button
 onClick={goBack}
 className="inline-flex items-center gap-2 rounded-xl border-2 border-surface-200 px-6 py-3 font-semibold text-surface-600 hover:bg-surface-50"
 >
 <ChevronLeft className="h-4 w-4" />
 Back
 </button>
 <button
 onClick={goNext}
 className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-8 py-3 font-medium text-white transition-colors hover:bg-saffron-700"
 >
 Continue
 <ChevronRight className="h-4 w-4" />
 </button>
 </div>
 </div>
 )}

 {/* ─── STEP 3: Review & Prasad ─────────────────────── */}
 {currentStep === 2 && (
 <div className="space-y-6">
 {/* Order Summary */}
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-surface-800">
 <CheckCircle2 className="h-5 w-5 text-saffron-500" />
 Order Summary
 </h2>
 <div className="space-y-3">
 <SummaryRow label="Puja" value={puja.name} />
 <SummaryRow label="Temple" value={selectedTemple?.templeName || '-'} />
 <SummaryRow
 label="Location"
 value={
 selectedTemple
 ? `${selectedTemple.templeCity}, ${selectedTemple.templeState}`
 : '-'
 }
 />
 <SummaryRow label="Date" value={formatDate(selectedDate)} />
 <SummaryRow
 label="Time"
 value={
 slotAvailability.find((s) => s.time === selectedSlot)?.label || selectedSlot
 }
 />
 <SummaryRow
 label="Devotees"
 value={devotees
 .map((d) => d.name)
 .filter(Boolean)
 .join(', ')}
 />
 {sankalp && <SummaryRow label="Sankalp" value={sankalp} />}
 </div>
 </div>

 {/* Prasad Delivery */}
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <div className="mb-4 flex items-center justify-between">
 <h2 className="flex items-center gap-2 text-lg font-bold text-surface-800">
 <Gift className="h-5 w-5 text-saffron-500" />
 Prasad Delivery
 </h2>
 <label className="relative inline-flex cursor-pointer items-center">
 <input
 type="checkbox"
 checked={wantsPrasad}
 onChange={(e) => setWantsPrasad(e.target.checked)}
 className="peer sr-only"
 />
 <div className="h-6 w-11 rounded-full bg-surface-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-all after:content-[''] peer-checked:bg-saffron-500 peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-saffron-200" />
 </label>
 </div>

 {wantsPrasad ? (
 <div>
 <p className="mb-4 text-sm text-surface-500">
 Sacred prasad from the temple will be delivered to your address.
 <span className="ml-1 font-semibold text-saffron-600">
 +₹{PRASAD_DELIVERY_FEE}
 </span>
 </p>

 <div className="grid gap-3 sm:grid-cols-2">
 <div>
 <label className="mb-1 block text-xs font-medium text-surface-600">
 Full Name <span className="text-red-400">*</span>
 </label>
 <input
 type="text"
 value={address.fullName}
 onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
 placeholder="Recipient name"
 className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 ${
 errors.addr_name ? 'border-red-300 bg-red-50' : 'border-surface-200'
 }`}
 />
 {errors.addr_name && (
 <p className="mt-1 text-xs text-red-500">{errors.addr_name}</p>
 )}
 </div>
 <div>
 <label className="mb-1 block text-xs font-medium text-surface-600">
 Phone <span className="text-red-400">*</span>
 </label>
 <input
 type="tel"
 value={address.phone}
 onChange={(e) => setAddress({ ...address, phone: e.target.value })}
 placeholder="10-digit number"
 className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 ${
 errors.addr_phone ? 'border-red-300 bg-red-50' : 'border-surface-200'
 }`}
 />
 {errors.addr_phone && (
 <p className="mt-1 text-xs text-red-500">{errors.addr_phone}</p>
 )}
 </div>
 <div className="sm:col-span-2">
 <label className="mb-1 block text-xs font-medium text-surface-600">
 Address Line 1 <span className="text-red-400">*</span>
 </label>
 <input
 type="text"
 value={address.line1}
 onChange={(e) => setAddress({ ...address, line1: e.target.value })}
 placeholder="House/Flat No., Street"
 className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 ${
 errors.addr_line1 ? 'border-red-300 bg-red-50' : 'border-surface-200'
 }`}
 />
 {errors.addr_line1 && (
 <p className="mt-1 text-xs text-red-500">{errors.addr_line1}</p>
 )}
 </div>
 <div className="sm:col-span-2">
 <label className="mb-1 block text-xs font-medium text-surface-600">
 Address Line 2
 </label>
 <input
 type="text"
 value={address.line2}
 onChange={(e) => setAddress({ ...address, line2: e.target.value })}
 placeholder="Area, Landmark (optional)"
 className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200"
 />
 </div>
 <div>
 <label className="mb-1 block text-xs font-medium text-surface-600">
 City <span className="text-red-400">*</span>
 </label>
 <input
 type="text"
 value={address.city}
 onChange={(e) => setAddress({ ...address, city: e.target.value })}
 placeholder="City"
 className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 ${
 errors.addr_city ? 'border-red-300 bg-red-50' : 'border-surface-200'
 }`}
 />
 {errors.addr_city && (
 <p className="mt-1 text-xs text-red-500">{errors.addr_city}</p>
 )}
 </div>
 <div>
 <label className="mb-1 block text-xs font-medium text-surface-600">
 State <span className="text-red-400">*</span>
 </label>
 <input
 type="text"
 value={address.state}
 onChange={(e) => setAddress({ ...address, state: e.target.value })}
 placeholder="State"
 className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 ${
 errors.addr_state ? 'border-red-300 bg-red-50' : 'border-surface-200'
 }`}
 />
 {errors.addr_state && (
 <p className="mt-1 text-xs text-red-500">{errors.addr_state}</p>
 )}
 </div>
 <div>
 <label className="mb-1 block text-xs font-medium text-surface-600">
 Pincode <span className="text-red-400">*</span>
 </label>
 <input
 type="text"
 value={address.pincode}
 onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
 placeholder="6-digit pincode"
 maxLength={6}
 className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 ${
 errors.addr_pincode ? 'border-red-300 bg-red-50' : 'border-surface-200'
 }`}
 />
 {errors.addr_pincode && (
 <p className="mt-1 text-xs text-red-500">{errors.addr_pincode}</p>
 )}
 </div>
 </div>
 </div>
 ) : (
 <p className="text-sm text-surface-500">
 Toggle the switch to add prasad delivery to your order (+₹{PRASAD_DELIVERY_FEE}).
 </p>
 )}
 </div>

 {/* Price Breakdown */}
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-surface-800">
 <IndianRupee className="h-5 w-5 text-saffron-500" />
 Price Breakdown
 </h2>
 <div className="space-y-3">
 <div className="flex justify-between text-sm">
 <span className="text-surface-600">Puja Fee</span>
 <span className="font-medium text-surface-700">
 ₹{basePrice.toLocaleString('en-IN')}
 </span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-surface-600">Platform Fee</span>
 <span className="font-medium text-surface-700">
 ₹{PLATFORM_FEE.toLocaleString('en-IN')}
 </span>
 </div>
 {wantsPrasad && (
 <div className="flex justify-between text-sm">
 <span className="text-surface-600">Prasad Delivery</span>
 <span className="font-medium text-surface-700">
 ₹{PRASAD_DELIVERY_FEE.toLocaleString('en-IN')}
 </span>
 </div>
 )}
 <div className="border-t border-surface-100 pt-3">
 <div className="flex justify-between">
 <span className="text-base font-bold text-surface-800">Total</span>
 <span className="text-xl font-bold text-saffron-600">
 ₹{totalPrice.toLocaleString('en-IN')}
 </span>
 </div>
 </div>
 </div>
 </div>

 {/* Terms */}
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <label className="flex items-start gap-3 cursor-pointer">
 <input
 type="checkbox"
 checked={agreedTerms}
 onChange={(e) => setAgreedTerms(e.target.checked)}
 className="mt-1 h-4 w-4 rounded border-surface-300 text-saffron-600 focus:ring-saffron-200"
 />
 <span className="text-sm text-surface-600">
 I agree to the{' '}
 <Link href="/terms" className="font-medium text-saffron-600 hover:underline">
 Terms & Conditions
 </Link>{' '}
 and{' '}
 <Link href="/refunds" className="font-medium text-saffron-600 hover:underline">
 Refund Policy
 </Link>
 . I understand that cancellation is allowed up to 24 hours before the scheduled
 puja time.
 </span>
 </label>
 {errors.terms && (
 <p className="mt-2 flex items-center gap-1 text-sm text-red-500">
 <AlertCircle className="h-4 w-4" /> {errors.terms}
 </p>
 )}
 </div>

 {/* Navigation */}
 <div className="flex justify-between">
 <button
 onClick={goBack}
 className="inline-flex items-center gap-2 rounded-xl border-2 border-surface-200 px-6 py-3 font-semibold text-surface-600 hover:bg-surface-50"
 >
 <ChevronLeft className="h-4 w-4" />
 Back
 </button>
 <button
 onClick={goNext}
 className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-8 py-3 font-medium text-white transition-colors hover:bg-saffron-700"
 >
 Proceed to Payment
 <CreditCard className="h-4 w-4" />
 </button>
 </div>
 </div>
 )}

 {/* ─── STEP 4: Payment ─────────────────────────────── */}
 {currentStep === 3 && (
 <div className="space-y-6">
 {/* Final Summary */}
 <div className="rounded-xl border border-saffron-200 bg-gradient-to-br from-saffron-50 to-amber-50 p-6">
 <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-surface-800">
 <CreditCard className="h-5 w-5 text-saffron-500" />
 Complete Your Payment
 </h2>
 <div className="mb-6 grid gap-3 sm:grid-cols-2">
 <div className="rounded-lg bg-white/80 p-3">
 <p className="text-xs text-surface-500">Puja</p>
 <p className="font-semibold text-surface-700">{puja.name}</p>
 </div>
 <div className="rounded-lg bg-white/80 p-3">
 <p className="text-xs text-surface-500">Temple</p>
 <p className="font-semibold text-surface-700">{selectedTemple?.templeName}</p>
 </div>
 <div className="rounded-lg bg-white/80 p-3">
 <p className="text-xs text-surface-500">Date & Time</p>
 <p className="font-semibold text-surface-700">
 {formatDate(selectedDate)}
 <br />
 {slotAvailability.find((s) => s.time === selectedSlot)?.label || selectedSlot}
 </p>
 </div>
 <div className="rounded-lg bg-white/80 p-3">
 <p className="text-xs text-surface-500">Devotees</p>
 <p className="font-semibold text-surface-700">
 {devotees.map((d) => d.name).join(', ')}
 </p>
 </div>
 </div>

 <div className="mb-6 rounded-xl bg-white p-4">
 <div className="space-y-2">
 <div className="flex justify-between text-sm">
 <span className="text-surface-600">Puja Fee</span>
 <span className="text-surface-700">₹{basePrice.toLocaleString('en-IN')}</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-surface-600">Platform Fee</span>
 <span className="text-surface-700">₹{PLATFORM_FEE}</span>
 </div>
 {wantsPrasad && (
 <div className="flex justify-between text-sm">
 <span className="text-surface-600">Prasad Delivery</span>
 <span className="text-surface-700">₹{PRASAD_DELIVERY_FEE}</span>
 </div>
 )}
 <div className="border-t border-surface-100 pt-2">
 <div className="flex justify-between">
 <span className="font-bold text-surface-800">Total Amount</span>
 <span className="text-2xl font-bold text-saffron-600">
 ₹{totalPrice.toLocaleString('en-IN')}
 </span>
 </div>
 </div>
 </div>
 </div>

 {paymentError && (
 <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
 <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
 <div>
 <p className="font-medium">Payment Failed</p>
 <p>{paymentError}</p>
 </div>
 </div>
 )}

 {/* Trust indicators */}
 <div className="mb-6 flex flex-wrap items-center gap-3">
 <span className="flex items-center gap-1 text-xs text-surface-500">
 <Shield className="h-3.5 w-3.5 text-tulsi-green" />
 Secure Payment
 </span>
 <span className="flex items-center gap-1 text-xs text-surface-500">
 <Video className="h-3.5 w-3.5 text-saffron-500" />
 Video Proof Guaranteed
 </span>
 <span className="flex items-center gap-1 text-xs text-surface-500">
 <CheckCircle2 className="h-3.5 w-3.5 text-ganga-blue" />
 100% Money-Back
 </span>
 </div>


 <div className="flex flex-col gap-3 sm:flex-row">
 <button
 onClick={handlePayment}
 disabled={paymentLoading || bookingSuccess}
 className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-saffron-600 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-saffron-700 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {paymentLoading ? (
 <>
 <Loader2 className="h-5 w-5 animate-spin" />
 Processing...
 </>
 ) : (
 <>
 <CreditCard className="h-5 w-5" />
 Pay ₹{totalPrice.toLocaleString('en-IN')} with Razorpay
 </>
 )}
 </button>
 </div>

 {/* Demo payment button (for testing) — P0 #PBO-9 (2026-07-09): only render
   when the app is explicitly in demo mode. Previously this was always visible,
   including production, letting anyone bypass real payment for a booking. */}
 {process.env.NEXT_PUBLIC_ALLOW_DEMO_PAYMENTS === 'true' && (
 <div className="mt-3 text-center">
 <button
 onClick={handleDemoPayment}
 disabled={paymentLoading}
 className="text-xs text-surface-400 underline hover:text-surface-600 disabled:opacity-50"
 >
 Demo: Simulate Successful Payment
 </button>
 </div>
 )}
 </div>

 {/* Back button */}
 <div className="flex justify-start">
 <button
 onClick={goBack}
 disabled={paymentLoading}
 className="inline-flex items-center gap-2 rounded-xl border-2 border-surface-200 px-6 py-3 font-semibold text-surface-600 hover:bg-surface-50 disabled:opacity-50"
 >
 <ChevronLeft className="h-4 w-4" />
 Back to Review
 </button>
 </div>
 </div>
 )}
 </div>
 </div>
 );
}

// ─── Helper Components ──────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
 return (
 <div className="flex justify-between gap-4 text-sm">
 <span className="shrink-0 text-surface-500">{label}</span>
 <span className="text-right font-medium text-surface-700">{value}</span>
 </div>
 );
}

export default function PujaBookingPage() {
 return (
  <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-saffron-500" /></div>}>
   <PujaBookingInner />
  </Suspense>
 );
}
