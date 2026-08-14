import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * RES-02, remaining surface — /messages.
 *
 * The banner + Retry pattern landed on the seven pages the finding names in its
 * `where:` line. Its evidence list has an eighth: with every /api/v1/* answering
 * HTTP 500, /messages rendered "Messages · 0 conversations · No conversations
 * yet." — three fabricated facts in a row, none of which the server said.
 *
 * RES-08's fix gave this component the state it needs (a `Reconnecting…` chip
 * driven by a failure streak) but left the list body untouched, so a devotee
 * with live threads is still told, during any incident, that she has never
 * spoken to anyone. "You have none" and "we could not find out" are different
 * answers, and only one of them is true here.
 */

const fetchMock = vi.fn();

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'token-1' }, user: { id: 'u1' } }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Every call answers HTTP 500, exactly as the sweep held it. */
function apiIsDown() {
  fetchMock.mockResolvedValue({
    ok: false,
    status: 500,
    json: async () => ({ error: 'Internal Server Error' }),
    text: async () => '{"error":"Internal Server Error"}',
  } as Response);
}

describe('RES-02 — /messages does not invent an empty inbox', () => {
  it('says the list could not be loaded instead of "No conversations yet"', async () => {
    apiIsDown();
    const { Inbox } = await import('../components/Inbox');

    const { container } = render(<Inbox role="devotee" />);

    await waitFor(() => {
      expect(container.textContent ?? '').toMatch(/could not load your conversations/i);
    });
    expect(
      container.textContent ?? '',
      'a devotee with live threads is told she has never spoken to anyone',
    ).not.toMatch(/No conversations yet/i);
  });

  it('does not print a conversation count the server never sent', async () => {
    apiIsDown();
    const { Inbox } = await import('../components/Inbox');

    const { container } = render(<Inbox role="devotee" />);

    await waitFor(() => {
      expect(container.textContent ?? '').toMatch(/could not load your conversations/i);
    });
    // The header read "0 conversations" beside a failed load — the same
    // fabricated zero the finding measured on /payouts and /temple-portal.
    expect(container.textContent ?? '', 'zero is a fabricated figure here').not.toMatch(
      /0 conversations/i,
    );
  });

  it('renders the honest empty state when the API answers with no threads', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ conversations: [] }),
      text: async () => '{"conversations":[]}',
    } as Response);
    const { Inbox } = await import('../components/Inbox');

    render(<Inbox role="devotee" />);

    await waitFor(() => {
      expect(screen.getByText(/No conversations yet/i)).toBeTruthy();
    });
    expect(screen.queryByText(/could not load your conversations/i)).toBeNull();
  });
});
