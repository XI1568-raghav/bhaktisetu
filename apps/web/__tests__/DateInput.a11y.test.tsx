/**
 * A11Y-09 — the branded DateInput had no label wiring and no accessible name.
 *
 * Measured on the live booking wizard (prod sweep 2026-08-12,
 * /pujas/book?slug=rudrabhishek):
 *   {"tag":"input","type":"text","id":"","name":"","placeholder":"DD/MM/YYYY",
 *    "ariaLabel":null,"labelFor":false,"wrapped":false,"autocomplete":"off"}
 *
 * Two defects, both in the component rather than the call site:
 *   1. the optional `label` was rendered as a floating <label> with no
 *      htmlFor and the input had no id, so even labelled call sites produced
 *      an unnamed field;
 *   2. call sites that pass no label at all (the booking wizard, and 8 of the
 *      astrology tools) left the placeholder as the only hint — and a
 *      placeholder is not an accessible name and vanishes on first keystroke.
 *
 * The fix has to be inside components/ui/DateInput.tsx so it reaches every
 * call site, including app/pujas/book/page.tsx which this lane cannot edit.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { DateInput, DateTimeInput } from '../components/ui/DateInput';

function theInput(): HTMLInputElement {
  const el = document.querySelector<HTMLInputElement>('input[type="text"]');
  if (!el) throw new Error('DateInput did not render a text input');
  return el;
}

/** Text of every element referenced by aria-describedby, joined. */
function describedByText(el: HTMLElement): string {
  const ids = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
  return ids
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
    .trim();
}

describe('A11Y-09 — DateInput exposes a name, a purpose and a persistent format hint', () => {
  it('wires the visible label to the input with htmlFor/id', () => {
    render(<DateInput value="" onChange={() => {}} label="Puja date" />);

    const input = theInput();
    const label = document.querySelector('label');

    expect(input.id, 'the input needs an id for a label to point at').toBeTruthy();
    expect(label?.getAttribute('for')).toBe(input.id);
    expect(screen.getByLabelText('Puja date')).toBe(input);
  });

  it('still has an accessible name when the call site passes no label', () => {
    render(<DateInput value="" onChange={() => {}} />);

    const input = theInput();
    const name = input.getAttribute('aria-label') ?? '';
    expect(
      name.trim(),
      'an unlabelled date field is announced as "edit text, blank"',
    ).not.toBe('');
  });

  it('accepts an explicit accessible name from the call site', () => {
    render(<DateInput value="" onChange={() => {}} ariaLabel="Date of birth" />);
    expect(screen.getByLabelText('Date of birth')).toBe(theInput());
  });

  it('describes the DD/MM/YYYY format, and the hint survives typing', () => {
    render(<DateInput value="" onChange={() => {}} label="Puja date" />);

    const input = theInput();
    expect(describedByText(input)).toMatch(/DD\/MM\/YYYY/);

    // The placeholder is gone the moment the user types — the description is not.
    fireEvent.change(input, { target: { value: '12' } });
    expect(describedByText(theInput())).toMatch(/DD\/MM\/YYYY/);
  });

  it('mirrors `required` into aria-required for assistive tech', () => {
    render(<DateInput value="" onChange={() => {}} label="Puja date" required />);
    expect(theInput().getAttribute('aria-required')).toBe('true');
  });

  it('gives every instance on a page its own id (no duplicate-id collisions)', () => {
    render(
      <>
        <DateInput value="" onChange={() => {}} label="From" />
        <DateInput value="" onChange={() => {}} label="To" />
      </>,
    );

    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="text"]'));
    expect(inputs).toHaveLength(2);
    expect(new Set(inputs.map((i) => i.id)).size).toBe(2);

    const describedBy = inputs.map((i) => i.getAttribute('aria-describedby'));
    expect(new Set(describedBy).size).toBe(2);

    expect(screen.getByLabelText('From')).toBe(inputs[0]);
    expect(screen.getByLabelText('To')).toBe(inputs[1]);
  });
});

describe('A11Y-09 — DateTimeInput names both halves of the pair', () => {
  it('names the date and the time field from the group label', () => {
    render(<DateTimeInput value="" onChange={() => {}} label="Darshan slot" />);

    expect(screen.getByLabelText('Darshan slot — date')).toBeTruthy();
    expect(screen.getByLabelText('Darshan slot — time')).toBeTruthy();
  });

  it('falls back to generic names when the call site passes no label', () => {
    render(<DateTimeInput value="" onChange={() => {}} />);

    expect(screen.getByLabelText('Date')).toBeTruthy();
    expect(screen.getByLabelText('Time')).toBeTruthy();
  });
});
