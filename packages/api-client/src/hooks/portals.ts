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

export interface AstrologerDashboardResponse {
  todayConsultations?: Array<{
    id: string;
    clientName?: string;
    topic?: string;
    scheduledAt?: string;
    timeLabel?: string;
    amount?: number;
    status?: string;
  }>;
  stats?: {
    todayCount?: number;
    earningsToday?: number;
    monthEarnings?: number;
    rating?: number;
    ratingCount?: number;
  };
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
    name: string;
    phone?: string;
    skill?: string;
    joinedAt?: string;
    hoursThisMonth?: number;
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

export interface WellnessDashboardResponse {
  stats?: {
    upcomingSessions?: number;
    activeEnrollments?: number;
    monthEarningsInr?: number;
    rating?: number;
  };
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
