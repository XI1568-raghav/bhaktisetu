import type { Metadata } from "next";
import Link from "next/link";
import { COMMONS_CREDITS, commonsSourcePage } from "../../lib/image-credits";
import { H1 } from '../../components/ui/heading-recipe';
// CI-15 — Wikipedia text is CC BY-SA 4.0 and attribution is a CONDITION of
// that licence, not a courtesy. components/CategoryArticle.tsx discharges the
// per-article half; this is the site-level register, so a reader can learn the
// licence in one place instead of opening sixty articles one at a time. The
// list is derived from the published corpus rather than typed out, so an
// article added or a citation removed cannot leave the notice stale.
import { getAllArticlesAcrossCategories, type KnowledgeCategory } from "../../lib/content";
import {
 WIKIPEDIA_TEXT_LICENSE,
 parseWikipediaSources,
 requiresShareAlikeNotice,
} from "../../lib/encyclopedia-attribution";

export const metadata: Metadata = {
 alternates: { canonical: 'https://darshya.online/credits' },
 title: "Credits & Attribution",
 description:
 "Attribution for the photographs, artworks and article text used on Darshya. Images come from Wikimedia Commons under Creative Commons or public-domain licenses; article text drawing on Wikipedia is used, and re-shared, under CC BY-SA 4.0.",
};

const CATEGORY_LABEL: Record<KnowledgeCategory, string> = {
 ved: "Vedas",
 sanatan: "Sanatan Dharm",
 sanskrit: "Sanskrit",
};

/**
 * Every published article whose `sources` frontmatter cites Wikipedia, with
 * the citations already parsed into linkable {title, url} pairs.
 */
const TEXT_SOURCES = getAllArticlesAcrossCategories()
 .filter((a) => requiresShareAlikeNotice(a.frontmatter.sources))
 .map((a) => ({
 category: a.frontmatter.category,
 slug: a.frontmatter.slug,
 title: a.frontmatter.title,
 href: `/${a.frontmatter.category}/${a.frontmatter.slug}`,
 cites: parseWikipediaSources(a.frontmatter.sources),
 }));

const TEXT_SOURCE_GROUPS = (["ved", "sanatan", "sanskrit"] as KnowledgeCategory[])
 .map((category) => ({
 category,
 label: CATEGORY_LABEL[category],
 articles: TEXT_SOURCES.filter((a) => a.category === category),
 }))
 .filter((g) => g.articles.length > 0);

/**
 * CM-08 — this page renders lib/image-credits.ts, it does not keep its own list.
 *
 * It used to declare a hardcoded 57-row `wikimediaCredits` array while the
 * register (70 rows, provenance read from the Commons imageinfo/extmetadata
 * API) sat beside it with zero production consumers. The two drifted: 14
 * register rows were missing from the page, 11 of them attribution-required,
 * and a delisted file (MKJNTemple.jpg) was still being credited here after the
 * register had replaced it. One list, one source of truth.
 *
 * Guarded by __tests__/cm08-credits-page-renders-register.test.tsx, which
 * asserts on the RENDERED output — a source grep would pass on an unused import.
 */

export default function CreditsPage() {
 return (
 <div className="min-h-[100dvh]" style={{ background: "var(--color-bg)" }}>
 <section
 className="py-14 sm:py-20"
 style={{ background: "var(--color-surface)" }}
 >
 <div className="max-w-3xl mx-auto px-6 sm:px-8">
 <p
 className="text-xs font-semibold uppercase tracking-widest mb-3"
 style={{ color: "var(--color-primary)" }}
 >
 Credits
 </p>
 <h1
 className={`${H1.catalogue} mb-3`}
 >
 Credits &amp; Attribution
 </h1>
 <p
 className="text-sm leading-relaxed"
 style={{ color: "var(--color-text-muted)" }}
 >
 Many photographs and artworks shown on Darshya are sourced from
 Wikimedia Commons under Creative Commons or public-domain licenses.
 Each image below links to its source page on Wikimedia Commons,
 where you can view the full license terms and original file.
 </p>
 <p
 className="mt-3 text-sm leading-relaxed"
 style={{ color: "var(--color-text-muted)" }}
 >
 Article text is credited too. {TEXT_SOURCES.length} of our
 encyclopedia articles draw on Wikipedia, which is published under{" "}
 {WIKIPEDIA_TEXT_LICENSE.name} — see{" "}
 <a href="#text-sources" className="underline" style={{ color: "var(--color-primary)" }}>
 Text sources
 </a>{" "}
 below.
 </p>
 </div>
 </section>

 <section className="py-12 sm:py-16">
 <div className="max-w-4xl mx-auto px-6 sm:px-8">
 <h2
 className="text-lg font-semibold mb-6"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 }}
 >
 Wikimedia Commons sources
 </h2>

 <div
 className="rounded-lg overflow-hidden border"
 style={{
 borderColor: "var(--color-border)",
 background: "var(--color-surface)",
 }}
 >
 <table className="w-full text-sm">
 <thead style={{ background: "var(--color-bg)" }}>
 <tr>
 <th
 className="text-left px-4 py-3 font-semibold"
 style={{ color: "var(--color-text)" }}
 >
 Subject
 </th>
 <th
 className="text-left px-4 py-3 font-semibold hidden sm:table-cell"
 style={{ color: "var(--color-text)" }}
 >
 Author
 </th>
 <th
 className="text-left px-4 py-3 font-semibold"
 style={{ color: "var(--color-text)" }}
 >
 License
 </th>
 </tr>
 </thead>
 <tbody>
 {COMMONS_CREDITS.map((c) => (
 <tr
 key={c.file}
 className="border-t"
 style={{ borderColor: "var(--color-border)" }}
 >
 <td className="px-4 py-3" style={{ color: "var(--color-text)" }}>
 <a
 href={commonsSourcePage(c.file)}
 target="_blank"
 rel="noopener noreferrer"
 className="hover:underline"
 style={{ color: "var(--color-primary)" }}
 >
 {c.subject}
 </a>
 </td>
 <td
 className="px-4 py-3 hidden sm:table-cell"
 style={{ color: "var(--color-text-muted)" }}
 >
 {c.author}
 </td>
 <td
 className="px-4 py-3 text-xs"
 style={{ color: "var(--color-text-muted)" }}
 >
 {c.licenseUrl ? (
 <a
 href={c.licenseUrl}
 target="_blank"
 rel="noopener noreferrer license"
 className="hover:underline"
 >
 {c.license}
 </a>
 ) : (
 c.license
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 <div
 className="mt-10 text-xs leading-relaxed"
 style={{ color: "var(--color-text-muted)" }}
 >
 <h3
 className="text-sm font-semibold mb-2"
 style={{ color: "var(--color-text)" }}
 >
 Other image sources
 </h3>
 <p className="mb-3">
 Puja samagri and store product photography is largely Wikimedia
 Commons as well — those files are credited in the table above, under
 the same licence terms. The remaining stock shots, profile portraits
 and abstract backgrounds come from{" "}
 <a
 href="https://unsplash.com/license"
 target="_blank"
 rel="noopener noreferrer"
 className="hover:underline"
 style={{ color: "var(--color-primary)" }}
 >
 Unsplash
 </a>
 , which is free to use for commercial and non-commercial purposes.
 </p>
 <p>
 The Darshya brand mark — the saffron shikhara enclosing a
 flame — is original artwork created for this project.
 </p>
 </div>

 <div
 className="mt-8 text-xs"
 style={{ color: "var(--color-text-muted)" }}
 >
 <p>
 Spotted an attribution that&apos;s wrong, or want to use one of
 these images yourself? Most Wikimedia Commons images can be
 freely used and re-used, provided you follow the original
 license. Click any subject above to see the full license text
 and downloadable original.
 </p>
 </div>
 </div>
 </section>

 {/*
 CI-15 — the text half of the licence obligation. Wikipedia prose is
 CC BY-SA 4.0: reuse is allowed, attribution and share-alike are the
 price. Every article below already carries its own notice; this is the
 one place the whole reuse is declared at once, and the licence and the
 wording both come from lib/encyclopedia-attribution.ts so the two
 surfaces cannot drift.
 */}
 <section
 id="text-sources"
 data-testid="text-sources"
 className="pb-16"
 >
 <div className="max-w-4xl mx-auto px-6 sm:px-8">
 <h2
 className="text-lg font-semibold mb-4"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 }}
 >
 Text sources
 </h2>

 <div
 className="rounded-lg border p-5 text-sm leading-relaxed"
 style={{
 borderColor: "var(--color-border)",
 background: "var(--color-surface)",
 color: "var(--color-text-muted)",
 }}
 >
 <p>
 {TEXT_SOURCES.length} of the encyclopedia articles on Darshya draw on
 Wikipedia, whose text is published by its contributors under the{" "}
 <a
 href={WIKIPEDIA_TEXT_LICENSE.url}
 target="_blank"
 rel="noopener noreferrer license"
 className="underline"
 style={{ color: "var(--color-primary)" }}
 >
 {WIKIPEDIA_TEXT_LICENSE.name}
 </a>{" "}
 licence ({WIKIPEDIA_TEXT_LICENSE.fullName}). Text on Darshya derived
 from those articles is shared under the same licence, and each article
 links back to the Wikipedia page it draws on — the authorship history
 lives there. Everything else on this site is our own work and is not
 covered by that licence.
 </p>
 <p className="mt-3">
 The licence also asks that we point to its{" "}
 <a
 href={WIKIPEDIA_TEXT_LICENSE.disclaimerUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="underline"
 style={{ color: "var(--color-primary)" }}
 >
 disclaimer of warranties
 </a>
 . Spotted an attribution that is wrong or missing? Tell us and we will
 correct it.
 </p>
 </div>

 {TEXT_SOURCE_GROUPS.map((group) => (
 <div key={group.category} className="mt-8">
 <h3
 className="text-sm font-semibold mb-3"
 style={{ color: "var(--color-text)" }}
 >
 {group.label} — {group.articles.length}{" "}
 {group.articles.length === 1 ? "article" : "articles"}
 </h3>
 <ul className="space-y-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
 {group.articles.map((a) => (
 <li key={a.href}>
 <Link
 href={a.href}
 className="font-medium hover:underline"
 style={{ color: "var(--color-text)" }}
 >
 {a.title}
 </Link>
 <span> — draws on </span>
 {a.cites.map((s, i) => (
 <span key={s.url}>
 {i > 0 && <span>, </span>}
 <a
 href={s.url}
 target="_blank"
 rel="noopener noreferrer"
 className="hover:underline"
 style={{ color: "var(--color-primary)" }}
 >
 {s.title}
 </a>
 </span>
 ))}
 </li>
 ))}
 </ul>
 </div>
 ))}
 </div>
 </section>
 </div>
 );
}
