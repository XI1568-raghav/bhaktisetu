import { z } from "zod";

// ──────────────────────────────────────────────────────────────────────────
// Delivery address — country-aware validation shared by web and API
// ──────────────────────────────────────────────────────────────────────────
//
// CM-06 (2026-08-13, P0). The prasad delivery address was validated with two
// India-only regexes duplicated on both sides of the wire:
//
//   pincode: /^\d{6}$/        phone: /^[6-9]\d{9}$/
//
// A Hoboken ZIP (07030), a London postcode (SW1A 1AA) and a US mobile
// (+1 201 555 0123) each failed the web form AND returned HTTP 400 from
// POST /bookings/create-order. NRI is the cohort the pricing doctrine is built
// on, so the highest-value buyer could not check out.
//
// This module is the single source of truth so the two layers cannot drift
// again — the dominant failure mode in this codebase is relaxing one side and
// leaving the other behind.
//
// Scope note: this is address/phone plumbing ONLY. Billing remains INR through
// Razorpay for every country. Nothing here selects, converts or quotes a
// foreign currency — that was RV-01 (an ~83x overcharge from treating a
// price-level multiplier as an FX rate) and it stays deleted. A real
// multi-currency rail is an owner-gated gateway decision, not a validation fix.

/** Rules for one delivery destination. Only non-default fields are set. */
export interface DeliveryCountry {
  /** ISO 3166-1 alpha-2. */
  readonly code: string;
  /** Human name — this is what is persisted to UserAddress.country. */
  readonly name: string;
  /** E.164 country calling code, leading '+'. */
  readonly dialCode: string;
  /**
   * Postal-code shape. `null` means the country has no postal-code system at
   * all (UAE, Hong Kong, Qatar, Fiji), so the field must be allowed to be
   * empty. `undefined` means "has postcodes, but we do not assert a precise
   * shape" — the generic 3-10 alphanumeric bound applies.
   */
  readonly postalPattern?: RegExp | null;
  /** UI label + placeholder help. */
  readonly postalLabel?: string;
  readonly postalExample?: string;
  /** True when a state/province/emirate is genuinely part of the postal address. */
  readonly stateRequired?: boolean;
  readonly stateLabel?: string;
  /**
   * Shape of a *national* (dial-code-less) number. Used only when the devotee
   * types a local number without a '+'. Anything with a '+' is validated as
   * plain E.164 instead.
   */
  readonly nationalPhonePattern?: RegExp;
  readonly phoneExample?: string;
}

// Generic fallbacks, applied when a country does not override them.
const GENERIC_POSTAL = /^[A-Za-z0-9][A-Za-z0-9 -]{1,9}$/;
const GENERIC_NATIONAL_PHONE = /^\d{5,14}$/;

const UK_POSTCODE =
  /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/;
const CA_POSTCODE = /^[ABCEGHJ-NPRSTVXYabceghj-nprstvxy]\d[A-Za-z]\s?\d[A-Za-z]\d$/;
const NANP_NATIONAL = /^[2-9]\d{2}[2-9]\d{6}$/; // US + Canada, 10 digits

/**
 * Delivery destinations, India first. Deliberately 50+ entries so the
 * homepage's "Book from 40+ countries" is a true statement rather than a
 * decorative one — see CM-11 on hardcoded trust numbers.
 */
export const DELIVERY_COUNTRIES: readonly DeliveryCountry[] = [
  {
    code: "IN",
    name: "India",
    dialCode: "+91",
    postalPattern: /^[1-9]\d{5}$/,
    postalLabel: "Pincode",
    postalExample: "110001",
    stateRequired: true,
    stateLabel: "State",
    nationalPhonePattern: /^[6-9]\d{9}$/,
    phoneExample: "9876543210",
  },
  {
    code: "US",
    name: "United States",
    dialCode: "+1",
    postalPattern: /^\d{5}(-\d{4})?$/,
    postalLabel: "ZIP code",
    postalExample: "07030",
    stateRequired: true,
    stateLabel: "State",
    nationalPhonePattern: NANP_NATIONAL,
    phoneExample: "+1 201 555 0123",
  },
  {
    code: "GB",
    name: "United Kingdom",
    dialCode: "+44",
    postalPattern: UK_POSTCODE,
    postalLabel: "Postcode",
    postalExample: "SW1A 1AA",
    stateLabel: "County (optional)",
    nationalPhonePattern: /^0?\d{9,10}$/,
    phoneExample: "+44 7700 900123",
  },
  {
    code: "CA",
    name: "Canada",
    dialCode: "+1",
    postalPattern: CA_POSTCODE,
    postalLabel: "Postal code",
    postalExample: "M5V 3L9",
    stateRequired: true,
    stateLabel: "Province",
    nationalPhonePattern: NANP_NATIONAL,
    phoneExample: "+1 416 555 0199",
  },
  {
    code: "AU",
    name: "Australia",
    dialCode: "+61",
    postalPattern: /^\d{4}$/,
    postalExample: "2000",
    stateRequired: true,
    stateLabel: "State / Territory",
    nationalPhonePattern: /^0?\d{9}$/,
    phoneExample: "+61 412 345 678",
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    dialCode: "+971",
    // The UAE has no postal-code system. Requiring one is the same class of
    // bug as requiring a 6-digit Indian pincode.
    postalPattern: null,
    stateLabel: "Emirate (optional)",
    nationalPhonePattern: /^0?\d{8,9}$/,
    phoneExample: "+971 50 123 4567",
  },
  {
    code: "SG",
    name: "Singapore",
    dialCode: "+65",
    postalPattern: /^\d{6}$/,
    postalExample: "048616",
    nationalPhonePattern: /^[689]\d{7}$/,
    phoneExample: "+65 8123 4567",
  },
  { code: "MY", name: "Malaysia", dialCode: "+60", postalPattern: /^\d{5}$/, postalExample: "50450" },
  {
    code: "NZ",
    name: "New Zealand",
    dialCode: "+64",
    postalPattern: /^\d{4}$/,
    postalExample: "1010",
  },
  { code: "ZA", name: "South Africa", dialCode: "+27", postalPattern: /^\d{4}$/, postalExample: "2196" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", postalPattern: /^\d{5}(-\d{4})?$/ },
  { code: "QA", name: "Qatar", dialCode: "+974", postalPattern: null },
  { code: "KW", name: "Kuwait", dialCode: "+965", postalPattern: /^\d{5}$/ },
  { code: "OM", name: "Oman", dialCode: "+968", postalPattern: /^\d{3}$/ },
  { code: "BH", name: "Bahrain", dialCode: "+973", postalPattern: /^\d{3,4}$/ },
  { code: "DE", name: "Germany", dialCode: "+49", postalPattern: /^\d{5}$/ },
  { code: "FR", name: "France", dialCode: "+33", postalPattern: /^\d{5}$/ },
  { code: "NL", name: "Netherlands", dialCode: "+31", postalPattern: /^\d{4}\s?[A-Za-z]{2}$/ },
  { code: "IE", name: "Ireland", dialCode: "+353" },
  { code: "IT", name: "Italy", dialCode: "+39", postalPattern: /^\d{5}$/ },
  { code: "ES", name: "Spain", dialCode: "+34", postalPattern: /^\d{5}$/ },
  { code: "PT", name: "Portugal", dialCode: "+351", postalPattern: /^\d{4}(-\d{3})?$/ },
  { code: "CH", name: "Switzerland", dialCode: "+41", postalPattern: /^\d{4}$/ },
  { code: "AT", name: "Austria", dialCode: "+43", postalPattern: /^\d{4}$/ },
  { code: "BE", name: "Belgium", dialCode: "+32", postalPattern: /^\d{4}$/ },
  { code: "SE", name: "Sweden", dialCode: "+46", postalPattern: /^\d{3}\s?\d{2}$/ },
  { code: "NO", name: "Norway", dialCode: "+47", postalPattern: /^\d{4}$/ },
  { code: "DK", name: "Denmark", dialCode: "+45", postalPattern: /^\d{4}$/ },
  { code: "FI", name: "Finland", dialCode: "+358", postalPattern: /^\d{5}$/ },
  { code: "PL", name: "Poland", dialCode: "+48", postalPattern: /^\d{2}-?\d{3}$/ },
  { code: "CZ", name: "Czechia", dialCode: "+420", postalPattern: /^\d{3}\s?\d{2}$/ },
  { code: "JP", name: "Japan", dialCode: "+81", postalPattern: /^\d{3}-?\d{4}$/ },
  { code: "KR", name: "South Korea", dialCode: "+82", postalPattern: /^\d{5}$/ },
  { code: "HK", name: "Hong Kong", dialCode: "+852", postalPattern: null },
  { code: "CN", name: "China", dialCode: "+86", postalPattern: /^\d{6}$/ },
  { code: "TH", name: "Thailand", dialCode: "+66", postalPattern: /^\d{5}$/ },
  { code: "ID", name: "Indonesia", dialCode: "+62", postalPattern: /^\d{5}$/ },
  { code: "PH", name: "Philippines", dialCode: "+63", postalPattern: /^\d{4}$/ },
  { code: "VN", name: "Vietnam", dialCode: "+84", postalPattern: /^\d{5,6}$/ },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", postalPattern: /^\d{5}$/ },
  { code: "NP", name: "Nepal", dialCode: "+977", postalPattern: /^\d{5}$/ },
  { code: "BD", name: "Bangladesh", dialCode: "+880", postalPattern: /^\d{4}$/ },
  { code: "PK", name: "Pakistan", dialCode: "+92", postalPattern: /^\d{5}$/ },
  { code: "MU", name: "Mauritius", dialCode: "+230" },
  { code: "KE", name: "Kenya", dialCode: "+254", postalPattern: /^\d{5}$/ },
  { code: "TZ", name: "Tanzania", dialCode: "+255", postalPattern: /^\d{5}$/ },
  { code: "UG", name: "Uganda", dialCode: "+256", postalPattern: null },
  { code: "NG", name: "Nigeria", dialCode: "+234", postalPattern: /^\d{6}$/ },
  { code: "FJ", name: "Fiji", dialCode: "+679", postalPattern: null },
  { code: "IL", name: "Israel", dialCode: "+972", postalPattern: /^\d{5,7}$/ },
  { code: "TR", name: "Turkey", dialCode: "+90", postalPattern: /^\d{5}$/ },
  { code: "RU", name: "Russia", dialCode: "+7", postalPattern: /^\d{6}$/ },
  { code: "BR", name: "Brazil", dialCode: "+55", postalPattern: /^\d{5}-?\d{3}$/, stateRequired: true },
  { code: "MX", name: "Mexico", dialCode: "+52", postalPattern: /^\d{5}$/, stateRequired: true },
  { code: "AR", name: "Argentina", dialCode: "+54" },
];

export const DEFAULT_DELIVERY_COUNTRY = "IN";

const BY_CODE: ReadonlyMap<string, DeliveryCountry> = new Map(
  DELIVERY_COUNTRIES.map((c) => [c.code, c]),
);

export function getDeliveryCountry(code: string | undefined | null): DeliveryCountry | undefined {
  if (!code) return BY_CODE.get(DEFAULT_DELIVERY_COUNTRY);
  return BY_CODE.get(code.trim().toUpperCase());
}

export function isSupportedDeliveryCountry(code: string | undefined | null): boolean {
  return getDeliveryCountry(code) !== undefined;
}

/** The value persisted to UserAddress.country (a name, not a code). */
export function deliveryCountryName(code: string | undefined | null): string {
  return getDeliveryCountry(code)?.name ?? "India";
}

export function postalCodeLabel(code: string | undefined | null): string {
  const c = getDeliveryCountry(code);
  if (!c) return "Postal code";
  if (c.postalPattern === null) return "Postal code (not used here)";
  return c.postalLabel ?? "Postal code";
}

export function stateLabel(code: string | undefined | null): string {
  return getDeliveryCountry(code)?.stateLabel ?? "State / Province";
}

export function isStateRequired(code: string | undefined | null): boolean {
  return getDeliveryCountry(code)?.stateRequired === true;
}

export function isPostalCodeRequired(code: string | undefined | null): boolean {
  const c = getDeliveryCountry(code);
  return c ? c.postalPattern !== null : true;
}

// ─── Phone ────────────────────────────────────────────────────────────────

/** Strip the punctuation humans type: spaces, dots, dashes, parens, NBSP. */
function stripPhonePunctuation(raw: string): string {
  return raw.replace(/[\s .\-()/]/g, "");
}

/**
 * Normalise to E.164 (`+` + 8..15 digits, first digit non-zero).
 *
 * - `+…` / `00…` are treated as already-international and are NOT forced to
 *   match the delivery country. An NRI in New Jersey whose reachable number is
 *   still their Indian mobile is a real, common case; rejecting it would just
 *   re-create the bug in the other direction.
 * - a bare national number is prefixed with the selected country's dial code.
 *
 * Returns null when the input cannot be a valid E.164 number.
 */
export function normalizePhoneToE164(
  raw: string | undefined | null,
  countryCode?: string | null,
): string | null {
  if (typeof raw !== "string") return null;
  let s = stripPhonePunctuation(raw.trim());
  if (!s) return null;

  if (s.startsWith("00")) s = `+${s.slice(2)}`;

  if (s.startsWith("+")) {
    const digits = s.slice(1);
    if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
    return `+${digits}`;
  }

  if (!/^\d+$/.test(s)) return null;

  const country = getDeliveryCountry(countryCode);
  if (!country) return null;

  const national = country.nationalPhonePattern ?? GENERIC_NATIONAL_PHONE;
  if (!national.test(s)) return null;

  // Trunk prefix: a local "07700900123" is "+447700900123", not "+4407700…".
  const trunkStripped = s.length > 1 && s.startsWith("0") ? s.slice(1) : s;
  const e164 = `${country.dialCode}${trunkStripped}`;
  if (!/^\+[1-9]\d{7,14}$/.test(e164)) return null;
  return e164;
}

/** Returns a human error message, or null when the phone is acceptable. */
export function validateDeliveryPhone(
  raw: string | undefined | null,
  countryCode?: string | null,
): string | null {
  const value = (raw ?? "").trim();
  if (!value) return "Phone is required";
  if (normalizePhoneToE164(value, countryCode) === null) {
    const c = getDeliveryCountry(countryCode);
    const example = c?.phoneExample ?? `${c?.dialCode ?? "+91"} …`;
    return `Enter a valid phone number for ${c?.name ?? "this country"} (e.g. ${example}), or include the country code`;
  }
  return null;
}

// ─── Postal code ──────────────────────────────────────────────────────────

/** Returns a human error message, or null when the postal code is acceptable. */
export function validatePostalCode(
  raw: string | undefined | null,
  countryCode?: string | null,
): string | null {
  const country = getDeliveryCountry(countryCode);
  if (!country) return "Select a delivery country first";

  const value = (raw ?? "").trim();

  if (country.postalPattern === null) {
    // No postal-code system: empty is correct, but if they typed something
    // keep it sane rather than silently accepting a paragraph.
    if (!value) return null;
    return GENERIC_POSTAL.test(value) ? null : `Enter a valid ${postalCodeLabel(country.code).toLowerCase()}`;
  }

  const label = country.postalLabel ?? "postal code";
  if (!value) return `${label} is required`;

  const pattern = country.postalPattern ?? GENERIC_POSTAL;
  if (!pattern.test(value)) {
    const eg = country.postalExample ? ` (e.g. ${country.postalExample})` : "";
    return `Enter a valid ${label.toLowerCase()} for ${country.name}${eg}`;
  }
  return null;
}

/** Returns a human error message, or null when the state/province is acceptable. */
export function validateStateProvince(
  raw: string | undefined | null,
  countryCode?: string | null,
): string | null {
  const value = (raw ?? "").trim();
  if (value.length > 100) return "State / Province is too long";
  if (!value && isStateRequired(countryCode)) {
    return `${stateLabel(countryCode)} is required`;
  }
  return null;
}

// ─── Zod schema (the API's half of the contract) ──────────────────────────

export const deliveryAddressSchema = z
  .object({
    fullName: z.string().trim().min(1, "Name is required").max(120),
    line1: z.string().trim().min(1, "Address line 1 is required").max(200),
    line2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(1, "City is required").max(100),
    // state/pincode are validated per-country in superRefine below — a base
    // .min(1) here would hard-block Singapore and Dubai all over again.
    state: z.string().trim().max(100).default(""),
    pincode: z.string().trim().max(16).default(""),
    phone: z.string().trim().min(1, "Phone is required").max(24),
    country: z
      .string()
      .trim()
      .default(DEFAULT_DELIVERY_COUNTRY)
      .transform((c) => (c ? c.toUpperCase() : DEFAULT_DELIVERY_COUNTRY))
      .refine(isSupportedDeliveryCountry, {
        message: "We do not deliver prasad to that country yet",
      }),
  })
  .superRefine((val, ctx) => {
    const stateErr = validateStateProvince(val.state, val.country);
    if (stateErr) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["state"], message: stateErr });
    }
    const postalErr = validatePostalCode(val.pincode, val.country);
    if (postalErr) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pincode"], message: postalErr });
    }
    const phoneErr = validateDeliveryPhone(val.phone, val.country);
    if (phoneErr) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: phoneErr });
    }
  })
  .transform((val) => ({
    ...val,
    // Store one canonical form so the courier/priest can dial it from anywhere.
    phone: normalizePhoneToE164(val.phone, val.country) ?? val.phone,
  }));

export type DeliveryAddressInput = z.input<typeof deliveryAddressSchema>;
export type DeliveryAddress = z.output<typeof deliveryAddressSchema>;

// ─── Prasad delivery is India-only (owner decision, 2026-10-06) ───────────
//
// The generic delivery contract above stays country-aware (it is also the
// address shape for billing/contact data), but PRASAD DELIVERY is shipped
// within India only. A booking without prasad stays open to NRIs anywhere:
// they simply do not tick the prasad box. Every prasad entry point (web wizard,
// mobile wizard, POST /bookings/create-order, /from-offering, /book) uses the
// helpers below so the rule cannot be relaxed on one side only.

/** The one sentence shown to devotees, and returned in the API's 400 body. */
export const PRASAD_INDIA_ONLY_NOTE = "Prasad is delivered within India only.";

export const PRASAD_INDIA_ONLY_MESSAGE =
  "Prasad is delivered within India only. Use an Indian delivery address with a 6-digit pincode, or book without prasad delivery.";

const INDIAN_PINCODE = /^\d{6}$/;

function isIndiaCountry(raw: unknown): boolean {
  if (raw == null) return true; // the schema default is India
  if (typeof raw !== "string") return false;
  const c = raw.trim().toUpperCase();
  return c === "" || c === "IN" || c === "INDIA";
}

/** Returns PRASAD_INDIA_ONLY_MESSAGE when the address cannot take prasad, else null. */
export function prasadAddressProblem(
  addr: { country?: unknown; pincode?: unknown } | null | undefined,
): string | null {
  if (!addr) return null;
  if (!isIndiaCountry(addr.country)) return PRASAD_INDIA_ONLY_MESSAGE;
  const pin = typeof addr.pincode === "string" ? addr.pincode.trim() : "";
  if (!INDIAN_PINCODE.test(pin)) return PRASAD_INDIA_ONLY_MESSAGE;
  return null;
}
