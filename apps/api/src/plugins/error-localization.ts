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
 * WHAT THIS PLUGIN DOES. It installs the error serializer, so localization is
 * a property of the pipeline rather than something each route has to remember:
 *
 *   1. `setErrorHandler` — every thrown error is redacted (unchanged: the rules
 *      in lib/error-redaction.ts still decide what a client may see) and then
 *      localized.
 *   2. `onSend` — error bodies a route built by hand and passed to `reply.send`
 *      are localized too, provided they name a code.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not overwrite a bespoke 4xx
 * message with a generic catalogue sentence. "Refunds are only allowed up to
 * 24 hours before the scheduled time." is more useful to a caller than a
 * translated "The request body is invalid.", and lib/error-redaction.ts's
 * contract — a 4xx message is written for the caller and is kept — is locked by
 * error-redaction.test.ts. So a message is replaced only when:
 *
 *   - the error names a catalogue code (`err.code` / `err.errorCode`), or
 *   - redaction already replaced the message with a generic English string,
 *     i.e. there is no caller-specific wording left to lose.
 *
 * That covers every 5xx and every redacted driver error by default, plus any
 * route that opts in by attaching a code — and it costs no existing message.
 *
 * WIRING — NOT YET DONE. src/server.ts is outside this task's lane, so the
 * three lines below are the only thing between this module and every error
 * response in the API. In src/server.ts, replace the `server.setErrorHandler`
 * block installed under the AW-08 comment with:
 *
 *     import { errorLocalizationPlugin } from './plugins/error-localization.js';
 *     …
 *     await errorLocalizationPlugin(server, { isProd: isProdEnv, onError: captureException });
 *
 * Two constraints on where that call goes, both load-bearing:
 *
 *  - It must stay ABOVE every `server.register(routes, { prefix })` call.
 *    Fastify resolves a route's error handler from the encapsulation context
 *    the route was registered in, and this API registers ~90 route plugins;
 *    installing afterwards is dead code. That is AW-08, and it is exactly
 *    where the current handler already sits.
 *  - It must be CALLED, not `server.register`-ed. Registering would put the
 *    handler and the onSend hook in a child context that no sibling route can
 *    see. (Wrapping in `fastify-plugin` would also work, but that package is
 *    not a dependency of apps/api.)
 *
 * `onError` carries the Sentry `captureException` the current handler calls, so
 * the swap loses no reporting.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { redactError, type SafeErrorBody } from '../lib/error-redaction.js';
import {
  errorCodeForStatus,
  isErrorCode,
  localizedError,
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
 * Localize an error body a route built by hand, e.g.
 * `{ error: { code: 'CART_EMPTY', message: '…' } }` or `{ code: 'CART_EMPTY', … }`.
 * Bodies with no recognizable code are returned untouched.
 */
export function localizeErrorPayload(payload: unknown, language: string): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  const lang = errorLanguage(language);
  const body = payload as Record<string, unknown>;

  const nested = body['error'];
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const inner = nested as Record<string, unknown>;
    if (isErrorCode(inner['code'])) {
      return {
        ...body,
        error: { ...inner, message: localizedError(inner['code'], lang) },
      };
    }
    return payload;
  }

  if (isErrorCode(body['code'])) {
    return { ...body, message: localizedError(body['code'], lang) };
  }
  return payload;
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
    // Cheap pre-filter: only pay for a parse when the body could carry a code.
    if (!payload.includes('"code"')) return payload;

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return payload;
    }

    try {
      const language = await languageFor(request, opts);
      const localized = localizeErrorPayload(parsed, language);
      return localized === parsed ? payload : JSON.stringify(localized);
    } catch {
      return payload;
    }
  });
}
