import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SITE_NAME } from '../lib/seo/title-template';

// TD-05 (prod sweep 2026-08-12): https://darshya.online/astrology/kundli — the
// page /kundli redirects to, and the free tool built to capture one of the
// highest-volume devotional searches in India — served the site-wide default
// title, "Darshya — India's Devotional Super App". Its own <h1> read "Free
// Kundli Generator"; nothing in the title tag said so. Every neighbouring
// route (/temples, /darshan, /festival) carried a bespoke title.
//
// The page is a client component, so it cannot export metadata itself. The
// segment layout supplies it, exactly as app/auth/login/layout.tsx does.

const KUNDLI = path.join(__dirname, '..', 'app', 'astrology', 'kundli');

describe('TD-05 — the free Kundli page has its own title', () => {
  it('the segment declares metadata', async () => {
    const mod = await import('../app/astrology/kundli/layout');
    const meta = (mod as { metadata?: Record<string, unknown> }).metadata;
    expect(meta).toBeTruthy();
    expect(typeof meta!.title).toBe('string');
  });

  it('the title names the tool, not just the brand', async () => {
    const { metadata } = (await import('../app/astrology/kundli/layout')) as {
      metadata: { title: string };
    };
    expect(metadata.title).toMatch(/kundli/i);
    expect(metadata.title).not.toMatch(/Devotional Super App/i);
  });

  it('does not double-brand: the root template appends the site name', async () => {
    const { metadata } = (await import('../app/astrology/kundli/layout')) as {
      metadata: { title: string };
    };
    expect(metadata.title).not.toContain(SITE_NAME);
  });

  it('carries a description and a canonical', async () => {
    const { metadata } = (await import('../app/astrology/kundli/layout')) as {
      metadata: { description?: string; alternates?: { canonical?: string } };
    };
    expect(metadata.description ?? '').not.toHaveLength(0);
    expect(metadata.alternates?.canonical).toBe('https://darshya.online/astrology/kundli');
  });

  it('the layout renders its children unchanged', async () => {
    const mod = (await import('../app/astrology/kundli/layout')) as {
      default: (p: { children: unknown }) => unknown;
    };
    const children = { marker: 'kundli-child' };
    expect(mod.default({ children })).toBe(children);
  });

  it('the page itself is still a client component that owns no metadata', () => {
    const src = fs.readFileSync(path.join(KUNDLI, 'page.tsx'), 'utf8');
    expect(src.startsWith("'use client'")).toBe(true);
  });
});
