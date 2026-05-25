import Link from 'next/link';
import { Clock, ArrowLeft } from 'lucide-react';
import { getArticle, getAllArticles, type KnowledgeCategory } from '../lib/content';
import MdxRender from './MdxRender';
import { notFound } from 'next/navigation';

interface Props {
  category: KnowledgeCategory;
  slug: string;
  categoryLabel: string;
}

export default function CategoryArticle({ category, slug, categoryLabel }: Props) {
  const article = getArticle(category, slug);
  if (!article) notFound();
  const all = getAllArticles(category);
  const related = (article.frontmatter.related ?? [])
    .map((s) => all.find((a) => a.frontmatter.slug === s))
    .filter(Boolean) as typeof all;

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <Link href={`/${category}`} className="inline-flex items-center gap-1 text-sm text-saffron-700 hover:text-saffron-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to {categoryLabel}
      </Link>
      <header className="mb-6">
        {article.frontmatter.subTopic && (
          <div className="text-xs font-semibold uppercase tracking-wider text-saffron-700 mb-1">{article.frontmatter.subTopic}</div>
        )}
        <h1 className="text-3xl md:text-4xl font-bold text-surface-900 leading-tight">{article.frontmatter.title}</h1>
        <p className="text-lg text-surface-600 mt-3">{article.frontmatter.summary}</p>
        <div className="mt-3 inline-flex items-center gap-2 text-xs text-surface-500">
          <Clock className="w-3.5 h-3.5" /> {article.frontmatter.readingMinutes} min read
        </div>
      </header>

      <article>
        <MdxRender body={article.body} glossaryTerms={article.frontmatter.glossaryTerms} />
      </article>

      {article.frontmatter.sources && article.frontmatter.sources.length > 0 && (
        <aside className="mt-12 p-4 bg-surface-50 border border-surface-100 rounded-xl">
          <h3 className="text-sm font-semibold text-surface-900 mb-2">Sources</h3>
          <ul className="text-sm text-surface-600 space-y-1 list-disc list-inside">
            {article.frontmatter.sources.map((s, i) => (<li key={i}>{s}</li>))}
          </ul>
        </aside>
      )}

      {related.length > 0 && (
        <section className="mt-10">
          <h3 className="text-lg font-bold text-surface-900 mb-3">Related</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {related.map((r) => (
              <Link
                key={r.frontmatter.slug}
                href={`/${category}/${r.frontmatter.slug}`}
                className="block p-3 bg-white border border-surface-200 rounded-lg hover:border-saffron-400 transition-colors"
              >
                <div className="font-semibold text-surface-900 text-sm">{r.frontmatter.title}</div>
                <div className="text-xs text-surface-500 mt-1 line-clamp-2">{r.frontmatter.summary}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
