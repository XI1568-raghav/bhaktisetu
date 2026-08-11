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

// ─── Store hooks ─────────────────────────────
export {
  useProducts,
  useProduct,
  useCollections,
  useCart,
  useAddToCart,
  useUpdateCartItem,
  useRemoveCartItem,
  storeQueryKeys,
} from "./hooks/store.js";
export type { Product, Collection, CartItem, Cart, Order } from "./hooks/store.js";

// ─── Provider portal hooks ───────────────────
export {
  useAstrologers,
  useAstrologer,
  useHoroscope,
  useWellnessInstructors,
  useWellnessSessions,
  useWellnessPrograms,
  useGaushalas,
  useCows,
  useAdoptionPlans,
  usePriestDashboard,
  usePriestBookings,
  usePriestPayouts,
  usePriestProfile,
  useAdminDashboard,
  useAdminUsers,
  useAdminPendingApprovals,
  useAdminRevenue,
} from "./hooks/providers.js";
export type {
  Astrologer,
  WellnessInstructor,
  WellnessSession,
  WellnessProgram,
  Gaushala,
  Cow,
  AdoptionPlan,
  PriestDashboard,
  PriestBooking,
  PriestPayout,
  AdminDashboard,
  AdminUser,
} from "./hooks/providers.js";

// ─── Wave 1-4 hooks (orders, tickets, wellness v2, astrology, commissions, subs, donations) ───
export {
  useStoreOrders,
  useStoreOrder,
  useCreateStoreOrder,
  useUpdateStoreOrderStatus,
  useSupportTickets,
  useSupportTicket,
  useCreateSupportTicket,
  useUpdateSupportTicket,
  useAddTicketMessage,
  useWellnessSessionsV2,
  useWellnessSession,
  useCreateWellnessSession,
  useEnrollWellnessSession,
  useVerifyWellnessEnrollment,
  useSetWellnessRoom,
  useAstrologyConsultations,
  useUpdateConsultation,
  useStartConsultationCall,
  useAdminCommissions,
  useSubscriptionPlans,
  useMySubscription,
  useSubscribe,
  useCancelSubscription,
  useCreateDonationOrder,
  useVerifyDonation,
} from "./hooks/wave-1-4.js";

export {
  useGenerateKundli,
  useDailyHoroscope,
  useYatraPackages,
  useYatraPackage,
  useBookYatraPackage,
  useYatraList,
  useYatra,
  useFindMuhurats,
  useCreateWeddingInquiry,
  useCreateAnnualSubscription,
  useIsPremium,
} from "./hooks/wave-5.js";
export type {
  KundliInput,
  YatraPackage,
  YatraBookInput,
  YatraDestination,
  MuhuratInput,
  WeddingMuhurat,
  WeddingInquiry,
} from "./hooks/wave-5.js";


// ─── Portal dashboard hooks ─────────────────
export {
  useAstrologerDashboard,
  useStoreAdminDashboard,
  useStoreAdminReviews,
  useStoreAdminRevenue,
  useGaushalaDashboard,
  useGaushalaPortalDonations,
  useGaushalaVolunteers,
  useTempleDashboard,
  useTemplePortalDonations,
  useWellnessDashboard,
  useWellnessStudents,
} from "./hooks/portals.js";
export type {
  AstrologerDashboardResponse,
  StoreAdminDashboardResponse,
  StoreAdminReviewsResponse,
  StoreAdminRevenueResponse,
  GaushalaDashboardResponse,
  GaushalaDonationsResponse,
  GaushalaVolunteersResponse,
  TempleDashboardResponse,
  TempleDonationsResponse,
  WellnessDashboardResponse,
  WellnessStudentsResponse,
} from "./hooks/portals.js";

// ─── Consultations (new AstrologerConsultation lifecycle) ───
export {
  useMyConsultations,
  useCancelConsultation,
  consultationKeys,
} from "./hooks/consultations.js";
export type {
  ConsultationStatus,
  MyConsultation,
  MyConsultationsResponse,
  CancelConsultationResponse,
} from "./hooks/consultations.js";

// ─── Reading progress hooks ──────────────────
export {
  useReadingProgress,
  useAllReadingProgress,
  useMergeAnonReadingProgress,
  readingProgressKeys,
  __testing,
} from "./hooks/reading-progress.js";
export type { UseReadingProgressOptions } from "./hooks/reading-progress.js";
