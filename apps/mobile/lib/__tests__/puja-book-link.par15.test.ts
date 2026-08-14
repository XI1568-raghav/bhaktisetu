import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * PAR-15, the app half.
 *
 * There is no in-app booking flow: both the puja card and the "Book Puja"
 * button call `Linking.openURL(bookUrl)` and eject the devotee into the mobile
 * browser on darshya.online. Building the flow is a separate, large piece of
 * work and the hook + endpoint half of it is fixed in packages/api-client.
 *
 * What is fixable here and now is the lie: a saffron primary button labelled
 * "Book Puja" with a calendar icon is the strongest possible signal that
 * tapping it books a puja in the app. It leaves the app. VoiceOver announced it
 * as a plain button too, so a screen-reader user got no warning at all.
 *
 * This locks the control to describing what it does — and locks the URL to the
 * catalogue slug (PAR-07 already replaced the mock catalogue; the link must
 * keep reading from the API row, never from a fixture).
 */

const SCREEN = path.resolve(__dirname, '../../app/(devotee)/pujas.tsx');
const src = readFileSync(SCREEN, 'utf8');

describe('PAR-15 — the Book control says that it leaves the app', () => {
  it('still opens the real catalogue slug, not a fixture', () => {
    expect(src).toMatch(/encodeURIComponent\(puja\.slug\)/);
    expect(src).toMatch(/darshya\.online\/pujas\/book\?slug=/);
  });

  it('names the destination in the visible label', () => {
    expect(src).toMatch(/Book on darshya\.online/);
  });

  it('announces itself to assistive tech as a link, with the destination', () => {
    expect(src).toMatch(/accessibilityRole=["']link["']/);
    expect(src).toMatch(/accessibilityHint=/);
  });

  it('does not still carry the bare "Book Puja" promise', () => {
    expect(src).not.toMatch(/>\s*Book Puja\s*</);
    expect(src).not.toMatch(/\{'Book Puja'\}/);
  });
});
