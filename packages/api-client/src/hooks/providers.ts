// ──────────────────────────────────────────────
// @poojly/api-client — Astrology / Wellness / Gaushala Hooks
// ──────────────────────────────────────────────

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { api } from "../client.js";

// ─── Astrology ───────────────────────────────

/**
 * One row of `GET /api/v1/astrology/astrologers` — the `PublicAstrologer`
 * projection in apps/api/src/routes/astrology.ts:42, built from approved
 * `AstrologerProfile` rows by `loadApprovedAstrologers()` (:86).
 *
 * Five of the eleven fields the old interface declared do not exist on the
 * wire: `ratingCount`, `pricePerMinute`, `avatarUrl` and `availability` are
 * never sent (the money column is `perMinuteRate`, a number), and every field
 * was optional even though the route always projects all of them. Six that ARE
 * sent — `userId`, `consultationCount`, `perMinuteRate`, `isOnline`, `mode`,
 * `verified` — were undeclared, so a screen could not reach the online flag
 * without a cast.
 *
 * `specializations` IS correct here: the route MAPS the profile column
 * `specialties` to this name (astrology.ts:97). The raw column name survives
 * only on `AstrologerPortalProfile` (hooks/portals.ts), which is the profile
 * row itself.
 */
export interface Astrologer {
  id: string;
  /** The `User.id` behind the profile — what presence and payouts key on. */
  userId: string;
  /** `AstrologerProfile.displayName`. */
  name: string;
  bio: string | null;
  /** `AstrologerProfile.specialties`, renamed by the route. */
  specializations: string[];
  languages: string[];
  experienceYears: number;
  rating: number;
  consultationCount: number;
  /** Rupees per minute, already coerced off `Decimal(10,2)` by the route. */
  perMinuteRate: number;
  isOnline: boolean;
  mode: string | null;
  /** Mirrors `AstrologerProfile.approved`. */
  verified: boolean;
}

/**
 * `GET /api/v1/astrology/astrologers` — the full envelope, not just
 * `{ astrologers, total }`. Paging was undeclared, so a caller had no typed way
 * to reach page 2 of the directory.
 */
export interface AstrologerListResponse {
  astrologers: Astrologer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /** Always `'live'` — the invented 15-row fixture is deleted (AW-02). */
  source: string;
}

export function useAstrologers(
  params?: {
    specialization?: string;
    language?: string;
    priceRange?: string;
    online?: string;
    sort?: string;
    page?: number;
    limit?: number;
  },
  options?: Omit<UseQueryOptions<AstrologerListResponse>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["astrology", "astrologers", params],
    queryFn: () =>
      api.get<AstrologerListResponse>("/api/v1/astrology/astrologers", {
        params: params as Record<
          string,
          string | number | boolean | undefined
        >,
      }),
    ...options,
  });
}

/**
 * `GET /api/v1/astrology/astrologers/:id` — the same projection plus `source`.
 * Only a UUID resolves; a fixture slug 404s (astrology.ts:206-239).
 */
export function useAstrologer(
  id: string,
  options?: Omit<
    UseQueryOptions<{ astrologer: Astrologer & { source: string } }>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: ["astrology", "astrologer", id],
    queryFn: () =>
      api.get<{ astrologer: Astrologer & { source: string } }>(
        `/api/v1/astrology/astrologers/${id}`
      ),
    enabled: !!id,
    ...options,
  });
}

export function useHoroscope(
  rashi: string,
  options?: Omit<UseQueryOptions<{ horoscope: unknown }>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["astrology", "horoscope", rashi],
    queryFn: () =>
      api.get<{ horoscope: unknown }>(`/api/v1/astrology/horoscope/${rashi}`),
    enabled: !!rashi,
    ...options,
  });
}

// ─── Wellness ────────────────────────────────

export interface WellnessInstructor {
  id: string;
  name: string;
  bio?: string;
  specializations?: string[];
  rating?: number;
  ratingCount?: number;
  hourlyRate?: number;
  avatarUrl?: string | null;
}

export interface WellnessSession {
  id: string;
  title: string;
  description?: string;
  type: string;
  duration: number;
  level?: string;
  instructorId?: string;
  instructorName?: string;
  startTime?: string;
  thumbnail?: string;
}

export interface WellnessProgram {
  id: string;
  title: string;
  description?: string;
  durationDays?: number;
  type: string;
  thumbnail?: string;
}

export function useWellnessInstructors(
  options?: Omit<
    UseQueryOptions<{ instructors: WellnessInstructor[] }>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: ["wellness", "instructors"],
    queryFn: () =>
      api.get<{ instructors: WellnessInstructor[] }>(
        "/api/v1/wellness/instructors"
      ),
    ...options,
  });
}

export function useWellnessSessions(
  options?: Omit<
    UseQueryOptions<{ sessions: WellnessSession[] }>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: ["wellness", "sessions"],
    queryFn: () =>
      api.get<{ sessions: WellnessSession[] }>("/api/v1/wellness/sessions"),
    ...options,
  });
}

export function useWellnessPrograms(
  options?: Omit<
    UseQueryOptions<{ programs: WellnessProgram[] }>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: ["wellness", "programs"],
    queryFn: () =>
      api.get<{ programs: WellnessProgram[] }>("/api/v1/wellness/programs"),
    ...options,
  });
}

// ─── Gaushala ────────────────────────────────

/**
 * One row of `GET /api/v1/gaushala` — `gaushalaService.getGaushalas()`
 * (apps/api/src/services/gaushala.service.ts:645), which spreads the fixture
 * row and adds the two derived counts.
 *
 * The old interface declared `cowCount` and `imageUrl`; the wire sends
 * `totalCows` and `image`. Both reads were `undefined` at runtime, so a
 * "500 cows" card rendered blank and every photo slot fell back to a
 * placeholder.
 *
 * ⚠ THIS LIST IS SAMPLE SUPPLY. `GAUSHALAS` is a module-level fixture, not a
 * DB read — apps/web/app/gaushala/[id]/page.tsx renders a "sample listing"
 * disclosure over it. Real, approved organisations live in `GaushalaProfile`
 * and are reachable only through `GET /gaushala/:id` (which resolves a real
 * profile by id or owner id) and the gaushala portal. Do NOT wire an owner's
 * own screen to this hook — that is exactly the mistake `(gaushala)/profile.tsx`
 * made (see apps/mobile/lib/gaushala-portal-profile.ts).
 */
export interface Gaushala {
  id: string;
  name: string;
  location: string;
  state: string;
  description: string;
  /** Herd size claimed by the listing. */
  totalCows: number;
  /** Fixture cows not yet marked adopted. */
  availableCows: number;
  /** How many `Cow` rows this gaushala actually has listed. */
  cowsListed: number;
  image: string;
  affiliation: string;
  isVerified: boolean;
  contactPhone: string;
  contactEmail: string;
  facilities: string[];
  visitingHours: string;
  coordinates: { lat: number; lng: number };
}

/**
 * One row of `GET /api/v1/gaushala/cows` — `gaushala.service.ts:23`.
 * `health` / `adoptionStatus` / `imageUrl` never existed; the wire sends
 * `healthStatus`, `isAdopted` and `photo`.
 */
export interface Cow {
  id: string;
  name: string;
  breed: string;
  age: number;
  gaushalaId: string;
  gaushalaName: string;
  photo: string;
  healthStatus: "healthy" | "under_treatment" | "senior_care";
  description: string;
  isAdopted: boolean;
  adopterName: string | null;
  monthlyUpdates: Array<{ date: string; photo: string; description: string }>;
}

/**
 * One row of `GET /api/v1/gaushala/plans` — `gaushala.service.ts:44`.
 * `title` / `pricePerMonth` / `benefits` were all invented; the wire sends
 * `name`, `price` and `features`, and the price is NOT monthly for three of the
 * four plans (`type` says which).
 */
export interface AdoptionPlan {
  id: string;
  name: string;
  nameHindi: string;
  type: "daily_feeding" | "monthly" | "annual" | "lifetime";
  /** Rupees, per the cadence named by `type`. */
  price: number;
  /** Pre-formatted, e.g. "51/day". */
  priceLabel: string;
  currency: string;
  features: string[];
  popular: boolean;
}

export function useGaushalas(
  options?: Omit<UseQueryOptions<{ gaushalas: Gaushala[] }>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["gaushala", "list"],
    queryFn: () => api.get<{ gaushalas: Gaushala[] }>("/api/v1/gaushala"),
    ...options,
  });
}

export function useCows(
  params?: { gaushalaId?: string; available?: boolean },
  options?: Omit<
    UseQueryOptions<{ cows: Cow[]; total: number }>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: ["gaushala", "cows", params],
    queryFn: () =>
      api.get<{ cows: Cow[]; total: number }>("/api/v1/gaushala/cows", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    ...options,
  });
}

export function useAdoptionPlans(
  options?: Omit<
    UseQueryOptions<{ plans: AdoptionPlan[] }>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: ["gaushala", "plans"],
    queryFn: () =>
      api.get<{ plans: AdoptionPlan[] }>("/api/v1/gaushala/plans"),
    ...options,
  });
}

// ─── Priest Portal ───────────────────────────

/**
 * GET /api/v1/priest/dashboard — the REAL shape.
 *
 * PAR-03: the previous interface declared
 *   { todayBookings, earningsToday, earningsThisMonth, rating, ratingCount,
 *     pendingVideoUploads }
 * None of those six fields has ever been returned by this endpoint. Because
 * the interface was a fabrication, `data.earningsToday.toLocaleString()`
 * type-checked and then threw `TypeError: Cannot read properties of undefined`
 * on the pandit's home tab the moment the fetch resolved.
 *
 * `earnings.pending` arrives as a Decimal STRING ("2310"), the other two as
 * numbers — normalise via apps/mobile/lib/api-contracts.ts#selectPriestDashboard.
 */
export interface PriestDashboard {
  priest: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    ratingAvg: number | null;
    ratingCount: number;
  };
  earnings: {
    total: number | string;
    thisMonth: number | string;
    pending: number | string;
  };
  bookings: {
    total: number;
    upcoming: number;
    completed: number;
  };
  upcomingBookings: Array<{
    id: string;
    bookingNumber: string;
    status: string;
    scheduledDate: string;
    scheduledTimeSlot: string | null;
    devoteeNames?: Array<{ name?: string }>;
    priceAmount: string | number;
    priestPayout: string | number | null;
    temple: { id: string; name: string; city?: string } | null;
    pujaType: { id: string; name: string } | null;
  }>;
}

/**
 * One row of `GET /api/v1/priest/bookings` — priest.service.ts's
 * `assignedBookingSelect` (:51), shared verbatim with `GET /priest/bookings/:id`
 * so the list and the detail page can never drift.
 *
 * PAR/PF: the previous interface declared `pujaName`, `devoteeName`,
 * `totalAmount` and `scheduledTime`. The select projects `pujaType.name`,
 * `user.fullName`, `priceAmount` and `scheduledTimeSlot` — so all four reads
 * were `undefined` at runtime, the card rendered "undefined (undefined)", and
 * `totalAmount.toLocaleString()` was one render away from throwing on the
 * pandit's own bookings tab. `apps/mobile/app/(priest)/bookings.tsx` normalises
 * the rows by hand today because this type could not be trusted.
 *
 * MONEY. `priceAmount`, `platformCommission` and `priestPayout` are
 * `Decimal(10,2)` columns and Prisma serialises them as STRINGS over JSON.
 * `number` is allowed only because a mocked client may hand back a number;
 * coerce before formatting, never `.toFixed()` them blind.
 *
 * `temple`, `pujaType` and `user` are REQUIRED relations on `PujaBooking`
 * (schema.prisma:530-532), so the route always projects an object.
 */
export interface PriestBooking {
  id: string;
  bookingNumber: string;
  status: string;
  /** `@db.Date`, ISO-8601. */
  scheduledDate: string;
  /** The real field. There is no `scheduledTime`. */
  scheduledTimeSlot: string;
  /** What the devotee paid. Decimal string. */
  priceAmount: string | number;
  currency: string;
  /** The platform's cut. Decimal string. */
  platformCommission: string | number;
  /** What the pandit earns on this booking. Decimal string. */
  priestPayout: string | number;
  devoteeNames: Array<{ name: string; gotra?: string; nakshatra?: string }>;
  sankalpDetails: string | null;
  specialInstructions: string | null;
  videoProofUrl: string | null;
  videoUploadedAt: string | null;
  /** Devotee's rating of this booking, 1-5, once left. */
  rating: number | null;
  reviewText: string | null;
  createdAt: string;
  temple: {
    id: string;
    name: string;
    nameLocal: string | null;
    slug: string;
    city: string;
    state: string;
  };
  pujaType: {
    id: string;
    name: string;
    nameLocal: string | null;
    slug: string;
    durationMinutes: number;
  };
  /** The devotee. `fullName`, not `devoteeName`. */
  user: { id: string; fullName: string; phone: string | null };
}

/**
 * `GET /api/v1/priest/bookings` — the full envelope from
 * `priestService.getAssignedBookings()` (:292). Paging and the tab counts were
 * undeclared, and the counts are the only source for the tab badges: they are
 * computed over the pandit's WHOLE book, not the page in hand.
 */
export interface PriestBookingsResponse {
  bookings: PriestBooking[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: {
    all: number;
    confirmed: number;
    priest_assigned: number;
    in_progress: number;
    completed: number;
  };
}

/**
 * One row of `GET /api/v1/priest/payouts`.
 *
 * Two rails feed this list and the route merges them (priest.ts:713-870):
 * the legacy `PriestPayout` sidecar (priest.service.ts#getPayoutHistory:659)
 * and the unified `Commission` ledger. Both project the SAME row shape, and
 * `rail` says which one a row came from — present only on the merged path.
 *
 * The old interface's `paidAt` and `bookingId` are not sent by either rail:
 * the settlement stamp is `processedAt` and the booking arrives as a nested
 * object, because the payouts screen renders `booking.bookingNumber` and
 * `booking.pujaType.name` unconditionally.
 *
 * `amount` is `Decimal(10,2)` — a STRING over JSON.
 */
export interface PriestPayout {
  id: string;
  /** Only on the merged path; `'commission'` for a unified-ledger row. */
  rail?: string;
  amount: string | number;
  status: string;
  /** `'not_requested'` until the pandit picks one. */
  payoutMethod: string | null;
  payoutReference: string | null;
  /** When the money actually moved. There is no `paidAt`. */
  processedAt: string | null;
  createdAt: string;
  booking: {
    id: string;
    bookingNumber: string;
    pujaType: { name: string };
    temple: { name: string };
  } | null;
}

/**
 * `GET /api/v1/priest/payouts` — the full envelope. `summary.totalEarned` means
 * SETTLED money only (PF-12); pending is reported separately and must never be
 * folded into it.
 */
export interface PriestPayoutsResponse {
  payouts: PriestPayout[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    totalEarned: string | number;
    pending: string | number;
    lastPayout: { amount: string | number; date: string | null } | null;
  };
  /** Merged path only: the two-rail merge window truncated this page. */
  mergeTruncated?: boolean;
}

export function usePriestDashboard(
  options?: Omit<UseQueryOptions<PriestDashboard>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["priest", "dashboard"],
    queryFn: () => api.get<PriestDashboard>("/api/v1/priest/dashboard"),
    ...options,
  });
}

export function usePriestBookings(
  params?: {
    status?: string;
    view?: "confirmed" | "priest_assigned" | "in_progress" | "completed";
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  },
  options?: Omit<UseQueryOptions<PriestBookingsResponse>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["priest", "bookings", params],
    queryFn: () =>
      api.get<PriestBookingsResponse>("/api/v1/priest/bookings", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    ...options,
  });
}

export function usePriestPayouts(
  params?: { status?: string; page?: number; limit?: number },
  options?: Omit<UseQueryOptions<PriestPayoutsResponse>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["priest", "payouts", params],
    queryFn: () =>
      api.get<PriestPayoutsResponse>("/api/v1/priest/payouts", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    ...options,
  });
}

export function usePriestProfile(
  options?: Omit<UseQueryOptions<{ profile: unknown }>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["priest", "profile"],
    queryFn: () => api.get<{ profile: unknown }>("/api/v1/priest/profile"),
    ...options,
  });
}

// ─── Admin Portal ────────────────────────────

/**
 * GET /api/v1/admin/dashboard — the REAL shape.
 *
 * PAR-04: the old interface declared `totalBookings` and `activeTemples`, which
 * this endpoint has never returned. `data.totalBookings.toLocaleString('en-IN')`
 * therefore threw on the admin home screen and again on Reports.
 */
export interface AdminDashboard {
  totalUsers: number;
  usersByRole: Record<string, number>;
  totalRevenue: number;
  pendingApprovals: number;
  activeSubscriptions: number;
  recentTransactions: Array<{
    id: string;
    userId: string;
    type: string;
    amount: number | string;
    status: string;
    createdAt: string;
  }>;
}

export interface AdminUser {
  id: string;
  email: string | null;
  fullName: string;
  phone: string;
  role: string;
  createdAt: string;
  status?: string;
}

export function useAdminDashboard(
  options?: Omit<UseQueryOptions<AdminDashboard>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => api.get<AdminDashboard>("/api/v1/admin/dashboard"),
    ...options,
  });
}

export function useAdminUsers(
  params?: { role?: string; q?: string },
  options?: Omit<
    UseQueryOptions<{ users: AdminUser[]; total: number }>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: ["admin", "users", params],
    queryFn: () =>
      api.get<{ users: AdminUser[]; total: number }>("/api/v1/admin/users", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    ...options,
  });
}

export function useAdminPendingApprovals(
  options?: Omit<
    UseQueryOptions<{ approvals: AdminUser[]; total: number }>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: ["admin", "approvals"],
    queryFn: () =>
      api.get<{ approvals: AdminUser[]; total: number }>(
        "/api/v1/admin/pending-approvals"
      ),
    ...options,
  });
}

export function useAdminRevenue(
  options?: Omit<UseQueryOptions<unknown>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["admin", "revenue"],
    queryFn: () => api.get<unknown>("/api/v1/admin/revenue"),
    ...options,
  });
}
