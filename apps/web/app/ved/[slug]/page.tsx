import type { Metadata } from 'next';
import { getArticle, getAllSlugs } from '../../../lib/content';
import CategoryArticle from '../../../components/CategoryArticle';
// CI-05: this route is a shell around CategoryArticle, so the shared exit is
// appended here rather than inside the component every category renders.
import { detailCta } from '../../../lib/detail-route-cta';

interface Params { slug: string }

export function generateStaticParams() {
  return getAllSlugs('ved').map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticle('ved', slug);
  if (!a) return { title: 'Article not found' };
  return {
    title: `${a.frontmatter.title} — Vedas`,
    alternates: { canonical: `https://darshya.online/ved/${slug}` },
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
