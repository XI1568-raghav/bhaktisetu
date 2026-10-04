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

/**
 * The exact `z.enum` `PATCH /store/orders/:id/status` validates against —
 * apps/api/src/routes/store-orders.ts:53-63. Uppercase; lowercase 400s.
 */
export type StoreOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

/**
 * PATCH /api/v1/store/orders/:id/status
 *
 * `status` was typed `string`, so a value outside the enum type-checked and
 * then 400'd at runtime — a bug tsc could have caught at the call site and did
 * not. `trackingNumber` is parsed by the same schema and was missing here, so
 * the only way a merchant could attach one was to bypass this hook.
 *
 * The route ALSO enforces a transition table (store-orders.ts:418-433) and
 * answers 409 `{ error: "Cannot transition order from X to Y." }` on a bad
 * move. Being in the enum is necessary, not sufficient.
 */
export function useUpdateStoreOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      trackingNumber,
      note,
    }: {
      id: string;
      status: StoreOrderStatus;
      trackingNumber?: string;
      note?: string;
    }) =>
      api.patch(`/api/v1/store/orders/${id}/status`, {
        status,
        trackingNumber,
        note,
      }),
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

// ─── Astrology Consultations — REMOVED, and why ────────────────────────────
//
// `useAstrologyConsultations`, `useUpdateConsultation` and
// `useStartConsultationCall` used to live here, wrapping
// `GET|PATCH /api/v1/astrology/consultations[/:id][/start-call]`.
//
// THOSE THREE ENDPOINTS ANSWER FROM A PRIVATE IN-MEMORY MAP.
// apps/api/src/services/astrology.service.ts:373 —
//
//     private sessions: Map<string, PortalConsultation> = new Map();
//
// Nothing writes to it but `startConsultation()` inside the same process. It is
// empty on every boot, is not shared between Render instances, and holds no row
// that survives a redeploy. Paid consultations live in the
// `astrologer_consultations` table — what `GET /astrologer-portal/dashboard`
// counts, what the Commission ledger is keyed to, and what routes/consultation.ts
// reads. So the astrologer's Sessions tab showed an empty list while the
// dashboard on the previous tab counted real consultations, and each card's
// three buttons addressed the volatile Map. Mobile stopped calling all three
// (apps/mobile/lib/astrologer-consultations.ts) and a guard test now asserts no
// screen re-imports them.
//
// DELETED RATHER THAN REPOINTED. There is no honest 1:1 mapping onto the real
// rail, and inventing one would be a fresh lie of exactly the kind this package
// is being cleaned of:
//
//   · The list splits in two. Devotee history is `GET /consultation/mine`;
//     the astrologer's own book is `GET /consultation/astrologer/mine`
//     (consultation.ts:724 and :1048). Different shapes, different auth, and a
//     `role` query parameter that neither accepts. `useMyConsultations()` in
//     hooks/consultations.js already covers the devotee side.
//   · `status: 'COMPLETED' | 'CANCELLED'` maps onto nothing. Completion is
//     `PATCH /consultation/:id/complete` (:936) — BODYLESS, no status field.
//   · The astrologer-side cancel DOES NOT EXIST. `POST /consultation/:id/cancel`
//     (:758) is devotee-only and 403s the astrologer. A hook cannot be pointed
//     at an endpoint the API declines to provide.
//   · There is no start-call endpoint on the real rail. The Jitsi room is minted
//     at verify-payment and surfaced as `jitsiUrl` on the row itself.
//   · The status vocabulary differs too: the Map stores 'scheduled', the table
//     stores pending_payment | payment_review | confirmed | completed |
//     cancelled.
//
// Use hooks/consultations.js (`useMyConsultations`, `useCancelConsultation`) for
// the devotee side. The astrologer side needs `GET /consultation/astrologer/mine`
// and `PATCH /consultation/:id/complete`; mobile owns that today.

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

/**
 * POST /api/v1/donations/create-order
 *
 * PAR-06: this mutation used to be typed `input: unknown`, so the compiler
 * never noticed that the donations screen sent `{amount, currency, cause,
 * donorName}` while the server's zod schema (apps/api/src/routes/donations.ts
 * :224-250) requires `amountInr` plus a real donee id. Every donation from the
 * app returned 400 {"fieldErrors":{"amountInr":["Required"]}} and the user saw
 * a bare "Invalid request body" alert.
 *
 * Mirrors the server schema exactly: whole rupees, ₹101..₹10,00,000, and
 * exactly one of gaushalaId / templeId matching causeKind.
 */
export interface CreateDonationOrderInput {
  amountInr: number;
  causeKind?: "gaushala" | "temple";
  gaushalaId?: string;
  templeId?: string;
  planId?: string;
  donorPan?: string;
  dedication?: string;
}

export interface CreateDonationOrderResponse {
  donationId: string;
  razorpayOrderId: string;
  /** paise, i.e. amountInr * 100 */
  amount: number;
  currency: string;
  keyId: string;
  isDemoPayment: boolean;
}

export function useCreateDonationOrder() {
  return useMutation({
    mutationFn: (input: CreateDonationOrderInput) =>
      api.post<CreateDonationOrderResponse>(
        "/api/v1/donations/create-order",
        input,
      ),
  });
}

export interface VerifyDonationInput {
  donationId: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}

export function useVerifyDonation() {
  return useMutation({
    mutationFn: (input: VerifyDonationInput) =>
      api.post<{ success?: boolean; verified?: boolean; receiptNumber?: string }>(
        "/api/v1/donations/verify",
        input,
      ),
  });
}

/**
 * GET /api/v1/payments/config -> { keyId, isDemo }
 *
 * PAR-01: the only server-truthful signal the client has for "is there a real
 * payment rail". The Upgrade screen gates on this rather than assuming a
 * missing checkout URL means the plan was granted.
 */
export function usePaymentConfig() {
  return useQuery({
    queryKey: ["payments", "config"],
    queryFn: () =>
      api.get<{ keyId: string | null; isDemo: boolean }>(
        "/api/v1/payments/config",
      ),
    staleTime: 5 * 60 * 1000,
  });
}
