import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Mail, Sparkles } from 'lucide-react';
import { listBlogPosts } from '../../lib/blog-posts';

import { buttonClass } from '../../components/ui/button-recipe';
export const revalidate = 3600; // GH unauth: 60/hr — 1h cache safe.

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Essays on Hindu traditions, temple technology, panchang, dharma, and the building of Darshya. Updated daily.',
  alternates: { canonical: 'https://darshya.online/blog' },
  openGraph: {
    title: 'Darshya blog',
    description: 'Essays on Hindu traditions, temple technology, and dharma.',
    url: 'https://darshya.online/blog',
    type: 'website',
    images: ['/og/default.png'],
  },
};

const TOPICS = [
  'Why video proof matters for online puja bookings',
  'Understanding Panchang for modern devotees',
  'How live darshan technology works behind the scenes',
  'The significance of Sankalp in Hindu rituals',
  'Building for the NRI Hindu diaspora',
  'Gau seva in the digital age',
];

export default async function BlogPage() {
  const posts = await listBlogPosts();

  return (
    <div className="min-h-[100dvh]" style={{ background: 'var(--color-bg)' }}>
      <section className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-6 sm:px-8">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'var(--color-primary)' }}
          >
            Blog
          </p>
          <h1
            className="heading-display text-2xl sm:text-3xl font-bold mb-3"
            style={{
              color: 'var(--color-text)',
              lineHeight: 'var(--leading-tight)',
            }}
          >
            Stories, Insights & Updates
          </h1>
          <p
            className="text-sm max-w-xl leading-relaxed"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Exploring the intersection of technology and tradition. Updated as
            our agents draft and our editors publish.
          </p>
        </div>
      </section>

      <section className="pb-16 sm:pb-20">
        <div className="max-w-4xl mx-auto px-6 sm:px-8">
          {posts.length > 0 ? (
            <ul className="grid gap-4 sm:gap-5">
              {posts.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="block p-5 rounded-xl border border-surface-200 bg-white hover:border-saffron-300 hover:shadow-sm transition"
                  >
                    <p className="text-xs text-surface-500 mb-1.5">
                      {new Date(p.date).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <h2 className="text-lg font-semibold text-surface-900 mb-2">
                      {p.title}
                    </h2>
                    <p className="text-sm text-surface-700 leading-relaxed line-clamp-3 mb-3">
                      {p.excerpt}
                    </p>
                    <span className="text-xs font-semibold text-saffron-700">
                      Read more →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="max-w-2xl mx-auto">
              <div
                className="p-8 rounded-xl text-center"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div
                  className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5"
                  style={{ background: 'var(--color-primary-highlight)' }}
                >
                  <Sparkles
                    className="w-5 h-5"
                    style={{ color: 'var(--color-primary)' }}
                  />
                </div>
                <h2
                  className="text-lg font-semibold mb-3"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: 'var(--color-text)',
                  }}
                >
                  First essays loading…
                </h2>
                <p
                  className="text-sm leading-relaxed mb-6 max-w-md mx-auto"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Our editors are reviewing the latest drafts. Join the
                  waitlist for an email when the first one ships.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/waitlist"
                    className={buttonClass('primary', 'md', 'btn-press')}
                  >
                    Join the waitlist <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <a
                    href="mailto:hello@darshya.online?subject=Blog%20updates"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-colors"
                    style={{
                      background: 'var(--color-bg)',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <Mail className="w-3.5 h-3.5" /> Email me when live
                  </a>
                </div>
              </div>
            </div>
          )}

          <div className="mt-10">
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-4 text-center"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Topics we cover
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {TOPICS.map((topic) => (
                <div
                  key={topic}
                  className="p-3 rounded-lg text-xs"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {topic}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
