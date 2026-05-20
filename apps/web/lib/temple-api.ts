import { API_BASE_URL } from './api-config';

// ─── Types ──────────────────────────────────────────────────────────────────
// Donation model is currently gaushala-only (schema.prisma:1080), so the
// /temple-portal/donations endpoint always returns an empty payload until a
// TempleDonation model lands. The shape below is forward-compatible with
// what we expect once the migration ships.

export interface TempleDonation {
  id: string;
  donorName: string;
  amount: string; // Decimal(10,2) → string
  purpose: string;
  paymentMethod: string;
  createdAt: string;
  isAnonymous: boolean;
  receipt: string;
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

// ─── Endpoints ──────────────────────────────────────────────────────────────

export async function getMyDonations(
  token: string | undefined,
): Promise<TempleDonation[]> {
  const res = await fetch(`${API_BASE_URL}/temple-portal/donations`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await describeFailure(res, 'Failed to load donations'));
  const data = (await res.json()) as { donations: TempleDonation[]; total: number };
  return data.donations ?? [];
}

// ─── Temple puja offerings CRUD ─────────────────────────────────────────────
// priceOverride + nriPrice arrive as STRINGS (Prisma Decimal → JSON).

export interface TemplePujaOffering {
  id: string;
  templeId: string;
  pujaTypeId: string;
  priceOverride: string | null;
  nriPrice: string | null;
  assignedPriestId: string | null;
  availableSlots: unknown;
  maxBookingsPerSlot: number;
  isActive: boolean;
}

export interface CreateTemplePujaInput {
  pujaTypeId: string;
  priceOverride?: number | null;
  nriPrice?: number | null;
  assignedPriestId?: string | null;
  availableSlots?: unknown[];
  maxBookingsPerSlot?: number;
  isActive?: boolean;
}

export type UpdateTemplePujaInput = Partial<CreateTemplePujaInput>;

export async function listTemplePujas(token: string | undefined): Promise<TemplePujaOffering[]> {
  const res = await fetch(`${API_BASE_URL}/temple-portal/pujas`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await describeFailure(res, 'Failed to load pujas'));
  const body = (await res.json()) as { offerings: TemplePujaOffering[] };
  return body.offerings;
}

export async function createTemplePuja(
  token: string | undefined,
  input: CreateTemplePujaInput,
): Promise<TemplePujaOffering> {
  const res = await fetch(`${API_BASE_URL}/temple-portal/pujas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await describeFailure(res, 'Failed to create puja'));
  const body = (await res.json()) as { offering: TemplePujaOffering };
  return body.offering;
}

export async function updateTemplePuja(
  token: string | undefined,
  id: string,
  input: UpdateTemplePujaInput,
): Promise<TemplePujaOffering> {
  const res = await fetch(`${API_BASE_URL}/temple-portal/pujas/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await describeFailure(res, 'Failed to update puja'));
  const body = (await res.json()) as { offering: TemplePujaOffering };
  return body.offering;
}

export async function deleteTemplePuja(
  token: string | undefined,
  id: string,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/temple-portal/pujas/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await describeFailure(res, 'Failed to delete puja'));
}

// ─── Darshan streams CRUD ───────────────────────────────────────────────────

export type DarshanStreamStatus = 'offline' | 'live' | 'scheduled';
export type DarshanStreamStatusPatch = 'scheduled' | 'live' | 'ended';
export type DarshanStreamProvider = 'YOUTUBE' | 'IVS' | 'EXTERNAL_RTMP';

export interface DarshanStream {
  id: string;
  templeId: string;
  streamKey: string;
  playbackUrl: string;
  status: DarshanStreamStatus;
  scheduledStart: string | null;
  actualStart: string | null;
  viewerCount: number;
  peakViewers: number;
  isPremium: boolean;
  streamProvider: DarshanStreamProvider;
  youtubeVideoId: string | null;
  youtubeChannelId: string | null;
  attribution: string | null;
  title: string | null;
  description: string | null;
  cameraLocation: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDarshanStreamInput {
  streamKey: string;
  playbackUrl: string;
  title?: string;
  description?: string;
  cameraLocation?: string;
  streamProvider?: DarshanStreamProvider;
  youtubeVideoId?: string;
  youtubeChannelId?: string;
  attribution?: string;
  scheduledStart?: string;
  isPremium?: boolean;
  status?: DarshanStreamStatus;
}

export type UpdateDarshanStreamInput = Partial<CreateDarshanStreamInput>;

export async function listDarshanStreams(token: string | undefined): Promise<DarshanStream[]> {
  const res = await fetch(`${API_BASE_URL}/temple-portal/darshan`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await describeFailure(res, 'Failed to load streams'));
  const body = (await res.json()) as { streams: DarshanStream[] };
  return body.streams;
}

export async function createDarshanStream(
  token: string | undefined,
  input: CreateDarshanStreamInput,
): Promise<DarshanStream> {
  const res = await fetch(`${API_BASE_URL}/temple-portal/darshan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await describeFailure(res, 'Failed to create stream'));
  const body = (await res.json()) as { stream: DarshanStream };
  return body.stream;
}

export async function updateDarshanStream(
  token: string | undefined,
  id: string,
  input: UpdateDarshanStreamInput,
): Promise<DarshanStream> {
  const res = await fetch(`${API_BASE_URL}/temple-portal/darshan/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await describeFailure(res, 'Failed to update stream'));
  const body = (await res.json()) as { stream: DarshanStream };
  return body.stream;
}

export async function deleteDarshanStream(
  token: string | undefined,
  id: string,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/temple-portal/darshan/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await describeFailure(res, 'Failed to delete stream'));
}

export async function setDarshanStreamStatus(
  token: string | undefined,
  id: string,
  status: DarshanStreamStatusPatch,
): Promise<DarshanStream> {
  const res = await fetch(`${API_BASE_URL}/temple-portal/darshan/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await describeFailure(res, 'Failed to update stream status'));
  const body = (await res.json()) as { stream: DarshanStream };
  return body.stream;
}

// ─── Public priests + puja types (for temple-portal form dropdowns) ─────────

export interface PublicPriestSummary {
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

export async function listPublicPriests(): Promise<PublicPriestSummary[]> {
  const res = await fetch(`${API_BASE_URL}/priests`);
  if (!res.ok) return [];
  const body = (await res.json()) as { priests: PublicPriestSummary[] };
  return body.priests ?? [];
}

export interface PujaTypeSummary {
  id: string;
  slug: string;
  name: string;
  deity?: string | null;
  category?: string | null;
}

export async function listPujaTypes(): Promise<PujaTypeSummary[]> {
  const res = await fetch(`${API_BASE_URL}/pujas/types?limit=100`);
  if (!res.ok) return [];
  const body = (await res.json()) as {
    pujaTypes?: PujaTypeSummary[];
    data?: PujaTypeSummary[];
    items?: PujaTypeSummary[];
  };
  return body.pujaTypes ?? body.data ?? body.items ?? [];
}
