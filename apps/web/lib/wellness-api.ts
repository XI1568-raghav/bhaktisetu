import { API_BASE_URL, DATA_FETCH_TIMEOUT_MS, fetchWithTimeout } from './api-config';
import { UserFacingError, serverErrorMessage, userFacingMessage } from './friendly-error';

// ─── Types ──────────────────────────────────────────────────────────────────
// Mirrors the /wellness-portal/students response — one row per devotee,
// collapsed from the raw enrollments. `lastSession.scheduledAt` arrives as
// an ISO string (Prisma DateTime → JSON).

export interface WellnessStudentSession {
  id: string;
  title: string;
  scheduledAt: string;
}

export interface WellnessStudent {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  sessionCount: number;
  lastEnrolledAt: string;
  lastSession: WellnessStudentSession;
  hasAttended: boolean;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function authHeaders(token: string | undefined): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function describeFailure(res: Response, fallback: string): Promise<string> {
  // RES-09: the server's own sentence when it wrote one worth reading, else
  // friendly copy for the status. Never `fallback (HTTP status): raw detail`.
  const friendly = userFacingMessage(new Error(`HTTP ${res.status}`), fallback);
  try {
    const msg = serverErrorMessage(await res.json(), friendly);
    // Fastify's own 404 ("Route GET:/api/v1/... not found") means the server we reached does not
    // have this endpoint yet. That is a deployment gap, not something a user can act on or read.
    if (/^Route [A-Z]+:\S* not found$/.test(msg)) {
      return `${fallback}. This feature is not available on our server yet; please try again later.`;
    }
    return msg;
  } catch {
    return friendly;
  }
}

// ─── Endpoints ──────────────────────────────────────────────────────────────

export async function getMyStudents(
  token: string | undefined,
): Promise<WellnessStudent[]> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/wellness-portal/students`, {
    headers: authHeaders(token),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to load students'), res.status);
  const data = (await res.json()) as { students: WellnessStudent[]; total: number };
  return data.students ?? [];
}

// ─── Sessions CRUD ──────────────────────────────────────────────────────────
// Backed by /api/v1/wellness/sessions (apps/api/src/routes/wellness-sessions.ts).
// priceInr arrives as a STRING (Prisma Decimal → JSON). Number() before
// arithmetic.

export type WellnessSessionType = 'YOGA' | 'MEDITATION' | 'VIPASSANA' | 'PRANAYAMA' | 'OTHER';
export type WellnessSessionStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';

export interface WellnessSession {
  id: string;
  instructorId: string;
  title: string;
  description: string;
  type: WellnessSessionType;
  scheduledAt: string;
  durationMinutes: number;
  capacity: number;
  priceInr: string;
  status: WellnessSessionStatus;
  roomUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  enrolled?: number;
}

export interface CreateWellnessSessionInput {
  title: string;
  description: string;
  type: WellnessSessionType;
  scheduledAt: string;
  durationMinutes: number;
  capacity: number;
  priceInr: number;
}

export type UpdateWellnessSessionInput = Partial<CreateWellnessSessionInput> & {
  status?: WellnessSessionStatus;
};

export async function listMySessions(token: string | undefined): Promise<WellnessSession[]> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/wellness/sessions/mine`, {
    headers: authHeaders(token),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to load sessions'), res.status);
  const body = (await res.json()) as { data: WellnessSession[] };
  return body.data;
}

export async function createWellnessSession(
  token: string | undefined,
  input: CreateWellnessSessionInput,
): Promise<WellnessSession> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/wellness/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(input),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to create session'), res.status);
  const body = (await res.json()) as { data: WellnessSession };
  return body.data;
}

export async function updateWellnessSession(
  token: string | undefined,
  id: string,
  input: UpdateWellnessSessionInput,
): Promise<WellnessSession> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/wellness/sessions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(input),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to update session'), res.status);
  const body = (await res.json()) as { data: WellnessSession };
  return body.data;
}

export async function deleteWellnessSession(
  token: string | undefined,
  id: string,
): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/wellness/sessions/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to delete session'), res.status);
}

// Wellness revamp (2026-08-05): the /sessions/:id/room endpoint existed but the
// portal had NO way to call it — the live-class room URL was unreachable except
// by curl. This wires it so an instructor can set their Jitsi room from the UI.
export async function setWellnessSessionRoom(
  token: string | undefined,
  id: string,
  roomUrl: string,
): Promise<WellnessSession> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/wellness/sessions/${id}/room`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ roomUrl }),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to set room URL'), res.status);
  const body = (await res.json()) as { data: WellnessSession };
  return body.data;
}

// ─── Cancellation + roster + attendance ─────────────────────────────────────
// Backed by routes/wellness-sessions.ts. The cancel and attendance endpoints
// answer 409 with a machine `code`; callers map those to copy in
// lib/wellness-cancel.ts, so these helpers throw a typed error carrying both.

export class WellnessApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: { error?: string; code?: string } | null,
  ) {
    super(message);
    this.name = 'WellnessApiError';
  }
}

async function jsonOrNull(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export interface WellnessRosterRow {
  id: string;
  status: 'PAID' | 'ATTENDED' | string;
  enrolledAt: string;
  attendedAt: string | null;
  user: { id: string; fullName: string | null };
}

export async function getSessionRoster(
  token: string | undefined,
  sessionId: string,
): Promise<WellnessRosterRow[]> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/wellness/sessions/${sessionId}/enrollments`, {
    headers: authHeaders(token),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to load the roster'), res.status);
  const body = (await res.json()) as { data: WellnessRosterRow[] };
  return body.data ?? [];
}

export async function markEnrolmentAttended(
  token: string | undefined,
  enrollmentId: string,
): Promise<{ earningsReleased?: boolean }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/wellness/enrollments/${enrollmentId}/attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: '{}',
  }, DATA_FETCH_TIMEOUT_MS);
  const body = await jsonOrNull(res);
  if (!res.ok) {
    throw new WellnessApiError('attendance failed', res.status, body as { error?: string; code?: string } | null);
  }
  return { earningsReleased: (body as { earningsReleased?: boolean } | null)?.earningsReleased };
}

export async function cancelWellnessEnrolment(
  token: string | undefined,
  enrollmentId: string,
): Promise<import('./wellness-cancel').EnrolmentCancelResponse> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/wellness/enrollments/${enrollmentId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: '{}',
  }, DATA_FETCH_TIMEOUT_MS);
  const body = await jsonOrNull(res);
  if (!res.ok) {
    throw new WellnessApiError('cancel failed', res.status, body as { error?: string; code?: string } | null);
  }
  return (body ?? {}) as import('./wellness-cancel').EnrolmentCancelResponse;
}

export async function cancelWellnessSessionWithRefunds(
  token: string | undefined,
  id: string,
): Promise<{ session: WellnessSession; cancellation?: { released?: number; refunded?: number; refundOwedInr?: number } }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/wellness/sessions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ status: 'CANCELLED' }),
  }, DATA_FETCH_TIMEOUT_MS);
  const body = await jsonOrNull(res);
  if (!res.ok) {
    throw new UserFacingError(
      serverErrorMessage(body, 'We could not cancel that session. Please try again.'),
      res.status,
    );
  }
  const b = body as { data: WellnessSession; cancellation?: { released?: number; refunded?: number; refundOwedInr?: number } };
  return { session: b.data, cancellation: b.cancellation };
}
