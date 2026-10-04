import { z } from "zod";

import { languageSchema } from "./languages.js";

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

/**
 * Mirrors `PATCH /api/v1/users/me` — the `updateProfileSchema` in
 * apps/api/src/routes/users.ts:13-27 and, through it, the `User` columns
 * (prisma/schema.prisma:172).
 *
 * The worst defect in this file, because it FAILED SILENTLY. This schema named
 * the field `displayName`; the route parses `fullName`, and a zod object
 * STRIPS unknown keys — so a rename request was accepted, answered
 * `200 {"success":true,"message":"Profile updated successfully"}`, and
 * discarded the new name. The user saw a success toast and the old name.
 * `useUpdateProfile` in @poojly/api-client is typed with it, which is why
 * apps/mobile/app/(devotee)/profile.tsx calls the endpoint by hand instead.
 *
 * Three more fields were fiction: `dateOfBirth`, `tradition` and `avatarUrl`
 * are not parsed by this route (nor is `dateOfBirth` a `User` column at all),
 * so all three were stripped too. Four that ARE parsed — `locationCity`,
 * `locationState`, `isNri`, `nriCountry` — were missing, and there is no other
 * way to set an NRI flag the whole pricing model turns on.
 *
 * Nullable where the column is: the route clears a field by receiving `null`.
 */
export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters")
    .optional(),
  email: z.string().email("Invalid email address").optional().nullable(),
  gotra: z.string().max(50).optional().nullable(),
  nakshatra: z.string().max(50).optional().nullable(),
  rashi: z.string().max(50).optional().nullable(),
  // I-11: was `z.string().min(2).max(5)`, which accepted "zz" and "zzzzz" and
  // deferred the real check to the Prisma `Language` enum — a 500 for what is
  // a 400. Derived from the one list now; see ./languages.ts.
  preferredLanguage: languageSchema.optional(),
  locationCity: z.string().max(100).optional().nullable(),
  locationState: z.string().max(100).optional().nullable(),
  isNri: z.boolean().optional(),
  nriCountry: z.string().max(100).optional().nullable(),
});

export type UpdateProfile = z.infer<typeof updateProfileSchema>;

// ─── Address ─────────────────────────────────

/**
 * Mirrors `POST /api/v1/users/me/addresses` — the `createAddressSchema` in
 * apps/api/src/routes/users.ts:29-40 and, through it, the `UserAddress` columns
 * (prisma/schema.prisma:278).
 *
 * This schema used to name four fields the route has never parsed —
 * `addressLine1`, `addressLine2`, `postalCode`, and `country` defaulting to the
 * ISO code `"IN"`. The route parses `line1`, `line2`, `pincode` and defaults
 * `country` to the NAME `"India"`, and zod strips what it does not know, so a
 * body built from this type arrived with every address field missing and the
 * route answered 400. `useCreateAddress` in @poojly/api-client is typed with
 * it, which is why apps/mobile/lib/account-api.ts hand-rolls the request today.
 *
 * `lat`/`lng` are accepted by the route and were absent here entirely.
 */
export const createAddressSchema = z.object({
  label: z
    .string()
    .min(1, "Label is required")
    .max(50, "Label must be at most 50 characters")
    .default("home"),
  line1: z
    .string()
    .min(1, "Address line 1 is required")
    .max(200, "Address line 1 is too long"),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().min(1, "City is required").max(100, "City name is too long"),
  state: z
    .string()
    .min(1, "State is required")
    .max(100, "State name is too long"),
  pincode: z
    .string()
    .min(4, "Pincode is required")
    .max(10)
    .regex(/^\d{4,10}$/, "Invalid pincode"),
  /** A country NAME, not an ISO code — this is what is persisted. */
  country: z.string().max(100).default("India"),
  isDefault: z.boolean().default(false),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
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

// ─── Languages (I-11 single source of truth) ─
export * from "./languages.js";

// ─── Reading Progress ────────────────────────
export * from "./reading-progress.js";

// ─── Delivery Address (country-aware, CM-06) ─
export * from "./delivery-address.js";
