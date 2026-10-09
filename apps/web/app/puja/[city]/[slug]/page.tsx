import type { Metadata } from 'next';
import { HAS_PUJA_MATERIALS_PROMISE } from '../../../../lib/launch-gates';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CITY_PUJAS, CITY_PUJA_SLUGS, getCityPuja } from '../../../../lib/city-pujas';
import { H1 } from '../../../../components/ui/heading-recipe';

// NOTE: no `runtime = 'edge'` — forbidden under @opennextjs/cloudflare (Node
// runtime only, via nodejs_compat). revalidate=86400 keeps ISR (daily regen);
// generateStaticParams (below) prerenders the static slugs on the default
// Node runtime, which OpenNext handles natively.
export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return CITY_PUJA_SLUGS.map(({ city, puja }) => ({ city, slug: puja }));
}

interface Params {
  params: Promise<{ city: string; slug: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { city, slug } = await params;
  const cp = getCityPuja(city, slug);
  if (!cp) return { title: 'Puja Booking' };

  const canonical = `${BASE_URL}/puja/${cp.city}/${cp.puja}`;
  return {
    title: cp.metaTitle,
    description: cp.metaDescription,
    alternates: {
      canonical,
      languages: {
        'en-IN': canonical,
        'en-US': canonical,
        'x-default': canonical,
      },
    },
    openGraph: {
      title: `${cp.metaTitle} | Darshya`,
      description: cp.metaDescription,
      url: canonical,
      type: 'website',
      images: [{ url: cp.heroSrc, alt: cp.heroAlt }],
    },
  };
}

export default async function CityPujaPage({ params }: Params) {
  const { city, slug } = await params;
  const cp = getCityPuja(city, slug);
  if (!cp) return notFound();

  const canonical = `${BASE_URL}/puja/${cp.city}/${cp.puja}`;
  const serviceLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: cp.pujadisplay,
    name: `${cp.pujadisplay} in ${cp.citydisplay}`,
    description: cp.metaDescription,
    provider: {
      '@type': 'Organization',
      name: 'Darshya',
      url: BASE_URL,
    },
    areaServed: {
      '@type': 'City',
      name: cp.citydisplay,
    },
    offers: {
      '@type': 'Offer',
      price: cp.priceInr,
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      url: canonical,
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Pujas', item: `${BASE_URL}/pujas` },
      { '@type': 'ListItem', position: 3, name: cp.citydisplay, item: `${BASE_URL}/city/${cp.city}` },
      { '@type': 'ListItem', position: 4, name: cp.pujadisplay, item: canonical },
    ],
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-surface-600 mb-4">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        <span className="mx-2">›</span>
        <Link href="/pujas" className="hover:text-saffron-700">Pujas</Link>
        <span className="mx-2">›</span>
        <Link href={`/city/${cp.city}`} className="hover:text-saffron-700">{cp.citydisplay}</Link>
        <span className="mx-2">›</span>
        <span className="text-surface-900">{cp.pujadisplay}</span>
      </nav>

      <header className="mb-6">
        <h1 className={`${H1.catalogue} mb-3`}>
          {cp.pujadisplay} in {cp.citydisplay} — Book Pandits | Darshya
        </h1>
        <p className="text-base text-surface-700">
          Authentic {cp.deity} worship performed in {cp.citydisplay} by Vedic pandits.
          Video proof of the puja; prasad delivery is optional.
        </p>
      </header>

      <figure className="mb-6">
        <img width={1200} height={400}           src={cp.heroSrc}
          alt={cp.heroAlt}
          className="w-full h-64 object-cover rounded-lg bg-saffron-100"
          loading="eager"
        />
      </figure>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-surface-900 mb-3">What is {cp.pujadisplay}?</h2>
        <p className="text-surface-700 mb-2"><strong>Deity:</strong> {cp.deity}</p>
        <p className="text-surface-700 mb-2"><strong>Scriptural basis:</strong> {cp.scripturalBasis}</p>
        <p className="text-surface-700"><strong>Intent:</strong> {cp.intent}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-surface-900 mb-3">
          Why perform it in {cp.citydisplay}?
        </h2>
        <p className="text-surface-700">{cp.templeContext} The puja is conducted at{' '}
          <strong>{cp.templeName}</strong> by our affiliated Vedic pandits.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-surface-900 mb-3">Ritual procedure</h2>
        <p className="text-surface-700 mb-3">
          <strong>Duration:</strong> approximately {cp.durationMinutes} minutes.
        </p>
        <p className="text-surface-700 mb-3">
          <strong>{HAS_PUJA_MATERIALS_PROMISE ? 'Samagri (required offerings):' : 'Samagri traditionally used in this puja:'}</strong>
        </p>
        <ul className="list-disc pl-6 text-surface-700 space-y-1 mb-3">
          {cp.samagri.map((s) => <li key={s}>{s}</li>)}
        </ul>
        <p className="text-surface-700">
          <strong>Muhurat guidance:</strong> {cp.muhuratGuidance} Consult{' '}
          <Link href="/panchang" className="text-indigo-700 underline">auspicious muhurat</Link>{' '}
          for your chosen date.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-surface-900 mb-3">
          What&rsquo;s in a Darshya booking
        </h2>
        <ul className="list-disc pl-6 text-surface-700 space-y-1">
          <li>Vedic pandit with authentic Sanskrit chanting</li>
          {HAS_PUJA_MATERIALS_PROMISE && <li>All samagri (offerings) — no extra shopping required</li>}
          <li>Video recording of the puja, delivered to your booking page after the ceremony</li>
          <li>Optional prasad delivery (flat add-on); no delivery date is promised</li>
          <li>Booking status on your booking page</li>
        </ul>
      </section>

      <section className="mb-8 bg-saffron-50 border border-saffron-200 rounded-lg p-4">
        <h2 className="text-2xl font-semibold text-surface-900 mb-2">Pricing &amp; timing</h2>
        <p className="text-surface-700 mb-2">
          <strong>Base sankalp:</strong> ₹{cp.priceInr.toLocaleString('en-IN')} (India) /
          ${cp.priceUsd} (NRI / international)
        </p>
        <p className="text-surface-700">
          Upgrades available at checkout (additional pandits, extended japa count, in-person seating,
          home-visit). Your booking page shows the schedule confirmation.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-surface-900 mb-3">FAQs</h2>
        <div className="space-y-3">
          {cp.faqs.map((f) => (
            <details key={f.q} className="border border-surface-200 rounded p-3">
              <summary className="font-medium text-surface-900 cursor-pointer">{f.q}</summary>
              <p className="text-surface-700 mt-2">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mb-8 border-t border-surface-200 pt-6">
        <h2 className="text-lg font-semibold text-surface-900 mb-3">Related</h2>
        <ul className="flex flex-wrap gap-3">
          <li>
            <Link href="/pujas" className="text-indigo-700 underline hover:text-indigo-900">
              Browse all pujas
            </Link>
          </li>
          <li>
            <Link href={`/temples/${cp.city}`} className="text-indigo-700 underline hover:text-indigo-900">
              {cp.templeName}
            </Link>
          </li>
          <li>
            <Link href={`/puja/${cp.relatedSlug}`} className="text-indigo-700 underline hover:text-indigo-900">
              {(() => {
                const [c, p] = cp.relatedSlug.split('/');
                const r = CITY_PUJAS.find((x) => x.city === c && x.puja === p);
                return r ? `${r.pujadisplay} in ${r.citydisplay}` : 'Related puja';
              })()}
            </Link>
          </li>
          <li>
            <Link href="/panchang" className="text-indigo-700 underline hover:text-indigo-900">
              Auspicious muhurat (panchang)
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
