import type { Metadata } from 'next';
import { getArticle, getAllSlugs } from '../../../lib/content';
import CategoryArticle from '../../../components/CategoryArticle';
// CI-05: this route is a shell around CategoryArticle, so the shared exit is
// appended here rather than inside the component every category renders.
import { detailCta } from '../../../lib/detail-route-cta';
// CI-08: fourteen of these articles are also published, more richly, at
// /upanishads/<slug>. Both families declared themselves canonical, so search
// engines were handed two competing originals for one subject. The curated
// family is the survivor; this route defers to it via the shared mapping
// rather than keeping a second copy of the slug table.
import { canonicalUpanishadUrl } from '../../../lib/upanishads';
// CI-08, same finding one shelf up: the four <veda>-overview articles shadow
// the curated /vedas/<slug> pages the same way. Derived from VEDAS rather than
// tabulated — see the module for why, and for where it should eventually live.
import { canonicalVedaUrl } from '../canonical';

interface Params { slug: string }

export function generateStaticParams() {
  return getAllSlugs('ved').map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticle('ved', slug);
  if (!a) return { title: 'Article not found' };
  // Upanishad first: it is the narrower, more specific claim, and no article
  // is matched by both (guarded in __tests__/ved-veda-canonical.ci08.test.ts).
  const twin = canonicalUpanishadUrl(slug) ?? canonicalVedaUrl(slug);
  return {
    title: `${a.frontmatter.title} — Vedas`,
    alternates: {
      canonical: twin
        ? `https://darshya.online${twin}`
        : `https://darshya.online/ved/${slug}`,
    },
    description: a.frontmatter.summary,
  };
}

export default async function VedArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = getArticle('ved', slug);
  return (
    <>
      <CategoryArticle category="ved" slug={slug} categoryLabel="Vedas" />
      <div className="container-prose pb-12">
        {detailCta({
          routePrefix: 'ved',
          subject: article?.frontmatter.title ?? 'the Vedas',
        })}
      </div>
    </>
  );
}
