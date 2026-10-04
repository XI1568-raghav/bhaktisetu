import { API_BASE_URL, DATA_FETCH_TIMEOUT_MS, fetchWithTimeout } from './api-config';
import { UserFacingError, serverErrorMessage, userFacingMessage } from './friendly-error';

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

export async function getMyDonations(
  token: string | undefined,
): Promise<TempleDonation[]> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/temple-portal/donations`, {
    headers: authHeaders(token),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to load donations'), res.status);
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
  const res = await fetchWithTimeout(`${API_BASE_URL}/temple-portal/pujas`, {
    headers: authHeaders(token),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to load pujas'), res.status);
  const body = (await res.json()) as { offerings: TemplePujaOffering[] };
  return body.offerings;
}

/**
 * S-06 (prod sweep 2026-08-12): a bare `{offerings: []}` looked identical
 * whether the manager had no offerings or no linked Temple at all — and every
 * create in the second case 409s. GET /temple-portal/pujas now also returns
 * `templeLinked` plus a human `message`, so the page can name the blocker
 * instead of rendering an empty list that reads as "nothing added yet".
 */
export interface TemplePujaListResult {
  offerings: TemplePujaOffering[];
  templeLinked: boolean;
  /** Present only when templeLinked is false. */
  linkMessage?: string;
}

export async function listTemplePujasWithLinkState(
  token: string | undefined,
): Promise<TemplePujaListResult> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/temple-portal/pujas`, {
    headers: authHeaders(token),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to load pujas'), res.status);
  const body = (await res.json()) as {
    offerings?: TemplePujaOffering[];
    templeLinked?: boolean;
    message?: string;
  };
  return {
    offerings: body.offerings ?? [],
    // Absent means an older API build that predates the flag; treat as linked
    // so the blocker banner is never shown on a false positive.
    templeLinked: body.templeLinked !== false,
    linkMessage: body.message,
  };
}

export async function createTemplePuja(
  token: string | undefined,
  input: CreateTemplePujaInput,
): Promise<TemplePujaOffering> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/temple-portal/pujas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(input),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to create puja'), res.status);
  const body = (await res.json()) as { offering: TemplePujaOffering };
  return body.offering;
}

export async function updateTemplePuja(
  token: string | undefined,
  id: string,
  input: UpdateTemplePujaInput,
): Promise<TemplePujaOffering> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/temple-portal/pujas/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(input),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to update puja'), res.status);
  const body = (await res.json()) as { offering: TemplePujaOffering };
  return body.offering;
}

export async function deleteTemplePuja(
  token: string | undefined,
  id: string,
): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/temple-portal/pujas/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to delete puja'), res.status);
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
  const res = await fetchWithTimeout(`${API_BASE_URL}/temple-portal/darshan`, {
    headers: authHeaders(token),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to load streams'), res.status);
  const body = (await res.json()) as { streams: DarshanStream[] };
  return body.streams;
}

export async function createDarshanStream(
  token: string | undefined,
  input: CreateDarshanStreamInput,
): Promise<DarshanStream> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/temple-portal/darshan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(input),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to create stream'), res.status);
  const body = (await res.json()) as { stream: DarshanStream };
  return body.stream;
}

export async function updateDarshanStream(
  token: string | undefined,
  id: string,
  input: UpdateDarshanStreamInput,
): Promise<DarshanStream> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/temple-portal/darshan/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(input),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to update stream'), res.status);
  const body = (await res.json()) as { stream: DarshanStream };
  return body.stream;
}

export async function deleteDarshanStream(
  token: string | undefined,
  id: string,
): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/temple-portal/darshan/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to delete stream'), res.status);
}

export async function setDarshanStreamStatus(
  token: string | undefined,
  id: string,
  status: DarshanStreamStatusPatch,
): Promise<DarshanStream> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/temple-portal/darshan/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ status }),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to update stream status'), res.status);
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
  const res = await fetchWithTimeout(`${API_BASE_URL}/priests`, {}, DATA_FETCH_TIMEOUT_MS);
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
  const res = await fetchWithTimeout(`${API_BASE_URL}/pujas/types?limit=100`, {}, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) return [];
  const body = (await res.json()) as {
    pujaTypes?: PujaTypeSummary[];
    data?: PujaTypeSummary[];
    items?: PujaTypeSummary[];
  };
  return body.pujaTypes ?? body.data ?? body.items ?? [];
}
