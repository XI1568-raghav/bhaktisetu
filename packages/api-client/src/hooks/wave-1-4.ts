// ──────────────────────────────────────────────
// @poojly/api-client — Wave 1-4 hooks
// Hooks for: store orders, support tickets, wellness sessions,
// astrology consultations, admin commissions, subscriptions, donations.
// ──────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client.js";

// ─── Store Orders ──────────────────────────────

export function useStoreOrders() {
  return useQuery({
    queryKey: ["storeOrders", "list"],
    queryFn: () => api.get<{ data: unknown[] }>("/store/orders"),
  });
}

export function useStoreOrder(id: string) {
  return useQuery({
    queryKey: ["storeOrders", "detail", id],
    queryFn: () => api.get<{ data: unknown }>(`/store/orders/${id}`),
    enabled: !!id,
  });
}

export function useCreateStoreOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: unknown) => api.post("/store/orders", input),
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
    }) => api.patch(`/store/orders/${id}/status`, { status, note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["storeOrders"] }),
  });
}

// ─── Support Tickets ──────────────────────────────

export function useSupportTickets(params?: { all?: boolean }) {
  const qs = params?.all ? "?all=true" : "";
  return useQuery({
    queryKey: ["supportTickets", "list", params],
    queryFn: () => api.get<{ data: unknown[] }>(`/support/tickets${qs}`),
  });
}

export function useSupportTicket(id: string) {
  return useQuery({
    queryKey: ["supportTickets", "detail", id],
    queryFn: () => api.get<{ data: unknown }>(`/support/tickets/${id}`),
    enabled: !!id,
  });
}

export function useCreateSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: unknown) => api.post("/support/tickets", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supportTickets"] }),
  });
}

export function useUpdateSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; [k: string]: unknown }) =>
      api.patch(`/support/tickets/${id}`, patch),
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
      api.post(`/support/tickets/${ticketId}/messages`, {
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
      "/wellness/sessions",
    ),
  });
}

export function useWellnessSession(id: string) {
  return useQuery({
    queryKey: ["wellnessSessions", "detail", id],
    queryFn: () =>
      api.get<{ data: unknown }>(`/wellness/sessions/${id}`),
    enabled: !!id,
  });
}

export function useCreateWellnessSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: unknown) => api.post("/wellness/sessions", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wellnessSessions"] }),
  });
}

export function useEnrollWellnessSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/wellness/sessions/${id}/enroll`, {}),
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
    }) => api.post(`/wellness/enrollments/${enrollmentId}/verify`, body),
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
    }) => api.patch(`/wellness/sessions/${sessionId}/room`, { roomUrl }),
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
        `/astrology/consultations${qs}`,
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
    }) => api.patch(`/astrology/consultations/${id}`, { status }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["astrologyConsultations"] }),
  });
}

export function useStartConsultationCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ roomUrl: string }>(
        `/astrology/consultations/${id}/start-call`,
        {},
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["astrologyConsultations"] }),
  });
}

// ─── Admin Commissions ──────────────────────────────

export function useAdminCommissions(params?: {
  status?: string;
  providerId?: string;
  from?: string;
  to?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.providerId) qs.set("providerId", params.providerId);
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  const qsStr = qs.toString();
  return useQuery({
    queryKey: ["adminCommissions", "list", params],
    queryFn: () =>
      api.get<{ data: unknown[] }>(
        `/admin/commissions${qsStr ? `?${qsStr}` : ""}`,
      ),
  });
}

// ─── Subscriptions ──────────────────────────────

export function useSubscriptionPlans(params?: { role?: string }) {
  const qs = params?.role ? `?role=${encodeURIComponent(params.role)}` : "";
  return useQuery({
    queryKey: ["subscriptions", "plans", params],
    queryFn: () =>
      api.get<{ plans: unknown[] }>(`/subscriptions/plans${qs}`),
  });
}

export function useMySubscription() {
  return useQuery({
    queryKey: ["subscriptions", "my"],
    queryFn: () => api.get<{ subscription: unknown | null }>(
      "/subscriptions/my",
    ),
  });
}

export function useSubscribe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId }: { planId: string }) =>
      api.post("/subscriptions/subscribe", { planId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subscriptions"] }),
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/subscriptions/cancel", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subscriptions"] }),
  });
}

// ─── Donations ──────────────────────────────

export function useCreateDonationOrder() {
  return useMutation({
    mutationFn: (input: unknown) =>
      api.post("/donations/create-order", input),
  });
}

export function useVerifyDonation() {
  return useMutation({
    mutationFn: (input: unknown) => api.post("/donations/verify", input),
  });
}
