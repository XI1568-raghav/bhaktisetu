import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * Temple manager test (2026-10-05): /temple-portal/donations.
 *
 * Reproduced with a real Rs 501 donation. GET /temple-portal/donations answers
 * `{ id, donor, email, amountInr, status, receiptNumber, createdAt, paidAt }`;
 * the page read `donorName`, `amount`, `receipt`, `purpose`, `paymentMethod`
 * and `isAnonymous`, none of which exist. A real donation rendered with no donor
 * name, an amount of NaN and an empty receipt, and "Total Received" was NaN.
 *
 * The API also returns donations that were never paid (`created`) or failed;
 * "Total Received" must count only `paid`, otherwise an abandoned checkout is
 * reported to the temple as money received.
 */

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'test-token' } }),
}));

import TempleDonationsPage from '../app/temple-portal/donations/page';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const API_ROWS = {
  total: 3,
  donations: [
    { id: 'd1', donor: 'Arjun Sharma', email: 'a@x.test', amountInr: 501, status: 'paid', receiptNumber: 'DR-20261005-E638', createdAt: '2026-10-05T14:22:45.206Z', paidAt: '2026-10-05T14:22:49.667Z' },
    { id: 'd2', donor: 'Meera Rao', email: 'm@x.test', amountInr: 1001, status: 'created', receiptNumber: null, createdAt: '2026-10-05T15:00:00.000Z', paidAt: null },
    { id: 'd3', donor: 'Asha Verma', email: 'v@x.test', amountInr: 2001, status: 'failed', receiptNumber: null, createdAt: '2026-10-05T16:00:00.000Z', paidAt: null },
  ],
};

function serve(body: unknown) {
  globalThis.fetch = vi.fn(
    async () => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  ) as unknown as typeof fetch;
}

describe('temple portal donations page', () => {
  it('renders the donor, amount and receipt the API actually sends', async () => {
    serve(API_ROWS);
    render(<TempleDonationsPage />);
    await waitFor(() => expect(screen.getAllByText('Arjun Sharma').length).toBeGreaterThan(0));
    expect(screen.getAllByText(/DR-20261005-E638/).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/NaN/);
    expect(document.body.textContent).not.toMatch(/undefined/);
  });

  it('counts only paid donations as received', async () => {
    serve(API_ROWS);
    render(<TempleDonationsPage />);
    await waitFor(() => expect(screen.getAllByText('Arjun Sharma').length).toBeGreaterThan(0));
    const received = screen.getByText('Total Received').parentElement!.parentElement!;
    expect(received.textContent).toMatch(/₹501(?!\d)/);
    expect(received.textContent).not.toMatch(/3,503|1,502|2,502/);
    const donors = screen.getByText('Total Donors').parentElement!.parentElement!;
    expect(donors.textContent).toMatch(/1$/);
  });

  it('labels unpaid and failed rows instead of presenting them as gifts', async () => {
    serve(API_ROWS);
    render(<TempleDonationsPage />);
    await waitFor(() => expect(screen.getAllByText('Meera Rao').length).toBeGreaterThan(0));
    expect(screen.getAllByText(/not completed/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/failed/i).length).toBeGreaterThan(0);
  });

  it('does not promise a transfer it cannot show: says how the money reaches the temple', async () => {
    serve(API_ROWS);
    render(<TempleDonationsPage />);
    await waitFor(() => expect(screen.getAllByText('Arjun Sharma').length).toBeGreaterThan(0));
    expect(screen.getByText(/collected by Darshya/i)).toBeTruthy();
  });
});
