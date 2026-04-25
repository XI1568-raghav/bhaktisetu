// ──────────────────────────────────────────────
// @poojly/api-client — Astrology / Wellness / Gaushala Hooks
// ──────────────────────────────────────────────

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { api } from "../client.js";

// ─── Astrology ───────────────────────────────

export interface Astrologer {
  id: string;
  name: string;
  bio?: string;
  specializations?: string[];
  languages?: string[];
  experienceYears?: number;
  rating?: number;
  ratingCount?: number;
  pricePerMinute?: number;
  avatarUrl?: string | null;
  availability?: string;
}

export function useAstrologers(
  params?: { specialization?: string; language?: string },
  options?: Omit<
    UseQueryOptions<{ astrologers: Astrologer[]; total: number }>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: ["astrology", "astrologers", params],
    queryFn: () =>
      api.get<{ astrologers: Astrologer[]; total: number }>(
        "/api/v1/astrology/astrologers",
        {
          params: params as Record<
            string,
            string | number | boolean | undefined
          >,
        }
      ),
    ...options,
  });
}

export function useAstrologer(
  id: string,
  options?: Omit<UseQueryOptions<{ astrologer: Astrologer }>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["astrology", "astrologer", id],
    queryFn: () =>
      api.get<{ astrologer: Astrologer }>(`/api/v1/astrology/astrologers/${id}`),
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

export interface Gaushala {
  id: string;
  name: string;
  description?: string;
  location?: string;
  cowCount?: number;
  imageUrl?: string;
}

export interface Cow {
  id: string;
  name: string;
  breed?: string;
  age?: number;
  health?: string;
  adoptionStatus?: string;
  imageUrl?: string;
}

export interface AdoptionPlan {
  id: string;
  title: string;
  description?: string;
  pricePerMonth: number;
  benefits?: string[];
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
  options?: Omit<UseQueryOptions<{ cows: Cow[] }>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["gaushala", "cows"],
    queryFn: () => api.get<{ cows: Cow[] }>("/api/v1/gaushala/cows"),
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

export interface PriestDashboard {
  todayBookings: number;
  earningsToday: number;
  earningsThisMonth: number;
  rating: number;
  ratingCount: number;
  pendingVideoUploads: number;
}

export interface PriestBooking {
  id: string;
  bookingNumber: string;
  pujaName: string;
  devoteeName: string;
  scheduledDate: string;
  scheduledTime?: string;
  status: string;
  totalAmount: number;
  videoUploadedAt?: string | null;
}

export interface PriestPayout {
  id: string;
  amount: number;
  status: string;
  paidAt?: string | null;
  bookingId?: string;
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
  options?: Omit<
    UseQueryOptions<{ bookings: PriestBooking[]; total: number }>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: ["priest", "bookings"],
    queryFn: () =>
      api.get<{ bookings: PriestBooking[]; total: number }>(
        "/api/v1/priest/bookings"
      ),
    ...options,
  });
}

export function usePriestPayouts(
  options?: Omit<
    UseQueryOptions<{ payouts: PriestPayout[]; total: number }>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: ["priest", "payouts"],
    queryFn: () =>
      api.get<{ payouts: PriestPayout[]; total: number }>(
        "/api/v1/priest/payouts"
      ),
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

export interface AdminDashboard {
  totalUsers: number;
  totalBookings: number;
  totalRevenue: number;
  activeTemples: number;
  pendingApprovals: number;
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
