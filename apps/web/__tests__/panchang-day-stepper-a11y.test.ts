import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// TD-08 (prod sweep 2026-08-12): the /panchang day stepper exposed no
// accessible name. Both arrows were an anchor wrapping a bare lucide icon —
// no text node, no aria-label, and the page reports imgs=0 so nothing could be
// deriving a name from alt text. A screen-reader user on the daily panchang
// heard "link" for both, with no way to tell forward from back, and stepping
// the date is the page's only interaction. WCAG 2.1 SC 2.4.4 / 4.1.2.
//
// (The same sweep also logged 44 nameless footer anchors. That half is a
// measurement artifact: the mega-footer is a deliberately collapsed <details>,
// so innerText reads '' through it while every link has real text. Not
// something to "fix" by expanding the footer.)

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'panchang', 'page.tsx'),
  'utf8',
);

/** Comments are not accessible names. Never assert against them. */
const CODE = SRC.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/** Every JSX element that opens with `<a` and its attribute list. */
function anchors(src: string): string[] {
  return Array.from(src.matchAll(/<a\b[\s\S]*?>/g)).map((m) => m[0]);
}

describe('TD-08 — the panchang day stepper announces itself', () => {
  it('the stepper anchors exist to be tested', () => {
    const stepper = anchors(CODE).filter((a) => /\/panchang\?offset=/.test(a));
    expect(stepper).toHaveLength(2);
  });

  it('both date arrows carry an accessible name', () => {
    const stepper = anchors(CODE).filter((a) => /\/panchang\?offset=/.test(a));
    for (const a of stepper) {
      expect(a, `nameless: ${a.replace(/\s+/g, ' ')}`).toMatch(/aria-label="[^"]+"/);
    }
  });

  it('the two names are distinct and say which direction', () => {
    const stepper = anchors(CODE).filter((a) => /\/panchang\?offset=/.test(a));
    const names = stepper.map((a) => /aria-label="([^"]+)"/.exec(a)?.[1] ?? '');
    expect(new Set(names).size).toBe(2);
    expect(names.join(' | ').toLowerCase()).toMatch(/previous/);
    expect(names.join(' | ').toLowerCase()).toMatch(/next/);
  });

  it('the decorative chevrons are hidden from the accessibility tree', () => {
    // Otherwise the icon's own node competes with the label on the anchor.
    for (const tag of ['ChevronLeft', 'ChevronRight']) {
      const uses = Array.from(CODE.matchAll(new RegExp(`<${tag}\\b[\\s\\S]*?/>`, 'g')));
      expect(uses.length).toBeGreaterThan(0);
      for (const u of uses) {
        expect(u[0], `${tag} is still announced`).toMatch(/aria-hidden/);
      }
    }
  });

  it('no control on the page is both nameless and inert', () => {
    // The mini-calendar carried two icon-only <button>s with no name AND no
    // handler — a month stepper that never stepped. Naming a dead control just
    // makes the dead end audible, so it had to go, not get a label.
    const buttons = Array.from(CODE.matchAll(/<button\b[\s\S]*?<\/button>/g)).map((m) => m[0]);
    for (const b of buttons) {
      const hasName = /aria-label="[^"]+"/.test(b) || />\s*[A-Za-z0-9]/.test(b.replace(/<[^>]*>/g, '>'));
      const hasBehaviour = /onClick|type="submit"|formAction/.test(b);
      expect(hasName || hasBehaviour, `nameless inert control: ${b.replace(/\s+/g, ' ').slice(0, 120)}`).toBe(true);
    }
  });
});
