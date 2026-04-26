/**
 * Server-side API helper for Next.js Server Components.
 * Fetches data from the Fastify backend during SSR.
 */

// API base URL.
// - In a Next.js node SSR context: process.env.API_URL is set
// - In Cloudflare Pages (edge runtime): NEXT_PUBLIC_API_URL is what reaches the worker
// - Final fallback: the production API on Render
// The /api/v1 suffix is added when missing so callers don't have to think about it.
function resolveApiBase(): string {
 const candidate =
 process.env.API_URL ||
 process.env.NEXT_PUBLIC_API_URL ||
 'https://api.darshya.online';
 return candidate.endsWith('/api/v1') ? candidate : `${candidate.replace(/\/$/, '')}/api/v1`;
}

const API_BASE = resolveApiBase();

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

 const json = await res.json();
 return normalizePaginated(json) as T;
}

/**
 * The API returns paginated endpoints as
 * { <pluralName>: [...], total, page, limit, totalPages }
 * but the web's `PaginatedResponse<T>` shape is
 * { data: [...], pagination: { page, limit, total, totalPages } }
 * Adapt at the boundary so callers don't have to think about it.
 */
function normalizePaginated(payload: unknown): unknown {
 if (!payload || typeof payload !== 'object') return payload;
 const obj = payload as Record<string, unknown>;
 if ('data' in obj || !('total' in obj && 'page' in obj && 'limit' in obj)) {
 return payload;
 }
 // Find the array key (e.g. "temples", "pujaTypes", "data" already-normalized)
 const arrayKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
 if (!arrayKey) return payload;
 return {
 data: obj[arrayKey],
 pagination: {
 page: obj.page,
 limit: obj.limit,
 total: obj.total,
 totalPages: obj.totalPages,
 },
 };
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
 // API responds with { temple: TempleDetail }
 const res = await serverFetch<{ temple: TempleDetail }>(`/temples/${slug}`, {
 revalidate: 300,
 tags: [`temple-${slug}`],
 });
 return res.temple;
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
 // The API stores shubhMuhurat as a labeled object; the web typed it as
 // an array of { name, start, end }. Adapt at the boundary.
 const raw = await serverFetch<Omit<Panchang, 'shubhMuhurat'> & {
 shubhMuhurat: Record<string, string> | { name: string; start: string; end: string }[];
 }>('/panchang/today', { revalidate: 3600, tags: ['panchang'] });
 const sm = raw.shubhMuhurat;
 const shubhMuhurat: { name: string; start: string; end: string }[] = Array.isArray(sm)
 ? sm
 : Object.entries(sm ?? {}).map(([key, range]) => {
 const m = (range as string).match(/^([\d:]+)\s*-\s*([\d:]+)$/);
 const pretty = key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();
 return { name: pretty, start: m?.[1] ?? range as string, end: m?.[2] ?? '' };
 });
 return { ...raw, shubhMuhurat };
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
