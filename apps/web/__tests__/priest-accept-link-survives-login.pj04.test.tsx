/**
 * PJ-04, the half the /priest/offers screen did not close.
 *
 * The shipped fix built /priest/offers over the existing dispatch endpoints and
 * added app/priest/bookings/[id]/page.tsx so the WhatsApp one-tap link stopped
 * 404ing. Both are real. What it could not close from inside those files — and
 * said so in its own header comment — is the login bounce:
 *
 *     apps/web/middleware.ts:221
 *       signIn.searchParams.set('redirect', pathname);
 *
 * `pathname`, not `pathname + search`. /priest is a PORTAL_PREFIX, so a pandit
 * who taps the WhatsApp link on a phone that is not signed in is bounced to
 * /auth/login?redirect=/priest/bookings/<id>, signs in, and lands on the plain
 * booking view — which for an un-accepted offer is a 403 from
 * getAssignedBookingById. The accept intent is destroyed by the one hop it is
 * guaranteed to make. Live-verified in the sweep: "?accept=1 stripped from the
 * redirect target".
 *
 * middleware.ts is not editable here, and it does not need to be: what the
 * middleware preserves perfectly is the PATH. Moving the intent out of the
 * query string and into a path segment makes it survive by construction —
 * /priest/bookings/<id>/accept round-trips through the login bounce unchanged.
 *
 * Both sides of the contract are asserted: the API must emit the path form, and
 * the web app must serve it. The old `?accept=1` route stays for the links
 * already sitting in people's WhatsApp history.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const redirects = vi.hoisted(() => ({ to: [] as string[] }));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    redirects.to.push(to);
    throw new Error(`NEXT_REDIRECT:${to}`);
  },
}));

const WEB = path.resolve(__dirname, '..');
const ACCEPT_PAGE = path.join(WEB, 'app/priest/bookings/[id]/accept/page.tsx');
const MIDDLEWARE = path.join(WEB, 'middleware.ts');
const DISPATCH = path.resolve(WEB, '../api/src/services/dispatch.service.ts');

const BOOKING_ID = 'b1330da2-c830-41ff-93da-ded81963b163';

beforeEach(() => {
  redirects.to = [];
});

describe('PJ-04 — the accept intent survives the login bounce', () => {
  it('middleware still forwards only the pathname (the constraint being designed around)', () => {
    // If this ever stops being true the path-segment route is harmless, but the
    // reason for it should be re-read rather than silently inherited.
    const src = readFileSync(MIDDLEWARE, 'utf8');
    expect(src).toMatch(/signIn\.searchParams\.set\(\s*'redirect'\s*,\s*pathname\s*\)/);
  });

  it('serves a path-segment accept route at app/priest/bookings/[id]/accept', () => {
    expect(existsSync(ACCEPT_PAGE), ACCEPT_PAGE).toBe(true);
  });

  it('lands the accept path on the offers surface, carrying the booking id', async () => {
    const mod = await import('../app/priest/bookings/[id]/accept/page');
    await expect(
      (mod.default as (p: { params: Promise<{ id: string }> }) => Promise<unknown>)({
        params: Promise.resolve({ id: BOOKING_ID }),
      }),
    ).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirects.to).toEqual([`/priest/offers?booking=${BOOKING_ID}`]);
  });

  it('API emits an accept URL with no query string, so nothing can be stripped', () => {
    const src = readFileSync(DISPATCH, 'utf8');
    const m = /acceptUrl:\s*`([^`]+)`/.exec(src);
    expect(m, 'acceptUrl template in dispatch.service.ts').toBeTruthy();
    const template = m![1];
    expect(template).not.toContain('?');
    expect(template).toContain('/accept');
  });

  it('the emitted path is exactly the route the web app serves', () => {
    const src = readFileSync(DISPATCH, 'utf8');
    const template = /acceptUrl:\s*`([^`]+)`/.exec(src)![1];
    const concrete = template
      .replace('${acceptBase}', 'https://darshya.online')
      .replace('${bookingId}', BOOKING_ID);
    const { pathname, search } = new URL(concrete);
    // What middleware would put in ?redirect= — and what must still resolve.
    expect(search).toBe('');
    expect(pathname).toBe(`/priest/bookings/${BOOKING_ID}/accept`);
  });

  it('keeps the legacy ?accept=1 route working for links already sent', async () => {
    const mod = await import('../app/priest/bookings/[id]/page');
    await expect(
      (
        mod.default as (p: {
          params: Promise<{ id: string }>;
          searchParams: Promise<{ accept?: string }>;
        }) => Promise<unknown>
      )({
        params: Promise.resolve({ id: BOOKING_ID }),
        searchParams: Promise.resolve({ accept: '1' }),
      }),
    ).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirects.to).toEqual([`/priest/offers?booking=${BOOKING_ID}`]);
  });
});
