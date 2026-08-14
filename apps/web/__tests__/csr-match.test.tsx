import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import CsrMatchClient from '../app/csr-match/CsrMatchClient';
import { COMPANY } from '../lib/company';

/**
 * LEG-14 (prod sweep 2026-08-12) split this route in two: a server page that
 * refuses to serve unless ENABLE_CSR_MATCH === 'true', and the client body
 * below. The original suite rendered the page component directly, so it now
 * renders the client.
 */
const notFoundSpy = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({
  notFound: () => notFoundSpy(),
}));

describe('CSR Match landing page (R-Q4-M-007)', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'lead-stub' }),
    }) as any;
  });

  it('renders hero with "2x Match" copy', () => {
    render(<CsrMatchClient />);
    expect(screen.getAllByText(/2x Match/i).length).toBeGreaterThan(0);
  });

  it('calculator: ₹1L employee pledge outputs ₹3L total impact', () => {
    render(<CsrMatchClient />);
    const input = screen.getByLabelText(/employee pledge/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '100000' } });
    const total = screen.getByTestId('total-impact');
    expect(total.textContent).toContain('3,00,000');
  });

  it('signup form exposes 4 required fields', () => {
    render(<CsrMatchClient />);
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/csr head email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/csr budget bracket/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/expected match cap/i)).toBeInTheDocument();
  });

  it('transparency dashboard renders 3 placeholder temple cards', () => {
    render(<CsrMatchClient />);
    expect(screen.getAllByTestId('temple-card')).toHaveLength(3);
  });

  it('form submission posts to /api/csr-match/leads', async () => {
    render(<CsrMatchClient />);
    fireEvent.change(screen.getByLabelText(/company name/i), { target: { value: 'TestCo' } });
    fireEvent.change(screen.getByLabelText(/csr head email/i), { target: { value: 'csr@testco.com' } });
    fireEvent.change(screen.getByLabelText(/csr budget bracket/i), { target: { value: '25L-50L' } });
    fireEvent.change(screen.getByLabelText(/expected match cap/i), { target: { value: '500000' } });
    fireEvent.click(screen.getByRole('button', { name: /submit interest/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/csr-match/leads',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('TestCo'),
        }),
      );
    });
  });
});

describe('LEG-14 — the page cannot publish a certification it does not hold', () => {
  afterEach(() => cleanup());

  it('states plainly that 80G and CSR-1 are not held', () => {
    expect(COMPANY.donationLegal.HAS_80G_VERIFIED).toBe(false);
    expect(COMPANY.donationLegal.HAS_CSR1_VERIFIED).toBe(false);
    render(<CsrMatchClient />);
    const line = screen.getByTestId('csr-credential-line').textContent ?? '';
    expect(line).toMatch(/does not yet hold 80G or CSR-1 registration/i);
  });

  it('never renders the certification claim anywhere on the page', () => {
    const { container } = render(<CsrMatchClient />);
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/is 80G certified/i);
    expect(text).not.toMatch(/CSR-1 registered\./);
    expect(text).not.toMatch(/80G \+ CSR-1 compliant/i);
  });

  it('labels the sample dashboard as placeholder data, not live figures', () => {
    const { container } = render(<CsrMatchClient />);
    const text = container.textContent ?? '';
    expect(text).toMatch(/placeholders, not live data/i);
  });
});

describe('LEG-14 — the route is gated off by default', () => {
  const original = process.env.ENABLE_CSR_MATCH;

  afterEach(() => {
    if (original === undefined) delete process.env.ENABLE_CSR_MATCH;
    else process.env.ENABLE_CSR_MATCH = original;
    notFoundSpy.mockClear();
    vi.resetModules();
    cleanup();
  });

  it('404s when ENABLE_CSR_MATCH is unset', async () => {
    delete process.env.ENABLE_CSR_MATCH;
    const { default: CsrMatchPage } = await import('../app/csr-match/page');
    expect(() => CsrMatchPage()).toThrow(/NEXT_NOT_FOUND/);
    expect(notFoundSpy).toHaveBeenCalled();
  });

  it('404s when ENABLE_CSR_MATCH is any value other than "true"', async () => {
    process.env.ENABLE_CSR_MATCH = '1';
    const { default: CsrMatchPage } = await import('../app/csr-match/page');
    expect(() => CsrMatchPage()).toThrow(/NEXT_NOT_FOUND/);
  });

  it('serves the page only when the operator opts in', async () => {
    process.env.ENABLE_CSR_MATCH = 'true';
    const { default: CsrMatchPage } = await import('../app/csr-match/page');
    expect(() => CsrMatchPage()).not.toThrow();
    expect(notFoundSpy).not.toHaveBeenCalled();
  });
});
