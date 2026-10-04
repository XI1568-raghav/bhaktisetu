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
    return serverErrorMessage(await res.json(), friendly);
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
