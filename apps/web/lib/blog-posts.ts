// Blog posts live as MDX/MD files in docs/agent-reports/blog-drafts/.
// Edge runtime can't read filesystem on CF Pages, so fetch from GitHub raw
// at request time with 1h cache. Pattern matches /changelog.

const REPO = 'XI1568-raghav/bhaktisetu';
const PATH = 'docs/agent-reports/blog-drafts';
const RAW = `https://raw.githubusercontent.com/${REPO}/main/${PATH}`;
const API = `https://api.github.com/repos/${REPO}/contents/${PATH}`;

export interface BlogPost {
  slug: string;
  date: string; // YYYY-MM-DD from filename
  title: string;
  excerpt: string;
  body: string; // raw markdown
  source: string; // GH source url
}

interface GHContentItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url: string | null;
}

// Filename convention: YYYY-MM-DD-slug-with-dashes.md
function parseFilename(name: string): { date: string; slug: string } | null {
  const m = /^(\d{4}-\d{2}-\d{2})-(.+)\.mdx?$/.exec(name);
  if (!m) return null;
  return { date: m[1]!, slug: m[2]! };
}

function extractTitle(body: string, fallback: string): string {
  const h1 = /^#\s+(.+)$/m.exec(body);
  if (h1) return h1[1]!.trim();
  // Fallback to humanised slug
  return fallback
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractExcerpt(body: string, max = 220): string {
  // Strip frontmatter, headings, code fences. Take first paragraph.
  const stripped = body
    .replace(/^---[\s\S]*?---\s*/m, '')
    .replace(/^#.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .trim();
  const first = stripped.split(/\n\s*\n/).find((p) => p.trim().length > 0) || '';
  const clean = first.replace(/\s+/g, ' ').trim();
  return clean.length > max ? clean.slice(0, max).trimEnd() + '…' : clean;
}

export async function listBlogPosts(): Promise<BlogPost[]> {
  try {
    const res = await fetch(API, {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return [];
    const items = (await res.json()) as GHContentItem[];
    const files = items.filter((i) => i.type === 'file' && /\.mdx?$/.test(i.name));

    const posts = await Promise.all(
      files.map(async (f): Promise<BlogPost | null> => {
        const parsed = parseFilename(f.name);
        if (!parsed) return null;
        if (!f.download_url) return null;
        try {
          const r = await fetch(f.download_url, { next: { revalidate: 3600 } });
          if (!r.ok) return null;
          const body = await r.text();
          return {
            slug: parsed.slug,
            date: parsed.date,
            title: extractTitle(body, parsed.slug),
            excerpt: extractExcerpt(body),
            body,
            source: `https://github.com/${REPO}/blob/main/${PATH}/${f.name}`,
          };
        } catch {
          return null;
        }
      }),
    );

    return posts
      .filter((p): p is BlogPost => p !== null)
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const posts = await listBlogPosts();
  return posts.find((p) => p.slug === slug) || null;
}

export async function blogPostSlugs(): Promise<string[]> {
  const posts = await listBlogPosts();
  return posts.map((p) => p.slug);
}
