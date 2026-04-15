// ──────────────────────────────────────────────
// @bhaktisetu/shared — Constants
// ──────────────────────────────────────────────

// ─── Booking Statuses ────────────────────────

export const BOOKING_STATUSES = {
  PENDING: {
    label: "Pending",
    color: "#F59E0B",
    bgColor: "#FEF3C7",
    description: "Booking is awaiting confirmation",
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "#3B82F6",
    bgColor: "#DBEAFE",
    description: "Booking has been confirmed",
  },
  PRIEST_ASSIGNED: {
    label: "Priest Assigned",
    color: "#8B5CF6",
    bgColor: "#EDE9FE",
    description: "A priest has been assigned for your puja",
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "#10B981",
    bgColor: "#D1FAE5",
    description: "Puja is currently being performed",
  },
  COMPLETED: {
    label: "Completed",
    color: "#059669",
    bgColor: "#A7F3D0",
    description: "Puja has been completed successfully",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "#EF4444",
    bgColor: "#FEE2E2",
    description: "Booking has been cancelled",
  },
  REFUNDED: {
    label: "Refunded",
    color: "#6B7280",
    bgColor: "#F3F4F6",
    description: "Payment has been refunded",
  },
  FAILED: {
    label: "Failed",
    color: "#DC2626",
    bgColor: "#FEE2E2",
    description: "Booking failed due to an error",
  },
} as const;

export type BookingStatusKey = keyof typeof BOOKING_STATUSES;

// ─── Puja Categories ─────────────────────────

export const PUJA_CATEGORIES = [
  { id: "graha-shanti", label: "Graha Shanti", icon: "planet" },
  { id: "devi-puja", label: "Devi Puja", icon: "lotus" },
  { id: "shiva-puja", label: "Shiva Puja", icon: "trident" },
  { id: "vishnu-puja", label: "Vishnu Puja", icon: "conch" },
  { id: "ganesh-puja", label: "Ganesh Puja", icon: "elephant" },
  { id: "navagraha", label: "Navagraha Puja", icon: "stars" },
  { id: "satyanarayan", label: "Satyanarayan Puja", icon: "om" },
  { id: "rudrabhishek", label: "Rudrabhishek", icon: "water" },
  { id: "homam-havan", label: "Homam / Havan", icon: "fire" },
  { id: "marriage", label: "Vivah Sanskar", icon: "rings" },
  { id: "griha-pravesh", label: "Griha Pravesh", icon: "home" },
  { id: "namkaran", label: "Namkaran", icon: "baby" },
  { id: "mundan", label: "Mundan", icon: "scissors" },
  { id: "annaprashan", label: "Annaprashan", icon: "bowl" },
  { id: "shraddha", label: "Shraddha / Pind Daan", icon: "pray" },
  { id: "kaal-sarp", label: "Kaal Sarp Dosh Nivaran", icon: "snake" },
  { id: "mangal-dosh", label: "Mangal Dosh Nivaran", icon: "shield" },
  { id: "vastu-shanti", label: "Vastu Shanti", icon: "compass" },
  { id: "lakshmi-puja", label: "Lakshmi Puja", icon: "coin" },
  { id: "saraswati-puja", label: "Saraswati Puja", icon: "book" },
] as const;

// ─── Traditions ──────────────────────────────

export const TRADITIONS = [
  {
    id: "SHAIVA",
    label: "Shaivism",
    labelHi: "\u0936\u0948\u0935",
    deity: "Shiva",
    color: "#1E40AF",
  },
  {
    id: "VAISHNAVA",
    label: "Vaishnavism",
    labelHi: "\u0935\u0948\u0937\u094D\u0923\u0935",
    deity: "Vishnu",
    color: "#047857",
  },
  {
    id: "SHAKTA",
    label: "Shaktism",
    labelHi: "\u0936\u093E\u0915\u094D\u0924",
    deity: "Devi",
    color: "#DC2626",
  },
  {
    id: "SMARTA",
    label: "Smartism",
    labelHi: "\u0938\u094D\u092E\u093E\u0930\u094D\u0924",
    deity: "Pancha Devata",
    color: "#D97706",
  },
  {
    id: "GANAPATYA",
    label: "Ganapatya",
    labelHi: "\u0917\u093E\u0923\u092A\u0924\u094D\u092F",
    deity: "Ganesha",
    color: "#EA580C",
  },
  {
    id: "SAURA",
    label: "Saura",
    labelHi: "\u0938\u094C\u0930",
    deity: "Surya",
    color: "#CA8A04",
  },
  {
    id: "BUDDHIST",
    label: "Buddhist",
    labelHi: "\u092C\u094C\u0926\u094D\u0927",
    deity: "Buddha",
    color: "#7C3AED",
  },
  {
    id: "JAIN",
    label: "Jain",
    labelHi: "\u091C\u0948\u0928",
    deity: "Tirthankara",
    color: "#0891B2",
  },
  {
    id: "SIKH",
    label: "Sikh",
    labelHi: "\u0938\u093F\u0916",
    deity: "Waheguru",
    color: "#EA580C",
  },
] as const;

// ─── Languages ───────────────────────────────

export const LANGUAGES = [
  { code: "hi", label: "Hindi", native: "\u0939\u093F\u0928\u094D\u0926\u0940" },
  { code: "en", label: "English", native: "English" },
  { code: "ta", label: "Tamil", native: "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD" },
  { code: "te", label: "Telugu", native: "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41" },
  { code: "kn", label: "Kannada", native: "\u0C95\u0CA8\u0CCD\u0CA8\u0CA1" },
  { code: "ml", label: "Malayalam", native: "\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02" },
  { code: "mr", label: "Marathi", native: "\u092E\u0930\u093E\u0920\u0940" },
  { code: "gu", label: "Gujarati", native: "\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0" },
  { code: "bn", label: "Bengali", native: "\u09AC\u09BE\u0982\u09B2\u09BE" },
  { code: "pa", label: "Punjabi", native: "\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40" },
  { code: "or", label: "Odia", native: "\u0B13\u0B21\u0B3C\u0B3F\u0B06" },
  { code: "sa", label: "Sanskrit", native: "\u0938\u0902\u0938\u094D\u0915\u0943\u0924\u092E\u094D" },
] as const;

// ─── Subscription Plans ──────────────────────

export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: "FREE",
    name: "Free",
    nameHi: "\u0928\u093F\u0903\u0936\u0941\u0932\u094D\u0915",
    priceInr: 0,
    priceUsd: 0,
    billingPeriod: null,
    features: [
      "Browse temples & pujas",
      "Daily panchang",
      "Limited content access",
      "Book pujas (standard pricing)",
    ],
    limits: {
      bookingsPerMonth: 2,
      liveDarshanMinutesPerDay: 15,
      contentAccessLevel: "basic",
    },
  },
  DEVOTEE: {
    id: "DEVOTEE",
    name: "Devotee",
    nameHi: "\u092D\u0915\u094D\u0924",
    priceInr: 199,
    priceUsd: 4.99,
    billingPeriod: "monthly" as const,
    features: [
      "Everything in Free",
      "Unlimited live darshan",
      "Priority puja booking",
      "5% discount on pujas",
      "Ad-free experience",
      "HD video recordings of pujas",
    ],
    limits: {
      bookingsPerMonth: 10,
      liveDarshanMinutesPerDay: -1,
      contentAccessLevel: "standard",
    },
  },
  PREMIUM: {
    id: "PREMIUM",
    name: "Premium",
    nameHi: "\u092A\u094D\u0930\u0940\u092E\u093F\u092F\u092E",
    priceInr: 499,
    priceUsd: 9.99,
    billingPeriod: "monthly" as const,
    features: [
      "Everything in Devotee",
      "All premium content",
      "10% discount on pujas",
      "Free prasad delivery (2/month)",
      "Personal priest consultation",
      "Exclusive festivals coverage",
    ],
    limits: {
      bookingsPerMonth: -1,
      liveDarshanMinutesPerDay: -1,
      contentAccessLevel: "premium",
    },
  },
  FAMILY: {
    id: "FAMILY",
    name: "Family",
    nameHi: "\u092A\u0930\u093F\u0935\u093E\u0930",
    priceInr: 799,
    priceUsd: 14.99,
    billingPeriod: "monthly" as const,
    features: [
      "Everything in Premium",
      "Up to 6 family members",
      "15% discount on pujas",
      "Free prasad delivery (5/month)",
      "Family panchang & reminders",
      "Dedicated support",
    ],
    limits: {
      bookingsPerMonth: -1,
      liveDarshanMinutesPerDay: -1,
      contentAccessLevel: "premium",
      familyMembers: 6,
    },
  },
} as const;

// ─── API Endpoints ───────────────────────────

export const API_ENDPOINTS = {
  // Auth
  AUTH_REQUEST_OTP: "/api/v1/auth/otp/request",
  AUTH_VERIFY_OTP: "/api/v1/auth/otp/verify",
  AUTH_REFRESH_TOKEN: "/api/v1/auth/refresh",
  AUTH_LOGOUT: "/api/v1/auth/logout",

  // User
  USER_PROFILE: "/api/v1/users/me",
  USER_UPDATE_PROFILE: "/api/v1/users/me",
  USER_ADDRESSES: "/api/v1/users/me/addresses",
  USER_BOOKINGS: "/api/v1/users/me/bookings",
  USER_SUBSCRIPTION: "/api/v1/users/me/subscription",

  // Temples
  TEMPLES: "/api/v1/temples",
  TEMPLE_BY_SLUG: (slug: string) => `/api/v1/temples/${slug}` as const,
  TEMPLE_PUJAS: (templeId: string) =>
    `/api/v1/temples/${templeId}/pujas` as const,
  TEMPLE_REVIEWS: (templeId: string) =>
    `/api/v1/temples/${templeId}/reviews` as const,
  TEMPLE_DARSHAN: (templeId: string) =>
    `/api/v1/temples/${templeId}/darshan` as const,

  // Pujas
  PUJAS: "/api/v1/pujas",
  PUJA_BY_SLUG: (slug: string) => `/api/v1/pujas/${slug}` as const,
  PUJA_CATEGORIES: "/api/v1/pujas/categories",

  // Bookings
  BOOKINGS: "/api/v1/bookings",
  BOOKING_BY_ID: (id: string) => `/api/v1/bookings/${id}` as const,
  BOOKING_CANCEL: (id: string) => `/api/v1/bookings/${id}/cancel` as const,
  BOOKING_REVIEW: (id: string) => `/api/v1/bookings/${id}/review` as const,

  // Payments
  PAYMENT_CREATE_ORDER: "/api/v1/payments/create-order",
  PAYMENT_VERIFY: "/api/v1/payments/verify",
  PAYMENT_BY_BOOKING: (bookingId: string) =>
    `/api/v1/payments/booking/${bookingId}` as const,

  // Content
  CONTENT: "/api/v1/content",
  CONTENT_BY_SLUG: (slug: string) => `/api/v1/content/${slug}` as const,
  CONTENT_FEATURED: "/api/v1/content/featured",

  // Panchang
  PANCHANG_TODAY: "/api/v1/panchang/today",
  PANCHANG_BY_DATE: (date: string) => `/api/v1/panchang/${date}` as const,

  // Live Darshan
  DARSHAN_LIVE: "/api/v1/darshan/live",
  DARSHAN_STREAM: (streamId: string) =>
    `/api/v1/darshan/${streamId}` as const,

  // Search
  SEARCH: "/api/v1/search",

  // Priests (admin)
  PRIESTS: "/api/v1/priests",
  PRIEST_BY_ID: (id: string) => `/api/v1/priests/${id}` as const,
} as const;

// ─── Misc Constants ──────────────────────────

export const MAX_DEVOTEE_NAMES = 10;
export const MAX_BOOKING_ADVANCE_DAYS = 90;
export const MIN_BOOKING_ADVANCE_HOURS = 4;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const OTP_LENGTH = 6;
export const OTP_EXPIRY_SECONDS = 300;
export const MAX_FILE_SIZE_MB = 5;
export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Puducherry",
  "Chandigarh",
] as const;
