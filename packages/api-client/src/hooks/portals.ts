// ──────────────────────────────────────────────
// @poojly/api-client — Portal dashboard hooks
// Hooks for: astrologer / store-admin / gaushala / temple / wellness
// portal dashboards + supporting lists (donations, volunteers, students,
// reviews). All paths use the `/api/v1/` prefix to match active mounts.
//
// The shapes are deliberately permissive (`unknown` / partial) because
// portal endpoints return role-specific records the mobile UI then
// narrows. Tightening types here causes ripple changes every time the
// server adds a field — not worth it for thin wrappers.
// ──────────────────────────────────────────────

import { useQuery } from "@tanstack/react-query";
import { api } from "../client.js";

// ─── Astrologer portal ────────────────────────────────────────────────

/**
 * The astrologer's own `AstrologerProfile` row, sent verbatim by
 * `GET /astrologer-portal/dashboard` (astrologer-portal.ts:257) and by
 * `PATCH /astrologer-portal/profile`. `null` when the account has no profile
 * yet — which is also what a caller with the role but no onboarding sees.
 *
 * `specialties` is the COLUMN name (schema.prisma:1099). The public directory
 * renames it to `specializations`; this row does not.
 */
export interface AstrologerPortalProfile {
  id: string;
  userId: string;
  displayName: string;
  specialties: string[];
  languages: string[];
  experience: number;
  rating: number;
  /** `Decimal(10,2)` — a string over JSON. */
  pricePerMinute: string | number;
  totalConsultations: number;
  bio: string | null;
  /** Free-form weekly blob, e.g. `{ mon: ["09:00-12:00"], tue: [] }`. */
  availability: unknown;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * `GET /api/v1/astrologer-portal/dashboard` — apps/api/src/routes/
 * astrologer-portal.ts:256-279.
 *
 * PAR: the previous interface declared `todayConsultations` and
 * `stats.todayCount / earningsToday / monthEarnings / ratingCount`. This route
 * has never sent any of those six, and it does not send `ratingCount` at all.
 * It sends `consultationsToday`, `earningsTodayInr`, `earningsMonthInr`,
 * `totalEarningsInr` and `upcomingSessions` — and `profile`, which was
 * undeclared even though three mobile screens read it (they cast, because they
 * had to).
 *
 * MONEY. Every `*Inr` figure is the astrologer's NET 80% share off the
 * Commission ledger (AW-04), already a `number`. `totalEarningsInr` is a
 * LIFETIME net figure and must never be labelled "Paid out" — only
 * `paidOutInr` describes money that moved.
 */
export interface AstrologerDashboardResponse {
  profile: AstrologerPortalProfile | null;
  stats: {
    /** Derived from `astrologer_consultations`, not the stale counter (AW-14). */
    totalConsultations: number;
    rating: number;
    pricePerMinute: number;
    approved: boolean;
    consultationsToday: number;
    earningsTodayInr: number;
    earningsMonthInr: number;
    totalEarningsInr: number;
    paidOutInr: number;
    pendingPayoutInr: number;
    /** The provider's share as a fraction, e.g. 0.8. */
    astrologerShare: number;
    activeClients: number;
  };
  /**
   * Raw `astrologer_consultations` rows — SNAKE_CASE, because they come from
   * `$queryRawUnsafe` and are not passed through a serializer — plus a derived
   * `jitsiUrl`. Empty when the table cannot be read.
   */
  upcomingSessions: Array<{
    id: string;
    reference: string | null;
    user_id: string | null;
    minutes: number | null;
    amount_inr: number | string | null;
    scheduled_at: string | null;
    room_name: string | null;
    status: string;
    created_at: string;
    jitsiUrl: string | null;
  }>;
}

export function useAstrologerDashboard() {
  return useQuery({
    queryKey: ["astrologer-portal", "dashboard"],
    queryFn: () =>
      api.get<AstrologerDashboardResponse>("/api/v1/astrologer-portal/dashboard"),
  });
}

// ─── Store-admin portal ───────────────────────────────────────────────

export interface StoreAdminDashboardResponse {
  stats?: {
    todaySales?: number;
    todayOrders?: number;
    monthSales?: number;
    lowStock?: number;
    pendingShipments?: number;
  };
  recentOrders?: Array<{
    id: string;
    customer?: string;
    amount?: number;
    status?: string;
    createdAt?: string;
  }>;
}

export function useStoreAdminDashboard() {
  return useQuery({
    queryKey: ["store-admin", "dashboard"],
    queryFn: () =>
      api.get<StoreAdminDashboardResponse>("/api/v1/store-admin/dashboard"),
  });
}

export interface StoreAdminReviewsResponse {
  reviews?: Array<{
    id: string;
    productName?: string;
    customer?: string;
    rating?: number;
    comment?: string;
    createdAt?: string;
    status?: string;
  }>;
}

export function useStoreAdminReviews() {
  return useQuery({
    queryKey: ["store-admin", "reviews"],
    queryFn: () =>
      api.get<StoreAdminReviewsResponse>("/api/v1/store-admin/reviews"),
  });
}

export interface StoreAdminRevenueResponse {
  topProducts?: Array<{
    id: string;
    name: string;
    sold: number;
    revenueInr: number;
  }>;
  totals?: {
    todayInr?: number;
    monthInr?: number;
    yearInr?: number;
  };
}

export function useStoreAdminRevenue() {
  return useQuery({
    queryKey: ["store-admin", "revenue"],
    queryFn: () =>
      api.get<StoreAdminRevenueResponse>("/api/v1/store-admin/revenue"),
  });
}

// ─── Gaushala portal ──────────────────────────────────────────────────

export interface GaushalaDashboardResponse {
  stats?: {
    totalCows?: number;
    sponsoredCows?: number;
    activeVolunteers?: number;
    monthlyDonationsInr?: number;
  };
}

export function useGaushalaDashboard() {
  return useQuery({
    queryKey: ["gaushala-portal", "dashboard"],
    queryFn: () =>
      api.get<GaushalaDashboardResponse>("/api/v1/gaushala-portal/dashboard"),
  });
}

export interface GaushalaDonationsResponse {
  donations?: Array<{
    id: string;
    donor?: string;
    email?: string | null;
    amountInr: number;
    status?: string; // created | paid | failed
    receiptNumber?: string | null;
    createdAt: string;
    paidAt?: string | null;
  }>;
}

export function useGaushalaPortalDonations() {
  return useQuery({
    queryKey: ["gaushala-portal", "donations"],
    queryFn: () =>
      api.get<GaushalaDonationsResponse>("/api/v1/gaushala-portal/donations"),
  });
}

export interface GaushalaVolunteersResponse {
  volunteers?: Array<{
    id: string;
    gaushalaId: string;
    fullName: string;
    phone?: string | null;
    email?: string | null;
    role?: string;
    active?: boolean;
    notes?: string | null;
    joinedAt?: string;
    createdAt?: string;
    updatedAt?: string;
  }>;
}

export function useGaushalaVolunteers() {
  return useQuery({
    queryKey: ["gaushala-portal", "volunteers"],
    queryFn: () =>
      api.get<GaushalaVolunteersResponse>("/api/v1/gaushala-portal/volunteers"),
  });
}

// ─── Temple portal ────────────────────────────────────────────────────

export interface TempleDashboardResponse {
  stats?: {
    todayBookings?: number;
    pendingPriestAssignment?: number;
    monthRevenueInr?: number;
    activeDarshanStreams?: number;
  };
}

export function useTempleDashboard() {
  return useQuery({
    queryKey: ["temple-portal", "dashboard"],
    queryFn: () =>
      api.get<TempleDashboardResponse>("/api/v1/temple-portal/dashboard"),
  });
}

export interface TempleDonationsResponse {
  donations?: Array<{
    id: string;
    donor?: string;
    email?: string | null;
    amountInr: number;
    status?: string; // created | paid | failed
    receiptNumber?: string | null;
    createdAt: string;
    paidAt?: string | null;
  }>;
  total?: number;
}

export function useTemplePortalDonations() {
  return useQuery({
    queryKey: ["temple-portal", "donations"],
    queryFn: () =>
      api.get<TempleDonationsResponse>("/api/v1/temple-portal/donations"),
  });
}

// ─── Wellness portal ──────────────────────────────────────────────────

/**
 * The instructor's own `WellnessProfile` row, sent verbatim by
 * `GET /wellness-portal/dashboard` (wellness-portal.ts:149). `null` before
 * onboarding. Note there is no `availability` column on this model, and the
 * money column is `pricePerSession`, not `pricePerMinute`.
 */
export interface WellnessPortalProfile {
  id: string;
  userId: string;
  displayName: string;
  specialties: string[];
  certifications: string[];
  experience: number;
  rating: number;
  /** `Decimal(10,2)` — a string over JSON. */
  pricePerSession: string | number;
  bio: string | null;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * `GET /api/v1/wellness-portal/dashboard` — apps/api/src/routes/
 * wellness-portal.ts:148-182.
 *
 * The previous interface declared `stats.activeEnrollments` and `stats.rating`
 * — neither is sent — and left `profile`, `upcomingSessions` and
 * `recentSessions` undeclared even though all three are.
 *
 * Note the NAME COLLISION the route creates and this type has to carry:
 * `stats.upcomingSessions` is a COUNT, while the top-level `upcomingSessions`
 * is the list itself.
 *
 * MONEY. `totalEarningsInr` / `monthEarningsInr` are the instructor's NET share
 * (1 − platformRate), not gross ticket revenue, and `totalEarningsInr` is
 * LIFETIME net — only `paidOutInr` is money that has actually moved (AW-10).
 */
export interface WellnessDashboardResponse {
  profile: WellnessPortalProfile | null;
  stats: {
    totalSessions: number;
    /** A COUNT of upcoming sessions, not the list below. */
    upcomingSessions: number;
    completedSessions: number;
    /** Distinct paid/attended enrollees. */
    totalStudents: number;
    totalEarningsInr: number;
    monthEarningsInr: number;
    paidOutInr: number;
    pendingPayoutInr: number;
    /** The instructor's share as a fraction, e.g. 0.8. */
    instructorShare: number;
    /** The platform's take rate as a fraction, e.g. 0.2. */
    platformRate: number;
  };
  upcomingSessions: Array<{
    id: string;
    title: string;
    scheduledAt: string;
    durationMinutes: number;
    capacity: number;
    /** Coerced to a number by the route. */
    priceInr: number;
    /** PAID + ATTENDED enrollments. */
    enrolled: number;
  }>;
  recentSessions: Array<{
    id: string;
    title: string;
    scheduledAt: string;
    status: string;
    priceInr: number;
    enrolled: number;
  }>;
}

export function useWellnessDashboard() {
  return useQuery({
    queryKey: ["wellness-portal", "dashboard"],
    queryFn: () =>
      api.get<WellnessDashboardResponse>("/api/v1/wellness-portal/dashboard"),
  });
}

export interface WellnessStudentsResponse {
  students?: Array<{
    id: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    sessionCount: number;
    lastEnrolledAt: string;
    lastSession: { id: string; title: string; scheduledAt: string };
    hasAttended: boolean;
  }>;
  total?: number;
}

export function useWellnessStudents() {
  return useQuery({
    queryKey: ["wellness-portal", "students"],
    queryFn: () =>
      api.get<WellnessStudentsResponse>("/api/v1/wellness-portal/students"),
  });
}
