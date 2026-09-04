import type { Metadata } from 'next';
import Link from 'next/link';
import { H1 } from '../../components/ui/heading-recipe';

export const metadata: Metadata = {
  alternates: { canonical: 'https://darshya.online/weddings' },
  title: 'Hindu Wedding Planning — Muhurat, Pandit, Samagri',
  description:
    'Plan your Vedic Hindu wedding end-to-end on Darshya. Find an auspicious muhurat from your kundli, book a verified pandit, and get the full samagri kit shipped. Three packages from ₹15,000.',
  openGraph: {
    images: ['/images/golden-temple-og.jpg'],
    title: 'Darshya Weddings — Muhurat, Pandit, Samagri',
    description:
      'Auspicious muhurat finder, verified pandits, full samagri. Three Vedic wedding packages from ₹15,000.',
    type: 'website',
    url: 'https://darshya.online/weddings',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Hindu Wedding Planning',
  provider: { '@type': 'Organization', name: 'Darshya', url: 'https://darshya.online' },
  areaServed: { '@type': 'Country', name: 'India' },
  description:
    'Vedic Hindu wedding muhurat finder, verified pandit booking, samagri kit, and 4-day Royal ceremony packages.',
  offers: [
    { '@type': 'Offer', name: 'Basic — Pandit only', price: '15000', priceCurrency: 'INR' },
    {
      '@type': 'Offer',
      name: 'Premium — Pandit + Samagri + Muhurat',
      price: '50000',
      priceCurrency: 'INR',
    },
    {
      '@type': 'Offer',
      name: 'Royal — 4-day Vedic ceremony',
      price: '200000',
      priceCurrency: 'INR',
    },
  ],
};

export default function WeddingsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-[100dvh] bg-gradient-to-b from-amber-50 to-white">
        <section className="px-4 sm:px-8 py-16 max-w-6xl mx-auto text-center">
          <p className="uppercase tracking-widest text-amber-700 text-sm">
            Vedic Hindu Wedding Planning
          </p>
          <h1 className={`${H1.marketing} mt-3`}>
            One muhurat. One pandit. One unforgettable wedding.
          </h1>
          <p className="prose-lead mt-5 text-stone-700 max-w-2xl mx-auto">
            From kundli matching to samagri to the seven pheras, Darshya assembles every part of
            your Vedic wedding around an auspicious muhurat picked from your nakshatras.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              href="/weddings/muhurat"
              className="px-6 py-3 rounded-lg bg-amber-700 text-white font-medium hover:bg-amber-800"
            >
              Find your muhurat
            </Link>
            <Link
              href="/weddings/packages"
              className="px-6 py-3 rounded-lg border border-amber-700 text-amber-800 font-medium hover:bg-amber-50"
            >
              See packages
            </Link>
            <Link
              href="/weddings/inquiry"
              className="px-6 py-3 rounded-lg bg-white border border-stone-300 text-stone-800 font-medium hover:bg-stone-50"
            >
              Talk to a planner
            </Link>
          </div>
        </section>

        <section className="px-4 sm:px-8 py-12 max-w-5xl mx-auto grid sm:grid-cols-3 gap-6">
          {[
            {
              t: 'Auspicious muhurat',
              d: 'Compute the most auspicious dates from bride + groom nakshatras across abhijit muhurat, panchak avoidance, and chandrashtama.',
            },
            {
              t: 'Verified pandit',
              d: 'Hand-picked, Aadhaar-verified pandits trained in classical Vedic rites — Hindi, Sanskrit, regional languages.',
            },
            {
              t: 'End-to-end samagri',
              d: 'Mandap, kalash, panchamrit, havan kit, and sankalp materials shipped before your ceremony date.',
            },
          ].map((b) => (
            <div key={b.t} className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
              <h3 className="font-serif text-xl text-amber-900">{b.t}</h3>
              <p className="mt-2 text-stone-700 text-sm">{b.d}</p>
            </div>
          ))}
        </section>

        <section className="px-4 sm:px-8 py-12 max-w-5xl mx-auto">
          <h2 className="font-serif text-3xl text-amber-900 text-center">Three packages</h2>
          <div className="mt-8 grid sm:grid-cols-3 gap-6">
            {[
              { t: 'Basic', p: '₹15,000', d: 'Pandit-only ceremony at your venue.' },
              {
                t: 'Premium',
                p: '₹50,000',
                d: 'Pandit + samagri + muhurat consultation + kundli matching.',
              },
              {
                t: 'Royal',
                p: '₹2,00,000',
                d: '4-day Vedic ceremony: Tilak, Haldi, Vivah, Reception with full mandap.',
              },
            ].map((p) => (
              <div
                key={p.t}
                className="bg-white rounded-xl p-6 shadow-sm border border-amber-100 flex flex-col"
              >
                <h3 className="font-serif text-xl text-amber-900">{p.t}</h3>
                <p className="text-3xl mt-2 text-amber-800 font-semibold">{p.p}</p>
                <p className="mt-3 text-stone-700 text-sm flex-1">{p.d}</p>
                <Link
                  href="/weddings/packages"
                  className="mt-4 text-amber-700 hover:underline text-sm"
                >
                  Compare packages →
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 sm:px-8 py-12 max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl text-amber-900 text-center">From recent couples</h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-6">
            {[
              {
                q: 'Darshya picked our muhurat from our nakshatras and shipped the full mandap kit two days early. The pandit was unbelievable.',
                a: 'Anjali & Rohit, Pune',
              },
              {
                q: 'We were Mangalik-matched and worried. Their team explained every dosha and parihara — the wedding went perfectly.',
                a: 'Priya & Karthik, Bangalore',
              },
            ].map((t) => (
              <figure
                key={t.a}
                className="bg-white rounded-xl p-6 border border-amber-100 shadow-sm"
              >
                <blockquote className="text-stone-700 italic">“{t.q}”</blockquote>
                <figcaption className="mt-3 text-amber-800 text-sm">— {t.a}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="px-4 sm:px-8 py-12 max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl text-amber-900 text-center">10-step planner</h2>
          <ol className="mt-6 grid sm:grid-cols-2 gap-3 list-decimal list-inside text-stone-800">
            {[
              'Engagement & Roka',
              'Kundli matching (Ashtakoota / Guna milan)',
              'Choose muhurat',
              'Book pandit & venue',
              'Order samagri & mandap',
              'Tilak ceremony',
              'Haldi & Mehendi',
              'Sangeet',
              'Vivah Sanskar (saat phere)',
              'Grihapravesh & Reception',
            ].map((s) => (
              <li key={s} className="bg-white rounded-lg p-4 border border-amber-100">
                {s}
              </li>
            ))}
          </ol>
          <div className="mt-6 text-center">
            <a
              href="/weddings/planner.pdf"
              className="text-amber-700 hover:underline"
              download
            >
              Download printable planner (PDF) →
            </a>
          </div>
        </section>
      </main>
    </>
  );
}
