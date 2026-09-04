/**
 * I-04 / I18N-03 — turn the error catalogue on by default.
 *
 * THE FINDING. `src/lib/error-i18n.ts` holds a complete five-language
 * catalogue: 30 codes × 5 languages = 150 authored strings, with a working
 * Accept-Language parser next to them. Exactly two call sites in the entire API
 * used it (both in routes/bookings.ts), reaching three of the thirty codes.
 * Every other error response — 756 of 758 — answered in English no matter what
 * the caller asked for. The strings were not missing; the wiring was.
 *
 * AND THE WIRING WAS STILL MISSING AFTER THE FIRST PASS. This plugin, the
 * catalogue, the resolver and a green suite all shipped, and production was
 * still English. Probing api.darshya.online on 2026-08-16 with
 * `Accept-Language: hi`:
 *
 *   GET  /api/v1/temples/__no_such__  ->  {"error":"Temple not found"}
 *   POST /api/v1/auth/login  body {}  ->  {"error":"ValidationError","message":"Required"}
 *
 * Two causes, both now closed:
 *
 *   a. src/server.ts never called this module — it still had the inline
 *      `setErrorHandler`. Pinned by error-localization.wiring.test.ts.
 *   b. Even called, the onSend hook bailed unless the body contained `"code"`.
 *      Routes do not throw and do not attach codes; they
 *      `return reply.code(404).send({ error: 'Temple not found' })`, 892 times
 *      across ~90 files. The pre-filter excluded essentially all of them.
 *
 * WHAT THIS PLUGIN DOES. It installs the error serializer, so localization is
 * a property of the pipeline rather than something each route has to remember:
 *
 *   1. `setErrorHandler` — every thrown error is redacted (unchanged: the rules
 *      in lib/error-redaction.ts still decide what a client may see) and then
 *      localized.
 *   2. `onSend` — the error bodies routes build by hand. This is the half that
 *      matters in production; see planErrorLocalization for the five shapes it
 *      recognizes and why each is safe to rewrite. 522 of the 892 hand-built
 *      bodies now localize.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not overwrite a bespoke 4xx
 * message with a generic catalogue sentence. "Refunds are only allowed up to
 * 24 hours before the scheduled time." is more useful to a caller than a
 * translated "The request body is invalid.", and lib/error-redaction.ts's
 * contract — a 4xx message is written for the caller and is kept — is locked by
 * error-redaction.test.ts. The 291 bodies that carry such wording stay English
 * until someone authors translations for them; that is a translation task, not
 * a wiring one, and this module is the wrong place to fake it.
 *
 * It also never rewrites `error`. That field is the machine label clients
 * switch on (apps/web/lib/friendly-error.ts, ~700 assertions in this suite);
 * only `message` changes language, with `code` added so a caller can branch.
 *
 * HOW IT IS INSTALLED (src/server.ts, top of bootstrap). Two constraints, both
 * load-bearing and both asserted by error-localization.wiring.test.ts:
 *
 *  - ABOVE every `server.register(routes, { prefix })` call. Fastify resolves a
 *    route's error handler from the encapsulation context the route was
 *    registered in, and this API registers ~90 route plugins; installing
 *    afterwards is dead code. That is AW-08.
 *  - CALLED, not `server.register`-ed. Registering would put the handler and the
 *    onSend hook in a child context that no sibling route can see. (Wrapping in
 *    `fastify-plugin` would also work, but that package is not a dependency of
 *    apps/api.)
 *
 * `onError` carries the Sentry `captureException` the old inline handler
 * called, so the swap loses no reporting.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { redactError, type SafeErrorBody } from '../lib/error-redaction.js';
import {
  errorCodeForEnglishMessage,
  errorCodeForStatus,
  genericRequestErrorCode,
  isErrorCode,
  localizedError,
  statusImpliesMessage,
  type ErrorCode,
} from '../lib/error-i18n.js';
import {
  errorLanguage,
  resolveRequestLanguage,
  type PreferredLanguageLoader,
  type SupportedLanguage,
} from '../lib/i18n.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** Language resolved for this request. Set on the first error that needs it. */
    resolvedLanguage?: SupportedLanguage;
  }
}

/**
 * The two English sentences lib/error-redaction.ts substitutes when it strips
 * an error. Seeing one of these means there is no caller-specific wording left,
 * so replacing it with a localized catalogue string loses nothing.
 */
const REDACTED_MESSAGES = new Set([
  'Internal server error',
  'Request could not be processed.',
  'Something went wrong',
]);

export interface ErrorLocalizationOptions {
  /** Mirrors `NODE_ENV === 'production'`; forwarded to redactError. */
  isProd?: boolean;
  /** Test seam for the `User.preferredLanguage` lookup. */
  loadPreferredLanguage?: PreferredLanguageLoader;
  /** Set false to install only the onSend localizer (used by tests). */
  installErrorHandler?: boolean;
  /** Reporting side-effect, e.g. Sentry's `captureException`. */
  onError?: (err: unknown) => void;
}

/** Codes a thrown error may carry, in the order we trust them. */
function errorCodeOf(err: Record<string, unknown>): ErrorCode | null {
  for (const key of ['errorCode', 'code'] as const) {
    const value = err[key];
    if (isErrorCode(value)) return value;
  }
  return null;
}

/**
 * Decide the message a client gets, given what redaction left behind.
 * Returns null when the existing message must be preserved as-is.
 */
export function localizedMessageFor(
  err: Record<string, unknown>,
  redacted: SafeErrorBody,
  language: string,
): { code: ErrorCode; message: string } | null {
  const lang = errorLanguage(language);
  const explicit = errorCodeOf(err);
  if (explicit) {
    return { code: explicit, message: localizedError(explicit, lang) };
  }
  if (REDACTED_MESSAGES.has(redacted.message)) {
    const code = errorCodeForStatus(redacted.statusCode);
    return { code, message: localizedError(code, lang) };
  }
  return null;
}

/**
 * The label a route attaches when a Zod schema rejected the request. Every one
 * of the eight sites that uses it (routes/auth.ts ×3, ai.ts ×3, support.ts,
 * weddings.ts ×2) fills `message` from `error.errors[0].message` — raw Zod
 * output like "Required" or "String must contain at least 8 character(s)".
 * That is machine text in no language, so translating it loses nothing; it is
 * preserved verbatim under `details.validation` regardless.
 */
const VALIDATION_LABEL = 'ValidationError';

/**
 * Which rule an error body falls under — decided WITHOUT knowing the language.
 *
 * Routes do not throw. They `return reply.code(404).send({ error: 'Temple not
 * found' })`, 892 times across ~90 files, so `setErrorHandler` never sees them
 * and a per-call-site helper would have to be threaded through every one.
 * Recognising the shapes those bodies actually take is what makes coverage
 * structural instead of per-route.
 *
 * The rules, in order, each with its justification for touching `message`:
 *
 *  1.  nested `{ error: { code } }`  — the code names the sentence outright.
 *  2.  top-level `code`             — same.
 *  3.  `message` IS an English catalogue sentence, or a redaction placeholder
 *                                   — pure translation; nothing is lost.
 *  4a. `error: 'ValidationError'`   — the route has declared this a schema
 *                                     failure and its message is raw Zod
 *                                     output; kept under `details.validation`.
 *  4b. `error` is one of the nine other spellings of "malformed request", and
 *      there is no message — a developer label with no caller content.
 *  5.  no `message` at all, on a status whose meaning is fixed (401/403/404/
 *      429/5xx) — purely additive.
 *
 * Anything else returns null and is answered verbatim, which is the point: a
 * bespoke 4xx sentence ("Refunds are only allowed up to 24 hours before…",
 * "Try again in 15 minutes.") tells the caller more than a translated generic
 * would, and lib/error-redaction.ts's contract that a 4xx message is kept
 * stays intact.
 *
 * Returning the decision rather than the finished body is also what keeps the
 * docblock on lib/i18n.ts honest — "an error storm cannot turn into a query
 * storm". Resolving a language can cost a `User.preferredLanguage` read, and
 * 291 of these bodies are never rewritten; resolving first would put a database
 * round-trip behind every one of them.
 */
type LocalizationPlan =
  | { where: 'nested'; code: ErrorCode }
  | { where: 'flat'; code: ErrorCode; setCode: boolean; validation?: string };

export function planErrorLocalization(
  payload: unknown,
  statusCode = 500,
): LocalizationPlan | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const body = payload as Record<string, unknown>;

  // 1 — nested envelope.
  const nested = body['error'];
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const inner = nested as Record<string, unknown>;
    return isErrorCode(inner['code']) ? { where: 'nested', code: inner['code'] } : null;
  }

  // 2 — the body already names a catalogue code.
  if (isErrorCode(body['code'])) {
    return { where: 'flat', code: body['code'], setCode: false };
  }

  const message = body['message'];

  // 3 — the message is wording this catalogue owns, in English.
  if (typeof message === 'string') {
    const fromEnglish = errorCodeForEnglishMessage(message);
    if (fromEnglish) return { where: 'flat', code: fromEnglish, setCode: true };
    if (REDACTED_MESSAGES.has(message)) {
      return { where: 'flat', code: errorCodeForStatus(statusCode), setCode: true };
    }
  }

  // 4a — a declared schema failure. Its message is raw Zod output at every one
  // of the eight sites, so it is replaced and kept under `details.validation`.
  if (body['error'] === VALIDATION_LABEL) {
    const plan: LocalizationPlan = { where: 'flat', code: 'INVALID_BODY', setCode: true };
    if (typeof message === 'string' && body['details'] === undefined) {
      plan.validation = message;
    }
    return plan;
  }

  if (message === undefined) {
    // 4b — one of the other nine spellings of "malformed request". Unlike 4a
    // this fires only when there is no message, because a body such as
    // `{ error: 'Invalid input', message: 'pincode must be 6 digits' }` names
    // the field to fix and a generic translation would erase that.
    const generic = genericRequestErrorCode(body['error']);
    if (generic) return { where: 'flat', code: generic, setCode: true };

    // 5 — no human sentence at all, on a status that supplies its own meaning.
    if (body['error'] !== undefined && statusImpliesMessage(statusCode)) {
      return { where: 'flat', code: errorCodeForStatus(statusCode), setCode: true };
    }
  }

  return null;
}

export function localizeErrorPayload(
  payload: unknown,
  language: string,
  statusCode = 500,
): unknown {
  const plan = planErrorLocalization(payload, statusCode);
  if (!plan) return payload;
  return applyLocalizationPlan(payload as Record<string, unknown>, plan, language);
}

function applyLocalizationPlan(
  body: Record<string, unknown>,
  plan: LocalizationPlan,
  language: string,
): Record<string, unknown> {
  const lang = errorLanguage(language);
  const message = localizedError(plan.code, lang);

  if (plan.where === 'nested') {
    const inner = body['error'] as Record<string, unknown>;
    return { ...body, error: { ...inner, message } };
  }

  const next: Record<string, unknown> = { ...body, message };
  if (plan.setCode) next['code'] = plan.code;
  if (plan.validation !== undefined) next['details'] = { validation: plan.validation };
  return next;
}

async function languageFor(
  request: FastifyRequest,
  opts: ErrorLocalizationOptions,
): Promise<SupportedLanguage> {
  if (request.resolvedLanguage) return request.resolvedLanguage;
  const language = await resolveRequestLanguage(request, {
    ...(opts.loadPreferredLanguage ? { loadPreferredLanguage: opts.loadPreferredLanguage } : {}),
  });
  request.resolvedLanguage = language;
  return language;
}

export async function errorLocalizationPlugin(
  server: FastifyInstance,
  opts: ErrorLocalizationOptions = {},
): Promise<void> {
  const isProd = opts.isProd ?? process.env.NODE_ENV === 'production';

  if (opts.installErrorHandler !== false) {
    server.setErrorHandler(async (err, request: FastifyRequest, reply: FastifyReply) => {
      server.log.error(err);
      opts.onError?.(err);
      if (reply.sent) return;

      const raw = err as unknown as Record<string, unknown>;
      const redacted = redactError(raw, { isProd });

      let body: { error: string; message: string; code?: string } = {
        error: redacted.error,
        message: redacted.message,
      };

      // A language lookup must never be the reason an error response fails.
      try {
        const language = await languageFor(request, opts);
        const localized = localizedMessageFor(raw, redacted, language);
        if (localized) {
          body = { error: redacted.error, message: localized.message, code: localized.code };
        }
      } catch {
        /* keep the un-localized body */
      }

      return reply.code(redacted.statusCode).send(body);
    });
  }

  server.addHook('onSend', async (request, reply, payload) => {
    if (reply.statusCode < 400) return payload;
    if (typeof payload !== 'string') return payload;
    // Cheap pre-filter. The previous version required `"code"`, which is why
    // this hook never fired in production: the two probes that proved
    // localization was dead — `{"error":"Temple not found"}` and
    // `{"error":"ValidationError","message":"Required"}` — carry no code, and
    // neither do the great majority of the API's 719 hand-built error bodies.
    if (!payload.startsWith('{')) return payload;
    if (
      !payload.includes('"error"') &&
      !payload.includes('"message"') &&
      !payload.includes('"code"')
    ) {
      return payload;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return payload;
    }

    // Decide BEFORE resolving a language: 291 hand-built 4xx bodies are
    // deliberately never rewritten, and resolving a language for them would put
    // a `User.preferredLanguage` read behind every one.
    const plan = planErrorLocalization(parsed, reply.statusCode);
    if (!plan) return payload;

    try {
      const language = await languageFor(request, opts);
      return JSON.stringify(
        applyLocalizationPlan(parsed as Record<string, unknown>, plan, language),
      );
    } catch {
      return payload;
    }
  });
}
