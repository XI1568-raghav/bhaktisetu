import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * The knowledge rail's category set is the FILESYSTEM, not a union literal.
 *
 * WHAT REGRESSED INTO EXISTENCE
 * -----------------------------
 * `type Category = 'sanskrit' | 'ved' | 'sanatan'` lived in this route, and
 * the same three keys lived again in app/(devotee)/knowledge.tsx (the card
 * list) and a third time in app/(devotee)/knowledge-category.tsx (the label
 * map). Publishing a fourth collection meant three edits across two apps, and
 * missing any one of them produced a 400 that read to the devotee as a missing
 * article rather than a missing edit.
 *
 * `listSlugs` already read the directory. Only the gate in front of it was
 * frozen. These tests pin the gate to the directory.
 *
 * The route module resolves CONTENT_ROOT at IMPORT time from
 * KNOWLEDGE_CONTENT_DIR, so the fixture tree is built and the env var set
 * before the dynamic import below — a top-level `import` would bind the real
 * apps/web/content path and make these assertions depend on shipped articles.
 */

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-rail-'));

function writeArticle(category: string, slug: string, title: string, subTopic: string) {
  const dir = path.join(ROOT, category);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${slug}.mdx`),
    `---\ntitle: ${title}\nslug: ${slug}\ncategory: ${category}\nsubTopic: ${subTopic}\nsummary: A fixture.\nreadingMinutes: 4\n---\n\n## Body\n\nFixture body.\n`,
    'utf8',
  );
}

let app: Awaited<ReturnType<typeof buildApp>>;

async function buildApp() {
  const { knowledgeRoutes } = await import('./knowledge.js');
  const server = Fastify();
  await server.register(knowledgeRoutes, { prefix: '/api/v1/knowledge' });
  await server.ready();
  return server;
}

beforeAll(async () => {
  // The three that exist in the repo today...
  writeArticle('sanskrit', 'sandhi-rules', 'Sandhi Rules', 'Grammar');
  writeArticle('ved', 'rigveda-overview', 'Rigveda Overview', 'Samhitas');
  writeArticle('sanatan', 'dharma-definition', 'Dharma', 'Concepts');
  // ...a fourth that does NOT, which the old union would have rejected...
  writeArticle('puranas', 'vishnu-purana', 'Vishnu Purana', 'Mahapuranas');
  // ...and apps/web/content/blog, which holds published.ts and no MDX.
  fs.mkdirSync(path.join(ROOT, 'blog'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'blog', 'published.ts'), 'export const POSTS = [];\n', 'utf8');

  process.env.KNOWLEDGE_CONTENT_DIR = ROOT;
  app = await buildApp();
});

afterAll(async () => {
  await app?.close();
  fs.rmSync(ROOT, { recursive: true, force: true });
});

describe('the category set comes from the content directory', () => {
  it('serves a category that no union ever listed', async () => {
    // The whole point. Under the old `isCategory` this was a 400.
    const res = await app.inject({ method: 'GET', url: '/api/v1/knowledge/puranas' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.category).toBe('puranas');
    expect(body.articles).toHaveLength(1);
    expect(body.articles[0].slug).toBe('vishnu-purana');
  });

  it('indexes every category with a count, and none without MDX', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/knowledge' });
    expect(res.statusCode).toBe(200);
    const keys = res.json().categories.map((c: { key: string }) => c.key);
    expect(keys).toEqual(['puranas', 'sanatan', 'sanskrit', 'ved']);
    // `blog` is a directory holding published.ts and zero .mdx. A category set
    // taken from `readdir` alone would publish it as an empty collection.
    expect(keys).not.toContain('blog');
    const counts = Object.fromEntries(
      res.json().categories.map((c: { key: string; count: number }) => [c.key, c.count]),
    );
    expect(counts).toEqual({ puranas: 1, sanatan: 1, sanskrit: 1, ved: 1 });
  });

  it('titles the three known collections and humanizes the rest', async () => {
    const byKey = Object.fromEntries(
      (await app.inject({ method: 'GET', url: '/api/v1/knowledge' })).json().categories.map(
        (c: { key: string; title: string }) => [c.key, c.title],
      ),
    );
    expect(byKey.ved).toBe('Vedas');
    expect(byKey.sanatan).toBe('Sanatan Dharma');
    // No entry in the title map: readable rather than absent, because the app
    // now renders whatever the index returns.
    expect(byKey.puranas).toBe('Puranas');
  });

  it('still rejects a category that has no directory', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/knowledge/mahabharata' });
    expect(res.statusCode).toBe(400);
  });
});

describe('the response shape the shipped app is built against is unchanged', () => {
  it('keeps `category` and `articles`, and adds `title` alongside them', async () => {
    const body = (await app.inject({ method: 'GET', url: '/api/v1/knowledge/ved' })).json();
    expect(body.category).toBe('ved');
    expect(body.title).toBe('Vedas');
    expect(body.articles[0]).toMatchObject({
      slug: 'rigveda-overview',
      title: 'Rigveda Overview',
      subTopic: 'Samhitas',
      summary: 'A fixture.',
    });
  });

  it('serves an article body under /:category/:slug', async () => {
    const body = (
      await app.inject({ method: 'GET', url: '/api/v1/knowledge/sanskrit/sandhi-rules' })
    ).json();
    expect(body.frontmatter.title).toBe('Sandhi Rules');
    expect(body.body).toContain('Fixture body.');
  });
});

describe('a slug cannot leave the content root', () => {
  /**
   * `readArticle` built `path.join(categoryDir(c), slug + '.mdx')` from an
   * unvalidated route param. The closed union guarded the CATEGORY and nothing
   * ever guarded the slug, so a traversing slug resolved outside CONTENT_ROOT
   * and served any .mdx on the API disk. Widening the category gate without
   * closing this would have widened the hole with it.
   */
  const escapes = [
    '/api/v1/knowledge/ved/..%2f..%2fsecret',
    '/api/v1/knowledge/ved/%2e%2e%2f%2e%2e%2fsecret',
    '/api/v1/knowledge/ved/..%5c..%5csecret',
  ];

  beforeAll(() => {
    fs.writeFileSync(path.join(ROOT, '..', 'secret.mdx'), '---\ntitle: Secret\n---\nleak\n', 'utf8');
  });

  it.each(escapes)('404s %s rather than reading outside the root', async (url) => {
    const res = await app.inject({ method: 'GET', url });
    expect(res.statusCode).toBe(404);
    expect(res.body).not.toContain('leak');
  });

  it('404s an unknown slug inside a real category', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/knowledge/ved/not-an-article' });
    expect(res.statusCode).toBe(404);
  });
});
