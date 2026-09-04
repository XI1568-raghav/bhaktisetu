/**
 * react-query bindings for the wellness marketplace.
 *
 * These live here rather than in @poojly/api-client because that package is
 * owned by another workstream and its two existing wellness hooks are both
 * mis-typed against the live route: `useWellnessSessions` declares
 * `{sessions: WellnessSession[]}` and `useWellnessSessionsV2` declares
 * `{sessions, total}`, while GET /api/v1/wellness/sessions answers `{data:[…]}`.
 * Neither has a hook for the detail route, the enrolments route or the enrol
 * POST at all.
 *
 * Shaping is deliberately NOT done here — the raw body goes to the selectors
 * in ./wellness, which are pinned field-by-field to the route handlers.
 *
 * WHY THE AUTHENTICATED READS USE A BARE `fetch`
 * ----------------------------------------------
 *   · GET /sessions/:id attaches `roomUrl` only for a caller the SERVER judges
 *     entitled, which it can only do if the request carries the bearer token.
 *     The unauthenticated `apiFetch` would silently return the same class
 *     minus the join link, which reads to the devotee as "the instructor has
 *     not published it" — a false statement about someone else's work.
 *   · The enrol POST must be classified by STATUS CODE (401 sign-in, 409 full
 *     / cancelled / already enrolled, 403 wrong role). `api.post` throws an
 *     ApiClientError and — worse for this flow — its 401 path fires the shared
 *     `onUnauthorised` handler, which signs the devotee out mid-enrolment.
 *     So the raw response is read here and handed to the pure classifier.
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { apiFetch, apiBase } from './api';

export const wellnessKeys = {
  /** Shared by the hub, the catalogue and both instructor screens. */
  classes: ['wellness', 'sessions'] as const,
  class: (id: string) => ['wellness', 'sessions', id] as const,
  myEnrolments: ['wellness', 'enrollments', 'mine'] as const,
};

type RawOptions = Omit<UseQueryOptions<unknown>, 'queryKey' | 'queryFn'>;

/** GET /api/v1/wellness/sessions — public catalogue of upcoming classes. */
export function useWellnessClasses(options?: RawOptions) {
  return useQuery<unknown>({
    queryKey: wellnessKeys.classes,
    queryFn: () => apiFetch<unknown>('/wellness/sessions'),
    ...options,
  });
}

function authHeaders(token: string | undefined): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * GET /api/v1/wellness/sessions/:id.
 *
 * Sent WITH the token when there is one, because that is the only way the
 * server can decide to include `roomUrl`.
 */
export function useWellnessClass(
  id: string | undefined,
  token: string | undefined,
  options?: RawOptions,
) {
  return useQuery<unknown>({
    queryKey: wellnessKeys.class(id ?? ''),
    enabled: typeof id === 'string' && id.length > 0,
    queryFn: async () => {
      const res = await fetch(`${apiBase()}/api/v1/wellness/sessions/${encodeURIComponent(id!)}`, {
        headers: authHeaders(token),
      });
      if (res.status === 404) throw new Error('This class could not be found.');
      if (!res.ok) throw new Error(`This class could not be loaded (${res.status}).`);
      return readJson(res);
    },
    ...options,
  });
}

/** GET /api/v1/wellness/enrollments/mine — requires a token by definition. */
export function useMyWellnessEnrolments(token: string | undefined, options?: RawOptions) {
  return useQuery<unknown>({
    queryKey: wellnessKeys.myEnrolments,
    enabled: typeof token === 'string' && token.length > 0,
    queryFn: async () => {
      const res = await fetch(`${apiBase()}/api/v1/wellness/enrollments/mine`, {
        headers: authHeaders(token),
      });
      if (!res.ok) throw new Error(`We couldn't load your classes (${res.status}).`);
      return readJson(res);
    },
    ...options,
  });
}

/**
 * POST /api/v1/wellness/sessions/:id/enroll.
 *
 * Returns the status and body verbatim; `enrolOutcome` in ./wellness decides
 * what they mean. Nothing here claims success.
 */
export async function postWellnessEnrol(
  sessionId: string,
  token: string | undefined,
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(
    `${apiBase()}/api/v1/wellness/sessions/${encodeURIComponent(sessionId)}/enroll`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    },
  );
  return { status: res.status, body: await readJson(res) };
}
