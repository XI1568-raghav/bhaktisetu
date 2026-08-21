import type { Metadata } from 'next';
import { getArticle, getAllSlugs } from '../../../lib/content';
import CategoryArticle from '../../../components/CategoryArticle';
// CI-05: this route is a shell around CategoryArticle, so the shared exit is
// appended here rather than inside the component every category renders.
import { detailCta } from '../../../lib/detail-route-cta';

interface Params { slug: string }

export function generateStaticParams() {
  return getAllSlugs('sanskrit').map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticle('sanskrit', slug);
  if (!a) return { title: 'Article not found' };
  return {
    title: `${a.frontmatter.title} — Sanskrit`,
    alternates: { canonical: `https://darshya.online/sanskrit/${slug}` },
    description: a.frontmatter.summary,
  };
}

export default async function SanskritArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = getArticle('sanskrit', slug);
  return (
    <>
      <CategoryArticle category="sanskrit" slug={slug} categoryLabel="Sanskrit" />
      <div className="container-prose pb-12">
        {detailCta({
          routePrefix: 'sanskrit',
          subject: article?.frontmatter.title ?? 'Sanskrit',
        })}
      </div>
    </>
  );
}
