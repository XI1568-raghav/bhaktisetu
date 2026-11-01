/**
 * PDF3 (tester report, devotee section + public pages), regression pins.
 *
 * - Items 6/7/8: a chunk file name with ( or ) makes Cloudflare Workers Assets
 *   answer 307 to the same URL (ERR_TOO_MANY_REDIRECTS) so route-group pages
 *   (/temples, /astrology, /pujas/book) fell into the error boundary.
 * - Item 7: every temple's "Live Darshan" target must be prerendered.
 * - Items 3/4/10/13: the devotee dashboard reaches consultations, settings,
 *   subscriptions, the share page and the gurukul portal.
 * - Item 12: nearby-place suggestions come from the committed distance tables.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import nextConfig, { clientChunkFilename } from '../next.config';
import { nearbySites } from '../lib/yatra-distance';
import { sacredSites } from '../lib/yatra-data';

const WEB = path.resolve(__dirname, '..');
const read = (rel: string) => readFileSync(path.join(WEB, rel), 'utf8');

describe('webpack client chunk file names never contain parentheses', () => {
  const tpl = 'static/chunks/[name]-[contenthash].js';
  const fn = clientChunkFilename(tpl);

  it('rewrites route-group names', () => {
    expect(fn({ chunk: { name: 'app/temples/(index)/page' } })).toBe(
      'static/chunks/app/temples/_index_/page-[contenthash].js',
    );
  });

  it('leaves every other chunk on the stock template', () => {
    expect(fn({ chunk: { name: 'app/pujas/[slug]/page' } })).toBe(tpl);
    expect(fn({ chunk: { name: null } })).toBe(tpl);
    expect(fn({})).toBe(tpl);
  });

  it('is installed for the client compilation only', () => {
    const client: any = { resolve: {}, output: { filename: tpl } };
    const server: any = { resolve: {}, output: { filename: '../[name].js' } };
    (nextConfig as any).webpack(client, { isServer: false });
    (nextConfig as any).webpack(server, { isServer: true });
    expect(typeof client.output.filename).toBe('function');
    expect(client.output.filename({ chunk: { name: 'app/astrology/(index)/page' } })).not.toMatch(/[()]/);
    expect(server.output.filename).toBe('../[name].js');
  });
});

describe('Live Darshan targets are prerendered', () => {
  beforeAll(() => {
    process.env.SKIP_API_PRERENDER = '1';
  });

  it('covers curated temples beyond the original short list', async () => {
    const { generateStaticParams } = await import('../app/darshan/[id]/page');
    const ids = (await generateStaticParams()).map((p: { id: string }) => p.id);
    for (const id of ['kedarnath', 'mallikarjuna', 'somnath', 'kashi-vishwanath']) {
      expect(ids, id).toContain(id);
    }
  });
});

describe('devotee dashboard entry points', () => {
  const src = read('app/dashboard/page.tsx');
  it('links consultations, subscriptions, settings and the share page', () => {
    for (const href of ['/profile/consultations', '/account/subscriptions', '/profile#settings', '/refer']) {
      expect(src).toContain(`href="${href}"`);
    }
  });
  it('points a gurukul owner at the gurukul portal', () => {
    expect(src).toContain('/gurukuls/mine/list');
    expect(src).toContain('href="/gurukul-portal"');
  });
});

describe('/refer is an honest share page', () => {
  const src = read('app/refer/page.tsx');
  it('offers WhatsApp and copy-link without promising a reward', () => {
    expect(src).toContain('https://wa.me/');
    expect(src).toContain('Copy link');
  });
});

describe('yatra planner nearby suggestions', () => {
  it('suggests unselected, close sites from the committed tables only', () => {
    const withCoords = sacredSites.find((s) => nearbySites(s, sacredSites, [s.id]).length > 0);
    expect(withCoords).toBeDefined();
    const out = nearbySites(withCoords!, sacredSites, [withCoords!.id]);
    expect(out.length).toBeLessThanOrEqual(3);
    for (const n of out) {
      expect(n.id).not.toBe(withCoords!.id);
      expect(n.km).toBeLessThanOrEqual(250);
    }
    const sorted = [...out].sort((a, b) => a.km - b.km);
    expect(out).toEqual(sorted);
  });
  it('never suggests an already chosen site', () => {
    const a = sacredSites[0];
    const all = sacredSites.map((s) => s.id);
    expect(nearbySites(a, sacredSites, all)).toEqual([]);
  });
});
