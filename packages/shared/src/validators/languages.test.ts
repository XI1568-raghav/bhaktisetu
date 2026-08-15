import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  SUPPORTED_LANGUAGES,
  TRANSLATED_LANGUAGES,
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  isTranslatedLanguage,
  languageSchema,
  normalizeLanguageTag,
  parseAcceptLanguage,
  resolveLanguage,
  localeFor,
} from "./languages.js";
import { updateProfileSchema } from "./index.js";

/**
 * I-11 — four inconsistent language lists collapse to one.
 *
 * The load-bearing test is the first one: it reads the Prisma enum off disk and
 * compares it to the exported list. Any future `enum Language` edit that does
 * not also edit languages.ts fails here instead of at runtime with a Prisma
 * enum error on a user's profile save.
 */
describe("I-11 — SUPPORTED_LANGUAGES is pinned to the Prisma Language enum", () => {
  it("matches enum Language in apps/api/prisma/schema.prisma exactly, in order", () => {
    const schemaPath = fileURLToPath(
      new URL("../../../../apps/api/prisma/schema.prisma", import.meta.url),
    );
    const schema = readFileSync(schemaPath, "utf8");

    const block = schema.match(/enum\s+Language\s*\{([^}]*)\}/);
    expect(block, "enum Language not found in schema.prisma").toBeTruthy();

    const fromPrisma = block![1]!
      .split("\n")
      .map((line) => line.replace(/\/\/.*$/, "").trim())
      .filter((line) => line.length > 0);

    expect(fromPrisma).toEqual([...SUPPORTED_LANGUAGES]);
  });

  it("TRANSLATED_LANGUAGES is a strict subset of SUPPORTED_LANGUAGES", () => {
    for (const lang of TRANSLATED_LANGUAGES) {
      expect(SUPPORTED_LANGUAGES as readonly string[]).toContain(lang);
    }
    expect(TRANSLATED_LANGUAGES.length).toBeLessThan(SUPPORTED_LANGUAGES.length);
  });

  it("the default language is itself supported and translated", () => {
    expect(isSupportedLanguage(DEFAULT_LANGUAGE)).toBe(true);
    expect(isTranslatedLanguage(DEFAULT_LANGUAGE)).toBe(true);
  });
});

describe("I-11 — the shared validator derives from the one list", () => {
  it("accepts every supported language code", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      const result = updateProfileSchema.safeParse({ preferredLanguage: lang });
      expect(result.success, `expected ${lang} to validate`).toBe(true);
    }
  });

  /**
   * RED against HEAD. The field was `z.string().min(2).max(5)`, so every one of
   * these parsed clean and only blew up later at the database as a Prisma enum
   * error — a 500 for what is a 400.
   */
  it("rejects codes that are the right shape but not a real language", () => {
    for (const bogus of ["zz", "zzzz", "xx-YZ", "klingon".slice(0, 5)]) {
      const result = updateProfileSchema.safeParse({ preferredLanguage: bogus });
      expect(result.success, `expected ${bogus} to be rejected`).toBe(false);
    }
  });

  it("still treats preferredLanguage as optional", () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(true);
  });

  it("languageSchema and isSupportedLanguage agree", () => {
    for (const candidate of [...SUPPORTED_LANGUAGES, "zz", "", "en-US"]) {
      expect(languageSchema.safeParse(candidate).success).toBe(
        isSupportedLanguage(candidate),
      );
    }
  });
});

describe("normalizeLanguageTag", () => {
  it("strips the region subtag and lowercases", () => {
    expect(normalizeLanguageTag("hi-IN")).toBe("hi");
    expect(normalizeLanguageTag("HI")).toBe("hi");
    expect(normalizeLanguageTag("  ta-Latn-IN  ")).toBe("ta");
  });

  it("returns null for unsupported or empty input", () => {
    expect(normalizeLanguageTag("zz")).toBeNull();
    expect(normalizeLanguageTag("")).toBeNull();
    expect(normalizeLanguageTag(null)).toBeNull();
    expect(normalizeLanguageTag(undefined)).toBeNull();
  });
});

describe("parseAcceptLanguage", () => {
  it("orders by q-weight, most-wanted first", () => {
    // hi 0.9 > en 0.8 > ta 0.4
    expect(parseAcceptLanguage("ta;q=0.4,hi-IN;q=0.9,en;q=0.8")).toEqual([
      "hi",
      "en",
      "ta",
    ]);
  });

  it("drops unsupported tags rather than failing", () => {
    expect(parseAcceptLanguage("zz-ZZ,qq;q=0.9,kn;q=0.1")).toEqual(["kn"]);
  });

  it("keeps header order for equal weights", () => {
    expect(parseAcceptLanguage("te,kn,hi")).toEqual(["te", "kn", "hi"]);
  });

  it("dedupes a language that appears twice", () => {
    expect(parseAcceptLanguage("hi-IN,hi;q=0.9")).toEqual(["hi"]);
  });

  it("drops q=0, which means 'explicitly not this one'", () => {
    expect(parseAcceptLanguage("hi;q=0,ta;q=0.5")).toEqual(["ta"]);
  });

  it("returns an empty list for missing or junk headers", () => {
    expect(parseAcceptLanguage(undefined)).toEqual([]);
    expect(parseAcceptLanguage("")).toEqual([]);
    expect(parseAcceptLanguage("*")).toEqual([]);
  });
});

describe("I18N-07 — resolveLanguage reads the stored preference", () => {
  it("prefers an explicit override over everything", () => {
    expect(
      resolveLanguage({
        override: "ta",
        preferredLanguage: "hi",
        acceptLanguage: "kn",
      }),
    ).toBe("ta");
  });

  /**
   * The finding: preferredLanguage was write-only. A user who set Tamil in
   * their profile and browses from an English-default handset must be answered
   * in Tamil, not English.
   */
  it("prefers the stored profile language over the browser header", () => {
    expect(
      resolveLanguage({ preferredLanguage: "ta", acceptLanguage: "en-GB,en;q=0.9" }),
    ).toBe("ta");
  });

  it("falls back to Accept-Language when no preference is stored", () => {
    expect(
      resolveLanguage({ preferredLanguage: null, acceptLanguage: "kn-IN,en;q=0.5" }),
    ).toBe("kn");
  });

  it("ignores a stored preference that is not a real language", () => {
    expect(
      resolveLanguage({ preferredLanguage: "zz", acceptLanguage: "hi" }),
    ).toBe("hi");
  });

  it("falls back to English when nothing resolves", () => {
    expect(resolveLanguage({})).toBe("en");
    expect(resolveLanguage({ override: "zz", acceptLanguage: "qq" })).toBe("en");
  });
});

describe("I-10 — localeFor names a locale so nothing inherits the server's", () => {
  it("maps every supported language to an India locale", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(localeFor(lang)).toBe(`${lang}-IN`);
    }
  });

  it("falls back to the default locale for junk", () => {
    expect(localeFor("zz")).toBe("en-IN");
    expect(localeFor(null)).toBe("en-IN");
  });

  it("produces Indian digit grouping, not the server's default", () => {
    // 12,34,567 in en-IN vs 1,234,567 in en-US. If a bare toLocaleString()
    // ran under a container defaulting to en-US this assertion would flip.
    expect((1234567).toLocaleString(localeFor("hi"))).toContain("12,34,567");
  });
});
