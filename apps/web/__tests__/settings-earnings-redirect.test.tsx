/**
 * `/settings/earnings` — regression guards (P0, 2026-08-11).
 *
 * The route used to render a 496-line design mock (MOCK_MONTHLY /
 * MOCK_TRANSACTIONS, "Total Earnings ₹1,44,800", TXN-2026… ids) as a signed-in
 * provider's real ledger, behind an <AuthGuard> with no allowedRoles, with an
 * inert "Request Instant Payout" button and an uncontrolled bank-details form
 * whose "save" wrote nothing. It is now a redirect onto the one real payout
 * surface. These tests fail if any part of that comes back.
 *
 * Assertions run against the file with comments stripped — the WHY comment in
 * page.tsx quotes the removed literals by name on purpose, and a guard that
 * tripped on its own documentation would be deleted by the next reader.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

/** Source with block and line comments removed, so guards bind to code only. */
const codeOf = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const PAGE = 'app/settings/earnings/page.tsx';

describe('/settings/earnings forwards to the real payout surface', () => {
  beforeEach(() => redirectMock.mockClear());

  it('the page redirects to /payouts instead of rendering a ledger', async () => {
    const mod = await import('../app/settings/earnings/page');
    mod.default();
    // The mock page returned JSX and never called redirect, so restoring it
    // fails here even if every literal below were renamed.
    expect(redirectMock).toHaveBeenCalledWith('/payouts');
  });

  it('is a server component, so no fabricated ledger can flash before the redirect', () => {
    expect(codeOf(PAGE)).not.toContain('use client');
  });
});

describe('/settings/earnings carries no fabricated money', () => {
  it('has no mock data tables', () => {
    const code = codeOf(PAGE);
    expect(code).not.toMatch(/MOCK_/);
    expect(code).not.toMatch(/TXN-\d/);
    expect(code).not.toMatch(/formatPrice/);
  });

  it('has no hardcoded amounts at all', () => {
    // Every figure on the old page was a literal: 18500, 2598, 1440, 4289…
    // A redirect stub needs no number this size, so any reappearing one is a
    // reintroduced fake figure (or a re-fabricated account number).
    expect(codeOf(PAGE)).not.toMatch(/\b\d{3,}\b/);
  });
});

describe('/settings/earnings has no controls that write nothing', () => {
  it('has no buttons, and no uncontrolled bank-details inputs', () => {
    const code = codeOf(PAGE);
    expect(code).not.toMatch(/<button/i);
    expect(code).not.toMatch(/<input/i);
    // defaultValue with no onChange is what made the bank form silently
    // discard a provider's new account number and IFSC.
    expect(code).not.toMatch(/defaultValue/);
    expect(code).not.toMatch(/IFSC/i);
  });
});

describe('the redirect target is still role-gated', () => {
  it('/payouts restricts to provider roles, so devotees do not land on a money page', () => {
    // The old page was <AuthGuard> with NO allowedRoles — every authenticated
    // user saw it. Redirecting only closes that hole while /payouts stays
    // gated, so this guards the authorization half of the fix.
    const payouts = read('app/payouts/page.tsx');
    expect(payouts).toMatch(/allowedRoles=\{PROVIDER_ROLES\}/);
    expect(payouts).toMatch(/const PROVIDER_ROLES: UserRole\[\] = \[[^\]]*\]/);
    const roles = payouts.match(/const PROVIDER_ROLES: UserRole\[\] = \[([^\]]*)\]/)?.[1] ?? '';
    expect(roles).not.toContain('devotee');
    expect(roles).toContain('priest');
  });
});
