// Regression guard for the /pujas/[slug]/book route.
//
// 2026-07-11: The parent puja page CTAs link to `/pujas/{slug}/book`
// (path-style, bookmarkable). That route 404'd because the actual booking
// UI lives at /pujas/book (reads `slug` from a search param) and nothing
// routed the path-style URL to it. Fix: app/pujas/[slug]/book/page.tsx
// redirects to /pujas/book?slug=...&temple=...
//
// This test asserts the route module exists and its default export calls
// next/navigation's redirect() — which throws a NEXT_REDIRECT error to
// unwind the render — with the slug (and optional temple) forwarded to the
// generic booking page. The redirect target lives on `error.digest`, whose
// shape is `NEXT_REDIRECT;<type>;<url>;<status>` (semicolon-delimited, url
// = 3rd segment). So a future refactor that deletes the route (or drops the
// slug/temple forwarding) breaks the build instead of silently
// reintroducing the 404.

import { describe, it, expect } from 'vitest';

// next/navigation's redirect() throws an error whose .digest is
// `NEXT_REDIRECT;replace;/target/url;307`. Extract the url (3rd segment).
function redirectUrlFromError(e: unknown): string {
  const digest = (e as { digest?: string }).digest ?? '';
  const parts = digest.split(';');
  return parts[2] ?? '';
}

async function renderBookRoute(slug: string, temple?: string) {
  const mod = await import('../../app/pujas/[slug]/book/page');
  const props = {
    params: Promise.resolve({ slug }),
    searchParams: Promise.resolve(temple ? { temple } : {}),
  };
  try {
    await mod.default(props as never);
    throw new Error('expected the route to call redirect(), but it did not throw');
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('expected the route')) throw e;
    return redirectUrlFromError(e);
  }
}

describe('SEO: /pujas/[slug]/book route resolves (no 404)', () => {
  it('the route module exists and exports a default component', async () => {
    const mod = await import('../../app/pujas/[slug]/book/page');
    expect(typeof mod.default).toBe('function');
  });

  it('redirects maha-mrityunjaya to the generic booking page with slug forwarded', async () => {
    const url = await renderBookRoute('maha-mrityunjaya');
    expect(url).toBe('/pujas/book?slug=maha-mrityunjaya');
  });

  it('forwards the temple query param when present', async () => {
    const url = await renderBookRoute('maha-mrityunjaya', 'somnath');
    expect(url).toBe('/pujas/book?slug=maha-mrityunjaya&temple=somnath');
  });

  it('URL-encodes the slug and temple', async () => {
    const url = await renderBookRoute('satyanarayan katha', 'kashi vishwanath');
    expect(url).toBe('/pujas/book?slug=satyanarayan%20katha&temple=kashi%20vishwanath');
  });
});
