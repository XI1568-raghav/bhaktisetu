// CI-15 — Wikipedia text is CC BY-SA. Attribution is a CONDITION of the
// licence, not a courtesy.
//
// 63 published articles list Wikipedia in their `sources` frontmatter — 45 in
// content/ved as `"Wikipedia: <Article Title>"`, 18 in content/sanatan and
// content/sanskrit as a bare `https://en.wikipedia.org/wiki/<Slug>` URL. Every
// one of them rendered as an inert bullet of plain text: no licence named, no
// link back to the article, and no share-alike notice. /credits, the only page
// that discusses licensing at all, covers Wikimedia Commons IMAGES and says
// nothing about text.
//
// CC BY-SA 4.0 §3(a)(1) requires, in a manner reasonable to the medium:
// identification of the creator, a copyright notice, a notice referring to the
// licence, a notice referring to the disclaimer of warranties, and a URI or
// hyperlink to the material. For a Wikipedia article the accepted discharge is
// a hyperlink to the article itself (which carries its own author history)
// plus a named, linked licence and a statement that derivatives share alike.
//
// This module is the parsing/derivation half: it turns whatever a `sources`
// array happens to contain into the exact attribution a renderer must print.
// It is deliberately pure and dependency-free so the article renderer, the
// /credits register and any future export path all derive the same notice from
// the same rule rather than each hand-rolling one.

/** The licence Wikipedia article text is published under. */
export const WIKIPEDIA_TEXT_LICENSE = {
  name: 'CC BY-SA 4.0',
  fullName: 'Creative Commons Attribution-ShareAlike 4.0 International',
  url: 'https://creativecommons.org/licenses/by-sa/4.0/',
  /** CC BY-SA 4.0 §5 — the disclaimer the licence asks be referred to. */
  disclaimerUrl: 'https://creativecommons.org/licenses/by-sa/4.0/#ref-appropriate-credit',
} as const;

export interface WikipediaSource {
  /** Human-readable article title, e.g. "Isha Upanishad". */
  title: string;
  /** Canonical article URL — the hyperlink the licence requires. */
  url: string;
  /** The raw `sources` entry this was parsed from. */
  raw: string;
}

export interface WikipediaAttribution {
  license: typeof WIKIPEDIA_TEXT_LICENSE;
  sources: WikipediaSource[];
  /**
   * The sentence a page must carry alongside the links. Kept here rather than
   * in JSX so /credits and the article renderer cannot drift apart.
   */
  notice: string;
}

/** `Wikipedia: Isha Upanishad` / `Wikipedia — Isha Upanishad` / `Wikipedia, Isha Upanishad` */
const CITED_BY_TITLE = /^\s*wikipedia\s*[:—–,-]\s*(.+?)\s*$/i;

/**
 * Any Wikipedia article URL. Deliberately covers every language subdomain and
 * the mobile host, because a citation added later will not necessarily be
 * en.* — and a non-English article is no less CC BY-SA.
 */
const CITED_BY_URL = /^\s*(?:https?:\/\/)?([a-z-]{2,12})(?:\.m)?\.wikipedia\.org\/wiki\/([^\s?#]+)/i;

function titleToUrl(title: string, lang = 'en'): string {
  return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.trim().replace(/\s+/g, '_'))}`;
}

function urlSlugToTitle(slug: string): string {
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    // A malformed percent-escape is not a reason to drop the attribution.
  }
  return decoded.replace(/_/g, ' ').trim();
}

/**
 * Every distinct Wikipedia article a `sources` list cites, in the order first
 * seen. A non-Wikipedia source (Olivelle, Britannica, a printed bhashya) is
 * simply not returned — those carry their own, different obligations.
 */
export function parseWikipediaSources(sources: readonly string[] | undefined): WikipediaSource[] {
  if (!sources?.length) return [];
  const out: WikipediaSource[] = [];
  const seen = new Set<string>();

  for (const raw of sources) {
    if (typeof raw !== 'string') continue;

    let parsed: WikipediaSource | null = null;

    const byUrl = raw.match(CITED_BY_URL);
    if (byUrl) {
      const lang = (byUrl[1] ?? 'en').toLowerCase();
      const title = urlSlugToTitle(byUrl[2] ?? '');
      if (title) parsed = { title, url: titleToUrl(title, lang), raw };
    } else {
      const byTitle = raw.match(CITED_BY_TITLE);
      // Guard against a bare "Wikipedia" with nothing after it, and against a
      // title that is itself only punctuation.
      const title = byTitle?.[1]?.trim();
      if (title && /[\p{L}\p{N}]/u.test(title)) {
        parsed = { title, url: titleToUrl(title), raw };
      }
    }

    if (!parsed) continue;
    const key = parsed.url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(parsed);
  }

  return out;
}

/** Does this article's source list trigger the CC BY-SA obligation? */
export function requiresShareAlikeNotice(sources: readonly string[] | undefined): boolean {
  return parseWikipediaSources(sources).length > 0;
}

/**
 * The complete attribution block for one article, or null when the article
 * cites no Wikipedia at all. A renderer should print `notice`, then link each
 * `sources[i].title` to `sources[i].url`, then link `license.name` to
 * `license.url`.
 */
export function wikipediaAttribution(
  sources: readonly string[] | undefined,
): WikipediaAttribution | null {
  const parsed = parseWikipediaSources(sources);
  if (parsed.length === 0) return null;
  return {
    license: WIKIPEDIA_TEXT_LICENSE,
    sources: parsed,
    notice:
      parsed.length === 1
        ? `This article draws on the Wikipedia article linked below, by its contributors, ` +
          `available under ${WIKIPEDIA_TEXT_LICENSE.name}. Text derived from it is shared under the same licence.`
        : `This article draws on the ${parsed.length} Wikipedia articles linked below, by their contributors, ` +
          `available under ${WIKIPEDIA_TEXT_LICENSE.name}. Text derived from them is shared under the same licence.`,
  };
}
