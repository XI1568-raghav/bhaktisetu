/**
 * A11Y-08 / A11Y-09 — the temple booking wizard, apps/web/app/pujas/book/page.tsx.
 *
 * Measured on the live wizard (prod sweep 2026-08-12, signed in as a devotee,
 * loaded from http://localhost:3000/pujas/book?slug=rudrabhishek), identical at
 * the initial step and after each of four Continue presses:
 *
 *   {"fieldsets":0,"legends":0,"radiogroups":0,"radios":0,"progressbars":0}
 *   liveRegions: []                     — no aria-live, role=alert or role=status
 *   grep aria-current                   — no match anywhere in the file
 *   date input: {"ariaLabel":null,"labelFor":false,"wrapped":false,
 *                "placeholder":"DD/MM/YYYY"}
 *
 * This is the revenue path. A screen-reader user pressing Continue was told
 * nothing had changed, was never told which step they were on or how many
 * remained, and heard the most consequential field in the booking announced as
 * "edit text, blank".
 *
 * The wizard is a ~2,700-line client component whose first paint depends on
 * three network round trips (puja type, bookable temples, slot availability),
 * so these are source assertions rather than a render. They are written to
 * fail on `git checkout HEAD -- app/pujas/book/page.tsx`: every one of them
 * names markup that did not exist before this change.
 *
 * The shared step indicator that the two *other* wizards already use has its
 * own render test at __tests__/WizardSteps.a11y.test.tsx.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '..', 'app/pujas/book/page.tsx');
const src = readFileSync(SRC, 'utf8');

/**
 * The JSX slice between two anchors, so an assertion cannot match elsewhere.
 * Returns '' when an anchor is missing rather than throwing, so a reverted
 * source produces N failing assertions instead of one collection error.
 */
function between(startNeedle: string, endNeedle: string): string {
  const a = src.indexOf(startNeedle);
  if (a < 0) return '';
  const b = src.indexOf(endNeedle, a);
  if (b < a) return '';
  return src.slice(a, b);
}

describe('A11Y-08 — the step indicator is a sequence, not four divs', () => {
  const indicator = () => between('aria-label="Booking progress"', 'STEP 1: Temple');

  it('is a <nav> with an accessible name', () => {
    expect(src).toMatch(/<nav[^>]*aria-label="Booking progress"/);
  });

  it('renders the steps as an ordered list', () => {
    expect(indicator(), 'the four steps must be <li> inside an <ol>').toMatch(/<ol\b/);
    expect(indicator()).toMatch(/<li\b/);
  });

  it('marks exactly the active step with aria-current="step"', () => {
    // Conditional, not unconditional: four aria-current="step" is the same
    // as none at all.
    expect(indicator()).toMatch(/aria-current=\{isCurrent \? 'step' : undefined\}/);
  });

  it('the <li> carries the flex sizing the old <div> carried, so nothing moves', () => {
    expect(indicator()).toMatch(/<li[\s\S]{0,160}className="flex flex-1 flex-col items-center"/);
  });
});

describe('A11Y-08 — a step change is announced', () => {
  const indicator = () => between('aria-label="Booking progress"', 'STEP 1: Temple');

  it('ships a polite live region inside the indicator', () => {
    expect(indicator()).toMatch(/role="status"/);
    expect(indicator()).toMatch(/aria-live="polite"/);
  });

  it('the region announces position AND label, not just a number', () => {
    expect(indicator()).toMatch(
      /Step \$\{currentStep \+ 1\} of \$\{STEP_LABELS\.length\}, \$\{STEP_LABELS\[currentStep\]\}/,
    );
  });

  it('the region is always mounted, not rendered alongside its own text', () => {
    // A region inserted at the same moment as its content is not reliably
    // announced, so it must not sit behind a conditional.
    expect(indicator()).not.toMatch(/\{\s*\w+\s*&&\s*\(?\s*<p className="sr-only" role="status"/);
  });
});

describe('A11Y-08 — focus moves to the new step', () => {
  it('there is a focusable heading naming the current step', () => {
    expect(src).toMatch(/ref=\{stepHeadingRef\}\s+tabIndex=\{-1\}/);
    expect(src).toMatch(
      /Step \$\{currentStep \+ 1\} of \$\{STEP_LABELS\.length\}: \$\{STEP_LABELS\[currentStep\]\}/,
    );
  });

  it('an effect keyed on currentStep focuses it', () => {
    const effect = between('const stepHeadingRef', '// Step 1');
    expect(effect).toMatch(/stepHeadingRef\.current\?\.focus\(\)/);
    expect(effect).toMatch(/\}, \[currentStep\]\)/);
  });

  it('the first paint does not steal focus', () => {
    const effect = between('const stepHeadingRef', '// Step 1');
    expect(effect, 'focusing on mount fights the browser scroll/focus restore').toMatch(
      /stepMountedRef/,
    );
  });
});

describe('A11Y-08 — the choice sets are grouped', () => {
  it('the temple cards are one radiogroup, labelled by the visible heading', () => {
    expect(src).toMatch(/id="book-temple-heading"/);
    expect(src).toMatch(/role="radiogroup"[\s\S]{0,80}aria-labelledby="book-temple-heading"/);
  });

  it('each temple card reports its own selected state', () => {
    const card = between('{bookableTemples.map((temple) => {', 'temple.templeName');
    expect(card).toMatch(/role="radio"/);
    expect(card).toMatch(/aria-checked=\{isSelected\}/);
  });

  it('the time slots are one radiogroup, labelled by the visible heading', () => {
    expect(src).toMatch(/id="book-slot-heading"/);
    expect(src).toMatch(/role="radiogroup" aria-labelledby="book-slot-heading"/);
  });

  it('each slot reports its own selected state', () => {
    const slot = between('{periodSlots.map((slot) => {', 'slot.label');
    expect(slot).toMatch(/role="radio"/);
    expect(slot).toMatch(/aria-checked=\{isSelected\}/);
  });

  it('aria-checked is bound to state, never hard-coded', () => {
    expect(src).not.toMatch(/aria-checked="(true|false)"/);
  });
});

describe('A11Y-09 — the date field has a name and a surviving format hint', () => {
  const call = () => between('<DateInput', '/>');

  it('the booking call site names the field', () => {
    // The card already renders a visible "Select Date" heading, so the name
    // goes on the input rather than duplicating the label on screen.
    expect(call()).toMatch(/ariaLabel="Puja date"/);
  });

  it('the call site declares the field required, matching the wizard validation', () => {
    expect(call()).toMatch(/\brequired\b/);
    // validateStep really does block Continue without a date.
    expect(src).toMatch(/errors\.date/);
  });

  it('DateInput itself still wires a persistent format hint, not just a placeholder', () => {
    const di = readFileSync(
      path.resolve(__dirname, '..', 'components/ui/DateInput.tsx'),
      'utf8',
    );
    expect(di).toMatch(/aria-describedby=\{hintId\}/);
    expect(di).toMatch(/Format: DD\/MM\/YYYY/);
    // The placeholder disappears on the first keystroke; the hint must not.
    expect(di).toMatch(/id=\{hintId\}[^>]*className="sr-only"/);
  });
});
