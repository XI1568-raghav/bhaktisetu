import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Globe, AlertTriangle } from "lucide-react";
import {
 getHelpArticle,
 isUnreviewedTranslation,
 HELP_ARTICLES,
 HELP_LANGS,
 HELP_SOURCE_LANG,
 type HelpLang,
} from "../../../../../lib/help-articles";

// NOTE: no `runtime = 'edge'` here — forbidden under @opennextjs/cloudflare
// (Node runtime only, via nodejs_compat). generateStaticParams (below) + ISR
// (revalidate=86400) both run on the default Node runtime, which OpenNext
// prerenders fine. (Earlier, under @cloudflare/next-on-pages, edge +
// generateStaticParams were mutually exclusive and blocked the whole build;
// that constraint is moot now that edge runtime is removed app-wide.)
export const revalidate = 86400;

type Params = Promise<{ lang: string; slug: string }>;

export async function generateMetadata({
 params,
}: {
 params: Params;
}): Promise<Metadata> {
 const { lang, slug } = await params;
 const article = getHelpArticle(lang as HelpLang, slug);
 if (!article) return { title: "Help Article Not Found" };

 const langInfo = HELP_LANGS.find((l) => l.code === article.lang);
 const alternates: Record<string, string> = {};
 for (const l of HELP_LANGS) {
 const translated = HELP_ARTICLES.find(
 (a) => a.slug === slug && a.lang === l.code,
 );
 if (translated) {
 alternates[l.code] = `/help/articles/${l.code}/${slug}`;
 }
 }

 return {
 title: `${article.title} — Help`,
 description: article.summary,
 /**
  * I-09 — an unattested translation must not become the indexed answer.
  *
  * Five of the six seed articles carry `reviewed_by: null`, which the schema
  * itself defines as "pending review". They are machine translations of
  * instructions about payments, cancellation and ritual, and they were served
  * with hreflang alternates and a content-language header asserting them as
  * proper localizations — i.e. actively offered to Google as THE Hindi/Tamil/
  * Telugu/Bengali/Marathi answer. `follow` stays on so the links out of the
  * page still carry weight; only the unreviewed copy itself is withheld.
  * Attest the translation (set `reviewed_by`) and it indexes immediately.
  */
 ...(isUnreviewedTranslation(article)
 ? { robots: { index: false, follow: true } }
 : {}),
 openGraph: {
 images: ['/images/golden-temple-og.jpg'],
 title: article.title,
 description: article.summary,
 locale: article.lang,
 },
 alternates: {
 canonical: `/help/articles/${article.lang}/${article.slug}`,
 languages: alternates,
 },
 other: {
 "content-language": langInfo?.code ?? "en",
 },
 };
}

export async function generateStaticParams() {
 return HELP_ARTICLES.map((a) => ({ lang: a.lang, slug: a.slug }));
}

function renderMarkdown(md: string): string {
 // Minimal MD → HTML: headings, lists, links, paragraphs.
 const lines = md.split("\n");
 const out: string[] = [];
 let inList = false;
 let inOl = false;

 const closeList = () => {
 if (inList) {
 out.push("</ul>");
 inList = false;
 }
 if (inOl) {
 out.push("</ol>");
 inOl = false;
 }
 };

 for (const raw of lines) {
 const line = raw.trim();
 if (!line) {
 closeList();
 continue;
 }
 if (line.startsWith("## ")) {
 closeList();
 out.push(
 `<h2 class="text-xl font-semibold text-surface-900 mt-8 mb-3">${escapeHtml(line.slice(3))}</h2>`,
 );
 continue;
 }
 if (line.startsWith("# ")) {
 closeList();
 out.push(
 `<h1 class="text-2xl font-bold text-surface-900 mt-8 mb-4">${escapeHtml(line.slice(2))}</h1>`,
 );
 continue;
 }
 const ol = line.match(/^(\d+)\.\s+(.*)$/);
 if (ol) {
 if (inList) {
 out.push("</ul>");
 inList = false;
 }
 if (!inOl) {
 out.push(
 '<ol class="list-decimal list-inside space-y-2 text-surface-700 mb-4">',
 );
 inOl = true;
 }
 out.push(`<li>${renderInline(ol[2]!)}</li>`);
 continue;
 }
 if (line.startsWith("- ")) {
 if (inOl) {
 out.push("</ol>");
 inOl = false;
 }
 if (!inList) {
 out.push(
 '<ul class="list-disc list-inside space-y-2 text-surface-700 mb-4">',
 );
 inList = true;
 }
 out.push(`<li>${renderInline(line.slice(2))}</li>`);
 continue;
 }
 closeList();
 out.push(
 `<p class="text-surface-700 leading-relaxed mb-4">${renderInline(line)}</p>`,
 );
 }
 closeList();
 return out.join("\n");
}

function escapeHtml(s: string): string {
 return s
 .replace(/&/g, "&amp;")
 .replace(/</g, "&lt;")
 .replace(/>/g, "&gt;");
}

function renderInline(s: string): string {
 // Bold + links.
 let out = escapeHtml(s);
 out = out.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-surface-900">$1</strong>');
 out = out.replace(
 /\[([^\]]+)\]\(([^)]+)\)/g,
 '<a href="$2" class="text-saffron-700 underline hover:text-saffron-800">$1</a>',
 );
 return out;
}

export default async function HelpArticlePage({ params }: { params: Params }) {
 const { lang, slug } = await params;
 const article = getHelpArticle(lang as HelpLang, slug);
 if (!article) notFound();

 const langInfo = HELP_LANGS.find((l) => l.code === article.lang);
 const translations = HELP_ARTICLES.filter(
 (a) => a.slug === slug && a.lang !== article.lang,
 );

 const articleJsonLd = {
 "@context": "https://schema.org",
 "@type": "Article",
 headline: article.title,
 description: article.summary,
 inLanguage: article.lang,
 dateModified: article.updatedAt,
 author: { "@type": "Organization", name: "Darshya" },
 publisher: { "@type": "Organization", name: "Darshya" },
 };

 const breadcrumbJsonLd = {
 "@context": "https://schema.org",
 "@type": "BreadcrumbList",
 itemListElement: [
 { "@type": "ListItem", position: 1, name: "Help", item: "/help" },
 {
 "@type": "ListItem",
 position: 2,
 name: article.title,
 item: `/help/articles/${article.lang}/${article.slug}`,
 },
 ],
 };

 return (
 <div className="min-h-[100dvh] bg-surface-50 py-12">
 <script
 type="application/ld+json"
 dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
 />
 <script
 type="application/ld+json"
 dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
 />

 <article className="max-w-3xl mx-auto px-4">
 <Link
 href="/help"
 className="inline-flex items-center gap-1 text-sm text-surface-600 hover:text-saffron-700 mb-6"
 >
 <ChevronLeft className="w-4 h-4" />
 Back to Help Center
 </Link>

 <div className="bg-white rounded-xl border border-surface-200 p-8 shadow-sm">
 <div className="flex items-center gap-2 text-xs text-surface-500 mb-3 uppercase tracking-wider">
 <Globe className="w-3.5 h-3.5" />
 {langInfo?.native ?? article.lang}
 <span>·</span>
 <span>{article.category.replace("-", " ")}</span>
 </div>

 <h1 className="text-3xl font-bold text-surface-900 mb-4" lang={article.lang}>
 {article.title}
 </h1>

 {/* I-09: the review state was carried in the data and rendered nowhere, so
     an unchecked machine translation about refunds read with exactly the
     authority of copy a person had signed off. Say it, above the answer,
     and point at the English original which is the reviewed one. */}
 {isUnreviewedTranslation(article) && (
 <div
 className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 mb-6"
 role="note"
 >
 <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
 <p className="text-xs text-amber-900 leading-relaxed">
 <strong className="font-semibold">
 Machine translated — pending review.
 </strong>{" "}
 No native speaker has checked this translation yet. For anything
 involving money or timing, the{" "}
 <Link
 href={`/help/articles/${HELP_SOURCE_LANG}/${article.slug}`}
 className="underline"
 >
 English original
 </Link>{" "}
 is the version we stand behind.
 </p>
 </div>
 )}

 <p
 className="text-lg text-surface-700 leading-relaxed mb-6 pb-6 border-b border-surface-200"
 lang={article.lang}
 >
 {article.summary}
 </p>

 <div
 className="prose-help"
 lang={article.lang}
 dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body) }}
 />

 <div className="mt-8 pt-6 border-t border-surface-200 text-xs text-surface-500">
 Last updated {article.updatedAt}
 </div>
 </div>

 {translations.length > 0 && (
 <div className="mt-6 bg-white rounded-xl border border-surface-200 p-6">
 <h2 className="text-sm font-semibold text-surface-900 mb-3 uppercase tracking-wider">
 Read in another language
 </h2>
 <div className="flex flex-wrap gap-2">
 {translations.map((t) => {
 const info = HELP_LANGS.find((l) => l.code === t.lang);
 return (
 <Link
 key={t.lang}
 href={`/help/articles/${t.lang}/${t.slug}`}
 className="px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-saffron-50 text-sm text-surface-700 hover:text-saffron-800 border border-surface-200 transition-colors"
 lang={t.lang}
 >
 {info?.native ?? t.lang}
 </Link>
 );
 })}
 </div>
 </div>
 )}
 </article>
 </div>
 );
}
