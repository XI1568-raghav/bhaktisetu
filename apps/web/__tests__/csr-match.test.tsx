import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CsrMatchPage from '../app/csr-match/page';

describe('CSR Match landing page (R-Q4-M-007)', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'lead-stub' }),
    }) as any;
  });

  it('renders hero with "2x Match" copy', () => {
    render(<CsrMatchPage />);
    expect(screen.getAllByText(/2x Match/i).length).toBeGreaterThan(0);
  });

  it('calculator: ₹1L employee pledge outputs ₹3L total impact', () => {
    render(<CsrMatchPage />);
    const input = screen.getByLabelText(/employee pledge/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '100000' } });
    const total = screen.getByTestId('total-impact');
    expect(total.textContent).toContain('3,00,000');
  });

  it('signup form exposes 4 required fields', () => {
    render(<CsrMatchPage />);
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/csr head email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/csr budget bracket/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/expected match cap/i)).toBeInTheDocument();
  });

  it('transparency dashboard renders 3 placeholder temple cards', () => {
    render(<CsrMatchPage />);
    expect(screen.getAllByTestId('temple-card')).toHaveLength(3);
  });

  it('form submission posts to /api/csr-match/leads', async () => {
    render(<CsrMatchPage />);
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
