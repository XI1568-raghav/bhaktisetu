/**
 * Server-side API helper for Next.js Server Components.
 * Fetches data from the Fastify backend during SSR.
 */

const API_BASE = process.env.API_URL || 'http://localhost:4000/api/v1';

interface FetchOptions {
  revalidate?: number | false;
  tags?: string[];
  cache?: RequestCache;
}

async function serverFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { revalidate = 60, tags, cache } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      next: {
        revalidate: revalidate === false ? undefined : revalidate,
        tags,
      },
      cache: cache ?? (revalidate === false ? 'no-store' : undefined),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

// ─── Temple API ─────────────────────────────────────────────────

export interface TempleListItem {
  id: string;
  name: string;
  nameLocal: string | null;
  slug: string;
  description: string;
  deityPrimary: string;
  deities: string[];
  tradition: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  images: { url: string; alt: string; type: string }[];
  isVerified: boolean;
  trustScore: number;
  liveDarshanEnabled: boolean;
  status: string;
  _count?: { bookings: number };
  darshanStream?: { viewerCount: number; status: string }[];
}

export interface TempleDetail extends TempleListItem {
  addressLine: string;
  pincode: string;
  country: string;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  timingInfo: Record<string, string> | null;
  verificationDate: string | null;
  streamUrl: string | null;
  priests: {
    priest: {
      id: string;
      displayName: string;
      specializations: string[];
      ratingAvg: number;
      ratingCount: number;
      avatarUrl: string | null;
    };
    isPrimary: boolean;
  }[];
  pujaOfferings: {
    id: string;
    priceOverride: string | null;
    availableSlots: { time: string; label: string }[];
    isActive: boolean;
    pujaType: {
      id: string;
      name: string;
      slug: string;
      description: string;
      category: string;
      deity: string;
      durationMinutes: number;
      basePrice: string;
      nriPrice: string;
      images: { url: string; alt: string }[];
    };
  }[];
  darshanStream: { id: string; playbackUrl: string; status: string; viewerCount: number }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TempleReview {
  id: string;
  rating: number;
  reviewText: string | null;
  createdAt: string;
  user: { fullName: string; avatarUrl: string | null };
  pujaType: { name: string };
}

export async function getTemples(params?: {
  page?: number;
  limit?: number;
  city?: string;
  state?: string;
  tradition?: string;
  deity?: string;
  search?: string;
  liveDarshan?: boolean;
}): Promise<PaginatedResponse<TempleListItem>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.city && params.city !== 'All Cities') searchParams.set('city', params.city);
  if (params?.tradition && params.tradition !== 'All') searchParams.set('tradition', params.tradition);
  if (params?.deity) searchParams.set('deity', params.deity);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.liveDarshan) searchParams.set('liveDarshan', 'true');

  const query = searchParams.toString();
  return serverFetch<PaginatedResponse<TempleListItem>>(
    `/temples${query ? `?${query}` : ''}`,
    { revalidate: 300, tags: ['temples'] },
  );
}

export async function getTempleBySlug(slug: string): Promise<TempleDetail> {
  return serverFetch<TempleDetail>(`/temples/${slug}`, {
    revalidate: 300,
    tags: [`temple-${slug}`],
  });
}

export async function getTempleReviews(
  templeId: string,
  page = 1,
): Promise<PaginatedResponse<TempleReview>> {
  return serverFetch<PaginatedResponse<TempleReview>>(
    `/temples/${templeId}/reviews?page=${page}`,
    { revalidate: 60 },
  );
}

// ─── Puja API ───────────────────────────────────────────────────

export interface PujaType {
  id: string;
  name: string;
  nameLocal: string | null;
  slug: string;
  description: string;
  category: string;
  deity: string;
  durationMinutes: number;
  basePrice: string;
  nriPrice: string;
  samagriIncluded: boolean;
  images: { url: string; alt: string }[];
  isActive: boolean;
}

export async function getPujaTypes(params?: {
  category?: string;
  deity?: string;
  search?: string;
}): Promise<PaginatedResponse<PujaType>> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);
  if (params?.deity) searchParams.set('deity', params.deity);
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  return serverFetch<PaginatedResponse<PujaType>>(
    `/pujas/types${query ? `?${query}` : ''}`,
    { revalidate: 600, tags: ['pujas'] },
  );
}

// ─── Content API ────────────────────────────────────────────────

export interface ContentItem {
  id: string;
  type: string;
  title: string;
  titleLocal: string | null;
  slug: string;
  body: string;
  audioUrl: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  deity: string | null;
  language: string;
  durationSeconds: number | null;
  tags: string[];
  isPremium: boolean;
  viewCount: number;
  likeCount: number;
  status: string;
}

export async function getContent(params?: {
  type?: string;
  deity?: string;
  language?: string;
}): Promise<PaginatedResponse<ContentItem>> {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set('type', params.type);
  if (params?.deity) searchParams.set('deity', params.deity);
  if (params?.language) searchParams.set('language', params.language);

  const query = searchParams.toString();
  return serverFetch<PaginatedResponse<ContentItem>>(
    `/content${query ? `?${query}` : ''}`,
    { revalidate: 300, tags: ['content'] },
  );
}

/**
 * Fetch a single content item by slug from the API.
 * The API returns { content: ContentItem }.
 */
export async function getContentBySlugApi(slug: string): Promise<ContentItem> {
  const res = await serverFetch<{ content: ContentItem }>(`/content/${slug}`, {
    revalidate: 300,
    tags: [`content-${slug}`],
  });
  return res.content;
}

export async function getDailyContent(): Promise<{
  aarti: ContentItem | null;
  mantra: ContentItem | null;
  chalisa: ContentItem | null;
  article: ContentItem | null;
}> {
  return serverFetch(`/content/daily`, { revalidate: 3600, tags: ['daily-content'] });
}

// ─── Panchang API ───────────────────────────────────────────────

export interface Panchang {
  id: string;
  date: string;
  tithi: string;
  nakshatra: string;
  yoga: string;
  karana: string;
  sunrise: string;
  sunset: string;
  rahuKaal: string;
  shubhMuhurat: { name: string; start: string; end: string }[];
  festivals: string[];
  vrat: string[];
  specialInfo: string | null;
}

export async function getTodayPanchang(): Promise<Panchang> {
  return serverFetch<Panchang>('/panchang/today', { revalidate: 3600, tags: ['panchang'] });
}

export async function getUpcomingFestivals(): Promise<{
  festivals: { date: string; name: string }[];
}> {
  return serverFetch('/panchang/festivals?days=30', { revalidate: 3600, tags: ['festivals'] });
}

// ─── Darshan API ────────────────────────────────────────────────

export interface DarshanStream {
  id: string;
  templeId: string;
  playbackUrl: string;
  status: string;
  viewerCount: number;
  peakViewers: number;
  isPremium: boolean;
  scheduledStart: string | null;
  temple: {
    name: string;
    slug: string;
    city: string;
    deityPrimary: string;
    images: { url: string; alt: string }[];
  };
}

export async function getLiveDarshan(): Promise<{ streams: DarshanStream[] }> {
  return serverFetch('/darshan/live', { revalidate: 30, tags: ['darshan'] });
}

export async function getScheduledDarshan(): Promise<{ streams: DarshanStream[] }> {
  return serverFetch('/darshan/scheduled', { revalidate: 60, tags: ['darshan-scheduled'] });
}
