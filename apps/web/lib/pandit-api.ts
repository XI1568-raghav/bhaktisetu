import { API_BASE_URL } from './api-config';

// ─── Types ──────────────────────────────────────────────────────────────────

// Offering.basePrice arrives as a STRING (Prisma Decimal → JSON string).
// Callers MUST parseFloat before formatting / arithmetic.
export interface Offering {
  id: string;
  priestId: string;
  name: string;
  description: string | null;
  deity: string;
  basePrice: string;
  durationMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PriestSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  languages: string[];
  specializations: string[];
  experienceYears: number;
  ratingAvg: number;
  ratingCount: number;
  isVerified: boolean;
  offeringCount: number;
}

export interface PriestWithOfferings extends PriestSummary {
  offerings: Offering[];
}

export interface CreateOfferingInput {
  name: string;
  description?: string;
  deity: string;
  basePrice: number;
  durationMinutes: number;
  isActive?: boolean;
}

export type UpdateOfferingInput = Partial<CreateOfferingInput>;

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

// ─── Pandit-side (authed) ───────────────────────────────────────────────────

export async function listMyOfferings(token: string | undefined): Promise<Offering[]> {
  const res = await fetch(`${API_BASE_URL}/priest/pujas`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await describeFailure(res, 'Failed to load pujas'));
  const data = (await res.json()) as { offerings: Offering[] };
  return data.offerings;
}

export async function createOffering(
  token: string | undefined,
  input: CreateOfferingInput,
): Promise<Offering> {
  const res = await fetch(`${API_BASE_URL}/priest/pujas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await describeFailure(res, 'Failed to create puja'));
  const data = (await res.json()) as { offering: Offering };
  return data.offering;
}

export async function updateOffering(
  token: string | undefined,
  id: string,
  input: UpdateOfferingInput,
): Promise<Offering> {
  const res = await fetch(`${API_BASE_URL}/priest/pujas/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await describeFailure(res, 'Failed to update puja'));
  const data = (await res.json()) as { offering: Offering };
  return data.offering;
}

export async function deleteOffering(
  token: string | undefined,
  id: string,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/priest/pujas/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await describeFailure(res, 'Failed to delete puja'));
}

export async function toggleOfferingActive(
  token: string | undefined,
  id: string,
): Promise<Offering> {
  const res = await fetch(`${API_BASE_URL}/priest/pujas/${id}/toggle-active`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await describeFailure(res, 'Failed to toggle puja'));
  const data = (await res.json()) as { offering: Offering };
  return data.offering;
}

// ─── Reviews ────────────────────────────────────────────────────────────────
// Review.providerId is the User UUID of the priest (NOT Priest.id) — mirrors
// the ratings.ts backend convention. Devotee name is not joined yet, so the
// UI must fall back to a generic label ("Devotee").

export interface PriestReview {
  id: string;
  userId: string;
  providerId: string;
  providerType: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export async function getMyReviews(token: string | undefined): Promise<PriestReview[]> {
  const res = await fetch(`${API_BASE_URL}/priest/reviews`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await describeFailure(res, 'Failed to load reviews'));
  const data = (await res.json()) as { reviews: PriestReview[] };
  return data.reviews ?? [];
}

// ─── Public (server-side fetch) ─────────────────────────────────────────────

export async function getPublicPriests(): Promise<PriestSummary[]> {
  const res = await fetch(`${API_BASE_URL}/priests`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { priests: PriestSummary[] };
  return data.priests ?? [];
}

// Returns null on 404 (priest not verified / not active) so the caller can
// trigger Next's notFound().
export async function getPublicPriest(id: string): Promise<PriestWithOfferings | null> {
  const res = await fetch(`${API_BASE_URL}/priests/${id}`, {
    next: { revalidate: 60 },
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return (await res.json()) as PriestWithOfferings;
}
