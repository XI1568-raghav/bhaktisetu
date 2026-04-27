import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { generateEmbedding, toPgVector, embeddings } from '../lib/embeddings.js';

/**
 * Semantic search across content, temples, pujas via pgvector cosine
 * similarity. Falls back to LIKE-based matching when COHERE_API_KEY is
 * unset OR when the embedding column doesn't exist yet (pgvector
 * extension not enabled — see prisma/migrations/<ts>_pgvector/).
 *
 *   GET /semantic-search?q=<query>&kind=<content|temple|puja>&limit=10
 *
 * Migration to add embeddings:
 *   1. Enable pgvector on Supabase: `create extension if not exists vector;`
 *   2. Add column: `alter table content_items add column embedding vector(1024);`
 *      Same for temples, puja_types.
 *   3. Backfill via scripts/backfill-embeddings.ts (calls generateEmbeddingsBatch).
 *   4. Index: `create index on content_items using ivfflat (embedding vector_cosine_ops);`
 *
 * Until step 1-3 are complete this route returns LIKE-matched results
 * automatically — no error is thrown.
 */

type SearchKind = 'content' | 'temple' | 'puja' | 'all';

interface SearchHit {
  kind: 'content' | 'temple' | 'puja';
  id: string;
  title: string;
  snippet: string;
  score: number;
  url: string;
}

// Different tables have different column names — content_items uses
// (title, body); temples and puja_types use (name, description).
// Map each whitelisted table to its display columns.
const TABLE_COLS: Record<
  'content_items' | 'temples' | 'puja_types',
  { titleCol: string; snippetCol: string }
> = {
  content_items: { titleCol: 'title', snippetCol: 'body' },
  temples:       { titleCol: 'name',  snippetCol: 'description' },
  puja_types:    { titleCol: 'name',  snippetCol: 'description' },
};

async function vectorSearch(
  table: 'content_items' | 'temples' | 'puja_types',
  embedding: number[],
  limit: number,
): Promise<Array<{ id: string; title: string; snippet: string; score: number }>> {
  const lit = toPgVector(embedding);
  const { titleCol, snippetCol } = TABLE_COLS[table];
  const lim = Math.max(1, Math.min(50, limit));
  // table + column names are whitelisted (not from user input) so safe to interpolate.
  try {
    return await prisma.$queryRawUnsafe<
      Array<{ id: string; title: string; snippet: string; score: number }>
    >(
      `select id,
              ${titleCol} as title,
              coalesce(left(${snippetCol}, 240), '') as snippet,
              1 - (embedding <=> '${lit}'::vector) as score
         from ${table}
        where embedding is not null
        order by embedding <=> '${lit}'::vector
        limit ${lim}`,
    );
  } catch (err) {
    console.warn(`[semantic-search] ${table} vector query failed:`, (err as Error).message);
    return [];
  }
}

async function fallbackLike(
  kind: SearchKind,
  q: string,
  limit: number,
): Promise<SearchHit[]> {
  const results: SearchHit[] = [];
  const term = `%${q}%`;
  if (kind === 'content' || kind === 'all') {
    const items = await prisma.contentItem
      .findMany({
        where: { OR: [{ title: { contains: q, mode: 'insensitive' } }, { body: { contains: q, mode: 'insensitive' } }] },
        select: { id: true, title: true, body: true, slug: true },
        take: limit,
      })
      .catch(() => []);
    for (const c of items) {
      results.push({
        kind: 'content',
        id: c.id,
        title: c.title,
        snippet: (c.body ?? '').slice(0, 240),
        score: 0,
        url: `/content/${c.slug}`,
      });
    }
  }
  if (kind === 'temple' || kind === 'all') {
    const items = await prisma.temple
      .findMany({
        where: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] },
        select: { id: true, name: true, description: true, slug: true },
        take: limit,
      })
      .catch(() => []);
    for (const t of items) {
      results.push({
        kind: 'temple',
        id: t.id,
        title: t.name,
        snippet: (t.description ?? '').slice(0, 240),
        score: 0,
        url: `/temples/${t.slug}`,
      });
    }
  }
  if (kind === 'puja' || kind === 'all') {
    const items = await prisma.pujaType
      .findMany({
        where: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] },
        select: { id: true, name: true, description: true, slug: true },
        take: limit,
      })
      .catch(() => []);
    for (const p of items) {
      results.push({
        kind: 'puja',
        id: p.id,
        title: p.name,
        snippet: (p.description ?? '').slice(0, 240),
        score: 0,
        url: `/pujas/${p.slug}`,
      });
    }
  }
  // Fake "term-overlap" score so ordering is at least deterministic
  void term;
  return results.slice(0, limit);
}

export async function semanticSearchRoutes(server: FastifyInstance) {
  server.get('/', async (request, reply) => {
    const { q, kind = 'all', limit = '10' } = (request.query ?? {}) as {
      q?: string;
      kind?: SearchKind;
      limit?: string;
    };
    if (!q || q.trim().length < 2) {
      return reply.code(400).send({ error: 'Query (q) must be at least 2 characters' });
    }
    const lim = Math.max(1, Math.min(50, Number(limit) || 10));

    if (!embeddings.enabled) {
      const hits = await fallbackLike(kind, q.trim(), lim);
      return reply.send({ ok: true, mode: 'like', hits });
    }

    const queryVec = await generateEmbedding(q.trim(), 'search_query');
    if (!queryVec) {
      const hits = await fallbackLike(kind, q.trim(), lim);
      return reply.send({ ok: true, mode: 'like-fallback', hits });
    }

    const all: SearchHit[] = [];
    if (kind === 'content' || kind === 'all') {
      const rows = await vectorSearch('content_items', queryVec, lim);
      for (const r of rows) {
        all.push({ kind: 'content', id: r.id, title: r.title, snippet: r.snippet, score: r.score, url: `/content/${r.id}` });
      }
    }
    if (kind === 'temple' || kind === 'all') {
      const rows = await vectorSearch('temples', queryVec, lim);
      for (const r of rows) {
        all.push({ kind: 'temple', id: r.id, title: r.title, snippet: r.snippet, score: r.score, url: `/temples/${r.id}` });
      }
    }
    if (kind === 'puja' || kind === 'all') {
      const rows = await vectorSearch('puja_types', queryVec, lim);
      for (const r of rows) {
        all.push({ kind: 'puja', id: r.id, title: r.title, snippet: r.snippet, score: r.score, url: `/pujas/${r.id}` });
      }
    }

    if (all.length === 0) {
      const hits = await fallbackLike(kind, q.trim(), lim);
      return reply.send({ ok: true, mode: 'like-fallback', hits });
    }

    all.sort((a, b) => b.score - a.score);
    return reply.send({ ok: true, mode: 'vector', hits: all.slice(0, lim) });
  });
}
