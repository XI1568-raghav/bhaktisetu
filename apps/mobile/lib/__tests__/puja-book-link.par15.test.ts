import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * PAR-15, the Book control — SUPERSEDED CONTRACT, REWRITTEN.
 *
 * WHAT THIS FILE USED TO ASSERT, AND WHY IT NO LONGER CAN
 * ------------------------------------------------------
 * When there was no in-app booking flow, the honest fix was to stop the control
 * pretending to be one. So this file pinned the OPPOSITE of the finding's
 * actual remedy: that the button read "Book on darshya.online", carried
 * `accessibilityRole="link"`, and built a
 * `darshya.online/pujas/book?slug=${encodeURIComponent(puja.slug)}` URL.
 *
 * Those four assertions encoded "this control leaves the app". PAR-15 asked for
 * native booking, and native booking now exists — app/(devotee)/puja-book.tsx,
 * posting to POST /api/v1/bookings/book, covered by booking-flow.par15.test.ts.
 * The control stays in the app, so a guard demanding that it announce an
 * external destination is now demanding a regression. It is rewritten, not
 * weakened: every assertion below is at least as strict as the one it replaces,
 * and the two that were still true (no bare "Book Puja" promise; the link is
 * built from the API row's slug and never a fixture) are kept.
 *
 * ONE MORE REASON THIS REWRITE WAS NEEDED. The old
 * `it('names the destination in the visible label')` searched raw source for
 * /Book on darshya\.online/ — and after the button was changed it still PASSED,
 * because that string survives in the prose comment explaining the change. A
 * source guard that reads comments certifies its own documentation. Every guard
 * below strips comments first.
 */

const SCREEN = path.resolve(__dirname, '../../app/(devotee)/pujas.tsx');

/** Source with block and line comments removed — a guard must match code. */
function code(): string {
  return readFileSync(SCREEN, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('PAR-15 — the Book control books in the app', () => {
  it('routes to the native booking screen', () => {
    expect(code()).toMatch(/\/\(devotee\)\/puja-book/);
  });

  it('still carries the real catalogue slug, never a fixture', () => {
    // Kept verbatim in spirit from the superseded version: whatever the control
    // does, it must act on the API row that was tapped. The slug now travels as
    // a route param instead of a query string.
    expect(code()).toMatch(/slug:\s*puja\.slug/);
  });

  it('no longer ejects the devotee into the mobile browser', () => {
    const src = code();
    expect(src).not.toMatch(/Linking\.openURL/);
    expect(src).not.toMatch(/darshya\.online\/pujas\/book/);
  });

  it('does not describe itself as leaving the app, because it does not', () => {
    const src = code();
    // The superseded contract REQUIRED both of these. Keeping them now would
    // mean a button that announces an external destination it never visits —
    // the same class of lie the earlier pass removed, pointing the other way.
    expect(src).not.toMatch(/accessibilityRole=["']link["']/);
    expect(src).not.toMatch(/Book on darshya\.online/);
  });

  it('announces itself to assistive tech as a button, with a hint', () => {
    const src = code();
    expect(src).toMatch(/accessibilityRole=["']button["']/);
    expect(src).toMatch(/accessibilityHint=/);
  });

  it('does not carry the bare "Book Puja" promise the audit flagged', () => {
    // Unchanged from the superseded version. A label that says only "Book Puja"
    // says nothing about what the next screen asks for.
    const src = code();
    expect(src).not.toMatch(/>\s*Book Puja\s*</);
    expect(src).not.toMatch(/\{'Book Puja'\}/);
  });
});
