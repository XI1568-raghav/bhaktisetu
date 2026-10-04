// ──────────────────────────────────────────────
// @poojly/api-client — Server error-body → ApiClientError mapping
// ──────────────────────────────────────────────

/**
 * WHY THIS MODULE EXISTS.
 *
 * `ApiClientError` used to be built from `data?.error?.message`, i.e. it
 * assumed every failure arrived as the nested `ApiError` envelope
 * (`{ error: { code, message, statusCode } }`) declared in `@poojly/shared`.
 * Not one Fastify route in `apps/api` sends that shape. The API sends FLAT
 * bodies — `data.error` is a STRING — so `.message` was always `undefined` and
 * every error in every app collapsed to "Request failed with status <n>".
 *
 * Real sentences that were being destroyed:
 *
 *   "You have ₹1,240.00 of unpaid earnings. Withdraw them (Payouts → Request
 *    payout) before deleting your account."  (services/account-deletion.service)
 *   "Finish setting up your store — add your store name — before listing
 *    products."                               (routes/store-admin.ts:208)
 *   "Insufficient stock for <id> (have 2, want 5)" (routes/store-orders.ts:226)
 *   "Cannot transition order from SHIPPED to PENDING."   (store-orders.ts:431)
 *   "You do not own this offering."                      (priest.ts:1195)
 *
 * Screens on web and mobile now bypass this client with raw `fetch` for the
 * sole purpose of keeping the server's sentence (see the header of
 * apps/mobile/lib/provider-queries.ts, which names both defects). This module
 * is the fix at the root; those workarounds become redundant rather than
 * necessary.
 *
 * ─── THE SHAPES THE API ACTUALLY SENDS ──────────────────────────────────────
 *
 * Derived by reading the handlers, not by guessing. `reply.send({ error: … })`
 * appears 691 times across apps/api/src/routes.
 *
 *   A. `{ error: "<sentence>" }`
 *      The overwhelming majority. priest.ts:440 'Booking not found.',
 *      store-orders.ts:226 'Insufficient stock for …', store-admin.ts:97
 *      'STORE_OWNER role required'. `error` IS the human sentence.
 *
 *   B. `{ error: "<sentence>", details|issues: <zod flatten()> }`
 *      priest.ts:410, store-admin.ts:116, payouts.ts:59. Same as A plus field
 *      errors. BOTH key spellings are in production use.
 *
 *   C. `{ error: "<machine label>", code?: "<CODE>", message: "<sentence>" }`
 *      account.ts:88 `{ error:'AccountDeletionBlocked', code:'UNPAID_EARNINGS',
 *      message:'You have ₹1,240.00 …' }`; store-orders.ts:253
 *      `{ error:'price_mismatch', message:'Prices changed while you were …' }`;
 *      store-admin.ts:208 `{ code:'store_profile_required',
 *      error:'Store setup incomplete', message:'Finish setting up your store …'}`.
 *      Here `message` is the sentence and `error` is the label.
 *
 *   D. `{ error: "<HTTP status name>", message: "<sentence>", code?, details? }`
 *      Fastify's own errors (`{ statusCode, code:'FST_ERR_CTP_EMPTY_JSON_BODY',
 *      error:'Bad Request', message:'Body cannot be empty …' }`),
 *      lib/i18n.ts#sendLocalizedError (`{ error:'Validation Error',
 *      message:<localized>, code:'INVALID_BODY', details: ZodIssue[] }`), and
 *      users.ts:283 `{ error:'Not Found', message:'Address not found or does
 *      not belong to you.' }`. `message` is the sentence.
 *
 *   E. A **generic `message` bolted onto a specific `error`** by
 *      plugins/error-localization.ts. Its `onSend` hook rewrites hand-built
 *      bodies: on 401/403/404/429/5xx a body carrying no `message` at all is
 *      given the catalogue sentence for its status plus that status's code
 *      (rule 5), and one of the fourteen generic "malformed request" labels
 *      gets INVALID_BODY / INVALID_QUERY (rule 4b). So
 *      `{ error:'You do not own this product.' }` reaches the client as
 *      `{ error:'You do not own this product.', message:'You do not have
 *      permission to do that.', code:'FORBIDDEN' }` — and here `message` is
 *      strictly WORSE than `error`. Deliberately, per that plugin's own
 *      contract: "It does not overwrite a bespoke 4xx message with a generic
 *      catalogue sentence."
 *
 *   F. The nested `ApiError` envelope. No route sends it, but it is the shape
 *      `@poojly/shared` declares and the shape this client's own tests use, so
 *      it stays first in line.
 *
 * ─── HOW THE MAPPER RESOLVES THEM ───────────────────────────────────────────
 *
 *   1. `error` is an OBJECT  →  the F envelope; read `.message` / `.code`.
 *   2. Only one of `error` / `message` is a usable string → that one.
 *   3. Both present:
 *      a. `error` is a MACHINE LABEL → `message`.   (C and D)
 *      b. else `code` is one of the seven catalogue codes the localizer can
 *         inject over a body that had no message → `error`.   (E)
 *      c. else → `message`.   (C with a sentence-shaped label, e.g.
 *         'Store setup incomplete')
 *   4. Nothing usable → "Request failed with status <n>", as before.
 */

/**
 * The catalogue codes plugins/error-localization.ts can attach to a body that
 * never had a `message` — `errorCodeForStatus` (401/403/404/429/other-4xx/5xx)
 * plus the two `GENERIC_REQUEST_LABELS` targets. When one of these sits next to
 * a bespoke `error` sentence, the `message` beside it is the generic the
 * localizer added and the sentence is the better answer.
 *
 * A code OUTSIDE this set (SLOT_UNAVAILABLE, KYC_REQUIRED, UNPAID_EARNINGS,
 * store_profile_required …) means the route named its own failure, so its
 * `message` is either bespoke or a translation of the same sentence — and
 * `message` wins there.
 */
const LOCALIZER_GENERIC_CODES: ReadonlySet<string> = new Set([
  "INVALID_BODY",
  "INVALID_QUERY",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
]);

/**
 * Multi-word `error` values that are developer labels rather than copy.
 *
 * Two sources, both verified: Fastify's default `error` field (the HTTP status
 * name) and apps/api/src/lib/error-i18n.ts's `GENERIC_REQUEST_LABELS` — the
 * spellings of "malformed request" the API itself classifies as carrying no
 * caller-specific content.
 *
 * Single-token values (`AccountDeletionBlocked`, `price_mismatch`,
 * `ValidationError`, `gone`) need no list; see `isMachineLabel`.
 */
const MACHINE_ERROR_LABELS: ReadonlySet<string> = new Set([
  // Fastify / HTTP status names.
  "bad request",
  "payment required",
  "not found",
  "method not allowed",
  "not acceptable",
  "request timeout",
  "payload too large",
  "unsupported media type",
  "unprocessable entity",
  "too many requests",
  "internal server error",
  "not implemented",
  "bad gateway",
  "service unavailable",
  "gateway timeout",
  // error-i18n.ts GENERIC_REQUEST_LABELS.
  "invalid input",
  "invalid body",
  "invalid request body",
  "validation error",
  "invalid query",
  "invalid query parameters",
  "invalid query parameter",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A trimmed, non-empty string, or null. */
function usableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * True when an `error` value is a developer label rather than something a
 * person should read. Single-token values always are: no sentence this API
 * writes for a caller is one word with no space in it.
 */
function isMachineLabel(label: string): boolean {
  if (!/\s/.test(label)) return true;
  return MACHINE_ERROR_LABELS.has(label.toLowerCase().replace(/\s+/g, " "));
}

export interface ResolvedApiError {
  /** `code` off the body, else `UNKNOWN_ERROR` — unchanged from before. */
  code: string;
  /** The best sentence the server sent, never a status-code placeholder. */
  message: string;
  /**
   * Whatever the route attached — zod `flatten()` under `details` OR under
   * `issues`, or `sendLocalizedError`'s `ZodIssue[]`. Deliberately `unknown`:
   * it used to be typed `Record<string, string[]>`, which none of those three
   * shapes is.
   */
  details?: unknown;
}

/**
 * Map an error response body to the fields `ApiClientError` carries.
 * Never throws; a non-object body falls back to the status sentence.
 */
export function resolveApiErrorBody(
  body: unknown,
  statusCode: number,
): ResolvedApiError {
  const fallback = `Request failed with status ${statusCode}`;
  if (!isRecord(body)) return { code: "UNKNOWN_ERROR", message: fallback };

  const rawError = body["error"];

  // 1 — the nested `ApiError` envelope (@poojly/shared).
  if (isRecord(rawError)) {
    const nestedDetails = rawError["details"];
    return {
      code: usableString(rawError["code"]) ?? "UNKNOWN_ERROR",
      message: usableString(rawError["message"]) ?? fallback,
      ...(nestedDetails !== undefined ? { details: nestedDetails } : {}),
    };
  }

  const label = usableString(rawError);
  const message = usableString(body["message"]);
  const code = usableString(body["code"]) ?? "UNKNOWN_ERROR";

  let resolved: string;
  if (label && message) {
    if (isMachineLabel(label)) {
      resolved = message;
    } else if (LOCALIZER_GENERIC_CODES.has(code)) {
      resolved = label;
    } else {
      resolved = message;
    }
  } else {
    resolved = message ?? label ?? fallback;
  }

  // Both spellings are in production use: `details` (priest.ts, store-admin.ts,
  // store-orders.ts, users.ts) and `issues` (payouts.ts, account.ts, ai.ts).
  const details = body["details"] ?? body["issues"];

  return {
    code,
    message: resolved,
    ...(details !== undefined ? { details } : {}),
  };
}
