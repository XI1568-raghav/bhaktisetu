import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PendingRefundCard from '../components/admin/PendingRefundCard';

describe('admin dashboard "Awaiting refund" tile', () => {
  it('shows the exact amount, labels it honestly and links to /admin/refunds', () => {
    render(<PendingRefundCard amountInr={12345.5} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/admin/refunds');
    expect(screen.getByText('Awaiting refund')).toBeTruthy();
    expect(screen.getByText('₹12,345.50')).toBeTruthy();
    expect(screen.getByText(/captured on cancelled bookings/i)).toBeTruthy();
  });

  it('is zero-styled (not alarming) when nothing is owed', () => {
    render(<PendingRefundCard amountInr={0} />);
    expect(screen.getByText('Nothing awaiting refund')).toBeTruthy();
    expect(screen.getByRole('link').className).not.toContain('border-red-300');
  });

  it('is alarming-styled when money is owed', () => {
    render(<PendingRefundCard amountInr={700} />);
    expect(screen.getByRole('link').className).toContain('border-red-300');
  });

  it('renders nothing when the API did not return the figure', () => {
    const { container } = render(<PendingRefundCard amountInr={undefined} />);
    expect(container.firstChild).toBeNull();
  });
});
