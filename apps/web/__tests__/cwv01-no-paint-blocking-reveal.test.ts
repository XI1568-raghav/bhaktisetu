import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const WEB = path.resolve(__dirname, '..');
const css = readFileSync(path.join(WEB, 'app/globals.css'), 'utf8');
const reveal = readFileSync(path.join(WEB, 'components/ScrollReveal.tsx'), 'utf8');
const tabs = readFileSync(path.join(WEB, 'components/MobileBottomTabs.tsx'), 'utf8');

/** Every top-level rule block whose selector mentions data-reveal. */
function revealRules(): Array<{ selector: string; body: string }> {
  const out: Array<{ selector: string; body: string }> = [];
  const re = /(^|\n)([^{}\n@][^{}]*\[data-reveal[^{}]*)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) out.push({ selector: m[2]!.trim(), body: m[3]! });
  return out;
}

describe('[CWV-01] scroll-reveal never hides content from first paint', () => {
  it('finds the reveal rules (an empty scan cannot pass)', () => {
    expect(revealRules().length).toBeGreaterThan(10);
  });

  it('no [data-reveal] rule hides or displaces an element unless it is .reveal-pending', () => {
    const offenders = revealRules()
      .filter((r) => !/\.reveal-pending|\.is-visible|prefers-reduced/.test(r.selector))
      .filter((r) =>
        r.body.split(';').some((decl) => {
          const [prop, ...rest] = decl.split(':');
          const value = rest.join(':').trim();
          switch (prop?.trim()) {
            case 'opacity':
              return value === '0';
            case 'transform':
              return value !== '' && !value.startsWith('none');
            case 'filter':
              return value.startsWith('blur');
            case 'clip-path':
              return true;
            default:
              return false;
          }
        }),
      )
      .map((r) => r.selector);
    expect(
      offenders,
      'a bare [data-reveal] rule that sets opacity 0 / a transform makes every LCP candidate ' +
        'invisible until hydration (measured: 3.1 s of render delay on the home hero)',
    ).toEqual([]);
  });

  it('ScrollReveal shows first-viewport elements immediately and only marks the rest pending', () => {
    expect(reveal).toContain("classList.add('reveal-pending')");
    expect(reveal).toMatch(/getBoundingClientRect\(\)\.top\s*>=\s*vh/);
    expect(reveal).toContain("el.classList.add('is-visible')");
  });
});

describe('[CWV-01] layout-shift sources stay closed', () => {
  it('the mobile tab bar rides above the consent banner with a transform, not by moving `bottom`', () => {
    expect(tabs).toMatch(/translateY\(calc\(var\(--consent-h/);
    expect(tabs).not.toMatch(/bottom:\s*'var\(--consent-h/);
  });

  it('the display face has a metric-matched local fallback in front of Noto', () => {
    expect(css).toMatch(/font-family:\s*'Cabinet Grotesk Fallback'/);
    expect(css).toMatch(/size-adjust:\s*[\d.]+%/);
    expect(css).toMatch(/--font-display:\s*'Cabinet Grotesk',\s*'Cabinet Grotesk Fallback',\s*var\(--font-noto-sans\)/);
  });
});
