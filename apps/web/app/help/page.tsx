import type { Metadata } from "next";
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
} from "lucide-react";

export const metadata: Metadata = {
 title: "Help Center",
 description:
 "Find answers to common questions about Darshya \u2014 puja bookings, live darshan, store orders, payments, refunds, and account management.",
};

const categories = [
 {
 icon: Flame,
 title: "Puja Bookings",
 description: "How to book, modify, or cancel a puja. Understanding sankalp, prasad delivery, and video proof.",
 articles: [
 "How do I book a puja?",
 "Can I reschedule a puja booking?",
 "How does video proof work?",
 "Will I receive prasad at home?",
 "What information is needed for sankalp?",
 ],
 },
 {
 icon: Video,
 title: "Live Darshan",
 description: "Streaming quality, schedules, temple timings, and troubleshooting playback issues.",
 articles: [
 "How do I watch live darshan?",
 "What are temple darshan timings?",
 "Stream is buffering or not loading",
 "Can I watch darshan recordings?",
 "Is darshan available on mobile?",
 ],
 },
 {
 icon: ShoppingBag,
 title: "Store & Orders",
 description: "Order tracking, delivery timelines, product authenticity, and return requests.",
 articles: [
 "How do I track my order?",
 "What is the delivery timeline?",
 "Are products authentic?",
 "How do I return an item?",
 "Do you deliver internationally?",
 ],
 },
 {
 icon: CreditCard,
 title: "Payments & Refunds",
 description: "Payment methods, failed transactions, refund timelines, and NRI pricing.",
 articles: [
 "What payment methods are accepted?",
 "My payment failed but money was deducted",
 "How long do refunds take?",
 "Why are NRI prices different?",
 "Can I pay via UPI?",
 ],
 },
 {
 icon: User,
 title: "Account & Profile",
 description: "Login issues, profile updates, gotra/nakshatra settings, and family member management.",
 articles: [
 "How do I create an account?",
 "I forgot my password",
 "How do I update my gotra?",
 "Can I add family members?",
 "How do I delete my account?",
 ],
 },
 {
 icon: HelpCircle,
 title: "General",
 description: "About Darshya, temple partnerships, content submissions, and feature requests.",
 articles: [
 "What is Darshya?",
 "How are temples verified?",
 "Can my temple join Darshya?",
 "How do I submit a bhajan or aarti?",
 "Where can I give feedback?",
 ],
 },
];

export default function HelpPage() {
 return (
 <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
 {/* Hero */}
 <section
 className="py-14 sm:py-20"
 style={{ background: "var(--color-surface)" }}
 >
 <div className="max-w-3xl mx-auto px-6 sm:px-8 text-center">
 <p
 className="text-xs font-semibold uppercase tracking-widest mb-3"
 style={{ color: "var(--color-primary)" }}
 >
 Help Center
 </p>
 <h1
 className="text-2xl sm:text-3xl font-bold mb-5"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 lineHeight: "var(--leading-tight)",
 }}
 >
 How Can We Help You?
 </h1>
 <div className="relative max-w-md mx-auto">
 <Search
 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
 style={{ color: "var(--color-text-faint)" }}
 />
 <input
 type="text"
 placeholder="Search for help articles..."
 className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg outline-none transition-colors"
 style={{
 background: "var(--color-bg)",
 border: "1px solid var(--color-border)",
 color: "var(--color-text)",
 }}
 />
 </div>
 </div>
 </section>

 {/* Categories */}
 <section className="py-14 sm:py-20">
 <div className="max-w-5xl mx-auto px-6 sm:px-8">
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
 {categories.map((cat) => {
 const Icon = cat.icon;
 return (
 <div
 key={cat.title}
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
 <h2
 className="text-sm font-semibold"
 style={{ color: "var(--color-text)" }}
 >
 {cat.title}
 </h2>
 </div>
 <p
 className="text-xs leading-relaxed mb-4"
 style={{ color: "var(--color-text-muted)" }}
 >
 {cat.description}
 </p>
 <ul className="space-y-1.5">
 {cat.articles.map((article) => (
 <li key={article}>
 <a
 href={`/support/faq?q=${encodeURIComponent(article)}`}
 className="flex items-center gap-1.5 text-xs py-1 transition-colors group"
 style={{ color: "var(--color-text-muted)" }}
 >
 <ChevronRight
 className="w-3 h-3 shrink-0 transition-transform group-hover:translate-x-0.5"
 style={{ color: "var(--color-text-faint)" }}
 />
 <span className="group-hover:underline">{article}</span>
 </a>
 </li>
 ))}
 </ul>
 </div>
 );
 })}
 </div>
 </div>
 </section>

 {/* Still need help */}
 <section
 className="py-14 sm:py-20"
 style={{ background: "var(--color-surface)" }}
 >
 <div className="max-w-3xl mx-auto px-6 sm:px-8 text-center">
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
 <a
 href="/contact"
 className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg btn-press transition-colors"
 style={{
 background: "var(--color-primary)",
 color: "var(--color-text-inverse)",
 }}
 >
 <Mail className="w-3.5 h-3.5" />
 Contact Support
 </a>
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
