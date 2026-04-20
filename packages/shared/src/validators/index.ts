import { z } from "zod";

// ──────────────────────────────────────────────
// @poojly/shared — Zod Validators
// ──────────────────────────────────────────────

// ─── Common Primitives ───────────────────────

const phoneRegex = /^\+?[1-9]\d{7,14}$/;
const postalCodeRegex = /^[1-9][0-9]{5}$/;

export const phoneSchema = z
  .string()
  .regex(phoneRegex, "Invalid phone number format");

export const indianPostalCodeSchema = z
  .string()
  .regex(postalCodeRegex, "Invalid Indian postal code");

// ─── Phone OTP ───────────────────────────────

export const phoneOtpRequestSchema = z.object({
  phone: phoneSchema,
  countryCode: z.string().min(1).max(4).default("+91"),
});

export const phoneOtpVerifySchema = z.object({
  phone: phoneSchema,
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
  countryCode: z.string().min(1).max(4).default("+91"),
});

export type PhoneOtpRequest = z.infer<typeof phoneOtpRequestSchema>;
export type PhoneOtpVerify = z.infer<typeof phoneOtpVerifySchema>;

// ─── User Profile ────────────────────────────

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters")
    .optional(),
  email: z.string().email("Invalid email address").optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  gotra: z.string().max(50).optional(),
  nakshatra: z.string().max(50).optional(),
  rashi: z.string().max(50).optional(),
  preferredLanguage: z.string().min(2).max(5).optional(),
  tradition: z
    .enum([
      "SHAIVA",
      "VAISHNAVA",
      "SHAKTA",
      "SMARTA",
      "GANAPATYA",
      "SAURA",
      "BUDDHIST",
      "JAIN",
      "SIKH",
    ])
    .optional(),
  avatarUrl: z.string().url("Invalid avatar URL").optional(),
});

export type UpdateProfile = z.infer<typeof updateProfileSchema>;

// ─── Address ─────────────────────────────────

export const createAddressSchema = z.object({
  label: z
    .string()
    .min(1, "Label is required")
    .max(50, "Label must be at most 50 characters"),
  addressLine1: z
    .string()
    .min(5, "Address line 1 is required")
    .max(200, "Address line 1 is too long"),
  addressLine2: z.string().max(200).optional(),
  city: z
    .string()
    .min(2, "City is required")
    .max(100, "City name is too long"),
  state: z
    .string()
    .min(2, "State is required")
    .max(100, "State name is too long"),
  postalCode: z.string().min(4, "Postal code is required").max(10),
  country: z.string().min(2).max(3).default("IN"),
  isDefault: z.boolean().default(false),
});

export type CreateAddress = z.infer<typeof createAddressSchema>;

// ─── Booking ─────────────────────────────────

export const createBookingSchema = z.object({
  templeId: z.string().uuid("Invalid temple ID"),
  pujaTypeId: z.string().uuid("Invalid puja type ID"),
  templePujaOfferingId: z.string().uuid("Invalid offering ID"),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .refine((date) => {
      const scheduled = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return scheduled >= today;
    }, "Scheduled date must be today or in the future"),
  scheduledTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format")
    .optional(),
  isOnline: z.boolean().default(false),
  devoteeNames: z
    .array(z.string().min(2, "Devotee name must be at least 2 characters"))
    .min(1, "At least one devotee name is required")
    .max(10, "Maximum 10 devotee names allowed"),
  gotras: z.array(z.string().max(50)).default([]),
  nakshatras: z.array(z.string().max(50)).default([]),
  specialInstructions: z
    .string()
    .max(500, "Special instructions must be at most 500 characters")
    .optional(),
  prasadDeliveryRequested: z.boolean().default(false),
  prasadDeliveryAddressId: z.string().uuid().optional(),
  currency: z.enum(["INR", "USD"]).default("INR"),
});

export type CreateBooking = z.infer<typeof createBookingSchema>;

// ─── Review ──────────────────────────────────

export const createReviewSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
  rating: z
    .number()
    .int()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be at most 100 characters")
    .optional(),
  comment: z
    .string()
    .min(10, "Comment must be at least 10 characters")
    .max(1000, "Comment must be at most 1000 characters")
    .optional(),
});

export type CreateReview = z.infer<typeof createReviewSchema>;

// ─── Search ──────────────────────────────────

export const searchQuerySchema = z.object({
  query: z
    .string()
    .min(1, "Search query is required")
    .max(200, "Search query is too long")
    .trim(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  category: z.string().max(50).optional(),
  tradition: z
    .enum([
      "SHAIVA",
      "VAISHNAVA",
      "SHAKTA",
      "SMARTA",
      "GANAPATYA",
      "SAURA",
      "BUDDHIST",
      "JAIN",
      "SIKH",
    ])
    .optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

// ─── Pagination ──────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
