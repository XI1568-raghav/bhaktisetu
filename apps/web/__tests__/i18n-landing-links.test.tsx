/**
 * Locale-carrying links must actually reach the middleware (audit I-02 / I18N-01).
 *
 * The remediation for I-02 has two halves and they only work together:
 *
 *   1. lib/i18n/locales.ts `localeHref()` puts `?lang=xx` on every onward link
 *      out of a locale landing, and the "English →" links carry `?lang=en` to
 *      CLEAR a stored locale.
 *   2. middleware.ts turns that param into the durable `poojly_language` cookie
 *      and strips it back off the URL.
 *
 * Half 2 only runs if the click produces a request. next/link prefetches
 * in-viewport links by default, and on Next 15 a prefetched static route is
 * reused from the client Router Cache for `staleTimes.static` (5 minutes by
 * default) — so the click can be served entirely from memory and never touch
 * the middleware. The visitor taps "पूजा बुक करें", lands on /pujas, and no
 * cookie was ever written: silently back to English, which is precisely the
 * defect I-02 filed.
 *
 * That hole got sharper, not softer, once middleware.ts started refusing to
 * write the cookie on a prefetch (a prefetch is not a choice — scrolling to the
 * footer must not change anybody's language). With writes confined to real
 * navigations, the real navigation has to happen.
 *
 * Hence: a link whose whole job is to hand the middleware a `?lang=` must not be
 * prefetched.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ href, prefetch, children, ...rest }: Record<string, unknown> & { children?: unknown }) => (
    <a
      href={String(href)}
      data-prefetch={String(prefetch)}
      {...(rest as Record<string, unknown>)}
    >
      {children as never}
    </a>
  ),
}));

import { LangLanding } from '../components/LangLanding';
import HindiLanding from '../app/hi/page';

const TAMIL_PROPS = {
  langCode: 'ta',
  langTag: 'ta_IN',
  pillText: 'சனாதன தர்மம்',
  heroTitle: 'இந்தியாவின் ஆன்மீக சூப்பர்-ஆப்',
  heroSubtitle: 'நேரலை தரிசனம், பூஜை முன்பதிவு.',
  ctaBookLabel: 'பூஜை முன்பதிவு',
  ctaDarshanLabel: 'நேரலை தரிசனம்',
  features: [
    { title: 'நேரலை தரிசனம்', body: 'முக்கிய கோயில்களிலிருந்து.', href: '/darshan' },
    { title: 'பூஜை', body: 'சரிபார்க்கப்பட்ட பண்டிதர்.', href: '/pujas' },
  ],
  nriHeading: 'வெளிநாட்டில் வசிக்கிறீர்களா?',
  nriBody: 'NRI பாதை.',
  nriCta: 'NRI தொகுப்பு',
  englishLink: 'English →',
  footerNote: 'முழு மொழிபெயர்ப்பு முன்னேற்றத்தில் உள்ளது.',
  englishLinkFooter: 'ஆங்கிலப் பதிப்பு →',
};

function localeLinks(container: HTMLElement) {
  return Array.from(container.querySelectorAll('a')).filter((a) =>
    (a.getAttribute('href') ?? '').includes('lang='),
  );
}

describe('I-02 / I18N-01 — a locale link is never served from the client router cache', () => {
  it('the Tamil landing emits locale links, and none of them is prefetchable', () => {
    const { container } = render(<LangLanding {...TAMIL_PROPS} />);
    const links = localeLinks(container);

    // The half-1 fix is present at all: onward CTAs carry the locale.
    expect(links.length).toBeGreaterThan(0);
    expect(links.map((a) => a.getAttribute('href'))).toContain('/pujas?lang=ta');

    for (const a of links) {
      expect(
        a.getAttribute('data-prefetch'),
        `${a.getAttribute('href')} may be prefetched, so a click can skip the middleware`,
      ).toBe('false');
    }
    cleanup();
  });

  it('the Hindi landing is under the same rule', () => {
    const { container } = render(<HindiLanding />);
    const links = localeLinks(container);

    expect(links.map((a) => a.getAttribute('href'))).toContain('/pujas?lang=hi');

    for (const a of links) {
      expect(
        a.getAttribute('data-prefetch'),
        `${a.getAttribute('href')} may be prefetched, so a click can skip the middleware`,
      ).toBe('false');
    }
    cleanup();
  });

  it('covers the "back to English" links, which CLEAR a stored locale', () => {
    // These are the ones where a cache hit is most damaging: the visitor asks
    // for English, gets the English page, and the Hindi cookie survives — so
    // every later page still reports them as a Hindi reader.
    const { container } = render(<LangLanding {...TAMIL_PROPS} />);
    const backToEnglish = Array.from(container.querySelectorAll('a')).filter(
      (a) => a.getAttribute('href') === '/?lang=en',
    );

    expect(backToEnglish.length).toBe(2); // header + footer
    for (const a of backToEnglish) {
      expect(a.getAttribute('data-prefetch')).toBe('false');
    }
    cleanup();
  });
});
