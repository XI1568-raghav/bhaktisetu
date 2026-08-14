// ──────────────────────────────────────────────
// @poojly/api-client — Wave 5 hooks
// Hooks for: kundli, horoscope (daily), yatra-packages, yatras,
// weddings (muhurat + inquiry), stripe-annual upgrade. Used by mobile parity (TD10).
// All paths use the explicit `/api/v1/` prefix to match the active server mounts.
// ──────────────────────────────────────────────

import { useMutation, useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { api } from "../client.js";

// ─── Astrology — kundli + horoscope-daily ─────────────────────────────────

export interface KundliInput {
  dob: string; // YYYY-MM-DD
  tob: string; // HH:mm
  location?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  name?: string;
}

export function useGenerateKundli() {
  return useMutation({
    mutationFn: (input: KundliInput) =>
      api.post<{ kundli: unknown }>("/api/v1/astrology/kundli", input),
  });
}

export function useDailyHoroscope(
  sign: string,
  options?: Omit<UseQueryOptions<{ horoscope: unknown }>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["astrology", "horoscope", "daily", sign],
    queryFn: () =>
      api.get<{ horoscope: unknown }>("/api/v1/astrology/horoscope/daily", {
        params: { sign },
      }),
    enabled: !!sign,
    ...options,
  });
}

// ─── Yatra packages (vertical-integrated tours) ───────────────────────────

export interface YatraPackage {
  id: string;
  slug: string;
  name: string;
  destination_slug: string;
  duration_days: number;
  price_inr: string | number;
  price_usd?: string | number | null;
  max_group_size: number;
  current_group_size: number;
  hero_image?: string | null;
  short_description?: string | null;
  departure_dates?: unknown;
}

export function useYatraPackages(params?: { destination?: string; maxPrice?: number }) {
  return useQuery({
    queryKey: ["yatra-packages", "list", params],
    queryFn: () =>
      api.get<{ packages: YatraPackage[] }>("/api/v1/yatra-packages", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
  });
}

export function useYatraPackage(slug: string) {
  return useQuery({
    queryKey: ["yatra-packages", "detail", slug],
    queryFn: () => api.get<YatraPackage>(`/api/v1/yatra-packages/${slug}`),
    enabled: !!slug,
  });
}

export interface YatraBookInput {
  travelersCount: number;
  contactEmail: string;
  contactPhone: string;
  specialRequests?: string;
}

export function useBookYatraPackage() {
  return useMutation({
    mutationFn: ({ slug, body }: { slug: string; body: YatraBookInput }) =>
      api.post<{ bookingNumber: string; totalInr: number; status: string }>(
        `/api/v1/yatra-packages/${slug}/book`,
        body,
      ),
  });
}

// ─── Yatra (curated destinations + companions) ────────────────────────────

export interface YatraDestination {
  slug: string;
  title: string;
  state?: string;
  region?: string;
  description?: string;
  heroImage?: string;
  durationDays?: number;
  priceFromInr?: number;
}

export function useYatraList() {
  return useQuery({
    queryKey: ["yatra", "list"],
    queryFn: () => api.get<{ yatras: YatraDestination[]; total: number }>("/api/v1/yatra/list"),
  });
}

export function useYatra(slug: string) {
  return useQuery({
    queryKey: ["yatra", "detail", slug],
    queryFn: () => api.get<{ yatra: YatraDestination }>(`/api/v1/yatra/${slug}`),
    enabled: !!slug,
  });
}

// ─── Weddings (muhurat + inquiry) ─────────────────────────────────────────

export interface MuhuratInput {
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
  brideRashi?: string;
  groomRashi?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface WeddingMuhurat {
  date: string;
  weekday?: string;
  tithi?: string;
  nakshatra?: string;
  yoga?: string;
  score?: number;
  isShubh?: boolean;
  reason?: string;
}

export function useFindMuhurats() {
  return useMutation({
    mutationFn: (input: MuhuratInput) =>
      api.post<{ muhurats: WeddingMuhurat[] } | WeddingMuhurat[] | unknown>(
        "/api/v1/weddings/muhurat",
        input,
      ),
  });
}

export interface WeddingInquiry {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  weddingDate?: string;
  package?: "basic" | "premium" | "royal";
  guests?: number;
  budget?: number;
  message?: string;
}

export function useCreateWeddingInquiry() {
  return useMutation({
    mutationFn: (input: WeddingInquiry) =>
      api.post<{ id: string; status: string }>("/api/v1/weddings/inquiry", input),
  });
}

// ─── NRI premium upgrade (annual) ─────────────────────────────────────────
//
// Was `useCreateStripeAnnual`, posting to /subscriptions/create-stripe-annual.
// That route was deleted 2026-08-11 with the Stripe rail, and the mobile app
// ships as a separate binary that does NOT redeploy with the API — so the
// premium upgrade button would have 404'd for every installed client the moment
// the API went out. Repointed to the surviving Razorpay path, matching what
// apps/web/app/upgrade/page.tsx already does. INR only.

// PAR-01 (2026-08-12): repointed AGAIN, from /subscriptions/subscribe to
// /subscriptions/create.
//
// /subscribe is not a checkout — it is an unconditional grant. It writes an
// ACTIVE ENTERPRISE subscription and a COMPLETED ₹5,000 Transaction with no
// Razorpay order, no payment and no mandate (subscription.service.ts:284-307),
// and the screen reported "Upgrade complete". /create at least attempts a real
// Razorpay subscription and returns a hosted `shortUrl` to pay at.
//
// It is NOT sufficient on its own: when Razorpay is unconfigured — or when the
// plan has no RAZORPAY_PLAN_* mapping, which `nri_premium_yearly` currently
// does not (subscription.service.ts:637-649) — /create takes its demo branch,
// sets `skipped: true`, and calls the same free grant. The caller must
// therefore gate on a live payment rail BEFORE invoking this, and must treat
// `skipped: true` or a missing shortUrl as a failure. See
// apps/mobile/lib/subscription-gate.ts.
export interface AnnualSubscriptionResponse {
  subscription?: {
    subscriptionId?: string;
    shortUrl?: string | null;
    url?: string | null;
    status?: string;
    skipped?: boolean;
    reason?: string;
  };
}

export function useCreateAnnualSubscription() {
  return useMutation({
    mutationFn: () =>
      api.post<AnnualSubscriptionResponse>("/api/v1/subscriptions/create", {
        planId: "nri_premium_yearly",
        role: "DEVOTEE",
      }),
  });
}

export function useIsPremium() {
  return useQuery({
    queryKey: ["subscriptions", "is-premium"],
    queryFn: () => api.get<{ isPremium: boolean }>("/api/v1/subscriptions/is-premium"),
  });
}
