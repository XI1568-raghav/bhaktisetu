import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

function read(name: string): string {
  return readFileSync(resolve(ROOT, name), 'utf-8');
}

describe('canada-pandit outreach templates (R-Q3-S-007)', () => {
  const en = read('outreach-email-en.md');
  const hi = read('outreach-email-hi.md');
  const wa = read('outreach-whatsapp.md');
  const fu = read('followup-day5.md');

  it('EN + HI emails have first_name, temple_name, city placeholders', () => {
    for (const t of [en, hi]) {
      expect(t).toMatch(/\{first_name\}/);
      expect(t).toMatch(/\{temple_name\}/);
      expect(t).toMatch(/\{city\}/);
    }
  });

  it('WA template is < 400 chars', () => {
    // strip front-matter header block to measure only the body lines
    const body = wa
      .split(/\n/)
      .filter((l) => !l.startsWith('#') && !l.startsWith('>'))
      .join(' ')
      .trim();
    expect(body.length).toBeLessThan(400);
  });

  it('no hard pricing claims (CAD/USD/INR) until rail live', () => {
    const PRICING = /\$\d+|CAD \d+|₹\d+|USD \d+/;
    for (const [name, t] of [
      ['en', en],
      ['hi', hi],
      ['wa', wa],
      ['fu', fu],
    ] as const) {
      expect(t, `${name} no hard pricing`).not.toMatch(PRICING);
    }
  });

  it('every email template mentions early-access partner language', () => {
    for (const [name, t] of [
      ['en', en],
      ['hi', hi],
      ['wa', wa],
    ] as const) {
      expect(t.toLowerCase(), `${name} early-access`).toMatch(
        /early-access|प्रारंभिक-पहुँच|prarambhik-pahunch/i,
      );
    }
  });

  it('CASL Reply STOP footer in EN + HI + day-5 follow-up emails', () => {
    for (const [name, t] of [
      ['en', en],
      ['hi', hi],
      ['fu', fu],
    ] as const) {
      expect(t, `${name} CASL footer`).toMatch(/Reply STOP/i);
      expect(t, `${name} address placeholder`).toMatch(/Bhaktisetu/);
    }
  });

  it('HI template provides Devanagari + Romanized sections', () => {
    expect(hi).toMatch(/## Devanagari/);
    expect(hi).toMatch(/## Romanized/);
  });

  it('CTA links to /become-pandit per spec', () => {
    for (const [name, t] of [
      ['en', en],
      ['hi', hi],
      ['wa', wa],
      ['fu', fu],
    ] as const) {
      expect(t, `${name} CTA`).toMatch(/become-pandit/);
    }
  });
});
