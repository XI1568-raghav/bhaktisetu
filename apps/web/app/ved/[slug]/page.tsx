import type { Metadata } from 'next';
import { getArticle, getAllSlugs } from '../../../lib/content';
import CategoryArticle from '../../../components/CategoryArticle';

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
  return <CategoryArticle category="ved" slug={slug} categoryLabel="Vedas" />;
}
