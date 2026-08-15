/**
 * DF-13 (prod sweep 2026-08-12, P3) — pages in the funnel shipping with no
 * metadata, and a doubled brand suffix on the ones that had it.
 *
 * The sweep pulled <title> across the funnel and found /astrology/kundli,
 * /pujas/book and /checkout/offering all falling back to the generic
 * "Darshya — India's Devotional Super App", while 16 other pages ended in
 * "| Darshya | Darshya".
 *
 * The doubled-suffix half was closed by SEO-03 (one template in
 * lib/seo/title-template.ts, brand stripped from 171 route files). What is
 * closed here is the /pujas/book half: it is a `'use client'` route, so it
 * could not export `metadata` itself — a segment layout can.
 *
 * /astrology/kundli and /checkout/offering are the same defect on routes
 * outside this lane and are NOT fixed here.
 */

import { describe, it, expect } from 'vitest';
import { metadata } from '../app/pujas/book/layout';
import { TITLE_TEMPLATE, SITE_NAME } from '../lib/seo/title-template';

describe('DF-13 — the booking page declares its own metadata', () => {
  it('has a written title rather than falling back to the app default', () => {
    expect(typeof metadata.title).toBe('string');
    expect((metadata.title as string).length).toBeGreaterThan(20);
  });

  it('has a description', () => {
    expect(typeof metadata.description).toBe('string');
    expect((metadata.description as string).length).toBeGreaterThan(50);
  });

  it('does not repeat the brand — the root template appends it exactly once', () => {
    const title = metadata.title as string;
    expect(title).not.toContain(SITE_NAME);
    const rendered = TITLE_TEMPLATE.replace('%s', title);
    const occurrences = rendered.split(SITE_NAME).length - 1;
    expect(occurrences).toBe(1);
  });

  it('stays inside the SERP title budget once branded', () => {
    const rendered = TITLE_TEMPLATE.replace('%s', metadata.title as string);
    expect(rendered.length).toBeLessThanOrEqual(70);
  });

  it('does not invite indexing of a client-rendered funnel step', () => {
    expect(metadata.robots).toMatchObject({ index: false });
  });

  it('self-canonicalises, per the SEO-01 rule the rest of the app follows', () => {
    expect(metadata.alternates?.canonical).toBe('https://darshya.online/pujas/book');
  });
});
