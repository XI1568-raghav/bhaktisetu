import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlogPost, listBlogPosts } from '../../../lib/blog-posts';
import { markdownToHtml } from '../../../lib/markdown';

export const revalidate = 3600;

interface Params {
  params: { slug: string };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await getBlogPost(params.slug);
  if (!p) return { title: 'Blog post — Darshya' };
  return {
    title: `${p.title} — Darshya blog`,
    description: p.excerpt,
    alternates: { canonical: `https://darshya.online/blog/${p.slug}` },
    openGraph: {
      title: p.title,
      description: p.excerpt,
      url: `https://darshya.online/blog/${p.slug}`,
      type: 'article',
      publishedTime: p.date,
      images: ['/og/default.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: p.title,
      description: p.excerpt,
      images: ['/og/default.png'],
    },
  };
}

export default async function BlogPostPage({ params }: Params) {
  const post = await getBlogPost(params.slug);
  if (!post) notFound();

  // Strip H1 from body (we render it as <h1> ourselves in the header).
  const bodyNoTitle = post.body.replace(/^#\s+.+$/m, '').trim();
  const html = markdownToHtml(bodyNoTitle);

  // Pull 3 recent siblings for related strip.
  const all = await listBlogPosts();
  const others = all.filter((p) => p.slug !== post.slug).slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: {
      '@type': 'Organization',
      name: 'Darshya',
      logo: { '@type': 'ImageObject', url: 'https://darshya.online/og/default.png' },
    },
    description: post.excerpt,
    url: `https://darshya.online/blog/${post.slug}`,
    mainEntityOfPage: `https://darshya.online/blog/${post.slug}`,
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-sm text-surface-600 mb-4">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/blog" className="hover:text-saffron-700">Blog</Link>
        <span className="mx-2">/</span>
        <span className="text-surface-900 line-clamp-1">{post.title}</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs text-surface-500 mb-2">
          {new Date(post.date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-surface-900 leading-tight">
          {post.title}
        </h1>
      </header>

      <article
        className="prose max-w-none text-surface-800"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <footer className="border-t border-surface-200 pt-6 mt-10 text-sm text-surface-600">
        <p className="mb-4">
          <a
            href={post.source}
            target="_blank"
            rel="noopener noreferrer"
            className="text-saffron-700 hover:underline"
          >
            View source on GitHub →
          </a>
        </p>

        {others.length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-3">
              Continue reading
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {others.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="block p-3 rounded-lg border border-surface-200 bg-white hover:border-saffron-300 hover:shadow-sm transition"
                  >
                    <p className="text-xs text-surface-500 mb-1">{p.date}</p>
                    <p className="text-sm font-semibold text-surface-900 line-clamp-2">
                      {p.title}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <Link href="/blog" className="inline-block mt-6 text-saffron-700 hover:underline">
          ← All posts
        </Link>
      </footer>
    </main>
  );
}
