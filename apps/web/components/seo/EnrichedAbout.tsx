import type { Enrichment } from '../../lib/enrich/types';

/**
 * Long-form "About" section + FAQ for encyclopedia pages, with FAQPage schema.
 * Renders nothing when the entry has no enrichment, so a page never shows an
 * empty heading.
 */
export function EnrichedAbout({ name, data }: { name: string; data?: Enrichment }) {
  if (!data || data.about.length === 0) return null;
  const faqLd =
    data.faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: data.faqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }
      : null;
  return (
    <section className="mx-auto mt-10 max-w-3xl px-4 sm:px-6" aria-labelledby="about-heading">
      <h2 id="about-heading" className="mb-4 text-2xl font-semibold text-surface-900">
        About {name}
      </h2>
      <div className="space-y-4 text-surface-700">
        {data.about.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {data.faqs.length > 0 && (
        <>
          <h3 className="mb-3 mt-8 text-lg font-semibold text-surface-900">Common questions</h3>
          <dl className="space-y-4">
            {data.faqs.map((f) => (
              <div key={f.q}>
                <dt className="font-medium text-surface-900">{f.q}</dt>
                <dd className="mt-1 text-surface-700">{f.a}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}
    </section>
  );
}
