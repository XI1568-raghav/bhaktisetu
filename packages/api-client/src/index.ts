// ──────────────────────────────────────────────
// @poojly/api-client — Barrel Export
// ──────────────────────────────────────────────

export { api, initApiClient, ApiClientError } from "./client.js";
export type { ApiClientConfig, RequestOptions } from "./client.js";

export {
  // Query keys
  queryKeys,
  // Temple hooks
  useTemples,
  useTemple,
  useTemplePujas,
  // Puja hooks
  usePujas,
  usePuja,
  usePujaCategories,
  // Booking hooks
  useBookings,
  useBooking,
  useCreateBooking,
  useCancelBooking,
  useCreateReview,
  // Content hooks
  useContent,
  useContentItem,
  useFeaturedContent,
  // Panchang hooks
  usePanchang,
  usePanchangByDate,
  // Darshan hooks
  useDarshan,
  useDarshanStream,
  // User hooks
  useUserProfile,
  useUpdateProfile,
  useUserAddresses,
  useCreateAddress,
} from "./hooks/index.js";

// ─── Auth hooks ──────────────────────────────
export {
  useSignInWithOtp,
  useVerifyOtp,
  useSignInWithCredentials,
  useSignUp,
  useLogout,
  useRefreshToken,
  useMe,
} from "./hooks/auth.js";

export type {
  UserRole,
  AuthUser,
  AuthSession,
  SendOtpRequest,
  SendOtpResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
  RefreshRequest,
  RefreshResponse,
  MeResponse,
} from "./hooks/auth.js";
