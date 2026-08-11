// ──────────────────────────────────────────────
// @poojly/api-client — Wave 1-4 hooks
// Hooks for: store orders, support tickets, wellness sessions,
// astrology consultations, admin commissions, subscriptions, donations.
//
// EVERY path here must start with `/api/v1` — see hooks/api-v1-prefix.test.ts,
// which fails the build if one does not.
//
// batch9-review (2026-08-11): all 25 paths in this file were root-relative
// WITHOUT the prefix (`/donations/create-order`, `/store/orders`, …) while
// every other hooks file in the package had it. The consumer is mobile, whose
// baseUrl is the bare origin (`https://api.darshya.online`, apps/mobile/
// lib/api.ts apiBase() wired at app/_layout.tsx), and client.ts builds the URL
// with `new URL(path, baseUrl)` — a root-relative path replaces the whole
// pathname, so nothing supplied the prefix and all 25 requests 404'd against
// routes that are mounted under `/api/v1` (server.ts). Nine mobile screens were
// dead, including the donation money path: tapping "Donate ₹1,100" never got a
// Razorpay order back. Fixed by prefixing here, not by changing the mobile
// baseUrl — the baseUrl is the origin by design (screens with their own fetch
// build `${API_ROOT}/api/v1...` off it) and every other hooks file already
// assumes a bare origin.
// ──────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client.js";

// ─── Store Orders ──────────────────────────────

export function useStoreOrders() {
  return useQuery({
    queryKey: ["storeOrders", "list"],
    queryFn: () => api.get<{ data: unknown[] }>("/api/v1/store/orders"),
  });
}

export function useStoreOrder(id: string) {
  return useQuery({
    queryKey: ["storeOrders", "detail", id],
    queryFn: () => api.get<{ data: unknown }>(`/api/v1/store/orders/${id}`),
    enabled: !!id,
  });
}

export function useCreateStoreOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: unknown) => api.post("/api/v1/store/orders", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["storeOrders"] }),
  });
}

export function useUpdateStoreOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      note,
    }: {
      id: string;
      status: string;
      note?: string;
    }) => api.patch(`/api/v1/store/orders/${id}/status`, { status, note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["storeOrders"] }),
  });
}

// ─── Support Tickets ──────────────────────────────

export function useSupportTickets(params?: { all?: boolean }) {
  const qs = params?.all ? "?all=true" : "";
  return useQuery({
    queryKey: ["supportTickets", "list", params],
    queryFn: () => api.get<{ data: unknown[] }>(`/api/v1/support/tickets${qs}`),
  });
}

export function useSupportTicket(id: string) {
  return useQuery({
    queryKey: ["supportTickets", "detail", id],
    queryFn: () => api.get<{ data: unknown }>(`/api/v1/support/tickets/${id}`),
    enabled: !!id,
  });
}

export function useCreateSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: unknown) => api.post("/api/v1/support/tickets", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supportTickets"] }),
  });
}

export function useUpdateSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; [k: string]: unknown }) =>
      api.patch(`/api/v1/support/tickets/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supportTickets"] }),
  });
}

export function useAddTicketMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticketId,
      body,
      isInternal,
    }: {
      ticketId: string;
      body: string;
      isInternal?: boolean;
    }) =>
      api.post(`/api/v1/support/tickets/${ticketId}/messages`, {
        body,
        isInternal,
      }),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({
        queryKey: ["supportTickets", "detail", vars.ticketId],
      }),
  });
}

// ─── Wellness Sessions ──────────────────────────────
// Naming: `useWellnessSessionsV2` etc. — `useWellnessSessions` already exists
// in hooks/providers.js as a mock-data variant. New hooks talk to the real
// /wellness/sessions Prisma-backed routes.

export function useWellnessSessionsV2() {
  return useQuery({
    queryKey: ["wellnessSessions", "list"],
    queryFn: () => api.get<{ sessions: unknown[]; total: number }>(
      "/api/v1/wellness/sessions",
    ),
  });
}

export function useWellnessSession(id: string) {
  return useQuery({
    queryKey: ["wellnessSessions", "detail", id],
    queryFn: () =>
      api.get<{ data: unknown }>(`/api/v1/wellness/sessions/${id}`),
    enabled: !!id,
  });
}

export function useCreateWellnessSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: unknown) => api.post("/api/v1/wellness/sessions", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wellnessSessions"] }),
  });
}

export function useEnrollWellnessSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/api/v1/wellness/sessions/${id}/enroll`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wellnessSessions"] }),
  });
}

export function useVerifyWellnessEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      enrollmentId,
      ...body
    }: {
      enrollmentId: string;
      [k: string]: unknown;
    }) => api.post(`/api/v1/wellness/enrollments/${enrollmentId}/verify`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wellnessSessions"] }),
  });
}

export function useSetWellnessRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      roomUrl,
    }: {
      sessionId: string;
      roomUrl: string;
    }) => api.patch(`/api/v1/wellness/sessions/${sessionId}/room`, { roomUrl }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wellnessSessions"] }),
  });
}

// ─── Astrology Consultations ──────────────────────────────

export function useAstrologyConsultations(params?: { role?: string }) {
  const qs = params?.role ? `?role=${encodeURIComponent(params.role)}` : "";
  return useQuery({
    queryKey: ["astrologyConsultations", "list", params],
    queryFn: () =>
      api.get<{ consultations: unknown[] }>(
        `/api/v1/astrology/consultations${qs}`,
      ),
  });
}

export function useUpdateConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "COMPLETED" | "CANCELLED";
    }) => api.patch(`/api/v1/astrology/consultations/${id}`, { status }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["astrologyConsultations"] }),
  });
}

export function useStartConsultationCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ roomUrl: string }>(
        `/api/v1/astrology/consultations/${id}/start-call`,
        {},
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["astrologyConsultations"] }),
  });
}

// ─── Admin Commissions ──────────────────────────────

/**
 * One row of the commission ledger, as `GET /api/v1/admin/commissions`
 * actually returns it (apps/api/src/routes/admin.ts).
 *
 * The two money columns follow apps/api/src/lib/commission-math.ts and are the
 * whole reason this interface is written out rather than left `unknown`:
 *
 *   amount     — the PROVIDER's earning (what payout balance pays out)
 *   percentage — the PLATFORM's take rate, as a fraction ("0.2000" = 20%)
 *
 * `grossAmount` and `platformCut` are derived server-side through that module.
 * Never re-derive them on the client and never read `amount` as the platform's
 * revenue — on a 20/80 split that overstates it 4x.
 *
 * Decimals arrive as strings so no precision is lost in JSON; keep them
 * strings and format for display rather than summing them in JS floats.
 */
export interface AdminCommissionRow {
  id: string;
  bookingId: string | null;
  storeOrderId?: string | null;
  wellnessEnrollmentId?: string | null;
  providerId: string;
  /** PROVIDER's earning. */
  amount: string;
  /** PLATFORM's take rate as a fraction, e.g. "0.2000". */
  percentage: string;
  grossAmount: string;
  platformCut: string;
  /** `percentage * 100`, pre-rounded server-side to avoid float artefacts. */
  ratePercent: number;
  status: string;
  createdAt: string;
  providerName: string | null;
  providerRole: string | null;
  bookingNumber: string | null;
  itemName: string | null;
  payoutReference: string | null;
  processedAt: string | null;
}

export interface AdminCommissionsPage {
  data: AdminCommissionRow[];
  page: number;
  pageSize: number;
  /** Ledger-wide row count for the active filter — NOT `data.length`. */
  total: number;
}

/**
 * `status` is the uppercase `CommissionStatus` enum — 'PENDING' | 'PAID' |
 * 'REVERSED'. The route validates with `z.enum` and 400s on anything else,
 * lowercase included.
 *
 * batch9-review (2026-08-11): `page`/`pageSize` were not sent, so the route's
 * default pageSize of 20 silently truncated the ledger and callers had no way
 * to reach row 21. The response already carried `page`/`pageSize`/`total`;
 * only the request side and the return type were missing them.
 */
export function useAdminCommissions(params?: {
  status?: "PENDING" | "PAID" | "REVERSED";
  providerId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.providerId) qs.set("providerId", params.providerId);
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  const qsStr = qs.toString();
  return useQuery({
    queryKey: ["adminCommissions", "list", params],
    queryFn: () =>
      api.get<AdminCommissionsPage>(
        `/api/v1/admin/commissions${qsStr ? `?${qsStr}` : ""}`,
      ),
  });
}

// ─── Subscriptions ──────────────────────────────

export function useSubscriptionPlans(params?: { role?: string }) {
  const qs = params?.role ? `?role=${encodeURIComponent(params.role)}` : "";
  return useQuery({
    queryKey: ["subscriptions", "plans", params],
    queryFn: () =>
      api.get<{ plans: unknown[] }>(`/api/v1/subscriptions/plans${qs}`),
  });
}

export function useMySubscription() {
  return useQuery({
    queryKey: ["subscriptions", "my"],
    queryFn: () => api.get<{ subscription: unknown | null }>(
      "/api/v1/subscriptions/my",
    ),
  });
}

export function useSubscribe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId }: { planId: string }) =>
      api.post("/api/v1/subscriptions/subscribe", { planId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subscriptions"] }),
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/v1/subscriptions/cancel", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subscriptions"] }),
  });
}

// ─── Donations ──────────────────────────────

export function useCreateDonationOrder() {
  return useMutation({
    mutationFn: (input: unknown) =>
      api.post("/api/v1/donations/create-order", input),
  });
}

export function useVerifyDonation() {
  return useMutation({
    mutationFn: (input: unknown) => api.post("/api/v1/donations/verify", input),
  });
}
