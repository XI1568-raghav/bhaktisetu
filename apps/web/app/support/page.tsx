import Link from 'next/link';
import {
 LifeBuoy,
 Search,
 Phone,
 Mail,
 MessageSquare,
 Ticket as TicketIcon,
 ArrowRight,
 CheckCircle2,
 Clock,
} from 'lucide-react';
import { SUPPORT_CATEGORIES, POPULAR_ARTICLES } from '../../lib/support';

export const metadata = {
 title: 'Support Center — Darshya',
 description:
 'Get help with puja bookings, darshan, payments, store orders, and more. Contact Darshya support or raise a ticket.',
};

export default function SupportPage() {
 return (
 <div className="bg-[#faf7f0] min-h-screen">
 {/* Hero */}
 <section className="bg-gradient-to-b from-[#fdf6e7] to-[#faf7f0] border-b border-amber-200/40">
 <div className="max-w-5xl mx-auto px-6 py-16 lg:py-20 text-center">
 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-saffron-100 text-saffron-800 text-xs font-medium mb-5">
 <LifeBuoy className="w-3.5 h-3.5" />
 Darshya Support Center
 </div>
 <h1 className="text-4xl lg:text-5xl font-[family-name:var(--font-display)] font-bold text-surface-900 tracking-tight mb-4">
 How can we help you today?
 </h1>
 <p className="text-surface-600 text-base lg:text-lg max-w-2xl mx-auto mb-8">
 Search articles, browse categories, or talk to a human — we&apos;re here 8am to 11pm IST, every day.
 </p>

 {/* Search */}
 <div className="max-w-2xl mx-auto relative">
 <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
 <input
 type="search"
 placeholder="Search for help articles..."
 className="w-full pl-12 pr-4 py-4 rounded-xl bg-white border border-surface-200 focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none text-sm"
 />
 </div>

 {/* Quick contact row */}
 <div className="mt-8 flex flex-wrap justify-center gap-3">
 <a
 href="tel:+918069009000"
 className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-surface-200 hover:border-saffron-400 hover:shadow-sm transition-all text-sm font-medium text-surface-700"
 >
 <Phone className="w-4 h-4 text-saffron-600" />
 +91-80-6900-9000
 </a>
 <a
 href="mailto:support@darshya.online"
 className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-surface-200 hover:border-saffron-400 hover:shadow-sm transition-all text-sm font-medium text-surface-700"
 >
 <Mail className="w-4 h-4 text-saffron-600" />
 support@darshya.online
 </a>
 <a
 href="https://wa.me/919876543210"
 target="_blank"
 rel="noreferrer"
 className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-surface-200 hover:border-saffron-400 hover:shadow-sm transition-all text-sm font-medium text-surface-700"
 >
 <MessageSquare className="w-4 h-4 text-green-600" />
 WhatsApp
 </a>
 <Link
 href="/support/ticket/new"
 className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-saffron-600 hover:bg-saffron-700 text-white text-sm font-semibold transition-colors"
 >
 <TicketIcon className="w-4 h-4" />
 Open Ticket
 </Link>
 </div>
 </div>
 </section>

 {/* Categories */}
 <section className="py-14">
 <div className="max-w-6xl mx-auto px-6">
 <div className="flex items-end justify-between mb-8">
 <div>
 <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-surface-900 tracking-tight">
 Browse by category
 </h2>
 <p className="text-sm text-surface-500 mt-1">Pick the area that matches your question.</p>
 </div>
 <Link
 href="/support/faq"
 className="text-sm font-medium text-saffron-700 hover:text-saffron-800 hidden sm:inline-flex items-center gap-1"
 >
 View full FAQ <ArrowRight className="w-4 h-4" />
 </Link>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {SUPPORT_CATEGORIES.map((cat) => (
 <Link
 key={cat.id}
 href={`/support/faq?cat=${cat.id}`}
 className="group bg-white rounded-xl border border-surface-200 p-5 hover:border-saffron-400 hover:-translate-y-0.5 hover:shadow-md transition-all"
 >
 <div className="text-3xl mb-3">{cat.emoji}</div>
 <h3 className="font-semibold text-surface-900 text-[15px] mb-1">{cat.name}</h3>
 <p className="text-xs text-surface-500 leading-relaxed">{cat.description}</p>
 </Link>
 ))}
 </div>
 </div>
 </section>

 {/* Popular articles */}
 <section className="py-14 bg-white border-y border-surface-200/60">
 <div className="max-w-6xl mx-auto px-6">
 <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-surface-900 tracking-tight mb-1">
 Popular articles
 </h2>
 <p className="text-sm text-surface-500 mb-8">The ones devotees read most this week.</p>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-2">
 {POPULAR_ARTICLES.map((article, idx) => (
 <a
 key={article.id}
 href="#"
 className="group flex items-start gap-4 py-4 border-b border-surface-100 hover:border-saffron-300 transition-colors"
 >
 <span className="text-sm font-bold text-saffron-600 w-6 shrink-0 pt-0.5">
 {String(idx + 1).padStart(2, '0')}
 </span>
 <div className="flex-1 min-w-0">
 <h4 className="font-semibold text-surface-900 text-[15px] group-hover:text-saffron-700 transition-colors">
 {article.title}
 </h4>
 <p className="text-xs text-surface-500 mt-1 line-clamp-2">{article.excerpt}</p>
 <div className="flex items-center gap-3 mt-1.5 text-[11px] text-surface-400">
 <span>{article.category}</span>
 <span>•</span>
 <span className="inline-flex items-center gap-1">
 <Clock className="w-3 h-3" /> {article.readTime}
 </span>
 </div>
 </div>
 <ArrowRight className="w-4 h-4 text-surface-300 group-hover:text-saffron-600 group-hover:translate-x-0.5 transition-all mt-1" />
 </a>
 ))}
 </div>
 </div>
 </section>

 {/* Status + CTA row */}
 <section className="py-14">
 <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="bg-white rounded-xl border border-surface-200 p-6 flex items-center gap-4">
 <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
 <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
 </div>
 <div className="flex-1">
 <h3 className="font-semibold text-surface-900 text-[15px] flex items-center gap-2">
 All systems operational
 <CheckCircle2 className="w-4 h-4 text-green-600" />
 </h3>
 <p className="text-xs text-surface-500 mt-0.5">
 Streaming, payments, and bookings running normally. Last check: just now.
 </p>
 </div>
 <a href="#" className="text-xs font-medium text-saffron-700 hover:text-saffron-800">
 Status page →
 </a>
 </div>

 <div className="bg-gradient-to-br from-saffron-600 to-saffron-700 rounded-xl p-6 text-white flex items-center gap-4">
 <div className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
 <TicketIcon className="w-6 h-6" />
 </div>
 <div className="flex-1">
 <h3 className="font-semibold text-[15px]">Still need help?</h3>
 <p className="text-xs text-white/80 mt-0.5">Raise a ticket — first response in 4 hours.</p>
 </div>
 <Link
 href="/support/ticket/new"
 className="px-4 py-2 bg-white text-saffron-700 rounded-lg text-sm font-semibold hover:bg-amber-50 transition-colors"
 >
 Open ticket
 </Link>
 </div>
 </div>
 </section>

 {/* My tickets shortcut */}
 <section className="pb-16">
 <div className="max-w-6xl mx-auto px-6">
 <Link
 href="/support/tickets"
 className="block bg-white rounded-xl border border-surface-200 p-5 hover:border-saffron-400 hover:shadow-sm transition-all"
 >
 <div className="flex items-center justify-between">
 <div>
 <h3 className="font-semibold text-surface-900 text-[15px]">View my tickets</h3>
 <p className="text-xs text-surface-500 mt-0.5">Check status of tickets you&apos;ve raised.</p>
 </div>
 <ArrowRight className="w-5 h-5 text-surface-400" />
 </div>
 </Link>
 </div>
 </section>
 </div>
 );
}
