import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DateInput } from '../components/ui/DateInput';

// PF-09 + DB-10 — two P3s in one component.
//
// PF-09: the year dropdown was a hardcoded 1900..currentYear+5 for EVERY
// consumer. All three booking call sites (pujas/book, marriage/book,
// home-puja/book) already passed `min`, and isInRange already enforced it — so
// a booking picker offered ~130 years and then silently refused 125 of them.
// The props were there the whole time; only the year list ignored them.
//
// DB-10: typing a date the field then refuses was swallowed in silence.
// handleTextBlur reverted the box to the last good value with no message, so a
// devotee could not tell whether the field was broken or their date was.
//
// The onInvalid prop is deliberately OPTIONAL — DateInput has ~26 consumers and
// a required prop turns a one-file change into a 26-file one. These tests cover
// both the callback and the no-callback path.

afterEach(() => cleanup());

const YEARS = () =>
  Array.from(document.querySelectorAll('select option'))
    .map((o) => Number(o.textContent))
    .filter((n) => Number.isFinite(n) && n > 1000);

describe('PF-09 — the year list honours min/max', () => {
  it('a booking window offers only the years it can accept', () => {
    render(
      <DateInput value="" onChange={() => {}} min="2026-08-14" max="2026-11-14" label="Date" />,
    );
    fireEvent.click(screen.getByLabelText('Open date picker'));
    const years = YEARS();
    expect(years).toEqual([2026]);
    // The defect: 1900 was always offered, on every field.
    expect(years).not.toContain(1900);
  });

  it('a min-only field spans min..currentYear+5, not 1900', () => {
    render(<DateInput value="" onChange={() => {}} min="2026-08-14" label="Date" />);
    fireEvent.click(screen.getByLabelText('Open date picker'));
    const years = YEARS();
    expect(Math.min(...years)).toBe(2026);
    expect(Math.max(...years)).toBe(new Date().getFullYear() + 5);
  });

  it('a date-of-birth field — no min, no max — keeps the full 1900 range', () => {
    // ~26 consumers pass neither. Narrowing them would be the real regression.
    render(<DateInput value="" onChange={() => {}} label="Date of birth" />);
    fireEvent.click(screen.getByLabelText('Open date picker'));
    const years = YEARS();
    expect(Math.min(...years)).toBe(1900);
    expect(Math.max(...years)).toBe(new Date().getFullYear() + 5);
  });

  it('never produces an empty list when max precedes min', () => {
    render(<DateInput value="" onChange={() => {}} min="2030-01-01" max="2020-01-01" label="D" />);
    fireEvent.click(screen.getByLabelText('Open date picker'));
    expect(YEARS().length).toBeGreaterThan(0);
  });
});

describe('DB-10 — a refused date says so instead of vanishing', () => {
  const typeAndBlur = (input: HTMLElement, text: string) => {
    fireEvent.change(input, { target: { value: text } });
    fireEvent.blur(input);
  };

  it('an out-of-range date renders an alert naming what was rejected', () => {
    render(<DateInput value="" onChange={() => {}} min="2026-08-14" label="Date" />);
    typeAndBlur(screen.getByLabelText('Date'), '01/01/2020');
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('01/01/2020');
    expect(alert.textContent).toMatch(/outside the dates/i);
  });

  it('an unparseable date gets a different, format-specific message', () => {
    render(<DateInput value="" onChange={() => {}} label="Date" />);
    typeAndBlur(screen.getByLabelText('Date'), 'not a date');
    expect(screen.getByRole('alert').textContent).toMatch(/DD\/MM\/YYYY/);
  });

  it('marks the field aria-invalid and points describedby at the message', () => {
    render(<DateInput value="" onChange={() => {}} min="2026-08-14" label="Date" />);
    const input = screen.getByLabelText('Date');
    typeAndBlur(input, '01/01/2020');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain(screen.getByRole('alert').id);
  });

  it('calls onInvalid with the attempted value and a reason', () => {
    const onInvalid = vi.fn();
    render(<DateInput value="" onChange={() => {}} min="2026-08-14" onInvalid={onInvalid} label="Date" />);
    typeAndBlur(screen.getByLabelText('Date'), '01/01/2020');
    expect(onInvalid).toHaveBeenCalledWith('01/01/2020', 'out-of-range');
  });

  it('works with NO onInvalid — the message is the component\'s own', () => {
    // The optional-prop contract: existing consumers get the fix for free.
    expect(() => {
      render(<DateInput value="" onChange={() => {}} min="2026-08-14" label="Date" />);
      typeAndBlur(screen.getByLabelText('Date'), '01/01/2020');
    }).not.toThrow();
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('clears the message once a valid date is typed', () => {
    render(<DateInput value="" onChange={() => {}} min="2026-08-14" label="Date" />);
    const input = screen.getByLabelText('Date');
    typeAndBlur(input, '01/01/2020');
    expect(screen.queryByRole('alert')).toBeTruthy();
    typeAndBlur(input, '20/09/2026');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says nothing when the field is simply left empty', () => {
    render(<DateInput value="" onChange={() => {}} min="2026-08-14" label="Date" />);
    fireEvent.blur(screen.getByLabelText('Date'));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
