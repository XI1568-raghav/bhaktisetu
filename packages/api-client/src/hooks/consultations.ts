// ──────────────────────────────────────────────
// @poojly/api-client — Consultations (AstrologerConsultation table)
// Hooks for the NEW per-minute astrologer consultation lifecycle shipped via
// /api/v1/consultation/* (commits b71b06c + 9aae740 + 3b56f47):
//   - GET  /api/v1/consultation/mine   → devotee history + upcoming
//   - POST /api/v1/consultation/:id/cancel → devotee-initiated cancel
//                                            (refund eligibility per
//                                            business rule #5)
// These wrap the AstrologerConsultation table, NOT the legacy
// `/astrology/consultations` endpoint covered by useAstrologyConsultations
// in wave-1-4.ts.
// ──────────────────────────────────────────────

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client.js";

export type ConsultationStatus =
  | "pending_payment"
  | "confirmed"
  | "completed"
  | "cancelled"
  | string;

export interface MyConsultation {
  id: string;
  reference: string;
  astrologerId: string;
  astrologerName: string;
  minutes: number;
  amountInr: number;
  currency: string;
  status: ConsultationStatus;
  roomName: string | null;
  jitsiUrl: string | null;
  scheduledAt: string | null;
  createdAt: string;
  paidAt?: string | null;
}

export interface MyConsultationsResponse {
  consultations: MyConsultation[];
}

export interface CancelConsultationResponse {
  cancelled: boolean;
  refundEligible: boolean;
  consultationId?: string;
  reference?: string;
  alreadyCancelled?: boolean;
  note?: string;
}

export const consultationKeys = {
  all: ["consultations"] as const,
  mine: ["consultations", "mine"] as const,
};

export function useMyConsultations() {
  return useQuery({
    queryKey: consultationKeys.mine,
    queryFn: () =>
      api.get<MyConsultationsResponse>("/api/v1/consultation/mine"),
  });
}

export function useCancelConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<CancelConsultationResponse>(
        `/api/v1/consultation/${id}/cancel`,
        {},
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: consultationKeys.all }),
  });
}
