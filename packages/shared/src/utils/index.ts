// ──────────────────────────────────────────────
// @poojly/shared — Utility Functions
// ──────────────────────────────────────────────

/**
 * Format a price in INR or USD with proper locale formatting.
 */
export function formatPrice(
  amount: number,
  currency: "INR" | "USD" = "INR",
  options?: { compact?: boolean }
): string {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  const notation = options?.compact ? "compact" : "standard";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation,
    minimumFractionDigits: currency === "INR" ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date string in Indian locale formats.
 */
export function formatDate(
  date: string | Date,
  format:
    | "full"
    | "long"
    | "medium"
    | "short"
    | "time"
    | "relative" = "medium"
): string {
  const d = typeof date === "string" ? new Date(date) : date;

  if (format === "relative") {
    return getRelativeTime(d);
  }

  if (format === "time") {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  }

  const options: Record<string, Intl.DateTimeFormatOptions> = {
    full: {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
    long: { year: "numeric", month: "long", day: "numeric" },
    medium: { year: "numeric", month: "short", day: "numeric" },
    short: { day: "2-digit", month: "2-digit", year: "2-digit" },
  };

  return new Intl.DateTimeFormat("en-IN", options[format]).format(d);
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return formatDate(date, "medium");
}

/**
 * Generate a unique booking number.
 * Format: BS-YYYYMMDD-XXXXX (e.g., BS-20260415-A7K3M)
 */
export function generateBookingNumber(): string {
  const now = new Date();
  const dateStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 5; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }

  return `BS-${dateStr}-${suffix}`;
}

/**
 * Detect if a user is an NRI based on their country code.
 */
export function isNriUser(country: string): boolean {
  const normalised = country.toUpperCase().trim();
  const indianCodes = new Set(["IN", "IND", "INDIA"]);
  return !indianCodes.has(normalised);
}

/**
 * Map a deity name to an icon identifier for the UI layer.
 */
export function getDeityIcon(deity: string): string {
  const mapping: Record<string, string> = {
    shiva: "trident",
    vishnu: "conch",
    krishna: "flute",
    rama: "bow",
    ganesha: "elephant",
    ganesh: "elephant",
    hanuman: "mace",
    durga: "trident-lotus",
    lakshmi: "lotus-coin",
    saraswati: "veena",
    parvati: "lotus",
    kali: "sword",
    surya: "sun",
    kartikeya: "spear",
    murugan: "spear",
    ayyappa: "bell",
    jagannath: "chariot",
    venkateswara: "conch",
    balaji: "conch",
    buddha: "wheel",
    mahavir: "hand",
  };

  return mapping[deity.toLowerCase()] ?? "om";
}

/**
 * Convert a string to a URL-friendly slug.
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

/**
 * Truncate text to a given length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1).trimEnd() + "\u2026";
}

/**
 * Build URL search params from an object, omitting undefined/null values.
 */
export function buildQueryString(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Capitalise the first letter of each word.
 */
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Parse a HH:MM time string into hours and minutes.
 */
export function parseTime(time: string): { hours: number; minutes: number } {
  const parts = time.split(":").map(Number);
  return { hours: parts[0] ?? 0, minutes: parts[1] ?? 0 };
}

/**
 * Calculate the price for a booking based on devotee count and NRI status.
 */
export function calculateBookingPrice(
  basePrice: number,
  devoteeCount: number,
  isNri: boolean,
  nriMultiplier: number = 1.5,
  discountPercent: number = 0
): number {
  let total = basePrice * devoteeCount;
  if (isNri) {
    total *= nriMultiplier;
  }
  if (discountPercent > 0) {
    total -= total * (discountPercent / 100);
  }
  return Math.round(total * 100) / 100;
}
