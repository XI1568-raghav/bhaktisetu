import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  HELP_CENTRE_URL,
  helpArticleUrl,
  HELP_CENTRE_LABEL,
  openHelpCentre,
} from '../help-centre';

/**
 * I18N-09 — the help centre was unreachable from the mobile app.
 *
 * apps/web grew a real help centre (seven English guides, per-language coverage
 * disclosure, unreviewed translations badged and noindexed). The mobile app had
 * no reference to it at all: `grep -rn "/help" apps/mobile` matched nothing. A
 * devotee inside the app could open a support TICKET — which waits on a human —
 * but could not read the answer that was already written.
 *
 * The link is a URL, so the useful contract is the URL itself plus the fact
 * that the support screen actually reaches for it. The source scan below strips
 * comments first: a guard a docblock can satisfy is not a guard, and this is
 * the fifth time in this sweep that mattered.
 */

const SUPPORT_SCREEN = path.resolve(__dirname, '../../app/(devotee)/support.tsx');

/** Source with block and line comments removed. `https://` must survive. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

describe('I18N-09 — the mobile app can reach the help centre', () => {
  it('points at the web help centre on the production host', () => {
    expect(HELP_CENTRE_URL).toBe('https://darshya.online/help');
  });

  it('builds an article URL in the shape the web route serves', () => {
    // apps/web/app/help/articles/[lang]/[slug]/page.tsx
    expect(helpArticleUrl('en', 'how-to-book-a-puja')).toBe(
      'https://darshya.online/help/articles/en/how-to-book-a-puja',
    );
  });

  it('escapes a slug rather than pasting it into the path raw', () => {
    expect(helpArticleUrl('hi', 'a b')).toBe('https://darshya.online/help/articles/hi/a%20b');
  });

  it('names the destination in words a devotee can act on', () => {
    expect(HELP_CENTRE_LABEL.length).toBeGreaterThan(0);
    expect(HELP_CENTRE_LABEL.toLowerCase()).toContain('help');
  });

  it('hands the help-centre URL to the opener', async () => {
    const open = vi.fn(async () => true);
    await expect(openHelpCentre(open)).resolves.toBe(true);
    expect(open).toHaveBeenCalledWith(HELP_CENTRE_URL);
  });

  it('returns false instead of throwing when nothing can open the URL', async () => {
    // The support screen is where a devotee lands when something is already
    // broken. An unhandled rejection there would replace a help link with a
    // crash — strictly worse than the missing link this finding is about.
    const open = vi.fn(async () => {
      throw new Error('no activity found to handle intent');
    });
    await expect(openHelpCentre(open)).resolves.toBe(false);
  });
});

describe('I18N-09 — the support screen actually offers it', () => {
  const source = stripComments(readFileSync(SUPPORT_SCREEN, 'utf8'));

  it('imports the help-centre module rather than retyping the URL', () => {
    expect(source).toContain("from '../../lib/help-centre'");
    // A second hardcoded copy of the URL is how the two drift apart.
    expect(source).not.toContain("'https://darshya.online/help'");
  });

  it('renders a control that opens it', () => {
    expect(source).toContain('openHelpCentre');
  });

  it('proves the scanner strips comments', () => {
    const withComment = "// openHelpCentre\nconst x = 1;";
    expect(stripComments(withComment)).not.toContain('openHelpCentre');
    expect(stripComments(withComment)).toContain('const x = 1;');
    // …and a URL inside real code survives the `//` rule.
    expect(stripComments("const u = 'https://a.example/b';")).toContain('https://a.example/b');
  });
});
