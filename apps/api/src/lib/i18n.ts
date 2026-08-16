/**
 * The API's language resolver.
 *
 * I-11 / I18N-07. Two things live here and nowhere else:
 *
 *  1. Re-export of the ONE language list (`@poojly/shared` → validators/languages.ts).
 *     Nothing in apps/api may restate a list of language codes; it imports from
 *     here or from @poojly/shared directly.
 *
 *  2. `resolveRequestLanguage(request)` — the answer to "what language is this
 *     response written in". `User.preferredLanguage` used to be write-only: set
 *     at signup, editable in the profile UI, returned by GET /me, and read by
 *     absolutely nothing. It is the natural input to this function, and it
 *     outranks Accept-Language because a profile setting is a deliberate choice
 *     and a browser header is ambient.
 *
 *     Precedence: ?lang= → User.preferredLanguage → Accept-Language → "en".
 *
 * The preferred-language lookup is deliberately lazy and cached. It runs only
 * when there is an authenticated user and only when something actually needs a
 * language (in practice: an error response), so the steady-state cost is zero
 * and an error storm cannot turn into a query storm.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  TRANSLATED_LANGUAGES,
  isSupportedLanguage,
  isTranslatedLanguage,
  languageSchema,
  localeFor,
  normalizeLanguageTag,
  parseAcceptLanguage,
  resolveLanguage,
  type SupportedLanguage,
  type TranslatedLanguage,
} from '@poojly/shared';

import { localizedError, type ErrorCode } from './error-i18n.js';

export {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  TRANSLATED_LANGUAGES,
  isSupportedLanguage,
  isTranslatedLanguage,
  languageSchema,
  localeFor,
  normalizeLanguageTag,
  parseAcceptLanguage,
  resolveLanguage,
};
export type { SupportedLanguage, TranslatedLanguage };

/** Query parameter that overrides everything for one request. */
export const LANG_QUERY_PARAM = 'lang';

/** How long a user's stored language choice is trusted without re-reading it. */
export const PREFERRED_LANGUAGE_TTL_MS = 5 * 60 * 1000;

export type PreferredLanguageLoader = (userId: string) => Promise<string | null>;

interface CacheEntry {
  lang: string | null;
  expiresAt: number;
}

const preferredLanguageCache = new Map<string, CacheEntry>();

/** Test seam, and the hook an admin "user changed their language" event would use. */
export function clearPreferredLanguageCache(userId?: string): void {
  if (userId) preferredLanguageCache.delete(userId);
  else preferredLanguageCache.clear();
}

/**
 * Default loader: one narrow column read, cached, and failure-tolerant. A
 * language lookup must never be the reason a request fails — if the database
 * is the thing that broke, we still have to answer with *some* language.
 */
export const loadPreferredLanguageFromDb: PreferredLanguageLoader = async (userId) => {
  const { prisma } = await import('./prisma.js');
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferredLanguage: true },
  });
  return (row?.preferredLanguage as string | undefined) ?? null;
};

/** The `?lang=` override, if the caller sent one. */
export function readLangOverride(request: Pick<FastifyRequest, 'query'>): string | null {
  const query = request.query as Record<string, unknown> | undefined;
  const raw = query?.[LANG_QUERY_PARAM];
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0];
  return null;
}

export function readAcceptLanguage(
  request: Pick<FastifyRequest, 'headers'>,
): string | string[] | undefined {
  return request.headers?.['accept-language'];
}

/**
 * The stored preference, if the auth layer already put it on the request.
 *
 * `AuthUser` (src/middlewares/auth.ts) does not carry `preferredLanguage`
 * today, so this returns null and the DB loader below covers it. The moment
 * auth.ts adds the column to its select this becomes the zero-cost path — no
 * change needed here.
 */
export function readCurrentUserLanguage(request: FastifyRequest): string | null {
  const user = request.currentUser as
    | { id?: string; preferredLanguage?: string | null }
    | undefined;
  return user?.preferredLanguage ?? null;
}

/**
 * Resolve without touching the database. Used where an await is not available
 * or a DB round-trip is not worth it.
 */
export function resolveRequestLanguageSync(request: FastifyRequest): SupportedLanguage {
  return resolveLanguage({
    override: readLangOverride(request),
    preferredLanguage: readCurrentUserLanguage(request),
    acceptLanguage: readAcceptLanguage(request),
  });
}

/**
 * Full resolution, including the user's stored `preferredLanguage`.
 *
 * Short-circuits before any lookup when an explicit `?lang=` already decided,
 * or when the request is anonymous. A lookup failure degrades to the header.
 */
export async function resolveRequestLanguage(
  request: FastifyRequest,
  opts: { loadPreferredLanguage?: PreferredLanguageLoader; now?: number } = {},
): Promise<SupportedLanguage> {
  const override = normalizeLanguageTag(readLangOverride(request));
  if (override) return override;

  const fromRequest = normalizeLanguageTag(readCurrentUserLanguage(request));
  if (fromRequest) return fromRequest;

  const acceptLanguage = readAcceptLanguage(request);
  const userId = (request.currentUser as { id?: string } | undefined)?.id;
  if (!userId) {
    return resolveLanguage({ acceptLanguage });
  }

  const load = opts.loadPreferredLanguage ?? loadPreferredLanguageFromDb;
  const now = opts.now ?? Date.now();

  const cached = preferredLanguageCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return resolveLanguage({ preferredLanguage: cached.lang, acceptLanguage });
  }

  let stored: string | null = null;
  try {
    stored = await load(userId);
    preferredLanguageCache.set(userId, {
      lang: stored,
      expiresAt: now + PREFERRED_LANGUAGE_TTL_MS,
    });
  } catch {
    // Negative-cache the failure too, so a database outage does not make every
    // error response re-attempt the same failing query.
    preferredLanguageCache.set(userId, {
      lang: null,
      expiresAt: now + PREFERRED_LANGUAGE_TTL_MS,
    });
  }

  return resolveLanguage({ preferredLanguage: stored, acceptLanguage });
}

/**
 * Narrow a supported language to one we hold authored strings for. A user on
 * Bengali or Punjabi is supported by the platform but reads English errors
 * until those catalogues are authored — an English sentence beats a raw code.
 */
export function errorLanguage(language: string | null | undefined): TranslatedLanguage {
  const lang = normalizeLanguageTag(language);
  return lang && isTranslatedLanguage(lang) ? lang : DEFAULT_LANGUAGE;
}

/**
 * Send an error whose `message` is a catalogue string in the caller's language.
 *
 * Shape is deliberately the one routes already send — `{ error, message }` with
 * `error` still the English label clients switch on — plus a stable `code`.
 * Only `message` changes, and apps/web reads exactly that field
 * (`app/profile/page.tsx:210`), so localization arrives without a client change.
 */
export async function sendLocalizedError(
  request: FastifyRequest,
  reply: FastifyReply,
  opts: {
    statusCode: number;
    code: ErrorCode;
    /** The existing English label, e.g. "Validation Error". Unchanged. */
    error: string;
    details?: unknown;
    /** Skip resolution when the caller already knows the language. */
    language?: string | null;
  },
): Promise<FastifyReply> {
  const language = opts.language ?? (await resolveRequestLanguage(request));
  const body: Record<string, unknown> = {
    error: opts.error,
    message: localizedError(opts.code, errorLanguage(language)),
    code: opts.code,
  };
  if (opts.details !== undefined) body['details'] = opts.details;
  return reply.code(opts.statusCode).send(body);
}
