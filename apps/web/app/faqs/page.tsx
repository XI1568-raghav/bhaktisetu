import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
import { FAQ_GROUPS, allFaqs, faqPageJsonLd } from '../../lib/faqs';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'FAQs — Puja Booking, Live Darshan, Pricing, Yatra',
  description:
    'Frequently asked questions about Darshya — how to book pujas, video proof, NRI pricing, yatra packages, refunds, 80G receipts, live darshan.',
  alternates: { canonical: 'https://darshya.online/faqs' },
  openGraph: {
    title: 'Darshya FAQs',
    description: 'Answers to common questions about puja booking, live darshan, NRI pricing, yatra.',
    url: 'https://darshya.online/faqs',
    type: 'website',
    images: ['/og/default.png'],
  },
};

export default function FaqsHub() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd(allFaqs())) }}
      />

      <header className="text-center mb-10">
        <div className="inline-block px-3 py-1 mb-3 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
          Help · FAQs
        </div>
        <h1 className={`${H1.marketing} mb-3`}>
          Frequently Asked Questions
        </h1>
        <p className="text-surface-700 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          Quick answers to common questions about puja booking, live darshan,
          NRI pricing, yatra packages, refunds, and 80G receipts. Can't find
          your question? <Link href="/contact" className="text-saffron-700 hover:underline">Contact us</Link>.
        </p>
      </header>

      <nav className="mb-8 p-4 rounded-lg bg-surface-50 border border-surface-200">
        <p className="text-xs font-semibold uppercase tracking-wide text-surface-600 mb-2">Jump to</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {FAQ_GROUPS.map((g) => (
            <li key={g.slug}>
              <a href={`#${g.slug}`} className="text-saffron-700 hover:underline">{g.title}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-10">
        {FAQ_GROUPS.map((g) => (
          <section key={g.slug} id={g.slug} className="scroll-mt-20">
            <h2 className="text-2xl font-bold text-surface-900 mb-1">{g.title}</h2>
            <p className="text-sm text-surface-600 mb-4">{g.description}</p>
            <div className="space-y-3">
              {g.faqs.map((f, i) => (
                <details
                  key={i}
                  className="group rounded-lg border border-surface-200 bg-white px-4 py-3 hover:border-saffron-300 transition"
                >
                  <summary className="cursor-pointer font-semibold text-surface-900 text-base list-none flex items-start justify-between gap-3">
                    <span>{f.q}</span>
                    <span className="text-saffron-600 shrink-0 mt-0.5 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                  </summary>
                  <p className="mt-3 text-sm text-surface-700 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-12 rounded-xl border border-saffron-200 bg-saffron-50 p-6 text-center">
        <h2 className="text-xl font-bold text-surface-900 mb-2">Still have questions?</h2>
        <p className="text-surface-700 text-sm mb-4">We respond within 24 hours on weekdays.</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/contact" className="px-5 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700">
            Contact us
          </Link>
          <a href="https://wa.me/919255109400" className="px-5 py-2 border border-saffron-600 text-saffron-700 rounded-md text-sm font-semibold hover:bg-saffron-50">
            WhatsApp →
          </a>
        </div>
      </section>
    </main>
  );
}
