/**
 * RES-09 (F357) — the residual after the 2026-08-28 pass, in two shapes.
 *
 * ── Shape 1: the empty state that renders on top of the error ────────────────
 *
 * The ledger note for F357 names it directly — "a call-site change on that page
 * plus suppressing the empty-state". `app/bookings/page.tsx:411` was gated in
 * the earlier pass; two devotee screens were not:
 *
 *   app/account/subscriptions/page.tsx:219   `) : !subscription ? (`
 *   app/profile/consultations/page.tsx:138   `{items.length === 0 ? (`
 *
 * Both render `null`/`[]` after a FAILED load exactly as they render it after a
 * successful empty one. So a devotee whose token expired, or whose connection
 * dropped, was told "You don't have an active subscription." beside a red
 * banner saying the load failed — a factual claim about their billing, made
 * from data the page never received. Friendly error copy does not fix that;
 * the error copy was already correct on the subscriptions page. The screen
 * still answered a question it had no answer to.
 *
 * ── Shape 2: raw developer text still reaching a devotee ─────────────────────
 *
 * MEASURED BEFORE (this branch, 2026-09-08):
 *
 *   app/profile/consultations/page.tsx:78   throw new Error(`Could not load (${res.status})`)
 *   app/profile/consultations/page.tsx:102  throw new Error(`Cancel ${res.status}${body ? `: ${body.slice(0, 140)}` : ''}`)
 *   app/profile/consultations/page.tsx:81   setError(e instanceof Error ? e.message : 'Network error')
 *   app/profile/consultations/page.tsx:105  setCancelError(e instanceof Error ? e.message : 'Could not cancel')
 *
 *   app/consultation/[id]/success/page.tsx:57  throw new Error(`Cancel ${res.status}${body ? `: ${body.slice(0, 140)}` : ''}`)
 *   app/consultation/[id]/success/page.tsx:63  setCancelError(e instanceof Error ? e.message : 'Could not cancel')
 *   app/consultation/[id]/success/page.tsx:79  throw new Error(`Could not load consultation (${res.status})`)
 *   app/consultation/[id]/success/page.tsx:84  setError(err instanceof Error ? err.message : 'Could not load consultation.')
 *
 * The cancel path is the worst of the set: it splices up to 140 characters of
 * the RESPONSE BODY into the thrown message and renders it. A gateway that
 * answers HTML, or an API that answers {"error":"Internal Server Error"}, puts
 * that text straight into a red box on a devotee's screen.
 *
 * The helper for all of this already exists and is tested — lib/friendly-error.
 * `UserFacingError` marks copy the product wrote, `userFacingMessage` passes
 * those through and routes everything else (network, 401, 429, 5xx) through
 * `friendlyApiError`. These pages just never called it.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { id: 'u1', fullName: 'Test Devotee' },
    isAuthenticated: true,
    isLoading: false,
  }),
  getRoleDashboardPath: () => '/dashboard',
}));

vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/profile/consultations',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: 'c-1' }),
}));

import AccountSubscriptionsPage from '../app/account/subscriptions/page';
import MyConsultationsPage from '../app/profile/consultations/page';
import ConsultationSuccessPage from '../app/consultation/[id]/success/page';

const res = (body: unknown, ok = true, status = 200, statusText = 'OK') =>
  ({
    ok,
    status,
    statusText,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }) as Response;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── Shape 1 — the empty state may not answer a question the page never got ───

describe('RES-09 — /account/subscriptions does not assert "no subscription" after a failed load', () => {
  it('a 500 shows the error and NOT the no-subscription empty state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        res({ error: 'Internal Server Error' }, false, 500, 'Internal Server Error'),
      ),
    );
    render(<AccountSubscriptionsPage />);
    await waitFor(() => expect(screen.getByText(/on our side/i)).toBeTruthy());
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/have an active subscription/i);
    expect(body).not.toMatch(/See plans/i);
  });

  it('a dropped connection shows the error and NOT the empty state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    render(<AccountSubscriptionsPage />);
    await waitFor(() => expect(screen.getByText(/check your connection/i)).toBeTruthy());
    expect(document.body.textContent ?? '').not.toMatch(/have an active subscription/i);
  });

  it('a genuinely empty result STILL shows the empty state and its plans link', async () => {
    // The gate must key on the error, not on the absence of data — otherwise it
    // would silently delete the real empty state, which is the honest answer
    // when the server actually said "you have none".
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res({ subscription: null })));
    render(<AccountSubscriptionsPage />);
    await waitFor(() =>
      expect(screen.getByText(/have an active subscription/i)).toBeTruthy(),
    );
    expect(screen.getByText(/See plans/i)).toBeTruthy();
  });
});

describe('RES-09 — /profile/consultations does not assert "no consultations" after a failed load', () => {
  it('a 500 shows the error and NOT the empty state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        res({ error: 'Internal Server Error' }, false, 500, 'Internal Server Error'),
      ),
    );
    render(<MyConsultationsPage />);
    await waitFor(() => expect(screen.getByText(/on our side/i)).toBeTruthy());
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/No consultations yet/i);
    expect(body).not.toMatch(/Browse Astrologers/i);
  });

  it('a genuinely empty list STILL shows the empty state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res({ consultations: [] })));
    render(<MyConsultationsPage />);
    await waitFor(() => expect(screen.getByText(/No consultations yet/i)).toBeTruthy());
  });
});

// ── Shape 2 — no status codes, no response bodies, no browser strings ────────

describe('RES-09 — /profile/consultations renders friendly copy, never developer text', () => {
  it('an expired session reads as an expired session, not "(401)"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(res({ error: 'Unauthorized' }, false, 401, 'Unauthorized')),
    );
    render(<MyConsultationsPage />);
    await waitFor(() => expect(screen.getByText(/session has expired/i)).toBeTruthy());
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/401/);
    expect(body).not.toMatch(/Could not load \(/i);
    expect(body).not.toMatch(/Unauthorized/i);
  });

  it('a dropped connection names the connection, not the browser’s own string', async () => {
    for (const raw of ['Failed to fetch', 'Load failed']) {
      cleanup();
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError(raw)));
      render(<MyConsultationsPage />);
      await waitFor(() => expect(screen.getByText(/check your connection/i)).toBeTruthy());
      expect(document.body.textContent ?? '').not.toMatch(new RegExp(raw, 'i'));
    }
  });

  it("keeps the API's own sentence when the server wrote one worth reading", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        res({ error: 'Consultations are temporarily unavailable in your region.' }, false, 409, 'Conflict'),
      ),
    );
    render(<MyConsultationsPage />);
    await waitFor(() =>
      expect(
        screen.getByText('Consultations are temporarily unavailable in your region.'),
      ).toBeTruthy(),
    );
  });
});

describe('RES-09 — /consultation/[id]/success renders friendly copy, never developer text', () => {
  it('a 500 on load does not print the status or the developer name', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        res({ error: 'Internal Server Error' }, false, 500, 'Internal Server Error'),
      ),
    );
    render(<ConsultationSuccessPage />);
    await waitFor(() => expect(screen.getByText(/on our side/i)).toBeTruthy());
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/500/);
    expect(body).not.toMatch(/Internal Server Error/i);
    expect(body).not.toMatch(/Could not load consultation \(/i);
  });

  it('a non-JSON gateway body is never spliced into the screen', async () => {
    // This is the shape the old `body.slice(0, 140)` leaked verbatim.
    const html = '<html><head><title>502 Bad Gateway</title></head><body>nginx/1.24.0</body></html>';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(html, false, 502, 'Bad Gateway')));
    render(<ConsultationSuccessPage />);
    await waitFor(() => expect(screen.getByText(/on our side/i)).toBeTruthy());
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/nginx/i);
    expect(body).not.toMatch(/502/);
  });
});

// ── The throws themselves, so a future edit cannot recompose developer text ──

describe('RES-09 — no consultation surface composes a message out of a status code', () => {
  const FILES = [
    'app/profile/consultations/page.tsx',
    'app/consultation/[id]/success/page.tsx',
    'app/checkout/offering/page.tsx',
  ];

  it('none of them interpolates res.status into a thrown or set message', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const WEB = path.resolve(__dirname, '..');
    for (const rel of FILES) {
      const src = fs
        .readFileSync(path.join(WEB, rel), 'utf8')
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      expect(src.length, rel).toBeGreaterThan(1000);
      // A template literal that puts the status inside a sentence.
      expect(src, rel).not.toMatch(/`[^`]*\$\{\s*(?:list|detail)?[rR]es\.status\s*\}[^`]*`/);
      // The raw-message pattern this finding is named for.
      expect(src, rel).not.toMatch(/set\w*Error\([^;]{0,80}\binstanceof\s+Error\s*\?/);
      expect(src, rel).not.toMatch(/\b(?:err|error|e)\.message\s*\|\|/);
      expect(src, rel).not.toMatch(/body\.slice\(/);
    }
  });
});
