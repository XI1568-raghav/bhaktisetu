import type { Metadata } from "next";
import Link from "next/link";
import {
 Search,
 Video,
 Flame,
 ShoppingBag,
 CreditCard,
 User,
 HelpCircle,
 ChevronRight,
 Mail,
 MessageCircle,
 Globe,
} from "lucide-react";
import {
 HELP_CATEGORIES,
 HELP_LANGS,
 HELP_SOURCE_LANG,
 getHelpArticleCount,
 getHelpArticlesByCategory,
 getHelpArticlesByLang,
 isUnreviewedTranslation,
 type HelpCategory,
} from "../../lib/help-articles";
import { FAQ_ITEMS, FAQ_SECTIONS } from "../../lib/support";

import { buttonClass } from '../../components/ui/button-recipe';
import { H1 } from '../../components/ui/heading-recipe';
/**
 * I-09 / I18N-09 (prod sweep 2026-08-12) — THE HELP CENTRE THAT LINKED TO
 * NOTHING.
 *
 * This page used to be a hardcoded array of six categories × five question
 * titles. Not one of the thirty was a link to an answer: each pointed at
 * `/support/faq?q=<title>`, a parameter the FAQ page did not read, and roughly
 * half named a question the FAQ does not contain — "Can I add family members?",
 * "How do I update my gotra?", "Is darshan available on mobile?" — so even a
 * working filter would have returned nothing. Meanwhile the six localized
 * articles that DO exist appeared nowhere on this page; grep for "help/articles"
 * across the whole app matched only inside the article template itself, and the
 * only route in was to type the URL.
 *
 * Everything below is now derived. The guides come from HELP_ARTICLES, the
 * questions from FAQ_ITEMS, the language row from HELP_LANGS, and the coverage
 * figures from getHelpArticleCount(). A new article is linked the moment it is
 * written, and a question cannot be advertised unless an answer exists.
 */

export const metadata: Metadata = {
 alternates: { canonical: 'https://darshya.online/help' },
 title: "Help Center",
 description:
 "Find answers to common questions about Darshya — puja bookings, live darshan, store orders, payments, refunds, and account management.",
};

const CATEGORY_ICONS: Record<HelpCategory, typeof Flame> = {
 "puja-bookings": Flame,
 "live-darshan": Video,
 "store-orders": ShoppingBag,
 "payments-refunds": CreditCard,
 "account-profile": User,
 general: HelpCircle,
};

const CATEGORY_BLURBS: Record<HelpCategory, string> = {
 "puja-bookings":
 "Booking a puja, what sankalp needs, and when the video proof of your ritual arrives.",
 "live-darshan": "Streaming, temple timings, and recordings.",
 "store-orders": "Order status, delivery charges, and what to do when a parcel is late.",
 "payments-refunds":
 "Cancellation windows, what each one refunds, when the money lands, and failed payments.",
 "account-profile": "Sign-in, your details, and account security.",
 general: "About Darshya, receipts, and everything that fits nowhere else.",
};

export default function HelpPage() {
 const counts = getHelpArticleCount();
 const englishArticles = getHelpArticlesByLang(HELP_SOURCE_LANG);
 const categoriesWithArticles = HELP_CATEGORIES.map((cat) => ({
 ...cat,
 articles: getHelpArticlesByCategory(HELP_SOURCE_LANG, cat.id),
 })).filter((cat) => cat.articles.length > 0);

 const questionsBySection = FAQ_SECTIONS.map((section) => ({
 section,
 items: FAQ_ITEMS.filter((i) => i.section === section).slice(0, 5),
 })).filter((s) => s.items.length > 0);

 const otherLanguages = HELP_LANGS.filter(
 (l) => l.code !== HELP_SOURCE_LANG && counts.byLang[l.code] > 0,
 );

 return (
 <div className="min-h-[100dvh]" style={{ background: "var(--color-bg)" }}>
 {/* Hero */}
 <section
 className="py-14 sm:py-20"
 style={{ background: "var(--color-surface)" }}
 >
 <div className="container-prose text-center">
 <p
 className="text-xs font-semibold uppercase tracking-widest mb-3"
 style={{ color: "var(--color-primary)" }}
 >
 Help Center
 </p>
 <h1
 className={`${H1.catalogue} mb-5`}
 >
 How Can We Help You?
 </h1>
 {/* A plain GET form: it works without JavaScript and lands on the FAQ
     with the query already applied, which is the same entry point every
     link on this page uses. */}
 <form action="/support/faq" method="get" className="relative max-w-md mx-auto">
 <Search
 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
 style={{ color: "var(--color-text-faint)" }}
 />
 <input
 type="search"
 name="q"
 aria-label="Search help articles"
 placeholder="Search for help articles..."
 className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg outline-none transition-colors"
 style={{
 background: "var(--color-bg)",
 border: "1px solid var(--color-border)",
 color: "var(--color-text)",
 }}
 />
 </form>
 <p className="mt-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
 {englishArticles.length} step-by-step guides and {FAQ_ITEMS.length} short
 answers. Written as they are needed, so everything listed here exists.
 </p>
 </div>
 </section>

 {/* Guides — the real article catalogue */}
 <section className="py-14 sm:py-20">
 <div className="container-wide">
 <h2
 className="text-lg font-bold mb-6"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 }}
 >
 Guides
 </h2>
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
 {categoriesWithArticles.map((cat) => {
 const Icon = CATEGORY_ICONS[cat.id];
 return (
 <div
 key={cat.id}
 className="p-5 rounded-xl"
 style={{
 background: "var(--color-surface)",
 border: "1px solid var(--color-border)",
 }}
 >
 <div className="flex items-center gap-2.5 mb-3">
 <div
 className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
 style={{ background: "var(--color-primary-highlight)" }}
 >
 <Icon
 className="w-4 h-4"
 style={{ color: "var(--color-primary)" }}
 />
 </div>
 <h3
 className="text-sm font-semibold"
 style={{ color: "var(--color-text)" }}
 >
 {cat.en}
 </h3>
 </div>
 <p
 className="text-xs leading-relaxed mb-4"
 style={{ color: "var(--color-text-muted)" }}
 >
 {CATEGORY_BLURBS[cat.id]}
 </p>
 <ul className="space-y-1.5">
 {cat.articles.map((article) => (
 <li key={article.slug}>
 <Link
 href={`/help/articles/${article.lang}/${article.slug}`}
 className="flex items-center gap-1.5 text-xs py-1 transition-colors group"
 style={{ color: "var(--color-text-muted)" }}
 >
 <ChevronRight
 className="w-3 h-3 shrink-0 transition-transform group-hover:translate-x-0.5"
 style={{ color: "var(--color-text-faint)" }}
 />
 <span className="group-hover:underline">{article.title}</span>
 </Link>
 </li>
 ))}
 </ul>
 </div>
 );
 })}
 </div>
 </div>
 </section>

 {/* Quick answers — every one of these exists in the FAQ */}
 <section
 className="py-14 sm:py-20"
 style={{ background: "var(--color-surface)" }}
 >
 <div className="container-wide">
 <h2
 className="text-lg font-bold mb-6"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 }}
 >
 Quick answers
 </h2>
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
 {questionsBySection.map(({ section, items }) => (
 <div key={section}>
 <h3
 className="text-xs font-semibold uppercase tracking-wider mb-2"
 style={{ color: "var(--color-text)" }}
 >
 {section}
 </h3>
 <ul className="space-y-1">
 {items.map((item) => (
 <li key={item.id}>
 <a
 href={`/support/faq?q=${encodeURIComponent(item.question)}`}
 className="flex items-start gap-1.5 text-xs py-1 transition-colors group"
 style={{ color: "var(--color-text-muted)" }}
 >
 <ChevronRight
 className="w-3 h-3 shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5"
 style={{ color: "var(--color-text-faint)" }}
 />
 <span className="group-hover:underline">{item.question}</span>
 </a>
 </li>
 ))}
 </ul>
 </div>
 ))}
 </div>
 <p className="mt-6 text-xs" style={{ color: "var(--color-text-muted)" }}>
 <Link href="/support/faq" className="underline">
 See all {FAQ_ITEMS.length} answers
 </Link>
 </p>
 </div>
 </section>

 {/* Languages — only the ones with something to read */}
 {otherLanguages.length > 0 && (
 <section className="py-14 sm:py-20">
 <div className="container-wide">
 <div className="flex items-center gap-2 mb-2">
 <Globe className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
 <h2
 className="text-lg font-bold"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 }}
 >
 Read in your language
 </h2>
 </div>
 <p
 className="prose-body mb-5 max-w-2xl"
 style={{ color: "var(--color-text-muted)" }}
 >
 Translation is behind the English catalogue. Only the guides listed
 here exist in these languages; everything else is English for now, and
 a translation nobody has reviewed says so at the top of the article.
 </p>
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {otherLanguages.map((lang) => {
 const articles = getHelpArticlesByLang(lang.code);
 return (
 <div
 key={lang.code}
 className="p-4 rounded-xl"
 style={{
 background: "var(--color-surface)",
 border: "1px solid var(--color-border)",
 }}
 >
 <p
 className="text-sm font-semibold mb-1"
 lang={lang.code}
 style={{ color: "var(--color-text)" }}
 >
 {lang.native}
 </p>
 <p
 className="text-xs mb-2"
 style={{ color: "var(--color-text-faint)" }}
 >
 {articles.length} of {englishArticles.length} guides
 {articles.some(isUnreviewedTranslation) ? " · pending review" : ""}
 </p>
 <ul className="space-y-1">
 {articles.map((article) => (
 <li key={article.slug}>
 <Link
 href={`/help/articles/${article.lang}/${article.slug}`}
 lang={article.lang}
 className="text-xs underline"
 style={{ color: "var(--color-text-muted)" }}
 >
 {article.title}
 </Link>
 </li>
 ))}
 </ul>
 </div>
 );
 })}
 </div>
 </div>
 </section>
 )}

 {/* Still need help */}
 <section
 className="py-14 sm:py-20"
 style={{ background: "var(--color-surface)" }}
 >
 <div className="container-prose text-center">
 <h2
 className="text-xl font-bold mb-3"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 }}
 >
 Still Need Help?
 </h2>
 <p
 className="text-sm leading-relaxed mb-6 max-w-md mx-auto"
 style={{ color: "var(--color-text-muted)" }}
 >
 Our support team is available Monday through Saturday to assist
 you with any questions.
 </p>
 <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
 <Link
 href="/support/ticket/new"
 className={buttonClass('primary', 'md', 'btn-press')}
 >
 <Mail className="w-3.5 h-3.5" />
 Raise a ticket
 </Link>
 <a
 href="https://wa.me/919255109400"
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg btn-press transition-colors"
 style={{
 background: "var(--color-bg)",
 color: "var(--color-text)",
 border: "1px solid var(--color-border)",
 }}
 >
 <MessageCircle className="w-3.5 h-3.5" />
 WhatsApp Us
 </a>
 </div>
 </div>
 </section>
 </div>
 );
}
