import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import JitsiCallButton from '../components/JitsiCallButton';

describe('JitsiCallButton', () => {
  it('renders enabled link inside the 2-hour call window', () => {
    render(
      <JitsiCallButton bookingId="abc-123" scheduledAt={new Date()} />,
    );
    const link = screen.getByRole('link', { name: /join 1:1 call/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('darshya-abc-123'));
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('disables the button outside the 2-hour window (past)', () => {
    const longAgo = new Date(Date.now() - 1000 * 60 * 60 * 5);
    render(<JitsiCallButton bookingId="abc-123" scheduledAt={longAgo} />);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent(/2h before scheduled time/i);
  });

  it('disables the button when scheduled time is far in the future', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 6);
    render(<JitsiCallButton bookingId="abc-123" scheduledAt={future} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('treats null scheduledAt as open (UI parent override)', () => {
    render(<JitsiCallButton bookingId="abc-123" scheduledAt={null} />);
    expect(screen.getByRole('link')).toBeInTheDocument();
  });

  it('treats invalid date strings as open', () => {
    render(<JitsiCallButton bookingId="abc-123" scheduledAt={'not-a-date'} />);
    expect(screen.getByRole('link')).toBeInTheDocument();
  });

  it('uses a deterministic room name derived from booking id', () => {
    render(<JitsiCallButton bookingId="xyz-999" scheduledAt={new Date()} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toContain('meet.jit.si/darshya-xyz-999');
  });

  it('respects custom label prop', () => {
    render(
      <JitsiCallButton bookingId="abc" scheduledAt={new Date()} label="Start Consultation" />,
    );
    expect(screen.getByText(/start consultation/i)).toBeInTheDocument();
  });

  it('applies primary variant styling by default', () => {
    render(<JitsiCallButton bookingId="abc" scheduledAt={new Date()} />);
    const link = screen.getByRole('link');
    expect(link.className).toContain('bg-saffron-600');
  });

  it('applies secondary variant styling when set', () => {
    render(
      <JitsiCallButton bookingId="abc" scheduledAt={new Date()} variant="secondary" />,
    );
    const link = screen.getByRole('link');
    expect(link.className).toContain('border');
    expect(link.className).not.toContain('bg-saffron-600');
  });
});
