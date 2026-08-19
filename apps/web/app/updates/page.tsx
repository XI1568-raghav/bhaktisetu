import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
import { API_BASE_URL } from '../../lib/api-config';

export const revalidate = 1800; // 30 min — fresh enough, doesn't hammer API

export const metadata: Metadata = {
  title: 'Updates — what Darshya shipped this week',
  description:
    'Build-in-public log. Every report our agent fleet publishes — SEO, content, social, investor outreach, infra health — in one public feed. Updated daily.',
  alternates: { canonical: 'https://darshya.online/updates' },
  openGraph: {
    title: 'Darshya updates — build in public',
    description:
      'Every report our agent fleet writes: SEO audits, content drafts, social queue, investor pipeline, infra health. Public, transparent, daily.',
    url: 'https://darshya.online/updates',
    type: 'website',
    images: ['/og/default.png'],
  },
};

interface FeedItem {
  file: string;
  date: string;
  agent: string;
  title: string;
  excerpt: string;
}

interface FeedResponse {
  items: FeedItem[];
  total: number;
}

async function loadFeed(): Promise<FeedItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/agents/feed`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as FeedResponse;
    return Array.isArray(json.items) ? json.items : [];
  } catch {
    return [];
  }
}

function agentLabel(agent: string): string {
  return agent
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function UpdatesPage() {
  const items = await loadFeed();

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <header className="mb-10">
        <span className="inline-block px-2.5 py-0.5 mb-4 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
          🤖 Build in public
        </span>
        <h1 className={`${H1.catalogue} mb-3`}>
          What Darshya shipped recently
        </h1>
        <p className="text-surface-700 text-base leading-relaxed">
          Our nine-agent fleet runs on a cron, writes every report it produces
          straight to our public repo, and surfaces it here. SEO audits, content
          drafts, social queues, investor pipeline, lighthouse scores, broken
          links — all transparent. No marketing varnish, just what the bots
          actually did this week.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-6 text-center text-sm text-surface-600">
          The feed is warming up. Check back in a few minutes — agents post daily
          around 04:00 UTC (09:30 IST).
        </div>
      ) : (
        <ul className="space-y-5">
          {items.map((it) => (
            <li
              key={it.file}
              className="rounded-xl border border-surface-200 bg-white p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
                  {agentLabel(it.agent.replace(/^\d{4}-\d{2}-\d{2}-/, ''))}
                </span>
                <time className="text-xs text-surface-500" dateTime={it.date}>
                  {it.date}
                </time>
              </div>
              <h2 className="text-lg font-semibold text-surface-900 mb-2">
                {it.title}
              </h2>
              <p className="text-sm text-surface-700 leading-relaxed line-clamp-4">
                {it.excerpt || 'See repo for full details.'}
              </p>
              <a
                href={`https://github.com/sunilkumardashx/bhakti-setu/blob/main/docs/agent-reports/${it.file}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm font-medium text-saffron-700 hover:underline"
              >
                Read full report →
              </a>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-12 border-t border-surface-200 pt-6 text-center text-sm text-surface-600">
        <p className="mb-3">
          Curious how it’s built? Every agent script lives in{' '}
          <code className="text-xs bg-surface-100 px-1.5 py-0.5 rounded">
            scripts/agents/
          </code>{' '}
          and runs on GitHub Actions free tier.
        </p>
        <Link
          href="/launch"
          className="inline-block px-5 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
        >
          Try Darshya →
        </Link>
      </footer>
    </main>
  );
}
