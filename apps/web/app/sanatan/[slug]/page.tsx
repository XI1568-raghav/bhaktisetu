import type { Metadata } from 'next';
import { getArticle, getAllSlugs } from '../../../lib/content';
import CategoryArticle from '../../../components/CategoryArticle';
// CI-05: this route is a shell around CategoryArticle, so the shared exit is
// appended here rather than inside the component every category renders.
import { detailCta } from '../../../lib/detail-route-cta';

interface Params { slug: string }

export function generateStaticParams() {
  return getAllSlugs('sanatan').map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticle('sanatan', slug);
  if (!a) return { title: 'Article not found' };
  return {
    title: `${a.frontmatter.title} — Sanatan Dharm`,
    alternates: { canonical: `https://darshya.online/sanatan/${slug}` },
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
