import type { Metadata } from "next";
import { COMMONS_CREDITS, commonsSourcePage } from "../../lib/image-credits";

export const metadata: Metadata = {
 alternates: { canonical: 'https://darshya.online/credits' },
 title: "Image Credits",
 description:
 "Attribution for the photographs and artworks used on Darshya. Many images are sourced from Wikimedia Commons under Creative Commons licenses.",
};

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
 className="heading-display text-2xl sm:text-3xl font-bold mb-3"
 style={{
 color: "var(--color-text)",
 lineHeight: "var(--leading-tight)",
 }}
 >
 Image Credits & Attribution
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
 </div>
 );
}
