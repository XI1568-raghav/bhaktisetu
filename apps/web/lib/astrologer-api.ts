import { API_BASE_URL } from './api-config';
import { UserFacingError, serverErrorMessage, userFacingMessage } from './friendly-error';

// ─── Types ──────────────────────────────────────────────────────────────────

// Free-form weekly availability blob. Shape decided by the UI; backend stores
// up to 64KB of JSON unmodified. See apps/api/src/routes/astrologer-portal.ts.
export type AvailabilityJson = unknown;

export interface DaySlots {
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
}

export interface WeekAvailability {
  [day: string]: DaySlots;
}

export interface AstrologerDashboard {
  profile: { availability?: AvailabilityJson } | null;
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

// ─── Availability ───────────────────────────────────────────────────────────

// Reads the AstrologerProfile.availability blob via /dashboard, which is the
// only endpoint that returns the profile today.
export async function getAvailability(
  token: string | undefined
): Promise<AvailabilityJson | null> {
  const res = await fetch(`${API_BASE_URL}/astrologer-portal/dashboard`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to load availability'), res.status);
  const data = (await res.json()) as AstrologerDashboard;
  return data.profile?.availability ?? null;
}

export async function updateAvailability(
  token: string | undefined,
  availability: AvailabilityJson
): Promise<AvailabilityJson> {
  const res = await fetch(`${API_BASE_URL}/astrologer-portal/availability`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ availability }),
  });
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to save availability'), res.status);
  const data = (await res.json()) as { availability: AvailabilityJson };
  return data.availability;
}
