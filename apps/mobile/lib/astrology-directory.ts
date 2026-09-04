/**
 * The astrology vertical's payload readers, kept out of the screens.
 *
 * WHY A LIB AND NOT A COMPONENT FILE
 * ----------------------------------
 * apps/mobile/vitest.config.ts runs plain node with no react-native transform,
 * so anything that imports `react-native` at the top level cannot be unit
 * tested at all. A rule that lives inside a screen is a rule nothing can check
 * — the same argument lib/astrologer-supply-label.ts and
 * lib/astrologer-rate-card.ts already make for this vertical.
 *
 * WHAT THE API ACTUALLY SERVES, and therefore what may be rendered
 * ---------------------------------------------------------------
 *   GET /api/v1/astrology/astrologers/live
 *     -> { astrologers[], total, source: 'live' }
 *   GET /api/v1/astrology/astrologers/:id            (:id MUST be a uuid)
 *     -> { astrologer: {...} }  |  404 { error }
 *   GET /api/v1/astrology/astrologers/:id/reviews
 *     -> { reviews: [], total: 0, ... }   ALWAYS empty — there is no
 *        astrologer review table; the generated testimonials were deleted in
 *        AW-02. So this vertical prints "No reviews yet", never a count.
 *
 * Every row the two directory routes serve is built by
 * `loadApprovedAstrologers` (apps/api/src/routes/astrology.ts) from an APPROVED
 * `AstrologerProfile` — a real person who entered these fields about
 * themselves. The 15-row invented fixture that used to back this funnel was
 * deleted; nothing here may re-introduce a plausible-looking substitute for a
 * field the payload does not carry. An absent field removes its row.
 */

import { formatInr } from './api-contracts';

// ─── payload shape ──────────────────────────────────────────────────────────

export interface LiveAstrologer {
  /** AstrologerProfile.id — a uuid. The only id the booking route accepts. */
  id: string;
  name: string;
  specializations: string[];
  languages: string[];
  /** null when the column is 0/absent; the row is omitted rather than zeroed. */
  experienceYears: number | null;
  /** null when unrated. Never defaulted to a plausible 4.x. */
  rating: number | null;
  consultationCount: number;
  /** ₹ per minute, Decimal(10,2) over JSON. null when unreadable or <= 0. */
  perMinuteRate: number | null;
  isOnline: boolean;
  /** Presence toggle: which channels the astrologer opened. */
  chat: boolean;
  call: boolean;
  bio: string | null;
  /** `approved` on the profile row — the only credential this product checks. */
  verified: boolean;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
}

function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function strList(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim())
    : [];
}

/**
 * One astrologer, or null when the row cannot be identified.
 *
 * A row with no id cannot be opened and a row with no name cannot be labelled,
 * so both are dropped rather than rendered as "Astrologer".
 */
export function selectAstrologer(row: unknown): LiveAstrologer | null {
  if (!isRecord(row)) return null;
  const id = str(row.id);
  const name = str(row.name);
  if (!id || !name) return null;

  const experienceYears = num(row.experienceYears);
  const rating = num(row.rating);
  const rate = num(row.perMinuteRate);
  const mode = isRecord(row.mode) ? row.mode : null;

  return {
    id,
    name,
    specializations: strList(row.specializations),
    languages: strList(row.languages),
    experienceYears: experienceYears !== null && experienceYears > 0 ? experienceYears : null,
    rating: rating !== null && rating > 0 ? rating : null,
    consultationCount: num(row.consultationCount) ?? 0,
    perMinuteRate: rate !== null && rate > 0 ? rate : null,
    isOnline: row.isOnline === true,
    chat: mode?.chat === true,
    call: mode?.call === true,
    bio: str(row.bio),
    verified: row.verified === true,
  };
}

/**
 * The directory list.
 *
 * Returns null — not [] — when the payload has no `astrologers` ARRAY at all.
 * The distinction is the whole point: an unrecognised body is an error, and
 * saying "no astrologers are listed" when the API answered something else is a
 * lie about supply. LiveAstrologersClient on the web draws the same line.
 */
export function selectAstrologers(payload: unknown): LiveAstrologer[] | null {
  if (!isRecord(payload) || !Array.isArray(payload.astrologers)) return null;
  return payload.astrologers
    .map(selectAstrologer)
    .filter((a): a is LiveAstrologer => a !== null);
}

/** One profile from `GET /astrologers/:id` -> `{ astrologer }`. */
export function selectAstrologerDetail(payload: unknown): LiveAstrologer | null {
  if (!isRecord(payload)) return null;
  return selectAstrologer(payload.astrologer);
}

/** Specialization labels present in the rows that actually arrived. */
export function specializationsOf(rows: LiveAstrologer[]): string[] {
  const seen = new Set<string>();
  for (const a of rows) for (const s of a.specializations) seen.add(s);
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

export function onlineCountOf(rows: LiveAstrologer[]): number {
  return rows.reduce((n, a) => n + (a.isOnline ? 1 : 0), 0);
}

// ─── identity tile ──────────────────────────────────────────────────────────

/**
 * Initials, because this vertical renders no remote avatars: the payload
 * carries no image for an AstrologerProfile, and a broken-image box on a real
 * person's profile is worse than their initials. Honorifics are stripped so
 * "Pt. Raghunath Sharma" reads RS rather than PR.
 */
export function astrologerInitials(name: string): string {
  // `\b` BEFORE the optional dot, not after it. `\.?\b` cannot match "Pt."
  // — after the dot the next character is a space, so there is no word
  // boundary to satisfy, the `\.?` backtracks to empty and only "Pt" is
  // removed. The stranded "." then becomes the first "word" and
  // "Pt. Raghunath Sharma" initials as ".R".
  const cleaned = name.replace(/\b(pt|pandit|acharya|dr|shri|sri|smt|guru|jyotish)\b\.?/gi, ' ');
  // Belt and braces: a token that does not START with a letter or digit is
  // punctuation left behind by some honorific this list does not know about.
  const words = cleaned
    .trim()
    .split(/\s+/)
    .filter((w) => /^[0-9A-Za-zÀ-￿]/.test(w));
  const picked = words.length > 0 ? words : name.trim().split(/\s+/).filter(Boolean);
  const out = picked
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return out || 'A';
}

// ─── money ──────────────────────────────────────────────────────────────────

/**
 * The per-minute rate as the server states it.
 *
 * `formatInr` rounds, which is right for a total and wrong for a Decimal(10,2)
 * rate: an astrologer on ₹12.50/min must not be advertised at ₹13/min — the
 * gap compounds over every minute of every consultation and lands on the
 * supply side, which is the failure PM-10 documents in lib/astrologer-rate-card.ts.
 * So integers go through `formatInr` (one grouping implementation) and a
 * fractional rate keeps its paise.
 */
export function formatRate(amount: number): string {
  if (Number.isInteger(amount)) return formatInr(amount);
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "₹25 / min", or null when the profile carries no usable rate. */
export function ratePerMinuteLabel(rate: number | null): string | null {
  return rate === null ? null : `${formatRate(rate)} / min`;
}

// ─── booking hand-off ───────────────────────────────────────────────────────

/**
 * The durations the web booking page offers. Mirrored so the app cannot show a
 * choice the page it hands off to does not have.
 * (apps/web/app/astrology/[id]/book/page.tsx — MINUTE_PRESETS.)
 */
export const MINUTE_PRESETS = [5, 10, 15, 20, 30, 45, 60] as const;

/** The API's floor, stated by POST /consultation/book, not invented here. */
export const MIN_CONSULTATION_INR = 50;

/**
 * WHERE A CONSULTATION IS ACTUALLY PAID FOR, and why the app does not create
 * the order itself.
 *
 * The obvious mobile flow — POST /consultation/book here, then hand the
 * devotee to the website to pay — CANNOT be finished. `POST /consultation/book`
 * inserts an `astrologer_consultations` row at status `pending_payment` and
 * mints a Razorpay order, and the ONLY page that can settle one is
 * apps/web/app/astrology/[id]/book/page.tsx, which always creates a NEW order
 * of its own. There is no `/consultation/pay?id=` counterpart to
 * `/bookings/pay?id=` (that page is puja-only: it reads `/bookings/{id}` and
 * posts `/payments/create-order` with a `bookingId`). So an order created in
 * the app is an order nobody can pay: the devotee is left holding a
 * pending_payment row, and any attempt to finish it on the website charges a
 * second one.
 *
 * Therefore the app creates NOTHING. It gathers the choice, states the rate the
 * API published, and hands the whole booking step to the page that owns the
 * Razorpay checkout. Nothing is held, nothing is charged, nothing is stranded.
 *
 * AND IT GOES THROUGH THE LOGIN GATE, for the same reason
 * lib/booking-flow.ts's `resumePaymentUrl` does: `/astrology/[id]/book` is
 * wrapped in <AuthGuard>, which redirects an unauthenticated visitor to
 * `/auth/login?redirect=${pathname}` — PATHNAME ONLY, dropping the query
 * string. The app's session lives in expo-secure-store and the website's in
 * localStorage['poojly_session'], so the devotee arrives unauthenticated almost
 * every time. Addressing the login page directly keeps `?minutes=` intact
 * through the round trip.
 *
 * `webOrigin` is REQUIRED and has no default — a literal production host here
 * would send a LAN or staging build to a site that has never heard of this
 * astrologer id. lib/web-origin.ts resolves it.
 */
export function consultationBookingUrl(astrologerId: string, webOrigin: string): string {
  // NO `?minutes=`, deliberately. apps/web/app/astrology/[id]/book/page.tsx
  // reads only `params.id` and initialises its own `minutes` state to 15 — it
  // never looks at the query string. Sending a duration the page ignores would
  // let this screen offer a picker whose value silently evaporates, which is
  // why the duration list here is informational and the choice is made on the
  // page that actually honours it.
  //
  // Built by hand rather than with URLSearchParams: React Native ships a
  // deliberately partial polyfill whose `set`, `get` and `delete` throw
  // "not implemented", so the convenient spelling crashes on device while
  // passing every node-run unit test. String concatenation is what the rest of
  // this app uses (lib/booking-flow.ts's resumePaymentUrl) for the same reason.
  const target =
    `/astrology/${encodeURIComponent(astrologerId)}/book` +
    `?utm_source=mobile-app&utm_medium=astrologer-booking`;
  return `${webOrigin.replace(/\/+$/, '')}/auth/login?redirect=${encodeURIComponent(target)}`;
}

// ─── horoscope ──────────────────────────────────────────────────────────────

export interface RashiSign {
  /** The path segment `GET /astrology/horoscope/:rashi` matches. */
  id: string;
  english: string;
  /** Sanskrit/Hindi name in Latin script, as the rest of the app spells it. */
  hindi: string;
  symbol: string;
  range: string;
}

/**
 * The twelve rashis, in zodiac order.
 *
 * These are the ROUTE KEYS, not content: `astrologyService.getDailyHoroscope`
 * matches on `rashi`, `rashiEnglish` or `rashiHindi` and 404s anything else, so
 * the ids here are the ones the API answers. Every word of the READING comes
 * from that response — none of it is stored in the app.
 */
export const RASHI_SIGNS: RashiSign[] = [
  { id: 'aries', english: 'Aries', hindi: 'Mesh', symbol: '♈', range: 'Mar 21 - Apr 19' },
  { id: 'taurus', english: 'Taurus', hindi: 'Vrishabh', symbol: '♉', range: 'Apr 20 - May 20' },
  { id: 'gemini', english: 'Gemini', hindi: 'Mithun', symbol: '♊', range: 'May 21 - Jun 20' },
  { id: 'cancer', english: 'Cancer', hindi: 'Kark', symbol: '♋', range: 'Jun 21 - Jul 22' },
  { id: 'leo', english: 'Leo', hindi: 'Simha', symbol: '♌', range: 'Jul 23 - Aug 22' },
  { id: 'virgo', english: 'Virgo', hindi: 'Kanya', symbol: '♍', range: 'Aug 23 - Sep 22' },
  { id: 'libra', english: 'Libra', hindi: 'Tula', symbol: '♎', range: 'Sep 23 - Oct 22' },
  { id: 'scorpio', english: 'Scorpio', hindi: 'Vrishchik', symbol: '♏', range: 'Oct 23 - Nov 21' },
  { id: 'sagittarius', english: 'Sagittarius', hindi: 'Dhanu', symbol: '♐', range: 'Nov 22 - Dec 21' },
  { id: 'capricorn', english: 'Capricorn', hindi: 'Makar', symbol: '♑', range: 'Dec 22 - Jan 19' },
  { id: 'aquarius', english: 'Aquarius', hindi: 'Kumbh', symbol: '♒', range: 'Jan 20 - Feb 18' },
  { id: 'pisces', english: 'Pisces', hindi: 'Meen', symbol: '♓', range: 'Feb 19 - Mar 20' },
];

export function rashiById(id: string | null | undefined): RashiSign | null {
  if (typeof id !== 'string') return null;
  const key = id.trim().toLowerCase();
  return RASHI_SIGNS.find((r) => r.id === key || r.english.toLowerCase() === key) ?? null;
}

/**
 * The body of `GET /astrology/horoscope/:rashi` -> `{ horoscope }`.
 *
 * Every field is optional here because the screen renders a row only when the
 * response carries it. That is not defensiveness for its own sake: the sibling
 * route `GET /horoscope/daily` returns a DIFFERENT shape (`reading`, not
 * `prediction`), and app/(devotee)/horoscope.tsx read `prediction ?? general`
 * off it — so the screen rendered an empty card against a 200 response and
 * nobody could tell, because "no reading available" is also what a real miss
 * looks like.
 */
export interface RashiHoroscope {
  rashiEnglish: string | null;
  rashiHindi: string | null;
  symbol: string | null;
  date: string | null;
  prediction: string | null;
  career: string | null;
  love: string | null;
  health: string | null;
  luckyNumber: number | null;
  luckyColor: string | null;
  luckyDirection: string | null;
  mantra: string | null;
  mantraHindi: string | null;
  rulingPlanet: string | null;
  element: string | null;
  /** 1-5. null when absent — never defaulted to a flattering 4. */
  overallRating: number | null;
}

export function selectRashiHoroscope(payload: unknown): RashiHoroscope | null {
  if (!isRecord(payload)) return null;
  const h = payload.horoscope;
  if (!isRecord(h)) return null;
  const rating = num(h.overallRating);
  return {
    rashiEnglish: str(h.rashiEnglish),
    rashiHindi: str(h.rashiHindi),
    symbol: str(h.symbol),
    date: str(h.date),
    prediction: str(h.prediction),
    career: str(h.career),
    love: str(h.love),
    health: str(h.health),
    luckyNumber: num(h.luckyNumber),
    luckyColor: str(h.luckyColor),
    luckyDirection: str(h.luckyDirection),
    mantra: str(h.mantra),
    mantraHindi: str(h.mantraHindi),
    rulingPlanet: str(h.rulingPlanet),
    element: str(h.element),
    overallRating: rating !== null && rating >= 1 && rating <= 5 ? Math.round(rating) : null,
  };
}

/** True when the response carried at least one sentence worth showing. */
export function hasReading(h: RashiHoroscope | null): boolean {
  return h !== null && (!!h.prediction || !!h.career || !!h.love || !!h.health);
}
