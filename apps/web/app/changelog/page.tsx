import type { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 3600; // 1h — GH unauth limit is 60 req/hr; 1h cache safe.

export const metadata: Metadata = {
  title: 'Changelog — every Darshya commit',
  description:
    'Public dev log. Every code change shipped to darshya.online, straight from GitHub. Updated hourly.',
  alternates: { canonical: 'https://darshya.online/changelog' },
  openGraph: {
    title: 'Darshya changelog',
    description: 'Every commit shipped. Public, hourly, no spin.',
    url: 'https://darshya.online/changelog',
    type: 'website',
    images: ['/og/default.png'],
  },
};

interface GHCommit {
  sha: string;
  html_url: string;
  commit: {
    author: { name: string; date: string };
    message: string;
  };
}

const REPO = 'XI1568-raghav/bhaktisetu';

async function loadCommits(): Promise<GHCommit[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/commits?per_page=40`,
      {
        next: { revalidate: 3600 },
        headers: { Accept: 'application/vnd.github+json' },
      },
    );
    if (!res.ok) return [];
    return (await res.json()) as GHCommit[];
  } catch {
    return [];
  }
}

function typeOf(msg: string): { label: string; tone: string } {
  const head = msg.split('\n')[0]!.toLowerCase();
  if (head.startsWith('feat')) return { label: 'feature', tone: 'bg-emerald-100 text-emerald-800' };
  if (head.startsWith('fix')) return { label: 'fix', tone: 'bg-amber-100 text-amber-800' };
  if (head.startsWith('chore(agents')) return { label: 'agent', tone: 'bg-saffron-100 text-saffron-800' };
  if (head.startsWith('chore') || head.startsWith('refactor')) return { label: 'chore', tone: 'bg-surface-200 text-surface-700' };
  if (head.startsWith('docs')) return { label: 'docs', tone: 'bg-blue-100 text-blue-800' };
  return { label: 'other', tone: 'bg-surface-100 text-surface-700' };
}

function title(msg: string): string {
  return msg.split('\n')[0]!.slice(0, 140);
}

function body(msg: string): string {
  const parts = msg.split('\n').slice(1).join('\n').trim();
  return parts.slice(0, 300);
}

export default async function ChangelogPage() {
  const commits = await loadCommits();

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <header className="mb-10">
        <span className="inline-block px-2.5 py-0.5 mb-4 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
          📜 Changelog
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-surface-900 mb-3">
          Every commit, public, hourly
        </h1>
        <p className="text-surface-700 text-base leading-relaxed">
          Code-level history of darshya.online. Pulled straight from GitHub.
          For agent-generated reports see <Link href="/updates" className="text-saffron-700 hover:underline">/updates</Link>.
        </p>
      </header>

      {commits.length === 0 ? (
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-6 text-center text-sm text-surface-600">
          Changelog warming up — GitHub API rate-limited. Refresh in a few minutes.
        </div>
      ) : (
        <ul className="space-y-4">
          {commits.map((c) => {
            const t = typeOf(c.commit.message);
            const d = c.commit.author?.date?.slice(0, 10) || '';
            const b = body(c.commit.message);
            return (
              <li
                key={c.sha}
                className="rounded-xl border border-surface-200 bg-white p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                  <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${t.tone}`}>
                    {t.label}
                  </span>
                  <time className="text-xs text-surface-500" dateTime={d}>{d}</time>
                </div>
                <h2 className="text-base font-semibold text-surface-900 mb-1">{title(c.commit.message)}</h2>
                {b ? (
                  <p className="text-sm text-surface-700 leading-relaxed whitespace-pre-line line-clamp-4">{b}</p>
                ) : null}
                <a
                  href={c.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-xs font-mono text-saffron-700 hover:underline"
                >
                  {c.sha.slice(0, 7)} →
                </a>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="mt-12 border-t border-surface-200 pt-6 text-center text-sm text-surface-600">
        <Link
          href="/updates"
          className="inline-block px-5 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
        >
          See agent reports →
        </Link>
      </footer>
    </main>
  );
}
