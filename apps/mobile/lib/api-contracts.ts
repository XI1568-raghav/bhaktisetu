/**
 * API adapters for the mobile app.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Seven P0 defects in the 2026-08-12 audit (PAR-02..PAR-07) were all the same
 * failure: a screen read an envelope key the API has never returned, and the
 * hook declared a fabricated TypeScript interface so the compiler agreed. The
 * screens then silently rendered zero rows — or crashed on
 * `undefined.toLocaleString()` — or fell back to a hardcoded mock catalogue
 * whose prices contradicted the website.
 *
 * Every selector here is written against a VERBATIM captured response
 * (lib/__tests__/fixtures/live-api-2026-08-12.json) and is pinned by a test.
 * Two rules the selectors obey without exception:
 *
 *   1. Read the key the server actually sends. No `.data` guessing.
 *   2. An unrecognised shape yields an EMPTY result or `null` — never invented
 *      data. A wrong-but-plausible number on a devotional or financial screen
 *      is worse than a blank one.
 *
 * These functions are pure and dependency-free so they can be tested in Node
 * without a React Native renderer.
 */

// ─── shared helpers ──────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Reads `key` off `payload` only if it is an array. Otherwise []. */
function arrayAt(payload: unknown, key: string): unknown[] {
  if (!isRecord(payload)) return [];
  const v = payload[key];
  return Array.isArray(v) ? v : [];
}

/**
 * Prisma `Decimal` columns arrive as STRINGS over JSON ("2310", "1100").
 * Numeric columns arrive as numbers. Accept both; reject anything else so a
 * null/undefined never becomes a confident 0 on a money field.
 */
export function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toNumberOr(v: unknown, fallback: number): number {
  const n = toNumber(v);
  return n === null ? fallback : n;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/** ₹26,869 — not "₹0.3L". Indian grouping, no lakh divisor that hides digits. */
export function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

// ─── PAR-02: devotee bookings + addresses ────────────────────────────────────
// GET /api/v1/users/me/bookings -> {success, bookings[], pagination{page,limit,total,totalPages}}
// GET /api/v1/users/me/addresses -> {success, addresses[]}

export interface BookingRow {
  id: string;
  bookingNumber?: string;
  status?: string;
  scheduledDate?: string;
  scheduledTimeSlot?: string;
  priceAmount?: string | number;
  temple?: { name?: string } | null;
  pujaType?: { name?: string } | null;
  [k: string]: unknown;
}

export interface AddressRow {
  id: string;
  label?: string;
  line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  isDefault?: boolean;
  [k: string]: unknown;
}

export function selectBookings(payload: unknown): BookingRow[] {
  return arrayAt(payload, 'bookings').filter(isRecord) as BookingRow[];
}

/**
 * The devotee has 81 bookings but a page carries 10. The old subtitle read the
 * page length, so even once the key was fixed it would have said "10 total".
 */
export function selectBookingTotal(payload: unknown): number {
  if (isRecord(payload) && isRecord(payload.pagination)) {
    const total = toNumber(payload.pagination.total);
    if (total !== null) return total;
  }
  return selectBookings(payload).length;
}

export function selectAddresses(payload: unknown): AddressRow[] {
  return arrayAt(payload, 'addresses').filter(isRecord) as AddressRow[];
}

// ─── PAR-03: priest dashboard ────────────────────────────────────────────────
// GET /api/v1/priest/dashboard ->
//   {priest:{id,displayName,avatarUrl,ratingAvg,ratingCount},
//    earnings:{total,thisMonth,pending},
//    bookings:{total,upcoming,completed},
//    upcomingBookings:[...]}
// There is no earningsToday / earningsThisMonth / todayBookings. There never was.

export interface PriestDashboardVM {
  displayName: string;
  avatarUrl?: string;
  earningsTotal: number;
  earningsThisMonth: number;
  earningsPending: number;
  totalBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  rating: number | null;
  ratingCount: number;
}

export function selectPriestDashboard(payload: unknown): PriestDashboardVM | null {
  if (!isRecord(payload)) return null;
  const priest = isRecord(payload.priest) ? payload.priest : null;
  const earnings = isRecord(payload.earnings) ? payload.earnings : null;
  const bookings = isRecord(payload.bookings) ? payload.bookings : null;
  // All three blocks are always present on a successful response. If any is
  // missing the shape has drifted again — say nothing rather than guess.
  if (!priest || !earnings || !bookings) return null;

  return {
    displayName: str(priest.displayName) ?? 'Pandit',
    avatarUrl: str(priest.avatarUrl),
    earningsTotal: toNumberOr(earnings.total, 0),
    earningsThisMonth: toNumberOr(earnings.thisMonth, 0),
    earningsPending: toNumberOr(earnings.pending, 0),
    totalBookings: toNumberOr(bookings.total, 0),
    upcomingBookings: toNumberOr(bookings.upcoming, 0),
    completedBookings: toNumberOr(bookings.completed, 0),
    rating: toNumber(priest.ratingAvg),
    ratingCount: toNumberOr(priest.ratingCount, 0),
  };
}

export interface PriestUpcomingBooking {
  id: string;
  bookingNumber?: string;
  status?: string;
  scheduledDate?: string;
  scheduledTimeSlot?: string;
  pujaName?: string;
  templeName?: string;
  priestPayout: number | null;
}

export function selectPriestUpcoming(payload: unknown): PriestUpcomingBooking[] {
  return arrayAt(payload, 'upcomingBookings')
    .filter(isRecord)
    .map((b) => ({
      id: String(b.id ?? ''),
      bookingNumber: str(b.bookingNumber),
      status: str(b.status),
      scheduledDate: str(b.scheduledDate),
      scheduledTimeSlot: str(b.scheduledTimeSlot),
      pujaName: isRecord(b.pujaType) ? str(b.pujaType.name) : undefined,
      templeName: isRecord(b.temple) ? str(b.temple.name) : undefined,
      priestPayout: toNumber(b.priestPayout),
    }))
    .filter((b) => b.id !== '');
}

// ─── PAR-04: admin dashboard ─────────────────────────────────────────────────
// GET /api/v1/admin/dashboard ->
//   {totalUsers, usersByRole{}, totalRevenue, pendingApprovals,
//    activeSubscriptions, recentTransactions[]}
// No totalBookings. No activeTemples.

export interface AdminDashboardVM {
  totalUsers: number;
  usersByRole: Record<string, number>;
  totalRevenue: number;
  pendingApprovals: number;
  activeSubscriptions: number;
  recentTransactions: Array<{
    id: string;
    type?: string;
    amount: number | null;
    status?: string;
    createdAt?: string;
  }>;
}

export function selectAdminDashboard(payload: unknown): AdminDashboardVM | null {
  if (!isRecord(payload)) return null;
  const totalUsers = toNumber(payload.totalUsers);
  const totalRevenue = toNumber(payload.totalRevenue);
  // These two are the load-bearing figures on the screen. If either is absent
  // or non-numeric the response is not an admin dashboard.
  if (totalUsers === null || totalRevenue === null) return null;

  const usersByRole: Record<string, number> = {};
  if (isRecord(payload.usersByRole)) {
    for (const [role, count] of Object.entries(payload.usersByRole)) {
      const n = toNumber(count);
      if (n !== null) usersByRole[role] = n;
    }
  }

  return {
    totalUsers,
    usersByRole,
    totalRevenue,
    pendingApprovals: toNumberOr(payload.pendingApprovals, 0),
    activeSubscriptions: toNumberOr(payload.activeSubscriptions, 0),
    recentTransactions: arrayAt(payload, 'recentTransactions')
      .filter(isRecord)
      .map((t) => ({
        id: String(t.id ?? ''),
        type: str(t.type),
        amount: toNumber(t.amount),
        status: str(t.status),
        createdAt: str(t.createdAt),
      })),
  };
}

// ─── admin: pending approvals ────────────────────────────────────────────────
//
// GET /api/v1/admin/pending-approvals -> {approvals[], total, hasMore}
//
// A row is what `adminService.getPendingApprovals()` builds — the shape
// apps/web/app/admin/approvals/page.tsx documents verbatim:
//
//   { id, userId, role: 'PANDIT'|'STORE_OWNER'|'ASTROLOGER'|
//                       'WELLNESS_INSTRUCTOR'|'GAUSHALA_MANAGER'|
//                       'TEMPLE_MANAGER',
//     profileName, city, createdAt }
//
// `useAdminPendingApprovals` in @poojly/api-client declares these as
// `AdminUser[]` — an interface with `fullName`, `email`, `phone` and `status`,
// none of which this endpoint has ever returned. Same class as PAR-02..07: the
// fabricated type made the compiler agree, and both admin screens rendered
// blank names against `u.fullName` and an always-"Pending" badge against
// `u.status`.
//
// `id` vs `userId` is the load-bearing distinction and the reason this selector
// exists rather than a cast: `id` is the PROFILE row, and the only write that
// approves anybody is `PATCH /api/v1/admin/users/:userId`. Sending the profile
// id there answers 404 "User not found".

export interface PendingApprovalRow {
  /** The provider PROFILE id. Useful as a list key; never a PATCH target. */
  id: string;
  /** The USER id — the one `PATCH /admin/users/:id` needs. */
  userId: string;
  /** Prisma `MarketplaceRole`, upper-snake (`PANDIT`, `TEMPLE_MANAGER`, …). */
  role: string;
  profileName: string;
  city?: string;
  createdAt?: string;
}

export function selectPendingApprovals(payload: unknown): PendingApprovalRow[] {
  return arrayAt(payload, 'approvals')
    .filter(isRecord)
    .map((a) => {
      const userId = str(a.userId);
      const id = str(a.id);
      return {
        id: id ?? userId ?? '',
        // No fallback to `id`: a wrong id here would PATCH somebody else's
        // account. An empty string is refused by the screen instead.
        userId: userId ?? '',
        role: str(a.role) ?? '',
        // The server already falls back through User.fullName → bio →
        // "Unnamed Pandit", so an empty value here means the row really has
        // no name — say so rather than rendering a blank line.
        profileName: str(a.profileName) ?? 'Unnamed',
        city: str(a.city),
        createdAt: str(a.createdAt),
      };
    })
    .filter((a) => a.id.length > 0);
}

/** `total` from the same envelope, falling back to the rows actually present. */
export function selectPendingApprovalsTotal(payload: unknown, fallbackRows: number): number {
  if (!isRecord(payload)) return fallbackRows;
  return toNumberOr(payload.total, fallbackRows);
}

// ─── admin: user list ────────────────────────────────────────────────────────
//
// GET /api/v1/admin/users?role=&status=&search=&page=&limit=
//   -> {users[], total, page, limit}
//
// A row is `adminService.getUsers()`'s `enriched`:
//   { id, fullName, email, phone, roles: string[], subscriptionTier,
//     blocked, blockedAt, blockedReason, createdAt }
//
// `roles` is an ARRAY of upper-snake Prisma roles. There is no `role` and no
// `status`, which is what the mobile screen read — so it labelled every row
// with an empty role and could never show that an account was blocked. AO-01
// added `blocked` to this response precisely so a client would stop displaying
// its own optimistic guess; the mobile list never started reading it.

export interface AdminUserRowVM {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  /** Upper-snake Prisma roles. Empty only when the server sent none. */
  roles: string[];
  /** The role to label the row with — the first non-DEVOTEE, else DEVOTEE. */
  primaryRole: string;
  blocked: boolean;
  blockedReason?: string;
  createdAt?: string;
}

export function selectAdminUsers(payload: unknown): AdminUserRowVM[] {
  return arrayAt(payload, 'users')
    .filter(isRecord)
    .map((u) => {
      const roles = Array.isArray(u.roles)
        ? u.roles.filter((r): r is string => typeof r === 'string' && r.length > 0)
        : [];
      const primaryRole = roles.find((r) => r !== 'DEVOTEE') ?? roles[0] ?? 'DEVOTEE';
      return {
        id: String(u.id ?? ''),
        fullName: str(u.fullName) ?? 'Unnamed',
        email: str(u.email),
        phone: str(u.phone),
        roles,
        primaryRole,
        // Only a literal `true` blocks. `undefined` is "the server did not
        // say", and rendering that as blocked would be the AO-01 lie inverted.
        blocked: u.blocked === true,
        blockedReason: str(u.blockedReason),
        createdAt: str(u.createdAt),
      };
    })
    .filter((u) => u.id.length > 0);
}

// ─── PAR-05: live darshan ────────────────────────────────────────────────────
// GET /api/v1/darshan/live ->
//   {streams:[{id,templeId,playbackUrl,status,viewerCount,currentSlot,endsInMin,
//              temple:{name,slug,city,deityPrimary,images[]}}], total, upcoming[]}
// GET /api/v1/darshan/:id/stream ->
//   {streamId,templeId,templeName,status,playbackUrl,thumbnailUrl,viewerCount,
//    startedAt[,recentVideoUrl,recentVideoTitle,youtubeChannelId]}
//   -- FLAT. No `data` envelope, no nested `temple`, and the field is
//   `playbackUrl`, not `streamUrl`.
// GET /api/v1/darshan/:id  -> 404. That is the URL the app used to call.

export interface LiveStreamVM {
  id: string;
  templeId?: string;
  templeName: string;
  templeSlug?: string;
  city?: string;
  deity?: string;
  imageUrl?: string;
  playbackUrl?: string;
  status: string;
  isLive: boolean;
  viewerCount: number | null;
  currentSlot?: string;
  scheduledStart?: string;
}

function mapStreamRow(row: Record<string, unknown>): LiveStreamVM | null {
  const id = str(row.id);
  if (!id) return null;
  const temple = isRecord(row.temple) ? row.temple : null;
  const images = temple && Array.isArray(temple.images) ? temple.images : [];
  const status = str(row.status) ?? 'unknown';
  return {
    id,
    templeId: str(row.templeId),
    templeName: (temple && str(temple.name)) ?? 'Temple',
    templeSlug: temple ? str(temple.slug) : undefined,
    city: temple ? str(temple.city) : undefined,
    deity: temple ? str(temple.deityPrimary) : undefined,
    imageUrl: typeof images[0] === 'string' ? (images[0] as string) : undefined,
    playbackUrl: str(row.playbackUrl),
    status,
    isLive: status === 'live',
    viewerCount: toNumber(row.viewerCount),
    currentSlot: str(row.currentSlot),
    scheduledStart: str(row.scheduledStart),
  };
}

export function selectLiveStreams(payload: unknown): LiveStreamVM[] {
  return arrayAt(payload, 'streams')
    .filter(isRecord)
    .map(mapStreamRow)
    .filter((s): s is LiveStreamVM => s !== null);
}

/**
 * `upcoming` on GET /darshan/live is NOT a list of streams — it is a list of
 * aarti slots: {templeSlug, nextSlot, startsInMin}. The Darshan tab used to
 * render four invented "scheduled" stream cards in this position.
 */
export interface UpcomingDarshanVM {
  templeSlug: string;
  nextSlot: string;
  startsInMin: number;
}

export function selectUpcomingDarshan(payload: unknown): UpcomingDarshanVM[] {
  return arrayAt(payload, 'upcoming')
    .filter(isRecord)
    .map((u): UpcomingDarshanVM | null => {
      const templeSlug = str(u.templeSlug);
      const nextSlot = str(u.nextSlot);
      const startsInMin = toNumber(u.startsInMin);
      if (!templeSlug || !nextSlot || startsInMin === null) return null;
      return { templeSlug, nextSlot, startsInMin };
    })
    .filter((u): u is UpcomingDarshanVM => u !== null)
    .sort((a, b) => a.startsInMin - b.startsInMin);
}

export interface StreamDetailVM {
  streamId: string;
  templeId?: string;
  templeName?: string;
  status: string;
  isLive: boolean;
  playbackUrl?: string;
  recentVideoUrl?: string;
  thumbnailUrl?: string;
  viewerCount: number | null;
  startedAt?: string;
  /**
   * PAR-21. `currentSlot` / `endsInMin` are published by BOTH /darshan/live and
   * /darshan/:id/stream (apps/api/src/routes/darshan.ts, deriveStreamPlayback →
   * the `/:id/stream` reply). The player used to ignore them and render a
   * hardcoded "24x7 darshan" chip instead, which is a claim about broadcast
   * hours that no endpoint makes.
   */
  currentSlot?: string;
  endsInMin: number | null;
}

export function selectStreamDetail(payload: unknown): StreamDetailVM | null {
  if (!isRecord(payload)) return null;
  const streamId = str(payload.streamId);
  if (!streamId) return null; // a 404 body has {message,error,statusCode}
  const status = str(payload.status) ?? 'unknown';
  return {
    streamId,
    templeId: str(payload.templeId),
    templeName: str(payload.templeName),
    status,
    isLive: status === 'live',
    playbackUrl: str(payload.playbackUrl),
    recentVideoUrl: str(payload.recentVideoUrl),
    thumbnailUrl: str(payload.thumbnailUrl),
    viewerCount: toNumber(payload.viewerCount),
    startedAt: str(payload.startedAt),
    currentSlot: str(payload.currentSlot),
    endsInMin: toNumber(payload.endsInMin),
  };
}

// ─── PAR-06: donations ───────────────────────────────────────────────────────
// POST /api/v1/donations/create-order requires, per the zod schema at
// apps/api/src/routes/donations.ts:224-250:
//   amountInr : integer, 101 .. 1_000_000     (NOT `amount`)
//   causeKind : 'gaushala' | 'temple' (optional, defaults to 'gaushala')
//   exactly one of gaushalaId / templeId, matching the kind
//   donorPan  : /^[A-Z]{5}[0-9]{4}[A-Z]$/ if present
// Sending {amount, currency, cause, donorName} — which is what the screen used
// to build — returns 400 {"fieldErrors":{"amountInr":["Required"]}}.

export class DonationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DonationInputError';
  }
}

export interface DonationFormState {
  amount: string;
  causeKind: 'gaushala' | 'temple';
  gaushalaId?: string;
  templeId?: string;
  donorPan?: string;
  dedication?: string;
}

export interface DonationOrderInput {
  amountInr: number;
  causeKind: 'gaushala' | 'temple';
  gaushalaId?: string;
  templeId?: string;
  donorPan?: string;
  dedication?: string;
}

export const DONATION_MIN_INR = 101;
export const DONATION_MAX_INR = 1_000_000;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/**
 * Mirrors the server's zod schema so the user gets a specific, actionable
 * message instead of the bare "Invalid request body" the API returns.
 */
export function buildDonationOrderInput(form: DonationFormState): DonationOrderInput {
  const raw = String(form.amount ?? '').trim();
  if (!/^\d+$/.test(raw)) {
    throw new DonationInputError('Enter the amount in whole rupees (no paise).');
  }
  const amountInr = Number(raw);
  if (amountInr < DONATION_MIN_INR) {
    throw new DonationInputError(`Minimum donation is ₹${DONATION_MIN_INR}.`);
  }
  if (amountInr > DONATION_MAX_INR) {
    throw new DonationInputError(
      `Maximum single donation here is ₹${DONATION_MAX_INR.toLocaleString('en-IN')}.`,
    );
  }

  const donorPan = form.donorPan?.trim().toUpperCase() || undefined;
  if (donorPan && !PAN_RE.test(donorPan)) {
    throw new DonationInputError('PAN must look like ABCDE1234F.');
  }

  const dedication = form.dedication?.trim() || undefined;

  if (form.causeKind === 'temple') {
    const templeId = form.templeId?.trim();
    if (!templeId) {
      throw new DonationInputError('Choose a temple to donate to.');
    }
    return {
      amountInr,
      causeKind: 'temple',
      templeId,
      ...(donorPan ? { donorPan } : {}),
      ...(dedication ? { dedication } : {}),
    };
  }

  const gaushalaId = form.gaushalaId?.trim();
  if (!gaushalaId) {
    throw new DonationInputError('Choose a gaushala to donate to.');
  }
  return {
    amountInr,
    causeKind: 'gaushala',
    gaushalaId,
    ...(donorPan ? { donorPan } : {}),
    ...(dedication ? { dedication } : {}),
  };
}

export interface GaushalaOption {
  id: string;
  name: string;
  location?: string;
}

export function selectGaushalas(payload: unknown): GaushalaOption[] {
  return arrayAt(payload, 'gaushalas')
    .filter(isRecord)
    .map((g) => ({
      id: String(g.id ?? ''),
      name: str(g.name) ?? '',
      location: str(g.location),
    }))
    .filter((g) => g.id !== '' && g.name !== '');
}

// ─── PAR-07: catalogue ───────────────────────────────────────────────────────
// GET /api/v1/temples    -> {temples[], total, page, limit, totalPages}
// GET /api/v1/pujas/types-> {pujaTypes[], total, page, limit, totalPages}
// Every pujaType row carries basePrice and nriPrice as Decimal strings.

export interface TempleVM {
  id: string;
  slug: string;
  name: string;
  nameLocal?: string;
  deity?: string;
  city?: string;
  state?: string;
  location: string;
  imageUrl?: string;
  isVerified: boolean;
  liveDarshanEnabled: boolean;
}

export function selectTemples(payload: unknown): TempleVM[] {
  return arrayAt(payload, 'temples')
    .filter(isRecord)
    .map((t): TempleVM | null => {
      const id = str(t.id);
      const slug = str(t.slug);
      const name = str(t.name);
      // The web temple route is /temples/[slug]; a row without a slug cannot be
      // linked and is not worth rendering as a tappable card.
      if (!id || !slug || !name) return null;
      const images = Array.isArray(t.images) ? t.images : [];
      const city = str(t.city);
      const state = str(t.state);
      return {
        id,
        slug,
        name,
        nameLocal: str(t.nameLocal),
        deity: str(t.deityPrimary),
        city,
        state,
        location: [city, state].filter(Boolean).join(', '),
        imageUrl: typeof images[0] === 'string' ? (images[0] as string) : undefined,
        isVerified: t.isVerified === true,
        liveDarshanEnabled: t.liveDarshanEnabled === true,
      };
    })
    .filter((t): t is TempleVM => t !== null);
}

export function selectTotal(payload: unknown, fallbackRows: number): number {
  if (isRecord(payload)) {
    const total = toNumber(payload.total);
    if (total !== null) return total;
  }
  return fallbackRows;
}

export interface PujaVM {
  id: string;
  slug: string;
  name: string;
  nameLocal?: string;
  description?: string;
  category?: string;
  deity?: string;
  durationMinutes: number | null;
  priceInr: number | null;
  nriPriceInr: number | null;
  imageUrl?: string;
  samagriIncluded: boolean;
}

/** Puja rows carried by a caller that only needs id/name/price to join on. */
export type PujaCatalogueRow = Pick<
  PujaVM,
  'id' | 'slug' | 'name' | 'durationMinutes' | 'priceInr' | 'nriPriceInr' | 'samagriIncluded'
> &
  Partial<PujaVM>;

export function selectPujaTypes(payload: unknown): PujaVM[] {
  return arrayAt(payload, 'pujaTypes')
    .filter(isRecord)
    .map((p): PujaVM | null => {
      const id = str(p.id);
      const slug = str(p.slug);
      const name = str(p.name);
      if (!id || !slug || !name) return null;
      const images = Array.isArray(p.images) ? p.images : [];
      return {
        id,
        slug,
        name,
        nameLocal: str(p.nameLocal),
        description: str(p.description),
        category: str(p.category),
        deity: str(p.deity),
        durationMinutes: toNumber(p.durationMinutes),
        priceInr: toNumber(p.basePrice),
        nriPriceInr: toNumber(p.nriPrice),
        imageUrl: typeof images[0] === 'string' ? (images[0] as string) : undefined,
        samagriIncluded: p.samagriIncluded === true,
      };
    })
    .filter((p): p is PujaVM => p !== null);
}

// ─── PAR-08: home-screen panchang ────────────────────────────────────────────
// GET /api/v1/panchang/today returns a FLAT row:
//   {id,date,tithi,nakshatra,yoga,karana,sunrise,sunset,rahuKaal,
//    shubhMuhurat:{vijayMuhurat,brahmaMuhurta,abhijitMuhurat},
//    festivals[],vrat[],specialInfo,locationCity}
// Two independent mismatches lived here: `data.data.x` (no `data` wrapper) and
// `rahukaal` (the key is `rahuKaal`). A third is subtler and fatal:
// `shubhMuhurat` is an OBJECT, and the card rendered it straight into <Text>,
// which throws "Objects are not valid as a React child".

export interface PanchangMuhurat {
  label: string;
  window: string;
}

export interface PanchangVM {
  date?: string;
  tithi?: string;
  nakshatra?: string;
  yoga?: string;
  karana?: string;
  sunrise?: string;
  sunset?: string;
  rahuKaal?: string;
  muhurats: PanchangMuhurat[];
  festivals: string[];
  vrat: string[];
  specialInfo?: string;
  locationCity?: string;
}

/** vijayMuhurat -> "Vijay Muhurat". Label text, not data. */
function humaniseKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function stringList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x !== '') : [];
}

export function selectPanchang(payload: unknown): PanchangVM | null {
  if (!isRecord(payload)) return null;
  const tithi = str(payload.tithi);
  const nakshatra = str(payload.nakshatra);
  // A 500/404 body has none of these. Publishing a fabricated tithi is the one
  // error a devotional product cannot make, so an unrecognised shape is "no
  // panchang", never a default day.
  if (!tithi && !nakshatra) return null;

  const muhurats: PanchangMuhurat[] = [];
  const shubh = payload.shubhMuhurat;
  if (isRecord(shubh)) {
    for (const [key, value] of Object.entries(shubh)) {
      const window = str(value);
      if (window) muhurats.push({ label: humaniseKey(key), window });
    }
  } else if (typeof shubh === 'string' && shubh !== '') {
    muhurats.push({ label: 'Shubh Muhurat', window: shubh });
  }

  return {
    date: str(payload.date),
    tithi,
    nakshatra,
    yoga: str(payload.yoga),
    karana: str(payload.karana),
    sunrise: str(payload.sunrise),
    sunset: str(payload.sunset),
    rahuKaal: str(payload.rahuKaal),
    muhurats,
    festivals: stringList(payload.festivals),
    vrat: stringList(payload.vrat),
    specialInfo: str(payload.specialInfo),
    locationCity: str(payload.locationCity),
  };
}

// ─── PAR-09: temple manager portal (SCOPED routes) ───────────────────────────
// The three temple screens read the PUBLIC /darshan/live, /temples and
// /pujas/types. Even with the envelope key fixed that shows the manager other
// temples' streams and the global puja catalogue as "your offerings". The
// scoped routes are:
//   GET /api/v1/temple-portal/dashboard -> {profile,stats{...},recentBookings[]}
//   GET /api/v1/temple-portal/pujas     -> {offerings[]}
//   GET /api/v1/temple-portal/darshan   -> {streams[]}
// (/temple-portal/streams does not exist — it 404s.)

export interface TemplePortalStats {
  totalBookings: number;
  monthBookings: number;
  totalRevenueInr: number;
  monthRevenueInr: number;
  /** Share already releasable or paid. null when an older server omits it. */
  releasedInr: number | null;
  monthReleasedInr: number | null;
  /** Share minted at confirmation, held until the puja is proved. */
  upcomingInr: number | null;
  totalStreams: number;
}

export interface TemplePortalBookingRow {
  id: string;
  bookingNumber?: string;
  devotee?: string;
  pujaName?: string;
  scheduledDate?: string;
  priceInr: number | null;
  status?: string;
}

export interface TemplePortalDashboardVM {
  hasTemple: boolean;
  templeName: string | null;
  stats: TemplePortalStats;
  recentBookings: TemplePortalBookingRow[];
}

export function selectTemplePortalDashboard(payload: unknown): TemplePortalDashboardVM | null {
  if (!isRecord(payload)) return null;
  const stats = isRecord(payload.stats) ? payload.stats : null;
  if (!stats) return null; // 403/500 body — not a dashboard
  const profile = isRecord(payload.profile) ? payload.profile : null;
  return {
    hasTemple: profile !== null,
    templeName: profile ? (str(profile.templeName) ?? null) : null,
    stats: {
      totalBookings: toNumberOr(stats.totalBookings, 0),
      monthBookings: toNumberOr(stats.monthBookings, 0),
      totalRevenueInr: toNumberOr(stats.totalRevenueInr, 0),
      monthRevenueInr: toNumberOr(stats.monthRevenueInr, 0),
      releasedInr: money(stats.releasedInr),
      monthReleasedInr: money(stats.monthReleasedInr),
      upcomingInr: money(stats.upcomingInr),
      totalStreams: toNumberOr(stats.totalStreams, 0),
    },
    recentBookings: arrayAt(payload, 'recentBookings')
      .filter(isRecord)
      .map((b) => ({
        id: String(b.id ?? ''),
        bookingNumber: str(b.bookingNumber),
        devotee: str(b.devotee),
        pujaName: str(b.pujaName),
        scheduledDate: str(b.scheduledDate),
        priceInr: toNumber(b.priceInr),
        status: str(b.status),
      }))
      .filter((b) => b.id !== ''),
  };
}

export interface TempleOfferingVM {
  id: string;
  pujaTypeId: string;
  name: string;
  /** priceOverride when the temple set one, else the catalogue base price. */
  priceInr: number | null;
  nriPriceInr: number | null;
  durationMinutes: number | null;
  availableSlots: string[];
  maxBookingsPerSlot: number | null;
  isActive: boolean;
  hasPriceOverride: boolean;
}

export function selectTemplePortalOfferings(
  payload: unknown,
  catalogue: PujaCatalogueRow[],
): TempleOfferingVM[] {
  const byId = new Map(catalogue.map((p) => [p.id, p]));
  return arrayAt(payload, 'offerings')
    .filter(isRecord)
    .map((o): TempleOfferingVM | null => {
      const id = str(o.id);
      const pujaTypeId = str(o.pujaTypeId);
      if (!id || !pujaTypeId) return null;
      const puja = byId.get(pujaTypeId);
      const override = toNumber(o.priceOverride);
      return {
        id,
        pujaTypeId,
        // No catalogue row means the name is genuinely unknown here. Show the
        // id rather than borrow a plausible puja name from somewhere else.
        name: puja?.name ?? `Puja ${pujaTypeId}`,
        priceInr: override ?? puja?.priceInr ?? null,
        nriPriceInr: toNumber(o.nriPrice) ?? puja?.nriPriceInr ?? null,
        durationMinutes: puja?.durationMinutes ?? null,
        availableSlots: stringList(o.availableSlots),
        maxBookingsPerSlot: toNumber(o.maxBookingsPerSlot),
        isActive: o.isActive === true,
        hasPriceOverride: override !== null,
      };
    })
    .filter((o): o is TempleOfferingVM => o !== null);
}

export interface TempleStreamVM {
  id: string;
  title: string;
  status: string;
  isLive: boolean;
  playbackUrl?: string;
  viewerCount: number | null;
  peakViewers: number | null;
  scheduledStart?: string;
  cameraLocation?: string;
}

export function selectTemplePortalStreams(payload: unknown): TempleStreamVM[] {
  return arrayAt(payload, 'streams')
    .filter(isRecord)
    .map((s): TempleStreamVM | null => {
      const id = str(s.id);
      if (!id) return null;
      const status = str(s.status) ?? 'unknown';
      return {
        id,
        title: str(s.title) ?? 'Darshan stream',
        status,
        isLive: status === 'live',
        playbackUrl: str(s.playbackUrl),
        viewerCount: toNumber(s.viewerCount),
        peakViewers: toNumber(s.peakViewers),
        scheduledStart: str(s.scheduledStart),
        cameraLocation: str(s.cameraLocation),
      };
    })
    .filter((s): s is TempleStreamVM => s !== null);
}

// ─── PAR-10: wellness sessions ───────────────────────────────────────────────
// GET /api/v1/wellness/sessions -> {data:[{id,instructorId,title,description,
//   type,scheduledAt,durationMinutes,capacity,priceInr,status,...}]}
// The hook declares {sessions: WellnessSession[]} and there is no `sessions`
// key, no `duration`, no `level`, no `startTime` and no participant count.
// (The route is registered twice in server.ts; the `{data}` shape is the one
// that wins.)

export interface WellnessSessionVM {
  id: string;
  title: string;
  description?: string;
  type?: string;
  scheduledAt?: string;
  durationMinutes: number | null;
  capacity: number | null;
  priceInr: number | null;
  status?: string;
  instructorId?: string;
}

export function selectWellnessSessions(payload: unknown): WellnessSessionVM[] {
  return arrayAt(payload, 'data')
    .filter(isRecord)
    .map((s): WellnessSessionVM | null => {
      const id = str(s.id);
      const title = str(s.title);
      if (!id || !title) return null;
      return {
        id,
        title,
        description: str(s.description),
        type: str(s.type),
        scheduledAt: str(s.scheduledAt),
        durationMinutes: toNumber(s.durationMinutes),
        capacity: toNumber(s.capacity),
        priceInr: toNumber(s.priceInr),
        status: str(s.status),
        instructorId: str(s.instructorId),
      };
    })
    .filter((s): s is WellnessSessionVM => s !== null);
}

// PAR-10 (create side). The instructor's "Schedule New Session" form posted
//   {title, description, type:'yoga', duration:60, level:'beginner', startTime}
// against a schema (routes/wellness-sessions.ts:29-49) that requires
//   {title>=3, description>=1, type:'YOGA'|'MEDITATION'|'VIPASSANA'|
//    'PRANAYAMA'|'OTHER', scheduledAt (ISO, not past), durationMinutes,
//    capacity, priceInr}
// Four keys were wrong, the enum was lower-case, `level` is not a column, and
// capacity + priceInr — both required — were never collected. Every create
// 400'd. This builder is the other half of that contract.

export class WellnessSessionInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WellnessSessionInputError';
  }
}

export type WellnessSessionType =
  | 'YOGA'
  | 'MEDITATION'
  | 'VIPASSANA'
  | 'PRANAYAMA'
  | 'OTHER';

const WELLNESS_TYPES: WellnessSessionType[] = [
  'YOGA',
  'MEDITATION',
  'VIPASSANA',
  'PRANAYAMA',
  'OTHER',
];

export interface WellnessSessionFormState {
  title: string;
  description: string;
  type: string;
  durationMinutes: string;
  capacity: string;
  priceInr: string;
  scheduledAt: string;
}

export interface WellnessSessionInput {
  title: string;
  description: string;
  type: WellnessSessionType;
  scheduledAt: string;
  durationMinutes: number;
  capacity: number;
  priceInr: number;
}

function positiveInt(raw: string, field: string, max: number): number {
  const value = Number(String(raw ?? '').trim());
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new WellnessSessionInputError(`${field} must be a whole number between 1 and ${max}.`);
  }
  return value;
}

export function buildWellnessSessionInput(
  form: WellnessSessionFormState,
): WellnessSessionInput {
  const title = form.title?.trim() ?? '';
  if (title.length < 3) {
    throw new WellnessSessionInputError('Title must be at least 3 characters.');
  }
  const description = form.description?.trim() ?? '';
  if (description === '') {
    throw new WellnessSessionInputError('Add a short description — the server requires one.');
  }

  const rawType = (form.type ?? '').trim().toUpperCase();
  const type: WellnessSessionType = (WELLNESS_TYPES as string[]).includes(rawType)
    ? (rawType as WellnessSessionType)
    : 'OTHER';

  const scheduledRaw = form.scheduledAt?.trim() ?? '';
  const scheduledMs = scheduledRaw ? Date.parse(scheduledRaw) : NaN;
  if (!Number.isFinite(scheduledMs)) {
    throw new WellnessSessionInputError(
      'Start time must be an ISO date-time, e.g. 2026-09-01T08:00:00.000Z.',
    );
  }
  if (scheduledMs < Date.now() - 60_000) {
    throw new WellnessSessionInputError('Start time cannot be in the past.');
  }

  const durationMinutes = positiveInt(form.durationMinutes, 'Duration', 600);
  const capacity = positiveInt(form.capacity, 'Capacity', 10_000);

  const priceRaw = String(form.priceInr ?? '').trim();
  const priceInr = Number(priceRaw);
  if (priceRaw === '' || !Number.isFinite(priceInr) || priceInr < 0) {
    throw new WellnessSessionInputError('Price must be 0 or more (use 0 for a free class).');
  }

  return {
    title,
    description,
    type,
    scheduledAt: new Date(scheduledMs).toISOString(),
    durationMinutes,
    capacity,
    priceInr,
  };
}

// ─── PAR-11: priest profile ──────────────────────────────────────────────────
// GET /api/v1/priest/profile returns the profile FLAT. `data.profile` is
// undefined, so the screen rendered nothing at all. The payload also has no
// bank or GST state — the screen invented "Not linked" / "Pending Review" for
// every pandit via `?? false`.

export interface PriestTempleRow {
  id: string;
  name: string;
  city?: string;
  slug?: string;
  isPrimary: boolean;
}

export interface PriestProfileVM {
  id?: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  specializations: string[];
  languages: string[];
  experienceYears: number | null;
  isVerified: boolean;
  aadhaarVerified: boolean;
  verificationStatus?: string;
  status?: string;
  rating: number | null;
  ratingCount: number;
  email?: string;
  phone?: string;
  temples: PriestTempleRow[];
  /** Not returned by this endpoint. Kept explicit so no screen guesses. */
  bankLinked: null;
  gstStatus: null;
}

export function selectPriestProfile(payload: unknown): PriestProfileVM | null {
  if (!isRecord(payload)) return null;
  const displayName = str(payload.displayName);
  if (!displayName) return null; // 401/404/500 body
  const user = isRecord(payload.user) ? payload.user : null;
  return {
    id: str(payload.id),
    displayName,
    bio: str(payload.bio),
    avatarUrl: str(payload.avatarUrl),
    specializations: stringList(payload.specializations),
    languages: stringList(payload.languages),
    experienceYears: toNumber(payload.experienceYears),
    isVerified: payload.isVerified === true,
    aadhaarVerified: payload.aadhaarVerified === true,
    verificationStatus: str(payload.verificationStatus),
    status: str(payload.status),
    rating: toNumber(payload.ratingAvg),
    ratingCount: toNumberOr(payload.ratingCount, 0),
    email: user ? str(user.email) : undefined,
    phone: user ? str(user.phone) : undefined,
    temples: arrayAt(payload, 'temples')
      .filter(isRecord)
      .map((t) => ({
        id: String(t.id ?? ''),
        name: str(t.name) ?? '',
        city: str(t.city),
        slug: str(t.slug),
        isPrimary: t.isPrimary === true,
      }))
      .filter((t) => t.id !== '' && t.name !== ''),
    bankLinked: null,
    gstStatus: null,
  };
}

// ─── PAR-12: gaushala cow registry ───────────────────────────────────────────
// The list read the PUBLIC GET /api/v1/gaushala/cows (19 cows across all five
// seeded gaushalas) while Add Cow POSTed to the SCOPED
// /api/v1/gaushala-portal/cows — so a manager saw someone else's herd and
// every cow they registered vanished. The scoped rows are prisma `Cow`
// (schema.prisma:1427): no `age`, no `adoptionStatus`, no `photo`.

export interface PortalCowVM {
  id: string;
  name: string;
  tagNumber?: string;
  breed?: string;
  ageYears: number | null;
  gender?: string;
  healthStatus?: string;
  arrivalDate?: string;
  notes?: string;
}

export function selectPortalCows(payload: unknown): PortalCowVM[] {
  return arrayAt(payload, 'cows')
    .filter(isRecord)
    .map((c): PortalCowVM | null => {
      const id = str(c.id);
      const name = str(c.name);
      if (!id || !name) return null;
      return {
        id,
        name,
        tagNumber: str(c.tagNumber),
        breed: str(c.breed),
        // Deliberately does NOT fall back to the public feed's `age`: a row
        // shaped like the public catalogue is not a cow this gaushala owns,
        // and half-mapping it is how the two collections got confused.
        ageYears: toNumber(c.ageYears),
        gender: str(c.gender),
        healthStatus: str(c.healthStatus),
        arrivalDate: str(c.arrivalDate),
        notes: str(c.notes),
      };
    })
    .filter((c): c is PortalCowVM => c !== null);
}

// ─── PAR-13: astrologer portal dashboard ─────────────────────────────────────
// GET /api/v1/astrologer-portal/dashboard sends
//   {profile, stats:{totalConsultations,rating,pricePerMinute,approved,
//    consultationsToday,earningsTodayInr,earningsMonthInr,totalEarningsInr,
//    activeClients}, upcomingSessions[]}
// The screen read stats.todayCount / earningsToday / monthEarnings /
// ratingCount and data.todayConsultations — none of which exist — so even a
// 200 rendered 0 / ₹0 / ₹0 and an empty schedule. Today the route 500s for the
// demo account (P2023, non-UUID id); a 500 must read as an error, not ₹0.

export interface AstrologerUpcomingVM {
  id: string;
  reference?: string;
  minutes: number | null;
  amountInr: number | null;
  scheduledAt?: string;
  status?: string;
  jitsiUrl?: string;
}

export interface AstrologerDashboardVM {
  displayName?: string;
  approved: boolean;
  listingNote?: string | null;
  pricePerMinute: number | null;
  rating: number | null;
  totalConsultations: number;
  consultationsToday: number;
  earningsTodayInr: number;
  earningsMonthInr: number;
  totalEarningsInr: number;
  upcoming: AstrologerUpcomingVM[];
}

export function selectAstrologerDashboard(payload: unknown): AstrologerDashboardVM | null {
  if (!isRecord(payload)) return null;
  const stats = isRecord(payload.stats) ? payload.stats : null;
  if (!stats) return null; // 500 body carries {statusCode,code,error,message}
  const profile = isRecord(payload.profile) ? payload.profile : null;
  return {
    displayName: profile ? str(profile.displayName) : undefined,
    approved: stats.approved === true,
    listingNote: isRecord(payload.listing) ? str(payload.listing.message) : null,
    pricePerMinute: toNumber(stats.pricePerMinute),
    rating: toNumber(stats.rating),
    totalConsultations: toNumberOr(stats.totalConsultations, 0),
    consultationsToday: toNumberOr(stats.consultationsToday, 0),
    earningsTodayInr: toNumberOr(stats.earningsTodayInr, 0),
    earningsMonthInr: toNumberOr(stats.earningsMonthInr, 0),
    totalEarningsInr: toNumberOr(stats.totalEarningsInr, 0),
    upcoming: arrayAt(payload, 'upcomingSessions')
      .filter(isRecord)
      .map((s) => ({
        id: String(s.id ?? ''),
        reference: str(s.reference),
        minutes: toNumber(s.minutes),
        // raw-SQL rows come back snake_case.
        amountInr: toNumber(s.amount_inr),
        scheduledAt: str(s.scheduled_at),
        status: str(s.status),
        jitsiUrl: str(s.jitsiUrl),
      }))
      .filter((s) => s.id !== ''),
  };
}

// ─── PAR-16: store catalogue + real cart ─────────────────────────────────────
// GET /api/v1/store/products -> {products[],total,page,limit,totalPages}
// Every row already carries rating, reviewCount, compareAtPrice, discount, tag
// and inStock — the exact fields the screen was taking from a positional mock
// (`productsData[i % 8]`), which stamped a real SKU with another product's
// 4.8 rating, 456 reviews and an invented 40% "MRP".
// Cart endpoints all answer {message?, cart} — the hooks type them as a bare
// Cart, so a naive `data.itemCount` is undefined.

export interface StoreProductVM {
  id: string;
  handle: string;
  title: string;
  description?: string;
  priceInr: number | null;
  compareAtPriceInr: number | null;
  discountPercent: number | null;
  currency: string;
  category?: string;
  collection?: string;
  tag?: string;
  sku?: string;
  weight?: string;
  inStock: boolean;
  freeDelivery: boolean;
  rating: number | null;
  reviewCount: number | null;
  imageUrl?: string;
}

function firstImageUrl(v: unknown): string | undefined {
  if (!Array.isArray(v) || v.length === 0) return undefined;
  const first = v[0];
  if (typeof first === 'string') return first;
  if (isRecord(first)) return str(first.url);
  return undefined;
}

export function selectStoreProducts(payload: unknown): StoreProductVM[] {
  return arrayAt(payload, 'products')
    .filter(isRecord)
    .map((p): StoreProductVM | null => {
      const id = str(p.id);
      const title = str(p.title);
      if (!id || !title) return null;
      return {
        id,
        handle: str(p.handle) ?? id,
        title,
        description: str(p.description),
        priceInr: toNumber(p.price),
        compareAtPriceInr: toNumber(p.compareAtPrice),
        discountPercent: toNumber(p.discount),
        currency: str(p.currency) ?? 'INR',
        category: str(p.category),
        collection: str(p.collection),
        tag: str(p.tag),
        sku: str(p.sku),
        weight: str(p.weight),
        // Absent stock information means "we do not know", and an unknown must
        // not read as in-stock on a buy button.
        inStock: p.inStock === true,
        freeDelivery: p.freeDelivery === true,
        rating: toNumber(p.rating),
        reviewCount: toNumber(p.reviewCount),
        imageUrl: firstImageUrl(p.images),
      };
    })
    .filter((p): p is StoreProductVM => p !== null);
}

export interface CartItemVM {
  id: string;
  productId: string;
  title: string;
  handle?: string;
  quantity: number;
  unitPriceInr: number | null;
  subtotal: number | null;
  imageUrl?: string;
}

export interface CartVM {
  id?: string;
  items: CartItemVM[];
  itemCount: number;
  subtotal: number | null;
  deliveryFee: number | null;
  tax: number | null;
  total: number | null;
  currency: string;
}

/** Handles both {cart} (GET) and {message,cart} (POST/PATCH/DELETE). */
export function selectCart(payload: unknown): CartVM | null {
  if (!isRecord(payload)) return null;
  const cart = isRecord(payload.cart) ? payload.cart : null;
  if (!cart) return null; // 401/400 body — the cart state is unknown, not empty
  const items: CartItemVM[] = arrayAt(cart, 'items')
    .filter(isRecord)
    .map((i) => {
      const product = isRecord(i.product) ? i.product : null;
      return {
        id: String(i.id ?? ''),
        productId: str(i.productId) ?? (product ? (str(product.id) ?? '') : ''),
        title: (product ? str(product.title) : undefined) ?? 'Item',
        handle: product ? str(product.handle) : undefined,
        quantity: toNumberOr(i.quantity, 0),
        unitPriceInr: product ? toNumber(product.price) : null,
        subtotal: toNumber(i.subtotal),
        imageUrl: product ? firstImageUrl(product.images) : undefined,
      };
    })
    .filter((i) => i.id !== '');

  return {
    id: str(cart.id),
    items,
    itemCount: toNumberOr(cart.itemCount, items.reduce((a, i) => a + i.quantity, 0)),
    subtotal: toNumber(cart.subtotal),
    deliveryFee: toNumber(cart.deliveryFee),
    tax: toNumber(cart.tax),
    total: toNumber(cart.total),
    currency: str(cart.currency) ?? 'INR',
  };
}

// ─── PAR-18: yatra destination inquiry ───────────────────────────────────────
// The destination CTA opened wa.me/919999999999 — a placeholder number, so a
// high-intent lead vanished with no server-side trace. POST
// /api/v1/yatra-inquiry exists (server.ts:434, public) and records the lead +
// emails the desk. This mirrors its zod schema (routes/yatra-inquiry.ts:36-53)
// so the traveller sees a specific message instead of a bare 400.

export class YatraInquiryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YatraInquiryError';
  }
}

export interface YatraInquiryFormState {
  yatraSlug: string;
  yatraTitle?: string;
  packageTier: 'economy' | 'standard' | 'premium';
  startDate: string;
  travelersCount: string;
  name: string;
  email: string;
  phone?: string;
  pickupCity?: string;
  notes?: string;
  /** Quoted total when the screen knows one; a destination inquiry has none. */
  totalInr?: number;
}

export interface YatraInquiryBody {
  yatraSlug: string;
  yatraTitle: string;
  packageTier: 'economy' | 'standard' | 'premium';
  startDate: string;
  pickupCity: string;
  travelersCount: number;
  totalInr: number;
  buyer: { name: string; email: string; phone: string; country: string };
  notes: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function buildYatraInquiry(form: YatraInquiryFormState): YatraInquiryBody {
  const yatraSlug = form.yatraSlug?.trim() ?? '';
  if (!yatraSlug) throw new YatraInquiryError('Could not identify the yatra. Go back and retry.');

  const startDate = form.startDate?.trim() ?? '';
  if (!startDate) throw new YatraInquiryError('Choose an approximate start date.');

  const count = Number(String(form.travelersCount ?? '').trim());
  if (!Number.isInteger(count) || count < 1 || count > 50) {
    throw new YatraInquiryError('Travellers must be a whole number between 1 and 50.');
  }

  const name = form.name?.trim() ?? '';
  if (!name) throw new YatraInquiryError('Enter your name so the yatra desk can reach you.');

  const email = form.email?.trim() ?? '';
  if (!EMAIL_RE.test(email)) throw new YatraInquiryError('Enter a valid email address.');

  const totalInr = Number.isFinite(form.totalInr) ? Math.max(0, Number(form.totalInr)) : 0;

  return {
    yatraSlug,
    yatraTitle: form.yatraTitle?.trim() || yatraSlug,
    packageTier: form.packageTier,
    startDate,
    pickupCity: form.pickupCity?.trim() ?? '',
    travelersCount: count,
    totalInr,
    buyer: {
      name,
      email,
      phone: form.phone?.trim() ?? '',
      country: 'India',
    },
    notes: form.notes?.trim() ?? '',
  };
}

// ─── PAR-22: provider earnings + temple payouts/bookings ─────────────────────
//
// These four surfaces exist on the web and had no mobile equivalent at all:
//
//   web /temple-portal/payouts        <- GET /api/v1/temple-portal/payouts
//   web /temple-portal/bookings       <- GET /api/v1/temple-portal/bookings
//   web /astrologer-portal/earnings   <- GET /api/v1/astrologer-portal/earnings
//   web /wellness-portal/earnings     <- GET /api/v1/payouts/commissions
//                                     +  GET /api/v1/payouts/balance
//
// The last pair is deliberately the UNIFIED provider surface (payout-requests.ts),
// not a per-role route: /payouts/commissions and /payouts/balance are open to
// every provider role, so one mobile earnings screen serves wellness, store,
// gaushala and temple alike. The web client makes the same choice for the same
// stated reason — the admin commissions route 403s a provider no matter what
// query string is attached (apps/web/lib/commission-api.ts:165-171).
//
// Every field below is read off the VERBATIM reply objects in the route
// handlers, cited per-selector. The same two rules apply as everywhere else in
// this file: read the key the server actually sends, and let an unrecognised
// shape yield empty/null rather than a confident zero on a money screen.

/** Money that arrives as a Decimal STRING ("2310.00") or as a number. */
function money(v: unknown): number | null {
  return toNumber(v);
}

// GET /api/v1/temple-portal/payouts -> {payouts[],total,pendingInr,paidInr}
// apps/api/src/routes/temple-portal.ts:360-372. `amount` is r.amount.toString().
export interface TemplePayoutRow {
  id: string;
  bookingId: string | null;
  amountInr: number | null;
  status: string;
  /** paid | payable | upcoming. null when an older server omits it. */
  releaseStatus: string | null;
  reference: string | null;
  processedAt: string | null;
  createdAt: string | null;
}

export interface TemplePayoutsVM {
  rows: TemplePayoutRow[];
  total: number;
  /** Payable + upcoming, kept for older servers. */
  pendingInr: number | null;
  /** Releasable now (puja performed and proved). null from an older server. */
  payableInr: number | null;
  /** Held until the puja is proved. null from an older server. */
  upcomingInr: number | null;
  paidInr: number | null;
}

export function selectTemplePayouts(payload: unknown): TemplePayoutsVM | null {
  if (!isRecord(payload)) return null;
  // A 403 body is {error}. It has no `payouts` array, and answering
  // "0 paid out" to a temple that was refused is the worst possible lie.
  if (!Array.isArray(payload.payouts)) return null;
  const rows = payload.payouts
    .filter(isRecord)
    .map((r): TemplePayoutRow | null => {
      const id = str(r.id);
      if (!id) return null;
      return {
        id,
        bookingId: str(r.bookingId) ?? null,
        amountInr: money(r.amount),
        status: str(r.status) ?? 'unknown',
        releaseStatus: str(r.releaseStatus) ?? null,
        reference: str(r.reference) ?? null,
        processedAt: str(r.processedAt) ?? null,
        createdAt: str(r.createdAt) ?? null,
      };
    })
    .filter((r): r is TemplePayoutRow => r !== null);
  return {
    rows,
    total: toNumberOr(payload.total, rows.length),
    pendingInr: money(payload.pendingInr),
    payableInr: money(payload.payableInr),
    upcomingInr: money(payload.upcomingInr),
    paidInr: money(payload.paidInr),
  };
}

// GET /api/v1/temple-portal/bookings -> {bookings[],total}
// apps/api/src/routes/temple-portal.ts:624-641. `priceAmount` is a Decimal string.
export interface TempleBookingRow {
  id: string;
  bookingNumber: string | null;
  status: string;
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  priceInr: number | null;
  pujaName: string | null;
  priestName: string | null;
  devoteeName: string | null;
}

export function selectTempleBookings(payload: unknown): TempleBookingRow[] | null {
  if (!isRecord(payload)) return null;
  if (!Array.isArray(payload.bookings)) return null;
  return payload.bookings
    .filter(isRecord)
    .map((b): TempleBookingRow | null => {
      const id = str(b.id);
      if (!id) return null;
      return {
        id,
        bookingNumber: str(b.bookingNumber) ?? null,
        status: str(b.status) ?? 'unknown',
        scheduledDate: str(b.scheduledDate) ?? null,
        scheduledTimeSlot: str(b.scheduledTimeSlot) ?? null,
        // `priceAmount`, not `price` and not `priceInr`.
        priceInr: money(b.priceAmount),
        pujaName: str(b.pujaName) ?? null,
        priestName: str(b.priestName) ?? null,
        devoteeName: str(b.devoteeName) ?? null,
      };
    })
    .filter((b): b is TempleBookingRow => b !== null);
}

// GET /api/v1/astrologer-portal/earnings -> {data[],summary{...}}
// apps/api/src/routes/astrologer-portal.ts:417-426 + loadAstrologerLedger:113-127.
export interface AstrologerEarningRow {
  id: string;
  bookingId: string | null;
  status: string;
  createdAt: string | null;
  /** payable | upcoming | paid | reversed. null from an older server. */
  releaseStatus: string | null;
  grossInr: number | null;
  platformCutInr: number | null;
  earningsInr: number | null;
}

export interface AstrologerEarningsVM {
  rows: AstrologerEarningRow[];
  totalEarningsInr: number | null;
  /** Payable pending, EXCLUDING upcoming consultations. Mixes ready + requested. */
  pendingInr: number | null;
  /** Ready to withdraw (not yet requested). Part of pendingInr. null from an older server. */
  readyInr: number | null;
  /** Requested, awaiting payout (already in a payout request). Part of pendingInr. null from an older server. */
  requestedInr: number | null;
  /** Consultations not yet completed. null from an older server. */
  upcomingInr: number | null;
  paidInr: number | null;
  /** 0.8 — the astrologer share, sent as a fraction, not a percentage. */
  astrologerShare: number | null;
}

export function selectAstrologerEarnings(payload: unknown): AstrologerEarningsVM | null {
  if (!isRecord(payload)) return null;
  const summary = isRecord(payload.summary) ? payload.summary : null;
  if (!summary) return null; // 403 {error} — not a ledger
  const rows = arrayAt(payload, 'data')
    .filter(isRecord)
    .map((r): AstrologerEarningRow | null => {
      const id = str(r.id);
      if (!id) return null;
      return {
        id,
        bookingId: str(r.bookingId) ?? null,
        status: str(r.status) ?? 'unknown',
        createdAt: str(r.createdAt) ?? null,
        releaseStatus: str(r.releaseStatus) ?? null,
        grossInr: money(r.grossAmountInr),
        platformCutInr: money(r.platformCutInr),
        // `earningsInr` is the astrologer own take. Never render grossAmountInr
        // as "you earned" — that is the devotee payment, not the payout.
        earningsInr: money(r.earningsInr),
      };
    })
    .filter((r): r is AstrologerEarningRow => r !== null);
  return {
    rows,
    totalEarningsInr: money(summary.totalEarningsInr),
    pendingInr: money(summary.pendingInr),
    readyInr: money(summary.readyInr),
    requestedInr: money(summary.requestedInr),
    upcomingInr: money(summary.upcomingInr),
    paidInr: money(summary.paidInr),
    astrologerShare: money(summary.astrologerShare),
  };
}

// GET /api/v1/payouts/commissions -> {data[],total,page,pageSize}
// apps/api/src/routes/payout-requests.ts:139-161.
//
// `grossAmount` / `platformCut` / `ratePercent` are DELIBERATELY null for rows
// written before COMMISSION_CONVENTION_CUTOVER (2026-08-11): the ledger is
// mixed and those rows would derive a confidently wrong rupee figure. The app
// must render the blank as a blank, never as 0.
export interface ProviderCommissionRow {
  id: string;
  bookingId: string | null;
  status: string;
  createdAt: string | null;
  /** The provider earning. Always populated, always safe to show. */
  amountInr: number | null;
  /** null for pre-cutover rows — not derivable, so not shown. */
  grossInr: number | null;
  platformCutInr: number | null;
  ratePercent: number | null;
}

export interface ProviderCommissionsVM {
  rows: ProviderCommissionRow[];
  total: number;
}

export function selectProviderCommissions(payload: unknown): ProviderCommissionsVM | null {
  if (!isRecord(payload)) return null;
  if (!Array.isArray(payload.data)) return null; // 403 {error}
  const rows = payload.data
    .filter(isRecord)
    .map((c): ProviderCommissionRow | null => {
      const id = str(c.id);
      if (!id) return null;
      return {
        id,
        bookingId: str(c.bookingId) ?? null,
        status: str(c.status) ?? 'unknown',
        createdAt: str(c.createdAt) ?? null,
        amountInr: money(c.amount),
        grossInr: money(c.grossAmount),
        platformCutInr: money(c.platformCut),
        ratePercent: money(c.ratePercent),
      };
    })
    .filter((c): c is ProviderCommissionRow => c !== null);
  return { rows, total: toNumberOr(payload.total, rows.length) };
}

// GET /api/v1/payouts/balance
//   -> {availableInr,pendingInr,paidOutInr,kycVerified,kycOnFile}
// apps/api/src/routes/payout-requests.ts:50, spreading payout.service:216-220.
export interface PayoutBalanceVM {
  availableInr: number | null;
  /** Earned but held until the session is held / puja proved. null from an older server. */
  upcomingInr: number | null;
  /** Money already inside an in-flight PayoutRequest. Disjoint from available. */
  pendingInr: number | null;
  paidOutInr: number | null;
  kycVerified: boolean;
  kycOnFile: boolean;
}

export function selectPayoutBalance(payload: unknown): PayoutBalanceVM | null {
  if (!isRecord(payload)) return null;
  // 403 {error: 'Provider role required'} has none of these keys.
  if (payload.availableInr === undefined) return null;
  return {
    availableInr: money(payload.availableInr),
    upcomingInr: money(payload.upcomingInr),
    pendingInr: money(payload.pendingInr),
    paidOutInr: money(payload.paidOutInr),
    kycVerified: payload.kycVerified === true,
    kycOnFile: payload.kycOnFile === true,
  };
}
