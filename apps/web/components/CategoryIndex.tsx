import Link from 'next/link';
import { BookOpen, Clock } from 'lucide-react';
import { getAllArticles, type KnowledgeCategory } from '../lib/content';
import DailyVerse from './DailyVerse';
import { H1 } from '../components/ui/heading-recipe';

interface Props {
  category: KnowledgeCategory;
  title: string;
  description: string;
  heroEmoji?: string;
}

export default function CategoryIndex({ category, title, description, heroEmoji = 'Om' }: Props) {
  const articles = getAllArticles(category);
  const bySubTopic = new Map<string, typeof articles>();
  for (const a of articles) {
    const key = a.frontmatter.subTopic || 'Overview';
    const arr = bySubTopic.get(key) ?? [];
    arr.push(a);
    bySubTopic.set(key, arr);
  }
  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="text-5xl mb-3">{heroEmoji}</div>
        <h1 className={H1.catalogue}>{title}</h1>
        <p className="text-surface-600 mt-2 max-w-2xl">{description}</p>
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-saffron-50 text-saffron-700 text-xs rounded-full">
          <BookOpen className="w-3.5 h-3.5" /> {articles.length} articles
        </div>
      </header>

      <DailyVerse />

      {Array.from(bySubTopic.entries()).map(([sub, arts]) => (
        <section key={sub} className="my-8">
          <h2 className="text-xl font-bold text-surface-900 mb-3">{sub}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {arts.map((a) => (
              <Link
                key={a.frontmatter.slug}
                href={`/${category}/${a.frontmatter.slug}`}
                className="block p-4 bg-white border border-surface-200 rounded-xl hover:border-saffron-400 hover:shadow-sm transition-all"
              >
                <h3 className="font-bold text-surface-900 mb-1">{a.frontmatter.title}</h3>
                <p className="text-sm text-surface-600 line-clamp-2">{a.frontmatter.summary}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-surface-500">
                  <Clock className="w-3 h-3" /> {a.frontmatter.readingMinutes} min
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {articles.length === 0 && (
        <div className="text-center py-16 text-surface-500">
          <p>Content publishing soon.</p>
        </div>
      )}
    </main>
  );
}
