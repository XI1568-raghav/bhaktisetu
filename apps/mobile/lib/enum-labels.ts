/**
 * CM-10 (prod sweep 2026-08-12) — the one place that turns a STORED value into
 * the words someone reads on a phone.
 *
 * The finding is "raw enum values like special_occasion are shown to
 * customers". It was measured on the web storefront and closed there by
 * apps/web/lib/puja-labels.ts (the `puja_types.category` column) and
 * apps/web/lib/enum-labels.ts (everything else on the web). Nobody had measured
 * the Expo app, and it was worse: a sweep of apps/mobile/app on 2026-08-20
 * found 36 render sites across 26 screens printing a database identifier into
 * visible text. A devotee's own booking list said `pending_payment` and
 * `priest_assigned`; an astrologer's earnings said `PENDING`; the wellness tab
 * said `YOGA`; admin screens said `WELLNESS_INSTRUCTOR` and
 * `bhakti_pass_monthly`.
 *
 * THE RULE
 * --------
 * A value that came out of the database reaches a `<Text>` only through a
 * function in this file. `lib/__tests__/enum-labels.cm10.test.ts` sweeps
 * apps/mobile/app and fails on any screen that skips it, so the rule survives
 * the next screen rather than depending on whoever writes it remembering.
 *
 * `humanizeEnum` is the floor: a member added to the schema tomorrow and never
 * mapped here still renders as "Some New Member", never as `some_new_member`.
 * That is why every map below is a lookup with a fallback and not a
 * `Record<Enum, string>` — an exhaustive type would turn a new DB member into a
 * compile error in the app, which is not where that mistake should surface.
 *
 * WHY NOT SHARE apps/web/lib/enum-labels.ts
 * -----------------------------------------
 * Different columns and different copy. The web module covers a puja SLUG map
 * and Sanskrit-lesson levels; this one covers booking/payout/payment status,
 * roles, plans and the wellness and support enums that only the app renders.
 * The two overlap in exactly one function (`humanizeEnum`, ~10 lines) and
 * neither app can import the other's `lib/` — apps/mobile resolves through
 * Metro and apps/web through Next, and the shared packages are the seam
 * between them. Duplicating ten lines beats adding a package boundary for
 * them.
 */

/**
 * Title-case a snake_case, kebab-case, SCREAMING_SNAKE or already-spaced
 * identifier.
 *
 * Guaranteed never to return a string containing `_` or `-`: this is the last
 * line of defence for values nobody has written a label for. An already-human
 * string is returned unchanged in substance ("Daily Routine" stays "Daily
 * Routine"), which matters because `app/(devotee)/wellness.tsx` puts both
 * hand-written display strings and an API enum into one `category` field.
 */
export function humanizeEnum(value: string | null | undefined): string {
  if (!value) return '';
  const words = value
    .trim()
    .split(/[_\-\s]+/)
    .filter(Boolean);
  if (words.length === 0) return '';
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Look a value up in a map that may be keyed in either case.
 *
 * The API is not consistent about this — Prisma enums are lowercase
 * (`BookingStatus.pending_payment`) or SCREAMING (`UserRole.DEVOTEE`) depending
 * on when they were written, and some routes echo a value they received rather
 * than one they read. Trying the literal key, then lower, then upper means a
 * screen never has to know which.
 */
function lookup(map: Readonly<Record<string, string>>, value: string | null | undefined): string {
  if (!value) return '';
  const raw = value.trim();
  if (!raw) return '';
  return map[raw] ?? map[raw.toLowerCase()] ?? map[raw.toUpperCase()] ?? humanizeEnum(raw);
}

// ─── money and fulfilment ───────────────────────────────────────────────────

/** `BookingStatus` — the pill on every booking list, devotee and provider. */
export const BOOKING_STATUS_LABELS: Readonly<Record<string, string>> = Object.freeze({
  pending_payment: 'Payment pending',
  confirmed: 'Confirmed',
  priest_assigned: 'Pandit assigned',
  in_progress: 'In progress',
  completed: 'Completed',
  video_uploaded: 'Video ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
});

export function bookingStatusLabel(status: string | null | undefined): string {
  return lookup(BOOKING_STATUS_LABELS, status);
}

/**
 * `PayoutStatus` / `ProviderPayoutStatus` / `PayoutRequestStatus` — three
 * enums, one vocabulary, one pill. `completed` reads as "Paid" because that is
 * the question a pandit is actually asking the screen.
 */
export const PAYOUT_STATUS_LABELS: Readonly<Record<string, string>> = Object.freeze({
  pending: 'Awaiting payout',
  processing: 'Processing',
  completed: 'Paid',
  failed: 'Failed',
  rejected: 'Rejected',
  reversed: 'Reversed',
});

export function payoutStatusLabel(status: string | null | undefined): string {
  return lookup(PAYOUT_STATUS_LABELS, status);
}

/** `PaymentStatus`. `captured` is gateway vocabulary; a person reads "Paid". */
export const PAYMENT_STATUS_LABELS: Readonly<Record<string, string>> = Object.freeze({
  initiated: 'Started',
  authorized: 'Authorised',
  captured: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  partially_refunded: 'Partly refunded',
});

export function paymentStatusLabel(status: string | null | undefined): string {
  return lookup(PAYMENT_STATUS_LABELS, status);
}

/** `CommissionStatus`. */
export const COMMISSION_STATUS_LABELS: Readonly<Record<string, string>> = Object.freeze({
  PENDING: 'Pending',
  PAID: 'Paid',
  REVERSED: 'Reversed',
});

export function commissionStatusLabel(status: string | null | undefined): string {
  return lookup(COMMISSION_STATUS_LABELS, status);
}

/**
 * `PriestVerificationStatus`, `PriestStatus` and `TempleStatus` — one operator
 * vocabulary for the admin approvals queue. Kept apart from
 * `applicationStatusLabel` because the audiences differ: an operator wants
 * "Rejected", a family reading its own gurukul application does not.
 */
export const APPROVAL_STATUS_LABELS: Readonly<Record<string, string>> = Object.freeze({
  pending: 'Pending',
  pending_review: 'Pending review',
  approved: 'Approved',
  verified: 'Verified',
  rejected: 'Rejected',
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
});

export function approvalStatusLabel(status: string | null | undefined): string {
  return lookup(APPROVAL_STATUS_LABELS, status);
}

/** `TransactionStatus` on the admin ledger. */
export const TRANSACTION_STATUS_LABELS: Readonly<Record<string, string>> = Object.freeze({
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
});

export function transactionStatusLabel(status: string | null | undefined): string {
  return lookup(TRANSACTION_STATUS_LABELS, status);
}

/** `TransactionType` on the admin ledger. */
export const TRANSACTION_TYPE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  BOOKING: 'Booking',
  SUBSCRIPTION: 'Subscription',
  PAYOUT: 'Payout',
});

export function transactionTypeLabel(type: string | null | undefined): string {
  return lookup(TRANSACTION_TYPE_LABELS, type);
}

// ─── people and plans ───────────────────────────────────────────────────────

/**
 * `UserRole` and `ProviderRole`. These are the values that read worst raw:
 * `WELLNESS_INSTRUCTOR` in an approvals queue looks like the software leaked.
 */
export const USER_ROLE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  DEVOTEE: 'Devotee',
  PANDIT: 'Pandit',
  STORE_OWNER: 'Store owner',
  ASTROLOGER: 'Astrologer',
  WELLNESS_INSTRUCTOR: 'Wellness instructor',
  GAUSHALA_MANAGER: 'Gaushala manager',
  TEMPLE_MANAGER: 'Temple manager',
  ADMIN: 'Admin',
});

export function userRoleLabel(role: string | null | undefined): string {
  return lookup(USER_ROLE_LABELS, role);
}

/**
 * `SubscriptionPlan` (devotee) and `MarketplacePlan` (provider). A price-book
 * id is not a product name — `bhakti_pass_monthly` is two facts joined by an
 * underscore, and the middot keeps them two facts.
 */
export const SUBSCRIPTION_PLAN_LABELS: Readonly<Record<string, string>> = Object.freeze({
  bhakti_pass_monthly: 'Bhakti Pass · Monthly',
  bhakti_pass_yearly: 'Bhakti Pass · Yearly',
  nri_premium_monthly: 'NRI Premium · Monthly',
  nri_premium_yearly: 'NRI Premium · Yearly',
  bhakti_pass: 'Bhakti Pass',
  premium: 'Premium',
  FREE: 'Free',
  BASIC: 'Basic',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
});

export function subscriptionPlanLabel(plan: string | null | undefined): string {
  return lookup(SUBSCRIPTION_PLAN_LABELS, plan);
}

/** `SubscriptionStatus` / `MarketplaceSubscriptionStatus`. */
export const SUBSCRIPTION_STATUS_LABELS: Readonly<Record<string, string>> = Object.freeze({
  active: 'Active',
  cancelled: 'Cancelled',
  expired: 'Expired',
  past_due: 'Payment overdue',
});

export function subscriptionStatusLabel(status: string | null | undefined): string {
  return lookup(SUBSCRIPTION_STATUS_LABELS, status);
}

// ─── catalogue ──────────────────────────────────────────────────────────────

/**
 * `PujaCategory` — the column CM-10 measured. The web owns the same map in
 * lib/puja-labels.ts; the wording here is copied from it rather than reinvented
 * so the app and the site describe one catalogue the same way.
 */
export const PUJA_CATEGORY_LABELS: Readonly<Record<string, string>> = Object.freeze({
  daily: 'Daily rituals',
  special_occasion: 'Special occasions',
  planetary: 'Planetary remedies',
  prosperity: 'Prosperity',
  health: 'Health & healing',
  memorial: 'Ancestral rites',
  festival: 'Festivals',
});

export function pujaCategoryLabel(category: string | null | undefined): string {
  return lookup(PUJA_CATEGORY_LABELS, category);
}

/** `ContentType`. `video_reel` is the only member that needed a map at all. */
export const CONTENT_TYPE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  aarti: 'Aarti',
  chalisa: 'Chalisa',
  mantra: 'Mantra',
  bhajan: 'Bhajan',
  story: 'Story',
  article: 'Article',
  shloka: 'Shloka',
  video_reel: 'Video reel',
});

export function contentTypeLabel(type: string | null | undefined): string {
  return lookup(CONTENT_TYPE_LABELS, type);
}

/** `StreamStatus`. */
export const STREAM_STATUS_LABELS: Readonly<Record<string, string>> = Object.freeze({
  offline: 'Offline',
  live: 'Live now',
  scheduled: 'Scheduled',
});

export function streamStatusLabel(status: string | null | undefined): string {
  return lookup(STREAM_STATUS_LABELS, status);
}

// ─── wellness ───────────────────────────────────────────────────────────────

/** `WellnessSessionType`. */
export const WELLNESS_SESSION_TYPE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  YOGA: 'Yoga',
  MEDITATION: 'Meditation',
  VIPASSANA: 'Vipassana',
  PRANAYAMA: 'Pranayama',
  OTHER: 'Other',
});

export function wellnessSessionTypeLabel(type: string | null | undefined): string {
  return lookup(WELLNESS_SESSION_TYPE_LABELS, type);
}

/** `WellnessSessionStatus`. */
export const WELLNESS_SESSION_STATUS_LABELS: Readonly<Record<string, string>> = Object.freeze({
  SCHEDULED: 'Scheduled',
  LIVE: 'Live now',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
});

export function wellnessSessionStatusLabel(status: string | null | undefined): string {
  return lookup(WELLNESS_SESSION_STATUS_LABELS, status);
}

// ─── astrology ──────────────────────────────────────────────────────────────

/** Consultation medium. "call" alone does not say which kind of call. */
export const CONSULTATION_TYPE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  chat: 'Chat',
  call: 'Voice call',
  video: 'Video call',
});

export function consultationTypeLabel(type: string | null | undefined): string {
  return lookup(CONSULTATION_TYPE_LABELS, type);
}

/** Consultation lifecycle. Mirrors booking vocabulary on purpose. */
export const CONSULTATION_STATUS_LABELS: Readonly<Record<string, string>> = Object.freeze({
  pending_payment: 'Payment pending',
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
});

export function consultationStatusLabel(status: string | null | undefined): string {
  return lookup(CONSULTATION_STATUS_LABELS, status);
}

// ─── store and support ──────────────────────────────────────────────────────

/** `StoreOrderStatus`. `PROCESSING` is what the warehouse calls packing. */
export const STORE_ORDER_STATUS_LABELS: Readonly<Record<string, string>> = Object.freeze({
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Packing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
});

export function storeOrderStatusLabel(status: string | null | undefined): string {
  return lookup(STORE_ORDER_STATUS_LABELS, status);
}

/** `SupportTicketStatus`. */
export const SUPPORT_TICKET_STATUS_LABELS: Readonly<Record<string, string>> = Object.freeze({
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
});

export function supportTicketStatusLabel(status: string | null | undefined): string {
  return lookup(SUPPORT_TICKET_STATUS_LABELS, status);
}

/** `SupportTicketCategory`. */
export const SUPPORT_TICKET_CATEGORY_LABELS: Readonly<Record<string, string>> = Object.freeze({
  BOOKING: 'Booking',
  PAYMENT: 'Payment',
  ACCOUNT: 'Account',
  TECHNICAL: 'Technical',
  OTHER: 'Other',
});

export function supportTicketCategoryLabel(category: string | null | undefined): string {
  return lookup(SUPPORT_TICKET_CATEGORY_LABELS, category);
}

// ─── gurukul ────────────────────────────────────────────────────────────────

/**
 * Gurukul application lifecycle. `rejected` is softened to "Not accepted"
 * because this pill is read by the applicant's own family, not by an operator.
 */
export const APPLICATION_STATUS_LABELS: Readonly<Record<string, string>> = Object.freeze({
  pending: 'Under review',
  accepted: 'Accepted',
  rejected: 'Not accepted',
  withdrawn: 'Withdrawn',
  waitlisted: 'Waitlisted',
});

export function applicationStatusLabel(status: string | null | undefined): string {
  return lookup(APPLICATION_STATUS_LABELS, status);
}
