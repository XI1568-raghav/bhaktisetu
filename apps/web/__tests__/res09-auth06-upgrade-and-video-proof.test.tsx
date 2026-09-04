/**
 * RES-09 / AUTH-06 — the two user-facing surfaces the previous passes left.
 *
 * RES-09 was closed for the pandit portal (app/priest/**, app/payouts,
 * app/account/subscriptions, app/weddings/inquiry) and AUTH-06 for the six
 * pages the finding named plus app/account/subscriptions. Re-sweeping
 * apps/web on 2026-09-02 for `catch (e) { setError(e instanceof Error ? e.message : …) }`
 * outside /admin still returned 36 hits. Two of them are not "staff-facing" by
 * any reading and are the two where the raw string does the most damage:
 *
 *   app/upgrade/page.tsx                   the paid-plan purchase screen
 *   components/provider/VideoProofUpload   the MANDATORY video-proof step
 *                                          (PROJECT_CONTEXT.md business rule 1)
 *
 * What each one actually rendered before this change:
 *
 *   /upgrade, bad status   `Subscription failed (500)` — the fallback baked
 *                          into the throw. An HTTP status code, on the screen
 *                          where someone just tried to pay.
 *   /upgrade, no network   the `fetch` has no catch of its own, so `err.message`
 *                          is whatever the browser wrote: "Failed to fetch"
 *                          (Chrome), "Load failed" (Safari), "NetworkError when
 *                          attempting to fetch resource." (Firefox).
 *   /upgrade, 401          the same dead end AUTH-06 is about: "Your session has
 *                          expired…" with no way to sign in — except here it
 *                          did not even say that, because the composed sentence
 *                          destroyed the status.
 *   VideoProofUpload       `upErr` is a Supabase `StorageError`, so a pandit
 *                          read the storage layer's own wording: "new row
 *                          violates row-level security policy", "The resource
 *                          already exists", "Payload too large".
 *
 * Every test below asserts BOTH halves: the friendly copy appears AND the raw
 * developer string does not. Asserting only the first would pass against a
 * screen that renders both.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const authState = {
  session: { accessToken: 'live-token' } as { accessToken: string } | null,
  user: { id: 'u1', role: 'devotee', fullName: 'Devotee' } as unknown,
  isAuthenticated: true,
  isLoading: false,
};

vi.mock('../lib/auth-context', async () => {
  const actual = await vi.importActual<typeof import('../lib/auth-context')>('../lib/auth-context');
  return { ...actual, useAuth: () => authState };
});

vi.mock('next/navigation', () => ({
  usePathname: () => '/upgrade',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

import UpgradePage from '../app/upgrade/page';
import VideoProofUpload from '../components/provider/VideoProofUpload';

const realFetch = globalThis.fetch;

/** The paid card on /upgrade. `free` short-circuits before any request. */
const PAID_CTA = 'Get session';

/** The AUTH-06 affordance: a link into /auth/login carrying a redirect. */
function reauthLink(): HTMLAnchorElement | null {
  return document.querySelector<HTMLAnchorElement>('a[href^="/auth/login"]');
}

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

beforeEach(() => {
  authState.session = { accessToken: 'live-token' };
  authState.isAuthenticated = true;
  authState.isLoading = false;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('RES-09 — /upgrade never shows a devotee a status code or a browser string', () => {
  it('a 5xx with nothing quotable in the body shows the page copy, not "Subscription failed (500)"', async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse(500, { error: 'Internal Server Error' }),
    ) as unknown as typeof fetch;

    render(<UpgradePage />);
    fireEvent.click(await screen.findByRole('button', { name: PAID_CTA }));

    // `friendlyApiError` recognises a 5xx and its copy is MORE specific than
    // the page's own fallback, so it is what should win here.
    await waitFor(() =>
      expect(
        screen.getByText('Something went wrong on our side. Please try again in a moment.'),
      ).toBeTruthy(),
    );
    // The half that would still pass if only the line above were asserted.
    expect(document.body.textContent).not.toContain('Subscription failed');
    expect(document.body.textContent).not.toContain('500');
    expect(document.body.textContent).not.toContain('Internal Server Error');
  });

  it('a dropped connection shows the network copy, not the browser’s own wording', async () => {
    // The `fetch` in handleUpgrade has no catch of its own; this is the path a
    // status-code sweep never reaches, and it differs per engine.
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;

    render(<UpgradePage />);
    fireEvent.click(await screen.findByRole('button', { name: PAID_CTA }));

    await waitFor(() =>
      expect(
        screen.getByText(
          'Could not reach the server. Please check your connection and try again.',
        ),
      ).toBeTruthy(),
    );
    expect(document.body.textContent).not.toContain('Failed to fetch');
  });

  it("still shows the server's OWN sentence — the refusal a devotee needs to read", async () => {
    // TC-03/TC-04: the withdrawn NRI plan is refused with a real explanation.
    // Suppressing raw text must not suppress that; a screen that answers every
    // failure with one generic line is a different defect, not a fix.
    globalThis.fetch = vi.fn(async () =>
      jsonResponse(400, { error: 'This plan is no longer available for purchase.' }),
    ) as unknown as typeof fetch;

    render(<UpgradePage />);
    fireEvent.click(await screen.findByRole('button', { name: PAID_CTA }));

    await waitFor(() =>
      expect(
        screen.getByText('This plan is no longer available for purchase.'),
      ).toBeTruthy(),
    );
  });
});

describe('AUTH-06 — /upgrade offers a way back in when the purchase 401s', () => {
  it('renders the sign-in affordance on a 401', async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse(401, { error: 'Unauthorized' }),
    ) as unknown as typeof fetch;

    render(<UpgradePage />);
    fireEvent.click(await screen.findByRole('button', { name: PAID_CTA }));

    await waitFor(() => expect(reauthLink()).toBeTruthy());
    // Back to /upgrade, not to a dashboard — the point of carrying `redirect`.
    expect(reauthLink()!.getAttribute('href')).toContain('redirect=');
    expect(reauthLink()!.getAttribute('href')).toContain('%2Fupgrade');
  });

  it('the 401 is classified from the STATUS, which the composed sentence destroys', async () => {
    // The body is the developer name "Unauthorized", which `serverErrorMessage`
    // refuses — so the rendered copy contains no "401" for a text classifier to
    // find. Only `UserFacingError.status` keeps the decision recoverable, which
    // is the whole reason the throw carries `res.status`.
    globalThis.fetch = vi.fn(async () =>
      jsonResponse(401, { error: 'Unauthorized' }),
    ) as unknown as typeof fetch;

    render(<UpgradePage />);
    fireEvent.click(await screen.findByRole('button', { name: PAID_CTA }));

    await waitFor(() => expect(reauthLink()).toBeTruthy());
    expect(document.body.textContent).not.toContain('401');
    expect(document.body.textContent).not.toContain('Unauthorized');
  });

  it('does NOT offer it for a failure that signing in again cannot fix', async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse(500, { error: 'Internal Server Error' }),
    ) as unknown as typeof fetch;

    render(<UpgradePage />);
    fireEvent.click(await screen.findByRole('button', { name: PAID_CTA }));

    await waitFor(() =>
      expect(
        screen.getByText('Something went wrong on our side. Please try again in a moment.'),
      ).toBeTruthy(),
    );
    expect(reauthLink()).toBeNull();
  });
});

describe('RES-09 — VideoProofUpload never shows a pandit the storage layer’s wording', () => {
  it('a Supabase StorageError is replaced, not rendered', async () => {
    // hasSupabase is read off the public env at render time, so the direct
    // upload branch only exists when both vars are set.
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');

    const supabaseModule = await import('../lib/supabase');
    vi.spyOn(supabaseModule, 'getSupabaseBrowserClient').mockReturnValue({
      storage: {
        from: () => ({
          // The real shape: `{ error }`, not a throw. The component rethrows it.
          upload: async () => ({
            error: Object.assign(new Error('new row violates row-level security policy'), {
              name: 'StorageError',
            }),
          }),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
        }),
      },
    } as never);

    const { container } = render(<VideoProofUpload bookingId="b1" />);
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput, 'the direct-upload branch did not render').toBeTruthy();

    const file = new File(['x'], 'proof.mp4', { type: 'video/mp4' });
    fireEvent.change(fileInput!, { target: { files: [file] } });

    await waitFor(() =>
      expect(
        screen.getByText(
          'We could not upload that video. Please check your connection and try again.',
        ),
      ).toBeTruthy(),
    );
    expect(document.body.textContent).not.toContain('row-level security');
  });

  it('a failed attach after a successful upload shows copy, not "Failed to fetch"', async () => {
    // The manual-URL rail, which every caller backs with a bare fetch.
    const onUploaded = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });

    const { container } = render(<VideoProofUpload bookingId="b1" onUploaded={onUploaded} />);
    const urlInput = container.querySelector<HTMLInputElement>('input[type="url"]');
    fireEvent.change(urlInput!, { target: { value: 'https://drive.example/proof.mp4' } });
    // The submit control is icon-only, so it has no accessible name to query by.
    const submit = urlInput!.parentElement!.querySelector<HTMLButtonElement>('button[type="button"]');
    expect(submit, 'the manual-URL submit button did not render').toBeTruthy();
    fireEvent.click(submit!);

    await waitFor(() =>
      expect(
        screen.getByText(
          'Could not reach the server. Please check your connection and try again.',
        ),
      ).toBeTruthy(),
    );
    expect(document.body.textContent).not.toContain('Failed to fetch');
  });
});
