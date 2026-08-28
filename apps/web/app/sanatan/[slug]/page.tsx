import type { Metadata } from 'next';
import { getArticle, getAllSlugs } from '../../../lib/content';
import CategoryArticle from '../../../components/CategoryArticle';
// CI-05: this route is a shell around CategoryArticle, so the shared exit is
// appended here rather than inside the component every category renders.
import { detailCta } from '../../../lib/detail-route-cta';
// CI-08: the six *-darshana articles here are the third publication of the six
// orthodox schools. They defer to /darshanas; every other Sanatan article has
// no twin and stays canonical.
import { canonicalDarshanaUrl } from '../../../lib/darshanas';

interface Params { slug: string }

export function generateStaticParams() {
  return getAllSlugs('sanatan').map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticle('sanatan', slug);
  if (!a) return { title: 'Article not found' };
  const twin = canonicalDarshanaUrl(slug);
  return {
    title: `${a.frontmatter.title} — Sanatan Dharm`,
    alternates: {
      // Same shape as app/ved/[slug]/page.tsx, the first route to carry a
      // deliberate cross-family canonical. Note that SEO-01's CANONICAL_LITERAL
      // (`/canonical\s*[:=]\s*(['"`])/`) only sees a canonical whose value
      // STARTS with a quote, so a ternary is invisible to it — which is why the
      // fallback branch is pinned at runtime instead, by calling this very
      // function in __tests__/darshana-route-family-canonical.ci08.test.ts
      // ("a Sanatan article with no darshana twin still claims itself").
      canonical: twin
        ? `https://darshya.online${twin}`
        : `https://darshya.online/sanatan/${slug}`,
    },
    description: a.frontmatter.summary,
  };
}

export default async function SanatanArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = getArticle('sanatan', slug);
  return (
    <>
      <CategoryArticle category="sanatan" slug={slug} categoryLabel="Sanatan Dharm" />
      <div className="container-prose pb-12">
        {detailCta({
          routePrefix: 'sanatan',
          subject: article?.frontmatter.title ?? 'Sanatan Dharm',
        })}
      </div>
    </>
  );
}
