import type { Metadata } from 'next';
import { getArticle, getAllSlugs } from '../../../lib/content';
import CategoryArticle from '../../../components/CategoryArticle';

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
    description: a.frontmatter.summary,
  };
}

export default async function SanatanArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  return <CategoryArticle category="sanatan" slug={slug} categoryLabel="Sanatan Dharm" />;
}
