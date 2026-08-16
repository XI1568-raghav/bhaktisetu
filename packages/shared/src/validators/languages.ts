import { z } from "zod";

/**
 * I-11 — the ONE list of languages the platform accepts.
 *
 * Before this module the product carried four mutually inconsistent
 * definitions of "a supported language" on the server side:
 *
 *   1. `apps/api/prisma/schema.prisma` `enum Language`  — 10 members. This is
 *      the DB constraint: the only values `User.preferredLanguage` can hold.
 *   2. `apps/api/src/routes/users.ts` `z.enum([...])`   — the same 10, retyped
 *      by hand, free to drift from the enum it guards.
 *   3. `packages/shared/src/validators/index.ts`        — `z.string().min(2).max(5)`,
 *      i.e. no list at all: "qq" and "zzzzz" both validated, then failed at the
 *      database with a Prisma enum error instead of a 400.
 *   4. `apps/api/src/lib/error-i18n.ts` `SUPPORTED_LANGS` — 5 members, the ones
 *      an error catalogue was actually authored for.
 *
 * (4) is not the same question as (1)-(3) and must not be collapsed into them:
 * "a value the user may store" and "a value we hold translated strings for" are
 * different sets, and narrowing (1) to (4) would reject `bn`/`mr`/`gu`/`ml`/`pa`
 * profiles that already exist in the database. So there are exactly two lists
 * here, one derived from and asserted against the other:
 *
 *   SUPPORTED_LANGUAGES  — accepted anywhere a language is stored or sent.
 *   TRANSLATED_LANGUAGES — the subset with a complete string catalogue.
 *                          Anything outside it renders in English.
 *
 * `languages.test.ts` pins SUPPORTED_LANGUAGES to the Prisma enum by parsing
 * schema.prisma, so (1) and this file cannot drift apart silently again.
 *
 * The web app keeps its own `SUPPORTED_LOCALES` in `apps/web/lib/i18n/locales.ts`.
 * That list answers a third question — "which locales have a landing page to
 * send a user to" — and is deliberately not merged here. Do NOT import this
 * module from apps/web: @poojly/shared's barrels use NodeNext `./foo.js`
 * specifiers on .ts sources and turbopack cannot resolve them.
 */

/**
 * Every language code the platform accepts. Order and membership mirror
 * `enum Language` in apps/api/prisma/schema.prisma exactly.
 */
export const SUPPORTED_LANGUAGES = [
  "en",
  "hi",
  "ta",
  "te",
  "bn",
  "mr",
  "gu",
  "kn",
  "ml",
  "pa",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Fallback whenever nothing better can be resolved. Typed as the literal so it
 * satisfies both SupportedLanguage and TranslatedLanguage — English is the one
 * language guaranteed to be in every catalogue.
 */
export const DEFAULT_LANGUAGE = "en" as const;

/**
 * The subset of SUPPORTED_LANGUAGES with a full authored string catalogue.
 * A supported-but-untranslated language renders English rather than a code.
 */
export const TRANSLATED_LANGUAGES = ["en", "hi", "ta", "te", "kn"] as const;

export type TranslatedLanguage = (typeof TRANSLATED_LANGUAGES)[number];

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return (
    typeof value === "string" &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
  );
}

export function isTranslatedLanguage(value: unknown): value is TranslatedLanguage {
  return (
    typeof value === "string" &&
    (TRANSLATED_LANGUAGES as readonly string[]).includes(value)
  );
}

/**
 * The single Zod definition of a language field. Every validator that guards a
 * language must derive from this rather than restate the list.
 */
export const languageSchema = z.enum(SUPPORTED_LANGUAGES);

/**
 * Normalize one BCP-47 tag to a supported primary subtag.
 * "hi-IN" -> "hi", "HI" -> "hi", "zz" -> null.
 */
export function normalizeLanguageTag(tag: string | null | undefined): SupportedLanguage | null {
  if (!tag) return null;
  const primary = tag.trim().toLowerCase().split("-")[0];
  return isSupportedLanguage(primary) ? primary : null;
}

/**
 * Parse an Accept-Language header into supported primary subtags, most-wanted
 * first. Honors q-weights and drops anything we do not support.
 *
 * "ta;q=0.4,hi-IN;q=0.9,zz" -> ["hi", "ta"]
 */
export function parseAcceptLanguage(
  header: string | string[] | null | undefined,
): SupportedLanguage[] {
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) return [];

  const ranked = raw
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      let q = 1;
      for (const p of params) {
        const m = p.trim().match(/^q=([0-9.]+)$/i);
        if (m && m[1]) {
          const parsed = Number.parseFloat(m[1]);
          if (Number.isFinite(parsed)) q = parsed;
        }
      }
      return { lang: normalizeLanguageTag(tag), q, index };
    })
    .filter((entry): entry is { lang: SupportedLanguage; q: number; index: number } =>
      entry.lang !== null && entry.q > 0,
    );

  // Stable sort: equal q-weights keep header order.
  ranked.sort((a, b) => (b.q - a.q) || (a.index - b.index));

  const seen = new Set<SupportedLanguage>();
  const out: SupportedLanguage[] = [];
  for (const { lang } of ranked) {
    if (seen.has(lang)) continue;
    seen.add(lang);
    out.push(lang);
  }
  return out;
}

/**
 * I18N-07 — resolve the language a response should be written in.
 *
 * `preferredLanguage` is a deliberate, durable choice the user made in their
 * profile; Accept-Language is whatever their browser or OS happens to be set
 * to. The stored choice therefore outranks the header. An explicit `?lang=`
 * outranks both because it is a per-request instruction.
 *
 * Precedence: override -> stored preference -> Accept-Language -> "en".
 */
export function resolveLanguage(input: {
  override?: string | string[] | null;
  preferredLanguage?: string | null;
  acceptLanguage?: string | string[] | null;
}): SupportedLanguage {
  const rawOverride = Array.isArray(input.override) ? input.override[0] : input.override;
  const override = normalizeLanguageTag(rawOverride);
  if (override) return override;

  const preferred = normalizeLanguageTag(input.preferredLanguage);
  if (preferred) return preferred;

  const [fromHeader] = parseAcceptLanguage(input.acceptLanguage);
  if (fromHeader) return fromHeader;

  return DEFAULT_LANGUAGE;
}

/**
 * BCP-47 locale to hand to Intl / toLocaleString for a given language.
 *
 * I-10 — a bare `toLocaleString()` silently adopts whatever locale the process
 * happens to run under, which on Render is the container's, not the reader's.
 * Every formatted number or date must name its locale, and this is where that
 * name comes from.
 */
const LOCALE_BY_LANGUAGE: Record<SupportedLanguage, string> = {
  en: "en-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
  bn: "bn-IN",
  mr: "mr-IN",
  gu: "gu-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  pa: "pa-IN",
};

export function localeFor(language: string | null | undefined): string {
  const lang = normalizeLanguageTag(language) ?? DEFAULT_LANGUAGE;
  return LOCALE_BY_LANGUAGE[lang];
}
