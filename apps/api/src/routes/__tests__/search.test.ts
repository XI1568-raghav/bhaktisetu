/**
 * [CM-12] The /search response contract.
 *
 * The finding's own fix text asks for "temples, pujas, content AND store
 * products in one result set". The route shipped three buckets and no store
 * query at all, so 26 saleable products were unreachable from the only search
 * box on the site — and nothing failed, because every guarding test lived on
 * the web side and hand-mocked the response shape it wanted.
 *
 * This is the first API-side test for this route. It asserts the SHAPE and the
 * arithmetic against the real handler with prisma stubbed, so a bucket that is
 * dropped from one of the two reply paths (the <2-char short circuit and the
 * main path) fails here rather than silently in a client that reads
 * `body.results?.products` and gets undefined.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const findMany = {
  temple: vi.fn(),
  pujaType: vi.fn(),
  contentItem: vi.fn(),
  storeProduct: vi.fn(),
};

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    temple: { findMany: (...a: unknown[]) => findMany.temple(...a) },
    pujaType: { findMany: (...a: unknown[]) => findMany.pujaType(...a) },
    contentItem: { findMany: (...a: unknown[]) => findMany.contentItem(...a) },
    storeProduct: { findMany: (...a: unknown[]) => findMany.storeProduct(...a) },
  },
}));

const { searchRoutes } = await import('../search.js');

/** Minimal Fastify double: captures the GET handler and runs it. */
async function run(query: Record<string, string>) {
  let handler!: (req: unknown, reply: unknown) => Promise<unknown>;
  await searchRoutes({
    get: (_path: string, h: typeof handler) => {
      handler = h;
    },
  } as never);
  let sent: unknown;
  const reply = {
    send: (b: unknown) => {
      sent = b;
      return b;
    },
  };
  await handler({ query }, reply);
  return sent as {
    query: string;
    results: Record<string, unknown> & { total: number };
  };
}

beforeEach(() => {
  findMany.temple.mockResolvedValue([]);
  findMany.pujaType.mockResolvedValue([]);
  findMany.contentItem.mockResolvedValue([]);
  findMany.storeProduct.mockResolvedValue([]);
});

const BUCKETS = ['temples', 'pujas', 'content', 'products'] as const;

describe('[CM-12] GET /search returns every bucket on every path', () => {
  it('the short-circuit reply carries all buckets', async () => {
    const body = await run({ q: 'a' });
    for (const b of BUCKETS) {
      expect(body.results[b], `"${b}" missing from the <2-char reply`).toEqual([]);
    }
    expect(body.results.total).toBe(0);
  });

  it('the main reply carries all buckets', async () => {
    const body = await run({ q: 'rudrabhishek' });
    for (const b of BUCKETS) {
      expect(body.results[b], `"${b}" missing from the main reply`).toBeInstanceOf(Array);
    }
  });

  it('store products are actually queried and mapped to a reachable href', async () => {
    findMany.storeProduct.mockResolvedValue([
      {
        id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
        name: 'Rudraksha Mala',
        category: 'Malas',
        price: 599,
        imageUrl: null,
      },
    ]);
    const body = await run({ q: 'rudraksha' });
    expect(findMany.storeProduct, 'no storeProduct query was issued').toHaveBeenCalled();
    const products = body.results.products as Array<Record<string, unknown>>;
    expect(products).toHaveLength(1);
    expect(products[0]!.name).toBe('Rudraksha Mala');
    // /store/<handle> is the STATIC catalogue in apps/web/lib/products.ts and
    // has no route for a DB row. /store/seller/<id> is the page that renders
    // one, so that is the only href that resolves.
    expect(products[0]!.href).toBe('/store/seller/3f2504e0-4f89-11d3-9a0c-0305e82c3301');
  });

  it('only active products are searchable', async () => {
    await run({ q: 'rudraksha' });
    const arg = findMany.storeProduct.mock.calls[0]![0] as { where: Record<string, unknown> };
    expect(arg.where.isActive, 'inactive/delisted products must not surface').toBe(true);
  });

  it('total counts every bucket, not just the original three', async () => {
    findMany.temple.mockResolvedValue([{ id: 't', slug: 't', name: 'T', city: '', state: '', deityPrimary: '', images: [] }]);
    findMany.storeProduct.mockResolvedValue([
      { id: 'p1', name: 'P1', category: null, price: 1, imageUrl: null },
      { id: 'p2', name: 'P2', category: null, price: 1, imageUrl: null },
    ]);
    const body = await run({ q: 'thali' });
    expect(
      body.results.total,
      'total omitted the products bucket, so the UI reports fewer hits than it renders',
    ).toBe(3);
  });
});

describe('[CM-12] the route docstring does not claim corpora it does not search', () => {
  it('does not advertise yatras', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = fs.readFileSync(
      path.resolve(import.meta.dirname, '..', 'search.ts'),
      'utf8',
    );
    const doc = /\/\*\*[\s\S]*?\*\//.exec(src)?.[0] ?? '';
    // The CLAIM sentence, not any mention: the docstring may explain why yatras
    // were dropped, it may not say the endpoint searches them.
    const claim = /Global search across[\s\S]*?\./.exec(doc)?.[0] ?? '';
    expect(claim, 'the summary sentence is gone — this guard would measure nothing').toBeTruthy();
    expect(
      claim,
      'the docstring promises yatras; there is no yatra query and no Yatra model',
    ).not.toMatch(/yatra/i);
    // ...and the claim is false because nothing queries one.
    expect(src).not.toMatch(/prisma\.yatra/);
  });
});
