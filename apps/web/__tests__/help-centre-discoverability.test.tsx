/**
 * I-09 / I18N-09 (prod sweep 2026-08-12) — the help centre.
 *
 * Two findings, one surface. I-09 counted article OBJECTS (6), I18N-09 counted
 * distinct TOPICS (1); both were measured against the same aspiration written
 * into the top of lib/help-articles.ts, and both landed on 2%. The number is
 * the smaller half of the problem. The larger half is that the articles that DO
 * exist are unreachable: /help never referenced HELP_ARTICLES, /help/articles/*
 * appeared in no navigation, and every "article" a devotee could click on
 * /help or /support was a hardcoded title pointing at `/support/faq?q=<title>`
 * — a query parameter the FAQ page did not read. Thirty links on /help, ten
 * more on /support and eight category tiles all landed on the same unfiltered
 * list, and ten of them named articles that had never been written at all.
 *
 * These tests fix the contract, not the count: every article that exists must
 * be reachable from /help, and no help surface may advertise an answer that
 * does not exist. They are deliberately data-driven — a new article is linked
 * automatically, and a fabricated one fails the suite.
 *
 * Everything scanned below is DATA (exported arrays, rendered HTML), never
 * source text, so no assertion here can be satisfied or broken by a comment.
 * The single exception is documented at its own test.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import HelpPage from '../app/help/page';
import SupportPage from '../app/support/page';
import * as Article from '../app/help/articles/[lang]/[slug]/page';
import {
  HELP_ARTICLES,
  HELP_LANGS,
  getHelpArticlesByLang,
  isUnreviewedTranslation,
} from '../lib/help-articles';
import {
  FAQ_ITEMS,
  AUTO_REPLY_RULES,
  POPULAR_ARTICLES,
  POPULAR_ARTICLE_REFS,
  SUPPORT_CATEGORIES,
  FAQ_SECTION_FOR_CATEGORY,
  FAQ_SECTIONS,
} from '../lib/support';
import { COMPANY } from '../lib/company';
import { SUPPORTED_LOCALES } from '../lib/i18n/locales';
import {
  FULL_REFUND_HOURS_BEFORE,
  CANCELLATION_CUTOFF_HOURS,
  PARTIAL_REFUND_PERCENT,
} from '../lib/cancellation-policy';

const searchParams = { current: new URLSearchParams() };
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
    usePathname: () => '/support/faq',
    useSearchParams: () => searchParams.current,
  };
});

import FaqPage from '../app/support/faq/page';

function decodeAttr(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/** Every href the page delivers, already HTML-decoded. */
function hrefsIn(html: string): string[] {
  return [...html.matchAll(/href="([^"]*)"/g)].map((m) => decodeAttr(m[1]!));
}

const helpHtml = renderToStaticMarkup(<HelpPage />);
const supportHtml = renderToStaticMarkup(<SupportPage />);

describe('I18N-09 — every published help article is reachable from /help', () => {
  it('links each English article by its real URL', () => {
    const english = getHelpArticlesByLang('en');
    expect(english.length).toBeGreaterThan(0);
    const hrefs = hrefsIn(helpHtml);
    for (const article of english) {
      expect(
        hrefs,
        `/help does not link /help/articles/en/${article.slug}`,
      ).toContain(`/help/articles/en/${article.slug}`);
    }
  });

  it('offers every language that actually has an article', () => {
    const hrefs = hrefsIn(helpHtml).join(' ');
    for (const lang of HELP_LANGS) {
      const count = getHelpArticlesByLang(lang.code).length;
      if (count === 0) continue;
      expect(hrefs, `/help offers no ${lang.code} article`).toContain(
        `/help/articles/${lang.code}/`,
      );
    }
  });

  it('offers no language the product has no landing for', () => {
    expect(HELP_LANGS.map((l) => l.code)).toEqual([...SUPPORTED_LOCALES]);
  });

  /**
   * This used to read `expect(helpHtml).toContain(String(englishCount))`, which
   * reduced to `toContain("7")` — and the 35kB of rendered HTML contains every
   * digit 1-9 in SVG path data alone, plus "12" and the WhatsApp number. It
   * passed whatever the page claimed, including nothing. Extract the figure the
   * page actually prints and compare it to the catalogue instead.
   */
  it('states the coverage it actually has, in figures taken from the catalogue', () => {
    const claimed = /(\d+) step-by-step guides and (\d+) short answers/.exec(helpHtml);
    expect(claimed, '/help no longer prints its guide and answer counts').not.toBeNull();
    expect(Number(claimed![1]), 'the guide count on /help is not the catalogue size').toBe(
      getHelpArticlesByLang('en').length,
    );
    expect(Number(claimed![2]), 'the answer count on /help is not the FAQ size').toBe(
      FAQ_ITEMS.length,
    );
  });

  it("states each language's real coverage against the English catalogue", () => {
    const english = getHelpArticlesByLang('en').length;
    for (const lang of HELP_LANGS) {
      if (lang.code === 'en') continue;
      const translated = getHelpArticlesByLang(lang.code).length;
      if (translated === 0) continue;
      expect(
        helpHtml,
        `/help does not state ${lang.code} coverage as ${translated} of ${english}`,
      ).toContain(`${translated} of ${english} guides`);
    }
  });
});

describe('I-09 — no help surface advertises an answer that does not exist', () => {
  const answerable = new Set<string>([
    ...FAQ_ITEMS.map((i) => i.question),
    ...HELP_ARTICLES.map((a) => a.title),
  ]);

  function faqQueryTargets(html: string): string[] {
    return hrefsIn(html)
      .filter((h) => h.startsWith('/support/faq?'))
      .map((h) => new URLSearchParams(h.slice(h.indexOf('?') + 1)).get('q'))
      .filter((q): q is string => Boolean(q));
  }

  it('/help asks the FAQ only for questions the FAQ can answer', () => {
    for (const q of faqQueryTargets(helpHtml)) {
      expect(answerable, `/help links to a non-existent answer: "${q}"`).toContain(q);
    }
  });

  it('drops no popular-article row on the floor', () => {
    // The list is built by flatMap, which silently skips a ref whose article
    // or FAQ id no longer exists. That would shrink the section rather than
    // fail, so the count is asserted against the declared refs.
    expect(POPULAR_ARTICLES).toHaveLength(POPULAR_ARTICLE_REFS.length);
  });

  it('/support popular articles all resolve to something that exists', () => {
    expect(POPULAR_ARTICLES.length).toBeGreaterThan(0);
    const slugs = new Set(HELP_ARTICLES.map((a) => a.slug));
    const faqIds = new Set(FAQ_ITEMS.map((i) => i.id));
    for (const article of POPULAR_ARTICLES) {
      const href = (article as { href?: string }).href;
      expect(href, `POPULAR_ARTICLES ${article.id} has no destination`).toBeTruthy();
      const articleMatch = href!.match(/^\/help\/articles\/([a-z]{2})\/([a-z0-9-]+)$/);
      const faqMatch = href!.match(/^\/support\/faq\?q=(.+)$/);
      if (articleMatch) {
        expect(slugs, `${article.id} points at a missing article`).toContain(articleMatch[2]!);
      } else if (faqMatch) {
        const q = decodeURIComponent(faqMatch[1]!);
        expect(answerable, `${article.id} points at a missing FAQ answer`).toContain(q);
      } else {
        throw new Error(`POPULAR_ARTICLES ${article.id} href "${href}" resolves nowhere`);
      }
      expect(faqIds.size).toBeGreaterThan(0);
    }
  });

  it('/support renders the destination each popular article declares', () => {
    const hrefs = hrefsIn(supportHtml);
    for (const article of POPULAR_ARTICLES) {
      expect(hrefs).toContain((article as { href: string }).href);
    }
  });

  it('/support sends a devotee to the help centre', () => {
    expect(hrefsIn(supportHtml)).toContain('/help');
  });
});

describe('the FAQ honours the deep links every help surface emits', () => {
  beforeEach(() => {
    searchParams.current = new URLSearchParams();
  });

  it('filters to the question a ?q= link asks for', () => {
    const target = FAQ_ITEMS.find((i) => i.id === 'bp-7')!;
    const other = FAQ_ITEMS.find((i) => i.id === 'gs-1')!;
    searchParams.current = new URLSearchParams({ q: target.question });
    render(<FaqPage />);
    expect(screen.getByText(target.question)).toBeTruthy();
    expect(screen.queryByText(other.question)).toBeNull();
  });

  it('filters to the section a ?cat= tile asks for', () => {
    const section = FAQ_SECTION_FOR_CATEGORY.darshan;
    expect(FAQ_SECTIONS).toContain(section);
    searchParams.current = new URLSearchParams({ cat: 'darshan' });
    render(<FaqPage />);
    const inSection = FAQ_ITEMS.find((i) => i.section === section)!;
    const outside = FAQ_ITEMS.find((i) => i.section !== section)!;
    expect(screen.getByText(inSection.question)).toBeTruthy();
    expect(screen.queryByText(outside.question)).toBeNull();
  });

  it('maps every support category tile to a real FAQ section', () => {
    for (const cat of SUPPORT_CATEGORIES) {
      const section = FAQ_SECTION_FOR_CATEGORY[cat.id];
      expect(section, `no FAQ section mapped for tile "${cat.id}"`).toBeTruthy();
      expect(FAQ_SECTIONS).toContain(section);
    }
  });
});

describe('I-09 — unreviewed translations are disclosed, and not indexed', () => {
  const params = (lang: string, slug: string) => Promise.resolve({ lang, slug });

  async function ssr(lang: string, slug: string): Promise<string> {
    const element = await (Article.default as (p: {
      params: Promise<{ lang: string; slug: string }>;
    }) => Promise<React.ReactElement>)({ params: params(lang, slug) });
    return renderToStaticMarkup(element);
  }

  const pending = HELP_ARTICLES.filter(isUnreviewedTranslation);
  const attested = HELP_ARTICLES.filter((a) => !isUnreviewedTranslation(a));

  it('has something to disclose', () => {
    expect(pending.length).toBeGreaterThan(0);
    expect(attested.length).toBeGreaterThan(0);
  });

  it('tells the reader the translation is machine-made and unverified', async () => {
    for (const article of pending) {
      const html = await ssr(article.lang, article.slug);
      expect(html, `${article.lang}/${article.slug} hides its review state`).toMatch(
        /pending review/i,
      );
    }
  });

  it('keeps unreviewed copy out of the index', async () => {
    for (const article of pending) {
      const meta = await Article.generateMetadata({ params: params(article.lang, article.slug) });
      expect(meta.robots, `${article.lang}/${article.slug} is indexable`).toMatchObject({
        index: false,
      });
    }
  });

  it('does not brand reviewed copy as pending', async () => {
    for (const article of attested) {
      const html = await ssr(article.lang, article.slug);
      expect(html).not.toMatch(/pending review/i);
      const meta = await Article.generateMetadata({ params: params(article.lang, article.slug) });
      expect((meta.robots as { index?: boolean } | undefined)?.index).not.toBe(false);
    }
  });
});

describe('help article bodies may not out-promise the constants', () => {
  it('quotes the video-proof window the company module publishes', () => {
    const canonical = COMPANY.refunds.videoProofTargetLabel.replace(/\s*hours?$/i, '').trim();
    const mentions = HELP_ARTICLES.filter((a) => /video|वीडियो|வீடியோ|వీడియో|ভিডিও/i.test(a.body));
    expect(mentions.length).toBeGreaterThan(0);
    for (const article of mentions) {
      expect(
        article.body,
        `${article.lang}/${article.slug} publishes a video window of its own`,
      ).toContain(canonical);
    }
  });

  it('promises no 80G receipt while the registration is unverified', () => {
    if (COMPANY.donationLegal.HAS_80G_VERIFIED) return;
    // An article explaining that the exemption is unavailable HAS to say the
    // words, so the ban is on the assertion, not the mention: any line naming
    // 80G must also carry the denial. The old seed article listed "80G receipt
    // (eligible donations)" as an included benefit, with nothing to deny it.
    const denial = /\bnot\b|\bno\b|cannot|can't|unavailable|until|once .* (granted|issued|on file)/i;
    for (const article of HELP_ARTICLES) {
      const lines = `${article.summary}\n${article.body}`.split('\n');
      for (const line of lines) {
        if (!/80\s*-?\s*G\b/i.test(line)) continue;
        expect(
          denial.test(line),
          `${article.lang}/${article.slug} asserts 80G without denying it: "${line.trim()}"`,
        ).toBe(true);
      }
    }
  });
});

describe('the support catalogue tells the truth about refunds and languages', () => {
  const prose = [
    ...FAQ_ITEMS.map((i) => ({ id: i.id, text: i.answer })),
    ...AUTO_REPLY_RULES.map((r) => ({ id: `auto:${r.keywords[0]}`, text: r.reply })),
  ];

  it('offers exactly the languages the product has a landing for', () => {
    const answer = FAQ_ITEMS.find((i) => i.id === 'gs-5')!.answer;
    expect(answer).not.toMatch(/Kannada/i);
    for (const lang of HELP_LANGS) {
      expect(answer, `gs-5 omits ${lang.label}`).toContain(lang.label);
    }
  });

  it('publishes no refund tier the cancellation engine refuses to produce', () => {
    for (const { id, text } of prose) {
      expect(text, `${id} promises a full refund at the ${CANCELLATION_CUTOFF_HOURS}h boundary`)
        .not.toMatch(/24\s*\+?\s*(hours?|hrs?)[^.]{0,40}full refund/i);
      expect(text, `${id} advertises the unreachable 50% tier`).not.toMatch(
        /within 24 hours[^.]{0,40}\b50\s*%/i,
      );
    }
  });

  it('quotes the shipped ladder where it answers the refund question', () => {
    const answer = FAQ_ITEMS.find((i) => i.id === 'bp-7')!.answer;
    expect(answer).toContain(`${FULL_REFUND_HOURS_BEFORE} hours`);
    expect(answer).toContain(`${PARTIAL_REFUND_PERCENT}%`);
    expect(answer).toMatch(new RegExp(`within ${CANCELLATION_CUTOFF_HOURS} hours`, 'i'));
  });

  it('quotes the shipped video-proof window where it answers that question', () => {
    const answer = FAQ_ITEMS.find((i) => i.id === 'bp-4')!.answer;
    expect(answer).toContain(COMPANY.refunds.videoProofTargetLabel);
  });
});

describe('the catalogue states its real size', () => {
  /**
   * The ONE assertion in this file that reads source text rather than data,
   * because the defect itself lived in a comment: the file header announced
   * "50 articles x 6 languages = 300 total" beside six objects, and a reader
   * could not tell an aspiration from a status. Comments are therefore exactly
   * what must be scanned — but only comments, and only for a bare numeric
   * total, so no prose about the catalogue can trip it.
   */
  it('no comment in help-articles.ts announces a total the catalogue does not have', () => {
    const src = readFileSync(path.join(process.cwd(), 'lib', 'help-articles.ts'), 'utf8');
    const comments = [
      ...src.matchAll(/\/\*[\s\S]*?\*\//g),
      ...src.matchAll(/(^|\s)\/\/[^\n]*/g),
    ].map((m) => m[0]);
    for (const comment of comments) {
      for (const claim of comment.matchAll(/=\s*(\d+)\s*total/gi)) {
        expect(
          Number(claim[1]),
          `a comment claims ${claim[1]} articles; the catalogue holds ${HELP_ARTICLES.length}`,
        ).toBeLessThanOrEqual(HELP_ARTICLES.length);
      }
    }
  });
});
