import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderWarmIntroMessage } from './wa-warm-intro-helpers.js';

/**
 * TC-01 (P0, trust) — the 80G promise in messages that leave the building.
 *
 * The audit measured this claim across apps/web. Two of its live copies are
 * not on a web page at all: they are strings the server sends to real people.
 *
 *   lib/wa-warm-intro-helpers.ts   the WhatsApp warm-intro text, both
 *                                  audiences: "astrology consults, and 80G
 *                                  donations to verified temples" and
 *                                  "astrology, 80G temple donations".
 *   services/outreach.service.ts   the gaushala first-touch email SUBJECT:
 *                                  "Darshya — आपकी गौशाला के लिए 80G donation
 *                                  platform", i.e. a trust was recruited on
 *                                  the promise.
 *
 * Both are false for the reason lib/pdf-receipt.ts already documents:
 * `is80GEligible()` requires a donee 80G registration number AND a donee PAN,
 * they come from `gaushala_profiles.regn_80g` / `.pan`, and those columns are
 * SELECTed in exactly one place (routes/donations.ts) and written by no route
 * in the repository. The receipt therefore prints "Proof of donation — not a
 * tax exemption certificate" for every donation ever made.
 *
 * A WhatsApp message and an email subject cannot be edited after they are
 * sent, which makes them the least recoverable place in the product to
 * overstate a tax position. The cases below fail against the strings above.
 */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const API_SRC = path.resolve(HERE, '..');

/** The claim shapes, as distinct from a comment explaining their removal. */
function code(rel: string): string {
  return fs
    .readFileSync(path.join(API_SRC, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('TC-01 — the receipt path still cannot produce an 80G document', () => {
  it('is80GEligible needs two columns nothing writes', () => {
    const receipt = code('lib/pdf-receipt.ts');
    expect(receipt).toMatch(/gaushala80GNumber/);
    expect(receipt).toMatch(/gaushalaPan/);
    expect(fs.readFileSync(path.join(API_SRC, 'lib/pdf-receipt.ts'), 'utf8')).toMatch(
      /Proof of donation — not a tax exemption certificate/,
    );

    const files: string[] = [];
    (function walk(dir: string) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) walk(path.join(dir, e.name));
        else if (e.name.endsWith('.ts') && !e.name.includes('.test.'))
          files.push(path.join(dir, e.name));
      }
    })(API_SRC);
    expect(files.length).toBeGreaterThan(50);

    const writers = files.filter((f) => {
      const s = fs.readFileSync(f, 'utf8');
      return /(set|,)\s*regn_80g\s*=/i.test(s) || /insert[\s\S]{0,400}regn_80g/i.test(s);
    });
    expect(writers).toEqual([]);
  });
});

describe('TC-01 — outbound prospect copy promises no deduction', () => {
  const CONTACTS = [
    { name: 'Asha', audience: 'friends-family' as const },
    { name: 'Vikram', audience: 'professional' as const },
  ];

  for (const contact of CONTACTS) {
    it(`the ${contact.audience} WhatsApp intro names no 80G donation`, () => {
      const message = renderWarmIntroMessage(contact, { baseUrl: 'https://darshya.online' });
      // Guards against a silently empty render making the negative vacuous.
      expect(message.length).toBeGreaterThan(300);
      expect(message).toContain('darshya.online');
      expect(message).not.toMatch(/80\s?G/i);
      // TC-08 rode along in the same sentence.
      expect(message).not.toMatch(/verified temples/i);
      // And it still says what a donor actually gets.
      expect(message).toMatch(/receipt/i);
    });
  }

  it('the gaushala first-touch email subject does not sell an 80G platform', () => {
    const src = code('services/outreach.service.ts');
    const subjects = [...src.matchAll(/^\s*\w+:\s*'([^']*)',?\s*$/gm)].map((m) => m[1]);
    expect(subjects.length).toBeGreaterThan(8);
    for (const subject of subjects) {
      expect(subject, `outreach subject promises 80G: ${subject}`).not.toMatch(/80\s?G/i);
    }
    // The gaushala line still exists — it was corrected, not deleted.
    expect(src).toMatch(/gaushala_first_touch: '[^']*donation platform'/);
  });
});
