'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '../../lib/api-config';
import { astrologyFetch } from '../../lib/astrologer-fetch';
import {
 ASTROLOGY_SORT_VALUES,
 ASTROLOGY_SPECIALIZATIONS,
 buildAstrologyQuery,
 parseAstrologyFilters,
 type AstrologyFilters,
 type AstrologySort,
} from '../../lib/astrology-filters';
import {
 Star,
 Moon,
 Sun,
 Sparkles,
 MessageCircle,
 Phone,
 Video,
 Shield,
 Clock,
 Users,
 Lock,
 ChevronRight,
 Search,
 Filter,
 Zap,
 Heart,
 Brain,
 Eye,
 ArrowRight,
 BadgeCheck,
 Globe,
 Award,
 Compass,
} from 'lucide-react';
import { DateInput } from '../../components/ui/DateInput';

// ─── Types ────────────────────────────────────────────────────────────────────

// Mirrors GET /astrology/astrologers/live (apps/api/src/routes/astrology.ts:132)
// — approved AstrologerProfile rows. Optional fields are optional because the
// DB columns are nullable: they render as absent, never as an invented value.
// There is no `photo`, `reviewCount`, `isBusy` or `badges` because a real
// AstrologerProfile carries none of those, and the old fixture's stock
// portraits published strangers' faces as named astrologers' likenesses.
interface Astrologer {
 id: string;
 name: string;
 specializations?: string[] | null;
 languages?: string[] | null;
 experienceYears?: number | null;
 rating?: number | null;
 consultationCount?: number | null;
 perMinuteRate?: number | null;
 isOnline?: boolean;
 mode?: { chat?: boolean; call?: boolean } | null;
 bio?: string | null;
 verified?: boolean;
}

interface DailyHoroscope {
 rashi: string;
 rashiHindi: string;
 rashiEnglish: string;
 symbol: string;
 prediction: string;
 luckyNumber: number;
 luckyColor: string;
 luckyDirection: string;
 mantra: string;
 mantraHindi: string;
 rulingPlanet: string;
 element: string;
 overallRating: number;
}

// ─── Hardcoded Fallback Data ──────────────────────────────────────────────────

// AW-02 (2026-08-12, P0): a hardcoded fallback array lived here — 15 invented
// astrologers with invented names, ratings, review counts and Rs50-90/min rates,
// seeded straight into component state, so the grid rendered them before any
// fetch resolved and KEPT rendering them if the fetch failed. Every card linked
// to a real Razorpay charge against a person who does not exist: money captured,
// Jitsi room minted, "Your astrologer has been notified", and no Commission row
// because verify-payment had no real provider to credit. It is deleted, not
// hidden behind a flag. The directory below is bound to real onboarded supply;
// when there is none it says so.

const fallbackHoroscopes: DailyHoroscope[] = [
 { rashi: 'aries', rashiHindi: 'मेष', rashiEnglish: 'Aries', symbol: '', prediction: 'A day of new beginnings and fresh energy. Trust your instincts.', luckyNumber: 9, luckyColor: 'Red', luckyDirection: 'East', mantra: 'Om Kraam Kreem Kraum Sah Bhaumaya Namah', mantraHindi: 'ओम क्रां क्रीं क्रौं सः भौमाय नमः', rulingPlanet: 'Mars (Mangal)', element: 'Fire (Agni)', overallRating: 4 },
 { rashi: 'taurus', rashiHindi: 'वृषभ', rashiEnglish: 'Taurus', symbol: '', prediction: 'Financial matters take center stage. Family brings joy.', luckyNumber: 6, luckyColor: 'Green', luckyDirection: 'Southeast', mantra: 'Om Draam Dreem Draum Sah Shukraya Namah', mantraHindi: 'ओम द्रां द्रीं द्रौं सः शुक्राय नमः', rulingPlanet: 'Venus (Shukra)', element: 'Earth (Prithvi)', overallRating: 3 },
 { rashi: 'gemini', rashiHindi: 'मिथुन', rashiEnglish: 'Gemini', symbol: '', prediction: 'Communication skills peak today. Express yourself freely.', luckyNumber: 5, luckyColor: 'Yellow', luckyDirection: 'North', mantra: 'Om Braam Breem Braum Sah Budhaya Namah', mantraHindi: 'ओम ब्रां ब्रीं ब्रौं सः बुधाय नमः', rulingPlanet: 'Mercury (Budh)', element: 'Air (Vayu)', overallRating: 4 },
 { rashi: 'cancer', rashiHindi: 'कर्क', rashiEnglish: 'Cancer', symbol: '', prediction: 'Home and family matters need attention. Creative pursuits shine.', luckyNumber: 2, luckyColor: 'White', luckyDirection: 'Northwest', mantra: 'Om Shraam Shreem Shraum Sah Chandraya Namah', mantraHindi: 'ओम श्रां श्रीं श्रौं सः चंद्राय नमः', rulingPlanet: 'Moon (Chandra)', element: 'Water (Jal)', overallRating: 3 },
 { rashi: 'leo', rashiHindi: 'सिंह', rashiEnglish: 'Leo', symbol: '', prediction: 'Leadership qualities shine bright. A celebration brings happiness.', luckyNumber: 1, luckyColor: 'Gold', luckyDirection: 'East', mantra: 'Om Hraam Hreem Hraum Sah Suryaya Namah', mantraHindi: 'ओम ह्रां ह्रीं ह्रौं सः सूर्याय नमः', rulingPlanet: 'Sun (Surya)', element: 'Fire (Agni)', overallRating: 5 },
 { rashi: 'virgo', rashiHindi: 'कन्या', rashiEnglish: 'Virgo', symbol: '', prediction: 'Attention to detail pays off. Health improvements noticed.', luckyNumber: 7, luckyColor: 'Green', luckyDirection: 'South', mantra: 'Om Braam Breem Braum Sah Budhaya Namah', mantraHindi: 'ओम ब्रां ब्रीं ब्रौं सः बुधाय नमः', rulingPlanet: 'Mercury (Budh)', element: 'Earth (Prithvi)', overallRating: 4 },
 { rashi: 'libra', rashiHindi: 'तुला', rashiEnglish: 'Libra', symbol: '', prediction: 'Balance and harmony define your day. Partnerships flourish.', luckyNumber: 6, luckyColor: 'Pink', luckyDirection: 'West', mantra: 'Om Draam Dreem Draum Sah Shukraya Namah', mantraHindi: 'ओम द्रां द्रीं द्रौं सः शुक्राय नमः', rulingPlanet: 'Venus (Shukra)', element: 'Air (Vayu)', overallRating: 4 },
 { rashi: 'scorpio', rashiHindi: 'वृश्चिक', rashiEnglish: 'Scorpio', symbol: '', prediction: 'Transformation and deep insights. Your intuition is strong.', luckyNumber: 8, luckyColor: 'Maroon', luckyDirection: 'North', mantra: 'Om Kraam Kreem Kraum Sah Bhaumaya Namah', mantraHindi: 'ओम क्रां क्रीं क्रौं सः भौमाय नमः', rulingPlanet: 'Mars (Mangal)', element: 'Water (Jal)', overallRating: 3 },
 { rashi: 'sagittarius', rashiHindi: 'धनु', rashiEnglish: 'Sagittarius', symbol: '', prediction: 'Adventure and learning highlighted. Foreign connections bring news.', luckyNumber: 3, luckyColor: 'Purple', luckyDirection: 'Northeast', mantra: 'Om Graam Greem Graum Sah Gurave Namah', mantraHindi: 'ओम ग्रां ग्रीं ग्रौं सः गुरवे नमः', rulingPlanet: 'Jupiter (Guru)', element: 'Fire (Agni)', overallRating: 4 },
 { rashi: 'capricorn', rashiHindi: 'मकर', rashiEnglish: 'Capricorn', symbol: '', prediction: 'Career ambitions get a major boost. Hard work pays off.', luckyNumber: 10, luckyColor: 'Brown', luckyDirection: 'West', mantra: 'Om Praam Preem Praum Sah Shanaischaraya Namah', mantraHindi: 'ओम प्रां प्रीं प्रौं सः शनैश्चराय नमः', rulingPlanet: 'Saturn (Shani)', element: 'Earth (Prithvi)', overallRating: 5 },
 { rashi: 'aquarius', rashiHindi: 'कुम्भ', rashiEnglish: 'Aquarius', symbol: '', prediction: 'Innovation and social connections thrive. A unique idea impresses.', luckyNumber: 11, luckyColor: 'Electric Blue', luckyDirection: 'Southwest', mantra: 'Om Praam Preem Praum Sah Shanaischaraya Namah', mantraHindi: 'ओम प्रां प्रीं प्रौं सः शनैश्चराय नमः', rulingPlanet: 'Saturn (Shani)', element: 'Air (Vayu)', overallRating: 4 },
 { rashi: 'pisces', rashiHindi: 'मीन', rashiEnglish: 'Pisces', symbol: '', prediction: 'Spiritual awareness and creativity peak. Dreams carry messages.', luckyNumber: 12, luckyColor: 'Sea Green', luckyDirection: 'Northeast', mantra: 'Om Graam Greem Graum Sah Gurave Namah', mantraHindi: 'ओम ग्रां ग्रीं ग्रौं सः गुरवे नमः', rulingPlanet: 'Jupiter (Guru)', element: 'Water (Jal)', overallRating: 4 },
];

// LC-12: the pills and the URL parser must read from ONE list. A pill the
// parser does not recognise writes ?filter=X and then reloads as "All" — the
// same half-shipped contract this finding is about, one drifted string later.
const specializations = ASTROLOGY_SPECIALIZATIONS;

const sortOptions = [
 { value: '', label: 'Relevance' },
 { value: 'rating', label: 'Top Rated' },
 { value: 'price', label: 'Price: Low to High' },
 { value: 'experience', label: 'Most Experienced' },
];

// ─── Page Component ───────────────────────────────────────────────────────────

export default function AstrologyPage() {
 const searchParams = useSearchParams();

 const [astrologers, setAstrologers] = useState<Astrologer[]>([]);
 const [horoscopes] = useState<DailyHoroscope[]>(fallbackHoroscopes);

 // LC-12: the four list controls below are the shareable identity of this page
 // — "online Vastu astrologers, cheapest first" is a query people type into
 // Google — and none of them used to reach the URL. See lib/astrology-filters.
 const [filters, setFilters] = useState<AstrologyFilters>(() =>
  parseAstrologyFilters(new URLSearchParams(searchParams?.toString() ?? ''))
 );
 const { spec: activeFilter, sort: sortBy, rashi: selectedRashi, online: showOnlineOnly } = filters;

 // Mirror for `commit`, so it can merge onto the freshest filters without
 // taking them as a dependency (and without doing history side effects inside
 // a setState updater, which React re-invokes).
 const filtersRef = useRef(filters);

 // AW-02 (2026-08-12, P0): this fetched `/astrology/astrologers?limit=100` —
 // the 15-row in-memory MOCK fixture — and seeded state with a hardcoded copy
 // of the same invented people, so the funnel sold consultations with
 // astrologers nobody could deliver while the 3 genuinely onboarded ones were
 // invisible. It now reads `/astrology/astrologers/live`: approved
 // AstrologerProfile rows only, the same set the booking endpoint will accept
 // (POST /consultation/book now REFUSES any non-onboarded astrologer id).
 //
 // There is deliberately no fallback. Empty means empty and a failure says it
 // failed — rendering fixtures on error is the defect this whole finding is.
 const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');

 // AW-02: the "From Rs. X/min" figure on the Live Consultation card was static
 // copy claiming Rs 10/min. It is now the real minimum across the loaded
 // directory, and null when nothing has loaded — so the card can say
 // "See astrologers" rather than quote a price nobody offers.
 const lowestRate = useMemo(() => {
   const rates = astrologers
     .map((a) => a.perMinuteRate)
     .filter((r): r is number => typeof r === 'number' && Number.isFinite(r) && r > 0);
   return rates.length ? Math.min(...rates) : null;
 }, [astrologers]);
 useEffect(() => {
  let cancelled = false;
  (async () => {
   try {
    // DF-12: bounded, because a bare `fetch` never rejects on a stalled socket
    // and `loadState` would sit on 'loading' — "Loading verified astrologers..."
    // forever, with the error branch below unreachable.
    const r = await astrologyFetch(`${API_BASE_URL}/astrology/astrologers/live`);
    if (!r.ok) { if (!cancelled) setLoadState('error'); return; }
    const j = await r.json();
    const list = Array.isArray(j?.astrologers) ? (j.astrologers as Astrologer[]) : [];
    if (!cancelled) {
     setAstrologers(list);
     setLoadState('ready');
    }
   } catch {
    if (!cancelled) setLoadState('error');
   }
  })();
  return () => { cancelled = true; };
 }, []);

 // LC-12: this used to be `router.replace(...)` inside an effect. In the App
 // Router that is a NAVIGATION: every pill click fired `GET /astrology?…&_rsc=…`
 // and the address bar only moved once that round trip committed, so on a cold
 // or wedged API the URL never changed at all. `replace` also writes no history
 // entry, so Back could not undo a filter. Every filter here runs client-side
 // over an array we already hold, so the server has nothing to contribute — the
 // native History API (which the App Router has synced with usePathname /
 // useSearchParams since 14.1) writes the URL with no request at all.
 const commit = useCallback((next: Partial<AstrologyFilters>) => {
  const merged = { ...filtersRef.current, ...next };
  filtersRef.current = merged;
  setFilters(merged);
  if (typeof window === 'undefined') return;
  const url = `${window.location.pathname}${buildAstrologyQuery(merged)}`;
  if (url === `${window.location.pathname}${window.location.search}`) return;
  window.history.pushState(null, '', url);
 }, []);

 // Back/Forward: re-read the URL so the LIST reverts, not just the address bar.
 useEffect(() => {
  const onPop = () => {
   const next = parseAstrologyFilters(new URLSearchParams(window.location.search));
   filtersRef.current = next;
   setFilters(next);
  };
  window.addEventListener('popstate', onPop);
  return () => window.removeEventListener('popstate', onPop);
 }, []);

 // Kundli form
 const [kundliName, setKundliName] = useState('');
 const [kundliDate, setKundliDate] = useState('');
 const [kundliTime, setKundliTime] = useState('');
 const [kundliPlace, setKundliPlace] = useState('');
 const [kundliGenerated, setKundliGenerated] = useState(false);

 // Compatibility form
 const [compatRashi1, setCompatRashi1] = useState('');
 const [compatRashi2, setCompatRashi2] = useState('');
 const [compatScore, setCompatScore] = useState<number | null>(null);

 // Filter astrologers. Every accessor is null-tolerant: the live payload comes
 // from nullable DB columns, unlike the fixture that guaranteed every field.
 const filteredAstrologers = astrologers.filter((a) => {
 if (activeFilter !== 'All' && !(a.specializations ?? []).includes(activeFilter)) return false;
 if (showOnlineOnly && !a.isOnline) return false;
 return true;
 }).sort((a, b) => {
 if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
 if (sortBy === 'price') return (a.perMinuteRate ?? 0) - (b.perMinuteRate ?? 0);
 if (sortBy === 'experience') return (b.experienceYears ?? 0) - (a.experienceYears ?? 0);
 // Default: online first
 return Number(!!b.isOnline) - Number(!!a.isOnline) || (b.rating ?? 0) - (a.rating ?? 0);
 });
 const onlineCount = filteredAstrologers.filter((a) => a.isOnline).length;

 function getStatusColor(astrologer: Astrologer) {
 return astrologer.isOnline ? 'bg-emerald-400' : 'bg-surface-400';
 }

 // Initials, not a photo: an AstrologerProfile carries no image, and the old
 // fixture attached stock portraits to named people.
 function initials(name: string) {
 const words = name
 .replace(/\b(pt\.?|pandit|acharya|dr\.?|shri|smt\.?|guru)\b/gi, ' ')
 .trim()
 .split(/\s+/)
 .filter(Boolean);
 const picked = words.length > 0 ? words : name.trim().split(/\s+/).filter(Boolean);
 return picked.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
 }

 function handleGenerateKundli() {
 if (kundliName && kundliDate && kundliTime && kundliPlace) {
 setKundliGenerated(true);
 }
 }

 function handleCompatibility() {
 if (compatRashi1 && compatRashi2) {
 const seed = (compatRashi1.charCodeAt(0) + compatRashi2.charCodeAt(0)) % 30;
 setCompatScore(Math.min(98, 55 + seed + ((compatRashi1.length + compatRashi2.length) % 20)));
 }
 }

 function renderStars(rating: number) {
 return (
 <div className="flex items-center gap-0.5">
 {[1, 2, 3, 4, 5].map((star) => (
 <Star
 key={star}
 className={`w-3.5 h-3.5 ${
 star <= Math.round(rating)
 ? 'fill-amber-400 text-amber-400'
 : 'fill-surface-200 text-surface-200'
 }`}
 />
 ))}
 </div>
 );
 }

 return (
 <div className="min-h-[100dvh]">
 {/* ── Hero Section ─────────────────────────────────────────────────────── */}
 <section className="bg-[#ede9e3]">
 <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-16 lg:py-24">
 <div className="text-center">
 {/* Promo badge */}
 <div className="inline-flex items-center gap-2 bg-saffron-100 border border-saffron-200 rounded-full px-5 py-2 mb-6">
 <Sparkles className="w-4 h-4 text-saffron-600" />
 <span className="text-sm font-semibold text-saffron-700">First 5 Minutes FREE</span>
 </div>

 <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-surface-800 mb-5 leading-tight">
 Connect with India&apos;s<br />
 <span className="text-[var(--color-primary)]">
 Top Astrologers
 </span>
 </h1>
 <p className="text-lg text-surface-500 max-w-2xl mx-auto mb-10 leading-relaxed">
 Get accurate predictions, personalized remedies, and spiritual guidance from
 verified astrologers. Available 24/7 via chat, call, or video.
 </p>

 {/* Feature Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
 {/* AI Astrologer Card */}
 <Link
 href="/astrology/chat"
 className="group relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 text-left hover:-translate-y-0.5 hover:shadow-md transition-all duration-300"
 >
 <div className="w-12 h-12 bg-saffron-600/15 rounded-xl flex items-center justify-center mb-4">
 <Brain className="w-6 h-6 text-saffron-600" />
 </div>
 <h3 className="text-lg font-bold text-surface-800 mb-2">AI Astrologer</h3>
 <p className="text-sm text-surface-500 mb-3">
 Free consultation, kundli analysis, remedies, and predictions
 </p>
 <div className="inline-flex items-center gap-1 text-sm font-semibold text-saffron-600">
 Free Consultation <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
 </div>
 </Link>

 {/* Live Consultation Card
     AW-02: was a bare <div className="... cursor-pointer"> with no href and no
     onClick — it looked clickable and did nothing. Its price line also read
     "From Rs. 10/min" as static copy while the cheapest REAL astrologer is
     Rs 18/min, so the one number on the card was both invented and low.
     Now a real Link, and the price is derived from the loaded directory (or
     omitted entirely when no rate is known — never a made-up floor). */}
 <Link
 href="#online-astrologers"
 className="group relative block bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 text-left hover:-translate-y-0.5 hover:shadow-md transition-all duration-300"
 >
 <div className="w-12 h-12 bg-saffron-600 rounded-xl flex items-center justify-center mb-4">
 <MessageCircle className="w-6 h-6 text-white" />
 </div>
 <h3 className="text-lg font-bold text-surface-800 mb-2">Live Consultation</h3>
 <p className="text-sm text-surface-500 mb-3">
 Chat with verified astrologers for personalized guidance
 </p>
 <div className="inline-flex items-center gap-1 text-sm font-semibold text-saffron-600">
 {lowestRate !== null ? `From Rs. ${lowestRate}/min` : 'See astrologers'}{' '}
 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
 </div>
 </Link>
 </div>
 </div>
 </div>
 </section>

 {/* ── Online Astrologers Section ──────────────────────────────────────── */}
 {/* AW-02: id is the Live Consultation card's link target — the card used to
     be a dead <div>, so there was nothing for it to point at. */}
 <section
 id="online-astrologers"
 className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-12 lg:py-16"
 >
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
 <div>
 <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight text-surface-800">
 Talk to Astrologers
 </h2>
 <p className="text-surface-500 mt-1">
 {loadState === 'ready'
 ? `${onlineCount} ${onlineCount === 1 ? 'astrologer' : 'astrologers'} online now`
 : loadState === 'loading'
 ? 'Loading verified astrologers...'
 : 'Availability unavailable'}
 </p>
 </div>
 <div className="flex items-center gap-3">
 <label className="flex items-center gap-2 text-sm text-surface-600 cursor-pointer">
 <input
 type="checkbox"
 checked={showOnlineOnly}
 onChange={(e) => commit({ online: e.target.checked })}
 className="w-4 h-4 rounded border-surface-300 text-saffron-600 focus:ring-saffron-400"
 />
 Online only
 </label>
 {/* LC-12: the sort control had no accessible name — a screen-reader user
     heard "combo box, Relevance" with nothing saying what it sorts. */}
 <select
 aria-label="Sort astrologers"
 value={sortBy}
 onChange={(e) => {
  const v = e.target.value as AstrologySort;
  commit({ sort: ASTROLOGY_SORT_VALUES.includes(v) ? v : '' });
 }}
 className="text-sm border border-surface-200 rounded-xl px-3 py-2 bg-white text-surface-700 focus:ring-2 focus:ring-saffron-400 focus:border-saffron-400"
 >
 {sortOptions.map((opt) => (
 <option key={opt.value} value={opt.value}>{opt.label}</option>
 ))}
 </select>
 </div>
 </div>

 {/* Specialization Filter Pills */}
 <div className="flex flex-wrap gap-2 mb-8">
 {specializations.map((spec) => (
 <button
 key={spec}
 type="button"
 aria-pressed={activeFilter === spec}
 onClick={() => commit({ spec })}
 className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
 activeFilter === spec
 ? 'bg-saffron-600 text-white shadow-md'
 : 'bg-white text-surface-600 border border-surface-200 hover:border-saffron-300 hover:text-saffron-600'
 }`}
 >
 {spec}
 </button>
 ))}
 </div>

 {/* Astrologer Cards Grid.
 AW-02: three honest terminal states — loading, failed, empty — instead of
 the old behaviour of silently rendering 15 invented astrologers. */}
 {loadState === 'loading' ? (
 <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center text-sm text-surface-500">
 Loading verified astrologers...
 </div>
 ) : loadState === 'error' ? (
 <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
 <p className="text-sm font-semibold text-red-700">
 We could not load the astrologer directory.
 </p>
 <p className="mt-1 text-xs text-red-600">
 Please try again shortly. We will not show you astrologers we cannot connect you to.
 </p>
 </div>
 ) : filteredAstrologers.length === 0 ? (
 <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
 <p className="text-sm font-semibold text-surface-700">
 No astrologers are available right now.
 </p>
 <p className="mt-1 text-xs text-surface-500">
 {astrologers.length > 0
 ? 'No verified astrologer matches these filters. Try clearing them.'
 : 'Our verified astrologers are being onboarded. Use the free Kundli and horoscope tools below in the meantime.'}
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
 {filteredAstrologers.map((astrologer) => {
 const rating = typeof astrologer.rating === 'number' && astrologer.rating > 0 ? astrologer.rating : null;
 const consults = typeof astrologer.consultationCount === 'number' ? astrologer.consultationCount : 0;
 const rate = typeof astrologer.perMinuteRate === 'number' && astrologer.perMinuteRate > 0 ? astrologer.perMinuteRate : null;
 const languages = (astrologer.languages ?? []).filter(Boolean);
 const specs = (astrologer.specializations ?? []).filter(Boolean);
 const years = typeof astrologer.experienceYears === 'number' ? astrologer.experienceYears : null;
 return (
 <Link
 key={astrologer.id}
 href={`/astrology/${astrologer.id}`}
 className="group bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden card-hover transition-all duration-300"
 >
 {/* Card Header */}
 <div className="relative p-4 pb-3">
 <div className="flex items-start gap-3">
 {/* Initials — the API carries no image for a real profile. */}
 <div className="relative shrink-0">
 <div
 className="w-16 h-16 rounded-xl bg-gradient-to-br from-saffron-100 to-amber-100 text-saffron-700 flex items-center justify-center font-serif text-xl font-semibold"
 aria-hidden="true"
 >
 {initials(astrologer.name)}
 </div>
 {/* Status dot */}
 <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 ${getStatusColor(astrologer)} rounded-full border-2 border-white`} />
 </div>

 {/* Info */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-1.5 mb-0.5">
 <h3 className="text-sm font-bold text-surface-800 truncate">
 {astrologer.name}
 </h3>
 {astrologer.verified && (
 <BadgeCheck className="w-4 h-4 text-saffron-600 shrink-0" />
 )}
 </div>
 <div className="flex items-center gap-1.5 mb-1">
 {rating !== null ? (
 <>
 {renderStars(rating)}
 <span className="text-xs text-surface-500">
 {rating.toFixed(1)}
 {consults > 0 ? ` (${consults.toLocaleString('en-IN')})` : ''}
 </span>
 </>
 ) : (
 <span className="text-xs text-surface-400">New on Darshya</span>
 )}
 </div>
 <p className="text-xs text-surface-500">
 {years !== null ? `${years} yrs exp` : 'Experience not listed'}
 {languages.length > 0 ? ` | ${languages.slice(0, 2).join(', ')}` : ''}
 </p>
 </div>
 </div>
 </div>

 {/* Specializations */}
 {specs.length > 0 && (
 <div className="px-4 pb-3">
 <div className="flex flex-wrap gap-1">
 {specs.slice(0, 3).map((spec) => (
 <span
 key={spec}
 className="text-xs font-medium px-2 py-0.5 rounded-md bg-saffron-50 text-saffron-600"
 >
 {spec}
 </span>
 ))}
 </div>
 </div>
 )}

 {/* Footer */}
 <div className="px-4 pb-4 flex items-center justify-between">
 <div className="text-sm font-bold text-surface-800">
 {rate !== null ? (
 <>
 <span className="text-lg">{'₹'}{rate}</span>
 <span className="text-xs font-normal text-surface-400">/min</span>
 </>
 ) : (
 <span className="text-xs font-normal text-surface-400">Rate on request</span>
 )}
 </div>
 <span
 className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
 astrologer.isOnline
 ? 'bg-saffron-600 text-white shadow-sm group-hover:shadow-md group-hover:bg-saffron-700'
 : 'bg-surface-100 text-surface-400'
 }`}
 >
 {astrologer.isOnline ? 'Chat Now' : 'Offline'}
 </span>
 </div>
 </Link>
 );
 })}
 </div>
 )}
 </section>

 {/* ── AI Features Section (Free Tools) ────────────────────────────────── */}
 <section className="bg-[#ede9e3] py-12 lg:py-16">
 <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10">
 <div className="text-center mb-10">
 <div className="inline-flex items-center gap-2 bg-saffron-100 border border-saffron-200 rounded-full px-4 py-1.5 mb-4">
 <Sparkles className="w-3.5 h-3.5 text-saffron-600" />
 <span className="text-xs font-bold text-saffron-700 uppercase tracking-wider">Free AI Tools</span>
 </div>
 <h2 className="text-2xl font-semibold text-surface-800 mb-2">
 Explore Your Astrology Blueprint
 </h2>
 <p className="text-surface-500 max-w-xl mx-auto">
 Get instant insights with our AI-powered astrology tools. No registration required.
 </p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {/* Free Kundli Card */}
 <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
 <div className="flex items-center gap-3 mb-5">
 <div className="w-10 h-10 bg-saffron-600/15 rounded-xl flex items-center justify-center">
 <Sun className="w-5 h-5 text-saffron-600" />
 </div>
 <div>
 <h3 className="font-bold text-surface-800">Free Kundli</h3>
 <p className="text-xs text-surface-500">Birth chart analysis</p>
 </div>
 </div>

 <div className="space-y-3 mb-5">
 <input
 type="text"
 placeholder="Full Name"
 value={kundliName}
 onChange={(e) => setKundliName(e.target.value)}
 className="w-full px-3 py-2 bg-surface-50 border border-[var(--color-border)] rounded-xl text-sm text-surface-800 placeholder:text-surface-400 focus:ring-2 focus:ring-saffron-400 focus:border-saffron-400 outline-none"
 />
 <DateInput
 value={kundliDate}
 onChange={(v) => setKundliDate(v)}
 />
 <input
 type="time"
 value={kundliTime}
 onChange={(e) => setKundliTime(e.target.value)}
 className="w-full px-3 py-2 bg-surface-50 border border-[var(--color-border)] rounded-xl text-sm text-surface-800 focus:ring-2 focus:ring-saffron-400 focus:border-saffron-400 outline-none"
 />
 <input
 type="text"
 placeholder="Birth Place"
 value={kundliPlace}
 onChange={(e) => setKundliPlace(e.target.value)}
 className="w-full px-3 py-2 bg-surface-50 border border-[var(--color-border)] rounded-xl text-sm text-surface-800 placeholder:text-surface-400 focus:ring-2 focus:ring-saffron-400 focus:border-saffron-400 outline-none"
 />
 </div>

 {kundliGenerated ? (
 <div className="bg-saffron-50 rounded-xl p-4 mb-4">
 <p className="text-saffron-700 font-semibold text-sm mb-2">Quick Preview Generated!</p>
 <p className="text-xs text-surface-500 mb-3">
 For full birth chart with planetary positions, dasha periods, and dosha analysis:
 </p>
 <Link href="/astrology/kundli" className="inline-flex items-center gap-1 text-xs text-saffron-600 font-semibold hover:underline">
 Open Full Kundli Generator <ArrowRight className="w-3 h-3" />
 </Link>
 </div>
 ) : (
 <Link
 href="/astrology/kundli"
 className="w-full py-2.5 bg-saffron-600 text-white font-medium text-sm rounded-lg hover:bg-saffron-700 transition-all text-center block"
 >
 Generate Kundli
 </Link>
 )}
 </div>

 {/* Daily Horoscope Card */}
 <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
 <div className="flex items-center gap-3 mb-5">
 <div className="w-10 h-10 bg-saffron-600/15 rounded-xl flex items-center justify-center">
 <Moon className="w-5 h-5 text-saffron-600" />
 </div>
 <div>
 <h3 className="font-bold text-surface-800">Daily Horoscope</h3>
 <p className="text-xs text-surface-500">Today&apos;s prediction</p>
 </div>
 </div>

 <div className="grid grid-cols-4 gap-1.5 mb-4">
 {horoscopes.slice(0, 12).map((h) => (
 <button
 key={h.rashi}
 type="button"
 data-rashi={h.rashi}
 aria-pressed={selectedRashi === h.rashi}
 aria-label={`${h.rashiEnglish} horoscope`}
 onClick={() => commit({ rashi: selectedRashi === h.rashi ? null : h.rashi })}
 className={`flex flex-col items-center py-2 rounded-lg transition-all text-center ${
 selectedRashi === h.rashi
 ? 'bg-saffron-100 border border-saffron-300'
 : 'bg-surface-50 border border-transparent hover:bg-surface-100'
 }`}
 >
 <span className="text-lg leading-none">{h.symbol}</span>
 <span className="text-xs text-surface-500 mt-0.5">{h.rashiHindi}</span>
 </button>
 ))}
 </div>

 {selectedRashi ? (
 <div className="bg-saffron-50 rounded-xl p-4">
 {(() => {
 const h = horoscopes.find((hr) => hr.rashi === selectedRashi);
 if (!h) return null;
 return (
 <>
 <div className="flex items-center gap-2 mb-2">
 <span className="text-xl">{h.symbol}</span>
 <div>
 <p className="text-sm font-bold text-surface-800">{h.rashiEnglish}</p>
 <p className="text-xs text-surface-500">{h.rashiHindi} &middot; {h.rulingPlanet}</p>
 </div>
 </div>
 <p className="text-xs text-surface-600 leading-relaxed mb-2">{h.prediction}</p>
 {/* Mantra */}
 <div className="bg-white/60 rounded-lg p-2 mb-2">
 <p className="text-xs text-surface-400 uppercase tracking-wide mb-0.5">Daily Mantra</p>
 <p className="text-xs font-medium text-saffron-700">{h.mantraHindi}</p>
 </div>
 <div className="flex flex-wrap items-center gap-2 text-xs text-surface-400">
 <span>Lucky #{h.luckyNumber}</span>
 <span>{h.luckyColor}</span>
 <span className="flex items-center gap-0.5">
 <Compass className="w-2.5 h-2.5" />
 {h.luckyDirection}
 </span>
 <span>{h.element}</span>
 </div>
 </>
 );
 })()}
 </div>
 ) : (
 <p className="text-xs text-surface-400 text-center py-3">
 Select your rashi to see today&apos;s prediction
 </p>
 )}

 <Link
 href="/astrology/horoscope"
 className="inline-flex items-center gap-1 text-xs text-saffron-600 font-semibold mt-3 hover:text-saffron-700 transition-colors"
 >
 View All Horoscopes <ArrowRight className="w-3 h-3" />
 </Link>
 </div>

 {/* Compatibility Match Card */}
 <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
 <div className="flex items-center gap-3 mb-5">
 <div className="w-10 h-10 bg-saffron-600/15 rounded-xl flex items-center justify-center">
 <Heart className="w-5 h-5 text-saffron-600" />
 </div>
 <div>
 <h3 className="font-bold text-surface-800">Compatibility Match</h3>
 <p className="text-xs text-surface-500">Rashi matching</p>
 </div>
 </div>

 <div className="space-y-3 mb-5">
 <div>
 <label className="text-xs text-surface-500 mb-1 block">Your Rashi</label>
 <select
 value={compatRashi1}
 onChange={(e) => { setCompatRashi1(e.target.value); setCompatScore(null); }}
 className="w-full px-3 py-2 bg-surface-50 border border-[var(--color-border)] rounded-xl text-sm text-surface-800 focus:ring-2 focus:ring-saffron-400 focus:border-saffron-400 outline-none"
 >
 <option value="">Select Rashi</option>
 {horoscopes.map((h) => (
 <option key={h.rashi} value={h.rashi}>
 {h.symbol} {h.rashiEnglish} ({h.rashiHindi})
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className="text-xs text-surface-500 mb-1 block">Partner&apos;s Rashi</label>
 <select
 value={compatRashi2}
 onChange={(e) => { setCompatRashi2(e.target.value); setCompatScore(null); }}
 className="w-full px-3 py-2 bg-surface-50 border border-[var(--color-border)] rounded-xl text-sm text-surface-800 focus:ring-2 focus:ring-saffron-400 focus:border-saffron-400 outline-none"
 >
 <option value="">Select Rashi</option>
 {horoscopes.map((h) => (
 <option key={h.rashi} value={h.rashi}>
 {h.symbol} {h.rashiEnglish} ({h.rashiHindi})
 </option>
 ))}
 </select>
 </div>
 </div>

 {compatScore !== null ? (
 <div className="bg-saffron-50 rounded-xl p-4 text-center mb-4">
 <p className="text-xs text-surface-500 mb-1">Compatibility Score</p>
 <p className="text-xl font-semibold text-saffron-600">
 {compatScore}%
 </p>
 <p className="text-xs text-surface-500 mt-1">
 {compatScore > 75 ? 'Highly Compatible!' : compatScore > 60 ? 'Good Match!' : 'Needs Understanding'}
 </p>
 </div>
 ) : (
 <button
 onClick={handleCompatibility}
 disabled={!compatRashi1 || !compatRashi2}
 className="w-full py-2.5 bg-saffron-600 text-white font-medium text-sm rounded-lg hover:bg-saffron-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Check Compatibility
 </button>
 )}
 </div>
 </div>
 </div>
 </section>

 {/* ── How It Works ─────────────────────────────────────────────────────── */}
 <section className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-12 lg:py-16">
 <div className="text-center mb-10">
 <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight text-surface-800 mb-2">
 How It Works
 </h2>
 <p className="text-surface-500">Get guidance in 4 simple steps</p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
 {[
 {
 step: 1,
 icon: Search,
 title: 'Choose Astrologer',
 desc: 'Browse profiles, check ratings, specializations, and find the right astrologer for you.',
 },
 {
 step: 2,
 icon: MessageCircle,
 title: 'Start Chat',
 desc: 'Connect instantly via chat, call, or video. First 5 minutes are free for new users.',
 },
 {
 step: 3,
 icon: Eye,
 title: 'Get Guidance',
 desc: 'Receive personalized predictions, remedies, and spiritual guidance from the expert.',
 },
 {
 step: 4,
 icon: Star,
 title: 'Rate & Review',
 desc: 'Share your experience to help others find the best astrologers on the platform.',
 },
 ].map((item) => {
 const Icon = item.icon;
 return (
 <div key={item.step} className="relative text-center group">
 <div className="w-14 h-14 mx-auto bg-saffron-600/15 rounded-xl flex items-center justify-center mb-4">
 <Icon className="w-6 h-6 text-saffron-600" />
 </div>
 <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-2 w-6 h-6 bg-white rounded-full border-2 border-saffron-200 flex items-center justify-center">
 <span className="text-xs font-bold text-saffron-600">{item.step}</span>
 </div>
 <h3 className="text-base font-bold text-surface-800 mb-1.5">{item.title}</h3>
 <p className="text-sm text-surface-500 leading-relaxed">{item.desc}</p>
 </div>
 );
 })}
 </div>
 </section>

 {/* ── Trust Section ────────────────────────────────────────────────────── */}
 <section className="bg-[#ede9e3]">
 <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-12 lg:py-14">
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
 {[
 { icon: Users, value: 'Vetted', label: 'Verified Astrologers', color: 'text-saffron-600' },
 { icon: Award, value: 'Selective', label: 'Manual Onboarding', color: 'text-saffron-600' },
 { icon: Clock, value: '24/7', label: 'Available', color: 'text-saffron-600' },
 { icon: Lock, value: '100%', label: 'Private & Secure', color: 'text-saffron-600' },
 ].map((stat) => {
 const Icon = stat.icon;
 return (
 <div key={stat.label}>
 <Icon className={`w-8 h-8 ${stat.color} mx-auto mb-3`} />
 <p className="text-lg font-semibold text-surface-800 mb-1">{stat.value}</p>
 <p className="text-sm text-surface-500">{stat.label}</p>
 </div>
 );
 })}
 </div>
 </div>
 </section>
 </div>
 );
}
