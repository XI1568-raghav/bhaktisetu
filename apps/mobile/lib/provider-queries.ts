/**
 * Mobile-local react-query hooks for the PROVIDER-portal endpoints the pandit,
 * astrologer and wellness-instructor screens need.
 *
 * WHY RAW `fetch` AND NOT `api.get` / `api.patch`
 * ----------------------------------------------
 * Two defects in `packages/api-client/src/client.ts` (owned by another
 * workstream — reported, not edited here) make that client the wrong tool for
 * these particular routes:
 *
 *  1. `request()` sets `Content-Type: application/json` UNCONDITIONALLY, even
 *     when `body` is undefined (client.ts:138-140, 173). Fastify rejects a
 *     bodyless request that declares a JSON body with
 *     `FST_ERR_CTP_EMPTY_JSON_BODY` BEFORE the handler runs — so
 *     `api.patch('/api/v1/priest/pujas/:id/toggle-active')` could only ever
 *     400. `PATCH /consultation/:id/complete` is bodyless too.
 *
 *  2. The error mapper reads `data?.error?.message` (client.ts:210). Every
 *     route in this file answers `{ error: "<sentence>" }` — `error` is a
 *     STRING — so `.message` is undefined and the server's own sentence
 *     ("Cannot complete a cancelled consultation.", "You do not own this
 *     offering.") is replaced with "Request failed with status 400".
 *
 * `app/(priest)/bookings.tsx` and `offers.tsx` already fetch by hand for
 * exactly these reasons. This module is the same pattern, factored once.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { useAuth } from './auth-context';
import { apiBase } from './api';

/** Fastify's error envelope on every route below is `{ error: "<sentence>" }`. */
export function serverSentence(payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const err = (payload as { error?: unknown }).error;
    if (typeof err === 'string' && err.trim()) return err.trim();
    // A few shared routes answer {error:'Forbidden', message:'…'}; the second
    // field is the one a person can act on.
    const msg = (payload as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) return msg.trim();
  }
  return '';
}

async function authedJson(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<unknown> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(serverSentence(payload) || `Request failed (${res.status}).`);
  }
  return payload;
}

type RawOptions = Omit<UseQueryOptions<unknown>, 'queryKey' | 'queryFn'>;

export const providerQueryKeys = {
  priestReviews: ['priest', 'reviews'] as const,
  priestOfferings: ['priest', 'pujas'] as const,
  astrologerConsultations: ['consultation', 'astrologer', 'mine'] as const,
  instructorSessions: ['wellness', 'sessions', 'mine'] as const,
};

// ─── Pandit ─────────────────────────────────────────────────────────────────

/** `GET /api/v1/priest/reviews` -> `{reviews[], total}`. */
export function usePriestReviews(options?: RawOptions) {
  const { session } = useAuth();
  const token = session?.accessToken ?? '';
  return useQuery<unknown>({
    queryKey: providerQueryKeys.priestReviews,
    enabled: !!token,
    queryFn: () => authedJson('/api/v1/priest/reviews', token),
    ...options,
  });
}

/** `GET /api/v1/priest/pujas` -> `{offerings[]}` — the pandit's OWN services. */
export function usePriestOfferings(options?: RawOptions) {
  const { session } = useAuth();
  const token = session?.accessToken ?? '';
  return useQuery<unknown>({
    queryKey: providerQueryKeys.priestOfferings,
    enabled: !!token,
    queryFn: () => authedJson('/api/v1/priest/pujas', token),
    ...options,
  });
}

/**
 * `PATCH /api/v1/priest/pujas/:id/toggle-active` — flips `isActive` server-side.
 * Bodyless by design: the handler reads the current row and inverts it, so the
 * client must NOT send a desired value (and must not declare Content-Type).
 */
export function useTogglePriestOffering() {
  const { session } = useAuth();
  const token = session?.accessToken ?? '';
  const qc = useQueryClient();
  return useMutation<unknown, Error, string>({
    mutationFn: (offeringId) =>
      authedJson(`/api/v1/priest/pujas/${offeringId}/toggle-active`, token, {
        method: 'PATCH',
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: providerQueryKeys.priestOfferings }),
  });
}

// ─── Astrologer ─────────────────────────────────────────────────────────────

/**
 * `GET /api/v1/consultation/astrologer/mine` ->
 * `{total,limit,offset,consultations[]}`.
 *
 * NOT `GET /api/v1/astrology/consultations`, which the screen used to call:
 * that route reads `astrology.service`'s private in-memory `Map`
 * (astrology.service.ts:373), which holds only rooms opened by the current
 * server process and is empty after every restart or redeploy. Paid
 * consultations live in the `astrologer_consultations` table, and this is the
 * endpoint that reads it.
 */
export function useAstrologerConsultations(options?: RawOptions) {
  const { session } = useAuth();
  const token = session?.accessToken ?? '';
  return useQuery<unknown>({
    queryKey: providerQueryKeys.astrologerConsultations,
    enabled: !!token,
    queryFn: () =>
      authedJson('/api/v1/consultation/astrologer/mine?limit=100', token),
    ...options,
  });
}

/**
 * `PATCH /api/v1/consultation/:id/complete` — bodyless.
 * Server guard: the caller must be the assigned astrologer (matched on
 * AstrologerProfile.id OR User.id) or an admin, and the row must be
 * `confirmed`. `completed` is idempotent; anything else answers 409 with a
 * sentence naming the current status.
 */
export function useCompleteConsultation() {
  const { session } = useAuth();
  const token = session?.accessToken ?? '';
  const qc = useQueryClient();
  return useMutation<unknown, Error, string>({
    mutationFn: (consultationId) =>
      authedJson(`/api/v1/consultation/${consultationId}/complete`, token, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: providerQueryKeys.astrologerConsultations,
      });
      void qc.invalidateQueries({ queryKey: ['astrologer-portal'] });
    },
  });
}

/**
 * `PATCH /api/v1/astrologer-portal/availability` — replaces the stored blob
 * wholesale. Body: `{availability: <free-form JSON, 64KB cap>}`.
 */
export function useSaveAstrologerAvailability() {
  const { session } = useAuth();
  const token = session?.accessToken ?? '';
  const qc = useQueryClient();
  return useMutation<unknown, Error, unknown>({
    mutationFn: (availability) =>
      authedJson('/api/v1/astrologer-portal/availability', token, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability }),
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['astrologer-portal', 'dashboard'] }),
  });
}

// ─── Wellness instructor ────────────────────────────────────────────────────

/**
 * `GET /api/v1/wellness/sessions/mine` -> `{data[]}` — the instructor's OWN
 * sessions, every status and every date, each with its paid `enrolled` count.
 *
 * NOT `GET /api/v1/wellness/sessions`, which the screens used to call: that is
 * the PUBLIC catalogue, filtered to `scheduledAt >= now` and
 * `status IN ('SCHEDULED','LIVE')`. An instructor's completed, cancelled and
 * past classes are invisible to it, it carries every OTHER instructor's rows,
 * and it strips `roomUrl`.
 */
export function useInstructorSessions(options?: RawOptions) {
  const { session } = useAuth();
  const token = session?.accessToken ?? '';
  return useQuery<unknown>({
    queryKey: providerQueryKeys.instructorSessions,
    enabled: !!token,
    queryFn: () => authedJson('/api/v1/wellness/sessions/mine', token),
    ...options,
  });
}
