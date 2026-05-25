import fs from 'node:fs';
import path from 'node:path';

export type KnowledgeCategory = 'sanskrit' | 'ved' | 'sanatan';

export interface Frontmatter {
  title: string;
  slug: string;
  category: KnowledgeCategory;
  subTopic?: string;
  summary: string;
  related?: string[];
  glossaryTerms?: string[];
  readingMinutes?: number;
  sources?: string[];
  publishedAt?: string;
}

export interface Article {
  frontmatter: Frontmatter;
  body: string;
  filename: string;
}

const CONTENT_ROOT = path.join(process.cwd(), 'content');

function parseFrontmatter(raw: string): { frontmatter: Record<string, unknown>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw };
  const [, fmRaw, body] = match;
  const fm: Record<string, unknown> = {};
  let pendingKey: string | null = null;
  let pendingArr: string[] | null = null;
  for (const line of fmRaw!.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (pendingArr) {
      const itemMatch = line.match(/^\s*-\s+(.*)$/);
      if (itemMatch) {
        pendingArr.push(stripQuotes(itemMatch[1]!.trim()));
        continue;
      } else {
        if (pendingKey) fm[pendingKey] = pendingArr;
        pendingArr = null;
        pendingKey = null;
      }
    }
    const kvMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!kvMatch) continue;
    const [, key, rawValue] = kvMatch;
    const value = rawValue!.trim();
    if (value === '') {
      pendingKey = key!;
      pendingArr = [];
      continue;
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      fm[key!] = inner ? inner.split(',').map((s) => stripQuotes(s.trim())) : [];
      continue;
    }
    fm[key!] = stripQuotes(value);
  }
  if (pendingArr && pendingKey) fm[pendingKey] = pendingArr;
  return { frontmatter: fm, body: body || '' };
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function normalizeFrontmatter(raw: Record<string, unknown>, fallbackSlug: string, category: KnowledgeCategory): Frontmatter {
  const minutes = raw.readingMinutes;
  return {
    title: typeof raw.title === 'string' ? raw.title : fallbackSlug,
    slug: typeof raw.slug === 'string' ? raw.slug : fallbackSlug,
    category,
    subTopic: typeof raw.subTopic === 'string' ? raw.subTopic : undefined,
    summary: typeof raw.summary === 'string' ? raw.summary : '',
    related: Array.isArray(raw.related) ? (raw.related as string[]) : [],
    glossaryTerms: Array.isArray(raw.glossaryTerms) ? (raw.glossaryTerms as string[]) : [],
    readingMinutes: typeof minutes === 'string' ? parseInt(minutes, 10) || 3 : typeof minutes === 'number' ? minutes : 3,
    sources: Array.isArray(raw.sources) ? (raw.sources as string[]) : [],
    publishedAt: typeof raw.publishedAt === 'string' ? raw.publishedAt : undefined,
  };
}

let articleCache: Map<KnowledgeCategory, Article[]> | null = null;

function loadCategory(category: KnowledgeCategory): Article[] {
  const dir = path.join(CONTENT_ROOT, category);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mdx'));
  const out: Article[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const { frontmatter, body } = parseFrontmatter(raw);
    const fallbackSlug = file.replace(/\.mdx$/, '');
    out.push({
      frontmatter: normalizeFrontmatter(frontmatter, fallbackSlug, category),
      body,
      filename: file,
    });
  }
  out.sort((a, b) => a.frontmatter.title.localeCompare(b.frontmatter.title));
  return out;
}

function ensureCache(): Map<KnowledgeCategory, Article[]> {
  if (articleCache) return articleCache;
  articleCache = new Map();
  articleCache.set('sanskrit', loadCategory('sanskrit'));
  articleCache.set('ved', loadCategory('ved'));
  articleCache.set('sanatan', loadCategory('sanatan'));
  return articleCache;
}

export function getAllArticles(category: KnowledgeCategory): Article[] {
  return ensureCache().get(category) ?? [];
}

export function getArticle(category: KnowledgeCategory, slug: string): Article | undefined {
  return getAllArticles(category).find((a) => a.frontmatter.slug === slug);
}

export function getAllSlugs(category: KnowledgeCategory): string[] {
  return getAllArticles(category).map((a) => a.frontmatter.slug);
}

export function getAllArticlesAcrossCategories(): Article[] {
  const out: Article[] = [];
  for (const cat of ['sanskrit', 'ved', 'sanatan'] as KnowledgeCategory[]) {
    out.push(...getAllArticles(cat));
  }
  return out;
}

export interface SearchIndexEntry {
  category: KnowledgeCategory;
  slug: string;
  title: string;
  summary: string;
  subTopic?: string;
}

export function buildSearchIndex(): SearchIndexEntry[] {
  return getAllArticlesAcrossCategories().map((a) => ({
    category: a.frontmatter.category,
    slug: a.frontmatter.slug,
    title: a.frontmatter.title,
    summary: a.frontmatter.summary,
    subTopic: a.frontmatter.subTopic,
  }));
}
