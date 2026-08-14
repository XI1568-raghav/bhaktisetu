// ──────────────────────────────────────────────
// @poojly/api-client — React Query Hooks
// ──────────────────────────────────────────────

import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";

import { api } from "../client.js";
import {
  API_ENDPOINTS,
  type Temple,
  type PujaType,
  type TemplePujaOffering,
  type PujaBooking,
  type ContentItem,
  type DailyPanchang,
  type LiveDarshanStream,
  type User,
  type ApiResponse,
  type PaginatedResponse,
  type TempleSearchParams,
  type PujaSearchParams,
  type BookingFilterParams,
  type ContentFilterParams,
  type CreateBooking,
  type CreateReview,
  type UpdateProfile,
  type CreateAddress,
  type UserAddress,
  type BookingReview,
} from "@poojly/shared";

// ─── Query Keys ──────────────────────────────

export const queryKeys = {
  temples: {
    all: ["temples"] as const,
    list: (params?: TempleSearchParams) => ["temples", "list", params] as const,
    detail: (slug: string) => ["temples", "detail", slug] as const,
    pujas: (templeId: string) => ["temples", templeId, "pujas"] as const,
  },
  pujas: {
    all: ["pujas"] as const,
    list: (params?: PujaSearchParams) => ["pujas", "list", params] as const,
    detail: (slug: string) => ["pujas", "detail", slug] as const,
    categories: ["pujas", "categories"] as const,
  },
  bookings: {
    all: ["bookings"] as const,
    list: (params?: BookingFilterParams) =>
      ["bookings", "list", params] as const,
    detail: (id: string) => ["bookings", "detail", id] as const,
  },
  content: {
    all: ["content"] as const,
    list: (params?: ContentFilterParams) =>
      ["content", "list", params] as const,
    detail: (slug: string) => ["content", "detail", slug] as const,
    featured: ["content", "featured"] as const,
  },
  panchang: {
    today: ["panchang", "today"] as const,
    byDate: (date: string) => ["panchang", date] as const,
  },
  darshan: {
    live: ["darshan", "live"] as const,
    stream: (id: string) => ["darshan", "stream", id] as const,
  },
  user: {
    profile: ["user", "profile"] as const,
    addresses: ["user", "addresses"] as const,
    subscription: ["user", "subscription"] as const,
  },
} as const;

// ─── Temple Hooks ────────────────────────────

/**
 * GET /api/v1/temples -> { temples, total, page, limit, totalPages }
 *
 * PAR-07: this was typed `PaginatedResponse<Temple>` (i.e. `{ data, meta }`),
 * an envelope the endpoint has never sent. Callers read `.data`, got
 * `undefined`, and fell back to a hardcoded five-temple mock. The type now
 * matches the wire.
 */
export interface TempleListResponse {
  temples: Temple[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useTemples(
  params?: TempleSearchParams,
  options?: Omit<UseQueryOptions<TempleListResponse>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: queryKeys.temples.list(params),
    queryFn: () =>
      api.get<TempleListResponse>(API_ENDPOINTS.TEMPLES, {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    ...options,
  });
}

export function useTemple(
  slug: string,
  options?: Omit<
    UseQueryOptions<ApiResponse<Temple>>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.temples.detail(slug),
    queryFn: () =>
      api.get<ApiResponse<Temple>>(API_ENDPOINTS.TEMPLE_BY_SLUG(slug)),
    enabled: !!slug,
    ...options,
  });
}

export function useTemplePujas(
  templeId: string,
  options?: Omit<
    UseQueryOptions<ApiResponse<TemplePujaOffering[]>>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.temples.pujas(templeId),
    queryFn: () =>
      api.get<ApiResponse<TemplePujaOffering[]>>(
        API_ENDPOINTS.TEMPLE_PUJAS(templeId)
      ),
    enabled: !!templeId,
    ...options,
  });
}

// ─── Puja Hooks ──────────────────────────────

/**
 * GET /api/v1/pujas/types -> { pujaTypes, total, page, limit, totalPages }
 *
 * PAR-07: same envelope lie as useTemples. Every row carries `basePrice` and
 * `nriPrice` as Decimal strings — the app used to claim "PujaType doesn't carry
 * price" and substitute mock rupee figures that disagreed with the website.
 */
export interface PujaTypeListResponse {
  pujaTypes: PujaType[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function usePujas(
  params?: PujaSearchParams,
  options?: Omit<UseQueryOptions<PujaTypeListResponse>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: queryKeys.pujas.list(params),
    queryFn: () =>
      api.get<PujaTypeListResponse>(API_ENDPOINTS.PUJAS, {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    ...options,
  });
}

export function usePuja(
  slug: string,
  options?: Omit<
    UseQueryOptions<ApiResponse<PujaType>>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.pujas.detail(slug),
    queryFn: () =>
      api.get<ApiResponse<PujaType>>(API_ENDPOINTS.PUJA_BY_SLUG(slug)),
    enabled: !!slug,
    ...options,
  });
}

export function usePujaCategories(
  options?: Omit<
    UseQueryOptions<ApiResponse<{ id: string; label: string; count: number }[]>>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.pujas.categories,
    queryFn: () =>
      api.get<ApiResponse<{ id: string; label: string; count: number }[]>>(
        API_ENDPOINTS.PUJA_CATEGORIES
      ),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// ─── Booking Hooks ───────────────────────────

/**
 * GET /api/v1/users/me/bookings
 *   -> { success, bookings, pagination:{page,limit,total,totalPages} }
 *
 * PAR-02: was typed `PaginatedResponse<PujaBooking>` and read as `.data`, so
 * "My Bookings" was blank for every devotee and Profile reported 0 bookings —
 * against 81 real rows for devotee@demo.com.
 */
export interface UserBookingsResponse {
  success: boolean;
  bookings: PujaBooking[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function useBookings(
  params?: BookingFilterParams,
  options?: Omit<UseQueryOptions<UserBookingsResponse>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: queryKeys.bookings.list(params),
    queryFn: () =>
      api.get<UserBookingsResponse>(API_ENDPOINTS.USER_BOOKINGS, {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    ...options,
  });
}

export function useBooking(
  id: string,
  options?: Omit<
    UseQueryOptions<ApiResponse<PujaBooking>>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.bookings.detail(id),
    queryFn: () =>
      api.get<ApiResponse<PujaBooking>>(API_ENDPOINTS.BOOKING_BY_ID(id)),
    enabled: !!id,
    ...options,
  });
}

export function useCreateBooking(
  options?: UseMutationOptions<ApiResponse<PujaBooking>, Error, CreateBooking>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBooking) =>
      api.post<ApiResponse<PujaBooking>>(API_ENDPOINTS.BOOKINGS, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    },
    ...options,
  });
}

export function useCancelBooking(
  options?: UseMutationOptions<
    ApiResponse<PujaBooking>,
    Error,
    { bookingId: string; reason?: string }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookingId, reason }) =>
      api.post<ApiResponse<PujaBooking>>(
        API_ENDPOINTS.BOOKING_CANCEL(bookingId),
        { reason }
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.detail(variables.bookingId),
      });
    },
    ...options,
  });
}

export function useCreateReview(
  options?: UseMutationOptions<ApiResponse<BookingReview>, Error, CreateReview>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReview) =>
      api.post<ApiResponse<BookingReview>>(
        API_ENDPOINTS.BOOKING_REVIEW(data.bookingId),
        data
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.detail(variables.bookingId),
      });
    },
    ...options,
  });
}

// ─── Content Hooks ───────────────────────────

export function useContent(
  params?: ContentFilterParams,
  options?: Omit<
    UseQueryOptions<PaginatedResponse<ContentItem>>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.content.list(params),
    queryFn: () =>
      api.get<PaginatedResponse<ContentItem>>(API_ENDPOINTS.CONTENT, {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    ...options,
  });
}

export function useContentItem(
  slug: string,
  options?: Omit<
    UseQueryOptions<ApiResponse<ContentItem>>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.content.detail(slug),
    queryFn: () =>
      api.get<ApiResponse<ContentItem>>(API_ENDPOINTS.CONTENT_BY_SLUG(slug)),
    enabled: !!slug,
    ...options,
  });
}

export function useFeaturedContent(
  options?: Omit<
    UseQueryOptions<ApiResponse<ContentItem[]>>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.content.featured,
    queryFn: () =>
      api.get<ApiResponse<ContentItem[]>>(API_ENDPOINTS.CONTENT_FEATURED),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

// ─── Panchang Hooks ──────────────────────────

export function usePanchang(
  options?: Omit<
    UseQueryOptions<ApiResponse<DailyPanchang>>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.panchang.today,
    queryFn: () =>
      api.get<ApiResponse<DailyPanchang>>(API_ENDPOINTS.PANCHANG_TODAY),
    staleTime: 60 * 60 * 1000, // 1 hour — panchang doesn't change often
    ...options,
  });
}

export function usePanchangByDate(
  date: string,
  options?: Omit<
    UseQueryOptions<ApiResponse<DailyPanchang>>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.panchang.byDate(date),
    queryFn: () =>
      api.get<ApiResponse<DailyPanchang>>(
        API_ENDPOINTS.PANCHANG_BY_DATE(date)
      ),
    enabled: !!date,
    staleTime: Infinity, // Historical panchang never changes
    ...options,
  });
}

// ─── Darshan Hooks ───────────────────────────

/**
 * GET /api/v1/darshan/live -> { streams, total, upcoming }
 *
 * PAR-05/PAR-07: was `ApiResponse<LiveDarshanStream[]>` read as `.data`, so the
 * Darshan tab showed eight invented streams and hid the genuinely live temple.
 * Each row nests the temple as `{name,slug,city,deityPrimary,images}`.
 */
export interface LiveDarshanRow {
  id: string;
  templeId: string;
  playbackUrl: string | null;
  status: string;
  viewerCount: number;
  peakViewers?: number;
  isPremium?: boolean;
  scheduledStart?: string | null;
  currentSlot?: string;
  endsInMin?: number;
  temple: {
    name: string;
    slug: string;
    city?: string;
    deityPrimary?: string;
    images?: string[];
  };
}

export interface DarshanLiveResponse {
  streams: LiveDarshanRow[];
  total: number;
  upcoming?: Array<{ templeSlug: string; nextSlot: string; startsInMin: number }>;
}

export function useDarshan(
  options?: Omit<UseQueryOptions<DarshanLiveResponse>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: queryKeys.darshan.live,
    queryFn: () => api.get<DarshanLiveResponse>(API_ENDPOINTS.DARSHAN_LIVE),
    refetchInterval: 30_000, // Refresh live streams every 30s
    ...options,
  });
}

/**
 * GET /api/v1/darshan/:idOrSlug/stream — FLAT, no envelope.
 *
 * PAR-05: the endpoint constant used to omit the `/stream` suffix, so this
 * 404'd on every call and re-polled the 404 every 15 seconds. `retry: false`
 * stops a genuinely-missing stream from being hammered, and the poll only runs
 * while a playable stream exists (callers pass `refetchInterval: false` once
 * they know it is offline).
 */
export interface DarshanStreamResponse {
  streamId: string;
  templeId: string;
  templeName: string;
  status: string;
  playbackUrl: string | null;
  recentVideoUrl?: string | null;
  recentVideoTitle?: string | null;
  youtubeChannelId?: string;
  thumbnailUrl: string | null;
  viewerCount: number;
  startedAt: string | null;
}

export function useDarshanStream(
  streamId: string,
  options?: Omit<UseQueryOptions<DarshanStreamResponse>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: queryKeys.darshan.stream(streamId),
    queryFn: () =>
      api.get<DarshanStreamResponse>(API_ENDPOINTS.DARSHAN_STREAM(streamId)),
    enabled: !!streamId,
    retry: false,
    refetchInterval: 15_000, // Refresh stream details every 15s
    ...options,
  });
}

// ─── User Hooks ──────────────────────────────

export function useUserProfile(
  options?: Omit<UseQueryOptions<ApiResponse<User>>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: queryKeys.user.profile,
    queryFn: () =>
      api.get<ApiResponse<User>>(API_ENDPOINTS.USER_PROFILE),
    ...options,
  });
}

export function useUpdateProfile(
  options?: UseMutationOptions<ApiResponse<User>, Error, UpdateProfile>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfile) =>
      api.patch<ApiResponse<User>>(API_ENDPOINTS.USER_UPDATE_PROFILE, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile });
    },
    ...options,
  });
}

/**
 * GET /api/v1/users/me/addresses -> { success, addresses }
 * PAR-02: was `ApiResponse<UserAddress[]>` read as `.data` -> always 0.
 */
export interface UserAddressesResponse {
  success: boolean;
  addresses: UserAddress[];
}

export function useUserAddresses(
  options?: Omit<UseQueryOptions<UserAddressesResponse>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: queryKeys.user.addresses,
    queryFn: () =>
      api.get<UserAddressesResponse>(API_ENDPOINTS.USER_ADDRESSES),
    ...options,
  });
}

export function useCreateAddress(
  options?: UseMutationOptions<ApiResponse<UserAddress>, Error, CreateAddress>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAddress) =>
      api.post<ApiResponse<UserAddress>>(API_ENDPOINTS.USER_ADDRESSES, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.addresses });
    },
    ...options,
  });
}
