import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * RES-09 / F357 — "Raw developer error text is rendered to users; the
 * friendly-error helper exists but is wired into only 2 surfaces."
 *
 * The finding's own remediation list is: "Start with /bookings, /bookings/view,
 * /dashboard, and the six portals." /bookings and /bookings/view were closed by
 * an earlier wave (error-honesty-res07-res09.test.tsx); /dashboard and /payouts
 * go through `loadErrorMessage`. The **six provider portals** were not, and the
 * ledger recorded them as NOT DONE.
 *
 * What a provider could be shown, verbatim, before this change — measured by
 * reading the source on 2026-09-01:
 *
 *   temple-portal/payouts        HTTP 502
 *   temple-portal/schedule       Save failed: HTTP 500
 *   astrologer-portal/consultations
 *                                API 500: {"error":"Internal Server Error"}
 *                                (and up to 120 raw characters of a gateway's HTML)
 *   astrologer-portal/earnings   HTTP 500
 *   store-admin/orders           Failed to fetch orders (502)
 *   store-admin/revenue          Failed to load revenue (HTTP 500)
 *   gaushala-portal/volunteers   Failed (500)
 *   …plus 24 more `setError(err instanceof Error ? err.message : …)` sites
 *   which render whatever the BROWSER wrote on a network failure
 *   ("Failed to fetch", "Load failed", "Unexpected token '<' … is not valid JSON").
 *
 * Two guards below, because either alone is weak:
 *
 *  1. A BEHAVIOURAL test that renders a real portal page against a real 500 and
 *     asserts the status code never reaches the DOM. This is the one that was
 *     red: before the change /temple-portal/payouts rendered the literal string
 *     "HTTP 500".
 *  2. A CENSUS over the six portal directories, so the next page added cannot
 *     quietly reintroduce the pattern. Its detector is itself asserted against
 *     known-offending and known-clean snippets, so a broken regex cannot report
 *     a clean tree.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Behavioural — a real portal page, a real 500
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { id: 'u1', fullName: 'Temple Manager', email: 't@x.test' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/temple-portal/payouts',
  useSearchParams: () => new URLSearchParams(),
}));

import TemplePayoutsPage from '../app/temple-portal/payouts/page';

function failWith(status: number, body: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      ({
        ok: false,
        status,
        text: async () => body,
        json: async () => JSON.parse(body),
      }) as unknown as Response,
    ),
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const FRIENDLY = /We could not load your payouts/i;

describe('RES-09 — a provider portal never prints the status code', () => {
  it('shows friendly copy, not "HTTP 500", when the API 500s', async () => {
    failWith(500, '{"error":"Internal Server Error"}');
    render(<TemplePayoutsPage />);

    await waitFor(() => expect(screen.getByText(FRIENDLY)).toBeTruthy());
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/HTTP\s*500/);
    // "Internal Server Error" is the developer NAME for the status — quoting it
    // back at a temple manager is the same defect in a different costume, and
    // `serverErrorText` is the piece that refuses it.
    expect(body).not.toMatch(/Internal Server Error/);
  });

  it('never renders a gateway’s raw HTML body', async () => {
    failWith(502, '<html><head><title>502 Bad Gateway</title></head><body>nginx</body></html>');
    render(<TemplePayoutsPage />);

    await waitFor(() => expect(screen.getByText(FRIENDLY)).toBeTruthy());
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/Bad Gateway/);
    expect(body).not.toMatch(/nginx/);
    expect(body).not.toMatch(/HTTP\s*502/);
  });

  it('does not print 401 or "Unauthorized" at a temple manager', async () => {
    failWith(401, '{"error":"Unauthorized"}');
    render(<TemplePayoutsPage />);

    await waitFor(() => expect(screen.getByText(FRIENDLY)).toBeTruthy());
    expect(document.body.textContent ?? '').not.toMatch(/\b401\b|Unauthorized/);
  });

  it('keeps a sentence the API actually wrote', async () => {
    // The opposite failure: flattening a useful server message into generic
    // copy is also a regression. `serverErrorText` keeps this one.
    failWith(409, '{"error":"Payouts are paused while your KYC is under review."}');
    render(<TemplePayoutsPage />);

    await waitFor(() =>
      expect(
        screen.getByText(/Payouts are paused while your KYC is under review\./i),
      ).toBeTruthy(),
    );
    expect(document.body.textContent ?? '').not.toMatch(/\b409\b/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Census — the six portals stay clean
// ─────────────────────────────────────────────────────────────────────────────

const WEB_ROOT = path.resolve(__dirname, '..');

/** The six portals the finding names, plus the two devotee screens it names. */
const NAMED_SURFACES = [
  'app/payouts',
  'app/temple-portal',
  'app/astrologer-portal',
  'app/wellness-portal',
  'app/gaushala-portal',
  'app/store-admin',
  'app/dashboard',
  'app/bookings',
];

function stripComments(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === '__tests__' || entry === 'node_modules' || entry === '.next') continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) out.push(full);
  }
  return out;
}

/**
 * A raw-error leak: an error string handed to the user that is built from the
 * caught error's own `.message`, or that interpolates an HTTP status.
 *
 * `setError`/`setToast`/`pushToast`/`alert` are the four sinks these pages use.
 * A `status` that is a DOMAIN status (`order.status`, `r.status === 'PAID'`)
 * is not a leak, so only `${…res.status}`-shaped interpolations inside a
 * user-visible string literal count.
 */
export function rawErrorLeaks(src: string): string[] {
  const clean = stripComments(src);
  const hits: string[] = [];

  // catch (e) { setX(e instanceof Error ? e.message : '…') }, `e?.message`,
  // and the cast form `(err as Error).message` that a narrower regex misses —
  // temple-portal/schedule used exactly that one and survived a grep for the
  // `instanceof` shape.
  for (const m of clean.matchAll(
    /(?:setError|setToast|setActionError|setRegisterError|pushToast|alert)\s*\([\s\S]{0,200}?(?:\b(?:err|e|error)\b\s*(?:instanceof\s+Error\s*\?\s*(?:err|e|error)\.message|\??\.message)|\(\s*(?:err|e|error)\s+as\s+Error\s*\)\.message)/g,
  )) {
    hits.push(m[0].slice(0, 90));
  }

  // A user-visible template literal that interpolates an HTTP status.
  for (const m of clean.matchAll(
    /(?:setError|setToast|setActionError|setRegisterError|pushToast|alert)\s*\([\s\S]{0,200}?`[^`]*\$\{\s*(?:res|r|response)\.status\s*\}/g,
  )) {
    hits.push(m[0].slice(0, 90));
  }

  // "…a friendly sentence (HTTP 502)." — the status stapled onto copy that is
  // otherwise fine. The devotee cannot act on the number and it reads as a
  // crash report. This shape sits too far from its sink for the pattern above
  // (it is inside a nested ternary on /bookings/view and /bookings/pay), so it
  // is matched on the literal itself.
  for (const m of clean.matchAll(/\((?:HTTP\s*)?\$\{\s*(?:res|r|response)\.status\s*\}\)/g)) {
    hits.push(m[0]);
  }

  return hits;
}

describe('RES-09 — the detector is not vacuous', () => {
  it('flags the shapes the finding described', () => {
    expect(
      rawErrorLeaks("setError(e instanceof Error ? e.message : 'Failed to load payouts');"),
    ).toHaveLength(1);
    expect(rawErrorLeaks('setToast(`Save failed: ${(err as Error).message}`);')).toHaveLength(1);
    expect(rawErrorLeaks('setError(`Failed to load revenue (HTTP ${r.status})`);')).not.toHaveLength(
      0,
    );
    // The stapled-on status, far from its sink.
    expect(
      rawErrorLeaks('const m = x ? a : `Could not load this booking (HTTP ${res.status}).`;'),
    ).toHaveLength(1);
    expect(
      rawErrorLeaks('const m = x ? a : `Could not cancel this booking (${res.status}).`;'),
    ).toHaveLength(1);
    expect(
      rawErrorLeaks("pushToast('error', err instanceof Error ? err.message : 'x');"),
    ).toHaveLength(1);
  });

  it('does not flag the fixed shapes or a domain status', () => {
    expect(rawErrorLeaks("setError(userFacingMessage(e, 'We could not load your payouts.'));")).toEqual([]);
    expect(rawErrorLeaks("setError(serverErrorMessage(j, 'We could not save your profile.'));")).toEqual([]);
    expect(rawErrorLeaks('const cls = r.status === "PAID" ? a : b;')).toEqual([]);
    // A comment quoting the offending pattern is not an offender.
    expect(rawErrorLeaks("// setError(e instanceof Error ? e.message : 'x');\n")).toEqual([]);
  });
});

describe('RES-09 — no named surface leaks developer error text', () => {
  it('every page the finding named routes its errors through a helper', () => {
    const offenders: string[] = [];
    for (const rel of NAMED_SURFACES) {
      for (const file of sourceFiles(path.join(WEB_ROOT, rel))) {
        for (const hit of rawErrorLeaks(readFileSync(file, 'utf8'))) {
          offenders.push(`${path.relative(WEB_ROOT, file).split(path.sep).join('/')}: ${hit}`);
        }
      }
    }
    expect(
      offenders,
      'this hands a provider the caught error’s own message (which on a ' +
        'network failure is whatever the browser wrote) or an HTTP status. ' +
        'Route it through lib/friendly-error: userFacingMessage(err, "…") ' +
        'for a catch, serverErrorMessage(body, "…") for a parsed body, and ' +
        'throw UserFacingError(serverErrorText(text, "…"), res.status) ' +
        'instead of `HTTP ${res.status}`.\n' +
        offenders.join('\n'),
    ).toEqual([]);
  });

  /**
   * Anti-vacuity in the other direction: the census would also pass on a tree
   * where every catch had been deleted. Each of the six portals must still
   * IMPORT the helper, i.e. still be handling errors at all.
   */
  it.each([
    'app/temple-portal',
    'app/astrologer-portal',
    'app/wellness-portal',
    'app/gaushala-portal',
    'app/store-admin',
  ])('%s still handles errors, through lib/friendly-error', (rel) => {
    const files = sourceFiles(path.join(WEB_ROOT, rel));
    const consumers = files.filter((f) => /lib\/friendly-error/.test(readFileSync(f, 'utf8')));
    expect(consumers.length, `${rel} imports lib/friendly-error nowhere`).toBeGreaterThan(0);
  });
});
