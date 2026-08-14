import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * RES-06 (prod sweep 2026-08-12, P1) — second half.
 *
 * With every /api/v1/* call returning 500, all six provider portals rendered
 * the onboarding-nag state: "Complete your Pandit profile — Submit your
 * details so an admin can review and approve your listing." That copy is
 * shown to providers who finished onboarding months ago, because the card
 * treats "no profile in state" and "we could not read your profile" as the
 * same thing — the `!profile` branch fires on both.
 *
 * A provider who sees it re-submits their documents, opens a support ticket,
 * or concludes the platform lost their verification. An unread state must
 * render as unread.
 */

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'live-token' } }),
}));

import MyProviderProfileCard from '../components/MyProviderProfileCard';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('MyProviderProfileCard — a failed load is not "you never onboarded"', () => {
  it('does not tell an approved pandit to complete onboarding when the API 500s', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 }),
    ) as unknown as typeof fetch;

    render(
      <MyProviderProfileCard role="PANDIT" onboardingSlug="priest" publicListingType="pandit" />,
    );

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/complete your pandit profile/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/submit your details so an admin can review/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /complete onboarding/i })).not.toBeInTheDocument();
  });

  it('still prompts onboarding when the API SUCCEEDS and says there is no profile', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ profile: null }), { status: 200 }),
    ) as unknown as typeof fetch;

    render(
      <MyProviderProfileCard role="PANDIT" onboardingSlug="priest" publicListingType="pandit" />,
    );

    expect(await screen.findByText(/complete your pandit profile/i)).toBeInTheDocument();
  });

  it('sends an abort signal so a stalled profile read cannot spin forever', async () => {
    const calls: Array<RequestInit | undefined> = [];
    globalThis.fetch = vi.fn(async (_i: RequestInfo | URL, init?: RequestInit) => {
      calls.push(init);
      return new Response(JSON.stringify({ profile: null }), { status: 200 });
    }) as unknown as typeof fetch;

    render(
      <MyProviderProfileCard role="PANDIT" onboardingSlug="priest" publicListingType="pandit" />,
    );

    await screen.findByText(/complete your pandit profile/i);
    expect(calls[0]?.signal).toBeInstanceOf(AbortSignal);
  });
});
