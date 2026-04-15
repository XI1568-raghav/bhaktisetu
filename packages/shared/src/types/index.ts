// ──────────────────────────────────────────────
// @bhaktisetu/shared — Domain Types
// ──────────────────────────────────────────────

// ─── Enums ───────────────────────────────────

export enum BookingStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PRIEST_ASSIGNED = "PRIEST_ASSIGNED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
  FAILED = "FAILED",
}

export enum ContentType {
  ARTICLE = "ARTICLE",
  VIDEO = "VIDEO",
  AUDIO = "AUDIO",
  MANTRA = "MANTRA",
  AARTI = "AARTI",
  CHALISA = "CHALISA",
  STORY = "STORY",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  AUTHORIZED = "AUTHORIZED",
  CAPTURED = "CAPTURED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
}

export enum PaymentMethod {
  UPI = "UPI",
  CARD = "CARD",
  NET_BANKING = "NET_BANKING",
  WALLET = "WALLET",
  INTERNATIONAL = "INTERNATIONAL",
}

export enum PayoutStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum SubscriptionTier {
  FREE = "FREE",
  DEVOTEE = "DEVOTEE",
  PREMIUM = "PREMIUM",
  FAMILY = "FAMILY",
}

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
  PAUSED = "PAUSED",
}

export enum Tradition {
  SHAIVA = "SHAIVA",
  VAISHNAVA = "VAISHNAVA",
  SHAKTA = "SHAKTA",
  SMARTA = "SMARTA",
  GANAPATYA = "GANAPATYA",
  SAURA = "SAURA",
  BUDDHIST = "BUDDHIST",
  JAIN = "JAIN",
  SIKH = "SIKH",
}

export enum StreamStatus {
  SCHEDULED = "SCHEDULED",
  LIVE = "LIVE",
  ENDED = "ENDED",
  OFFLINE = "OFFLINE",
}

// ─── User ────────────────────────────────────

export interface UserAddress {
  id: string;
  userId: string;
  label: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  phone: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gotra?: string;
  nakshatra?: string;
  rashi?: string;
  preferredLanguage: string;
  tradition?: Tradition;
  isNri: boolean;
  country: string;
  subscriptionTier: SubscriptionTier;
  addresses: UserAddress[];
  createdAt: string;
  updatedAt: string;
}

// ─── Temple ──────────────────────────────────

export interface TemplePriest {
  id: string;
  templeId: string;
  priestId: string;
  priest: Priest;
  isHead: boolean;
  assignedSince: string;
}

export interface Temple {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  tradition: Tradition;
  deity: string;
  imageUrl: string;
  galleryUrls: string[];
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  contactPhone?: string;
  contactEmail?: string;
  websiteUrl?: string;
  openingTime: string;
  closingTime: string;
  isVerified: boolean;
  isFeatured: boolean;
  rating: number;
  totalReviews: number;
  priests: TemplePriest[];
  pujaOfferings: TemplePujaOffering[];
  liveDarshanAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Priest ──────────────────────────────────

export interface Priest {
  id: string;
  userId: string;
  user: User;
  name: string;
  slug: string;
  bio: string;
  avatarUrl?: string;
  tradition: Tradition;
  specializations: string[];
  languages: string[];
  experienceYears: number;
  rating: number;
  totalRatings: number;
  isAvailableOnline: boolean;
  isVerified: boolean;
  bankAccountId?: string;
  upiId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Puja ────────────────────────────────────

export interface PujaType {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  category: string;
  tradition: Tradition;
  deity: string;
  durationMinutes: number;
  imageUrl: string;
  benefits: string[];
  requiredSamagri: string[];
  mantraCount?: number;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplePujaOffering {
  id: string;
  templeId: string;
  temple?: Temple;
  pujaTypeId: string;
  pujaType: PujaType;
  priceInr: number;
  priceUsd: number;
  nriPriceUsd?: number;
  isAvailableOnline: boolean;
  isAvailableInPerson: boolean;
  maxDevotees: number;
  advanceBookingDays: number;
  availableDays: number[];
  availableTimeSlots: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Booking ─────────────────────────────────

export interface PujaBooking {
  id: string;
  bookingNumber: string;
  userId: string;
  user?: User;
  templeId: string;
  temple?: Temple;
  pujaTypeId: string;
  pujaType?: PujaType;
  templePujaOfferingId: string;
  templePujaOffering?: TemplePujaOffering;
  priestId?: string;
  priest?: Priest;
  status: BookingStatus;
  scheduledDate: string;
  scheduledTime?: string;
  isOnline: boolean;
  devoteeNames: string[];
  gotras: string[];
  nakshatras: string[];
  specialInstructions?: string;
  totalAmountInr: number;
  totalAmountUsd: number;
  currency: "INR" | "USD";
  prasadDeliveryAddress?: UserAddress;
  prasadDeliveryRequested: boolean;
  videoRecordingUrl?: string;
  livestreamUrl?: string;
  certificateUrl?: string;
  payment?: Payment;
  review?: BookingReview;
  cancelledAt?: string;
  cancellationReason?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingReview {
  id: string;
  bookingId: string;
  userId: string;
  templeId: string;
  priestId?: string;
  rating: number;
  title?: string;
  comment?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Payment ─────────────────────────────────

export interface Payment {
  id: string;
  bookingId: string;
  userId: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  stripePaymentIntentId?: string;
  amount: number;
  currency: "INR" | "USD";
  status: PaymentStatus;
  method?: PaymentMethod;
  receiptUrl?: string;
  refundAmount?: number;
  refundReason?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PriestPayout {
  id: string;
  priestId: string;
  priest?: Priest;
  bookingId: string;
  booking?: PujaBooking;
  amount: number;
  currency: "INR" | "USD";
  status: PayoutStatus;
  payoutMethod: "BANK_TRANSFER" | "UPI";
  transactionRef?: string;
  processedAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Content ─────────────────────────────────

export interface ContentItem {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  description?: string;
  body?: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  duration?: number;
  deity?: string;
  tradition?: Tradition;
  language: string;
  tags: string[];
  authorName?: string;
  authorAvatarUrl?: string;
  isFeatured: boolean;
  isPremium: boolean;
  viewCount: number;
  likeCount: number;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Panchang ────────────────────────────────

export interface DailyPanchang {
  id: string;
  date: string;
  tithi: string;
  tithiEndTime: string;
  nakshatra: string;
  nakshatraEndTime: string;
  yoga: string;
  yogaEndTime: string;
  karana: string;
  karanaEndTime: string;
  vara: string;
  sunrise: string;
  sunset: string;
  moonrise: string;
  moonset: string;
  rahukaal: string;
  gulikakaal: string;
  yamakandakaal: string;
  abhijitMuhurta: string;
  amritKaal: string;
  festivals: string[];
  vratas: string[];
  specialDays: string[];
  auspiciousTimings: string[];
  inauspiciousTimings: string[];
  hinduMonth: string;
  hinduYear: string;
  paksha: "SHUKLA" | "KRISHNA";
  location: string;
  createdAt: string;
}

// ─── Live Darshan ────────────────────────────

export interface LiveDarshanStream {
  id: string;
  templeId: string;
  temple?: Temple;
  title: string;
  description?: string;
  streamUrl: string;
  thumbnailUrl?: string;
  status: StreamStatus;
  viewerCount: number;
  scheduledStartTime?: string;
  actualStartTime?: string;
  endTime?: string;
  isRecordingAvailable: boolean;
  recordingUrl?: string;
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Subscription ────────────────────────────

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  priceInr: number;
  priceUsd: number;
  currency: "INR" | "USD";
  razorpaySubscriptionId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt?: string;
  features: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── API Response Types ──────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  message?: string;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
    statusCode: number;
  };
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ─── Query / Filter Types ────────────────────

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface TempleSearchParams extends PaginationParams {
  query?: string;
  city?: string;
  state?: string;
  tradition?: Tradition;
  deity?: string;
  hasLiveDarshan?: boolean;
  isFeatured?: boolean;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

export interface PujaSearchParams extends PaginationParams {
  query?: string;
  category?: string;
  tradition?: Tradition;
  deity?: string;
  templeId?: string;
  minPrice?: number;
  maxPrice?: number;
  isOnline?: boolean;
}

export interface BookingFilterParams extends PaginationParams {
  status?: BookingStatus;
  fromDate?: string;
  toDate?: string;
  templeId?: string;
}

export interface ContentFilterParams extends PaginationParams {
  type?: ContentType;
  tradition?: Tradition;
  deity?: string;
  language?: string;
  tag?: string;
  isPremium?: boolean;
}
