import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Approval was removed (REQUIRE_PROVIDER_APPROVAL unset): a registered provider's
 * portal is active, and an unlisted profile says honestly what is missing. Approval
 * wording appears only when the API says approval is required.
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

function api(body: unknown) {
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch;
}

const PROFILE = { id: 'p1', approved: false, displayName: 'Acharya X', city: 'Pune' };

describe('MyProviderProfileCard — unlisted profile, approval off', () => {
  it('shows the API\'s honest note and no approval wording', async () => {
    api({
      profile: PROFILE,
      listing: { listed: false, approvalRequired: false, missing: ['price'], message: 'Your portal is active. Add your price and details to be listed.' },
    });
    render(<MyProviderProfileCard role="ASTROLOGER" onboardingSlug="astrologer" publicListingType="astrologer" />);
    expect(await screen.findByTestId('listing-note')).toHaveTextContent('Your portal is active. Add your price and details to be listed.');
    expect(screen.getByText('Not listed yet')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/approval|pending|under review/i);
  });

  it('falls back to the same sentence when an older API sends no listing block', async () => {
    api({ profile: PROFILE });
    render(<MyProviderProfileCard role="WELLNESS_INSTRUCTOR" onboardingSlug="wellness_instructor" />);
    expect(await screen.findByTestId('listing-note')).toHaveTextContent(/Your portal is active/);
    expect(document.body.textContent).not.toMatch(/approval|pending|under review/i);
  });

  it('says nothing about listing once the profile is live', async () => {
    api({ profile: { ...PROFILE, approved: true }, listing: { listed: true, approvalRequired: false, missing: [], message: null } });
    render(<MyProviderProfileCard role="ASTROLOGER" onboardingSlug="astrologer" publicListingType="astrologer" />);
    expect(await screen.findByText('Live on Darshya')).toBeInTheDocument();
    expect(screen.queryByTestId('listing-note')).not.toBeInTheDocument();
  });
});

describe('MyProviderProfileCard — approval wording only when the API says approval is required', () => {
  it('shows the admin-approval note and badge', async () => {
    api({
      profile: PROFILE,
      listing: { listed: false, approvalRequired: true, missing: [], message: 'Your profile is waiting for admin approval.' },
    });
    render(<MyProviderProfileCard role="ASTROLOGER" onboardingSlug="astrologer" publicListingType="astrologer" />);
    expect(await screen.findByTestId('listing-note')).toHaveTextContent('waiting for admin approval');
    expect(screen.getByText('Admin approval needed')).toBeInTheDocument();
  });
});
