import { API_BASE_URL } from './api-config';

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
  try {
    const body = (await res.json()) as { message?: string; error?: string };
    const detail = body.message ?? body.error;
    return detail ? `${fallback} (${res.status}): ${detail}` : `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
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
  if (!res.ok) throw new Error(await describeFailure(res, 'Failed to load availability'));
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
  if (!res.ok) throw new Error(await describeFailure(res, 'Failed to save availability'));
  const data = (await res.json()) as { availability: AvailabilityJson };
  return data.availability;
}
