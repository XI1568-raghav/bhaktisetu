/**
 * The /wellness/yoga and /wellness/meditation landing pages published supply
 * that does not exist — the same defect COM-14 (the /wellness instructor
 * strip), AW-07 (the /wellness "upcoming this week" strip) and AW-17 (the
 * /wellness/instructors index) removed from every OTHER surface of this
 * section on 2026-08-12. These two pages were missed by that sweep and were
 * still serving it on prod on 2026-09-09:
 *
 *   yoga/page.tsx:66-71        Aarav Sharma 4.9 / 342 reviews / 12 yrs / Rs599,
 *                              Swami Dhyanananda 4.9 / 512 reviews, +4 more
 *   yoga/page.tsx:73-82        a weekly schedule of eight classes, each with a
 *                              `spots` count rendered as "4 spots left" in red
 *   yoga/page.tsx:84-91        six library videos with "12.4K views"
 *   meditation/page.tsx:62-65  four teachers with the same invented ratings
 *   meditation/page.tsx:84-89  four dated sessions, "3 spots left", Rs499
 *
 * GET /api/v1/wellness/sessions answered `{"data":[]}` the same day. Not one
 * of those people, classes, seats, prices or view counts corresponds to a row
 * in any table. A fabricated star average and a fabricated countdown of
 * remaining seats on a page that takes money are a consumer-protection
 * problem, not a copy nit — the argument
 * __tests__/leg17-store-fabricated-review-counts.test.tsx already makes for
 * the store grid and __tests__/fabricated-viewer-counts.test.ts for the
 * darshan lane.
 *
 * The second half of the defect is structural, and is why the fiction survived
 * review so long: every "Book" button under those scarcity prompts — ten of
 * them across the two pages — was a bare `<button>` with no `onClick`, no
 * `type`, no form and no href, inside a server component carrying no
 * `'use client'`. No handler could ever attach to any of them. The pages
 * looked transactional and were not, so nobody clicking through the funnel
 * ever hit a failure that would have exposed the numbers as invented.
 *
 * SOURCE SCAN, not a render, for the reason DF-10 chose one: the failure being
 * guarded is REINTRODUCTION — a fixture array pasted back from an old revision,
 * or from the eight-person roster still living in
 * apps/api/src/routes/wellness.ts (out of this lane, and the reason AW-17
 * refused to consume GET /wellness/instructors). A regex over the lane catches
 * that wherever it lands; a render test catches only what it renders.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const LANE_FILES = ['app/wellness/yoga/page.tsx', 'app/wellness/meditation/page.tsx'] as const;

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

/**
 * Comments are stripped before every scan.
 *
 * This lane documents a deletion by quoting what was deleted — the fix comments
 * in both pages name "Aarav Sharma" and "spots left" on purpose, exactly as
 * app/wellness/page.tsx does for COM-14 and AW-07, so that the next person does
 * not "restore" them. A scanner that could not tell shipped code from the note
 * explaining why the code is gone would punish the documentation and reward
 * silent deletion. The `[^:]` guard keeps `https://` inside a string literal
 * from being read as a line comment.
 */
const stripComments = (src: string): string =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

/**
 * The eight-person fixture roster. Six of them shipped on these two pages; the
 * other two are listed because they are the rest of the same invented cast
 * (apps/api/src/routes/wellness.ts) and are one paste away.
 */
const INVENTED_PEOPLE = [
  'Aarav Sharma',
  'Meera Iyer',
  'Rajesh Kulkarni',
  'Nandini Raghavan',
  'Swami Dhyanananda',
  'Kavya Menon',
  'Anita Desai',
  'Acharya Goenkaji',
] as const;

function inventedPeople(src: string): string[] {
  const code = stripComments(src);
  return INVENTED_PEOPLE.filter((name) => code.includes(name));
}

/**
 * Every data key this lane used to carry invented social proof: a star
 * average, a review tally, a years-of-experience claim, a view count. The
 * platform measures none of these for a wellness instructor — no review table
 * joins `wellness_sessions`, and there is no video library at all — so the key
 * may not exist here, with or without digits beside it.
 */
const SOCIAL_PROOF_KEY = 'rating|reviewCount|reviews|experience|views';

function socialProofKeys(src: string): string[] {
  const re = new RegExp(`\\b(?:${SOCIAL_PROOF_KEY})\\s*[:=]\\s*\\{?\\s*[^,\\n}]*`, 'g');
  return [...stripComments(src).matchAll(re)].map((m) => m[0].trim());
}

/**
 * A braced expression that puts one of those fields on screen —
 * `{inst.rating}`, `{inst.reviewCount} reviews`. `[^{}]*` keeps a match inside
 * one brace pair so a whole component body cannot be swallowed as a single hit.
 *
 * The field must be READ (`.rating`) or KEYED (`rating:`), never merely
 * spelled. A bare `\b(rating|…|experience)\b` inside the braces reported the
 * surviving style guide on this very page — "Immersive experience using singing
 * bowls" sits in an object literal, so the whole entry matched. Banning the
 * English word "experience" from a page about meditation is not the rule; the
 * rule is that no field carrying unmeasured social proof reaches the screen.
 */
function socialProofOnScreen(src: string): string[] {
  const re = new RegExp(
    `\\{([^{}]*(?:\\.\\s*(?:${SOCIAL_PROOF_KEY})\\b|\\b(?:${SOCIAL_PROOF_KEY})\\s*[:=])[^{}]*)\\}`,
    'g',
  );
  return [...stripComments(src).matchAll(re)].map((m) => m[1].trim());
}

/**
 * Scarcity — both the rendered sentence and the data key behind it. A seat
 * count reaches this section only from the API's `spotsLeft` (capacity minus
 * held enrolments, rendered by WellnessClassesClient), never from a literal.
 */
function scarcityClaims(src: string): string[] {
  const code = stripComments(src);
  return [
    ...[...code.matchAll(/\bspots?\s+(?:left|remaining|available)/gi)].map((m) => m[0]),
    ...[...code.matchAll(/\bspots\s*[:=]\s*\{?\s*\d+/g)].map((m) => m[0]),
  ];
}

/** `price: 599` — a per-session fee for a session nobody scheduled. */
function priceLiterals(src: string): string[] {
  return [...stripComments(src).matchAll(/\bprice\s*[:=]\s*\{?\s*\d+/g)].map((m) => m[0]);
}

/**
 * A `<button>` in a file that is not a client component. Next attaches no
 * handler to it and none can be added without the directive, so it is a control
 * that cannot act — which is what all ten "Book" buttons were. A server-rendered
 * button is legitimate inside a `<form>` (a server action), and neither page has
 * one; if that changes, this scanner needs the form case, not a suppression.
 */
function inertButtons(src: string): string[] {
  if (/^\s*['"]use client['"]/m.test(src)) return [];
  const code = stripComments(src);
  if (/<form\b/.test(code)) return [];
  return [...code.matchAll(/<button\b[^>]*>/g)].map((m) => m[0].replace(/\s+/g, ' '));
}

/** The lucide star, which appeared on these pages only inside a rating badge. */
function ratingStars(src: string): string[] {
  return [...stripComments(src).matchAll(/<Star\b[^>]*>?/g)].map((m) => m[0].replace(/\s+/g, ' '));
}

const LANE = LANE_FILES.map((rel) => ({ rel, src: read(rel) }));

describe('the wellness landing pages publish no invented supply', () => {
  it.each(LANE)('$rel names no fixture instructor', ({ rel, src }) => {
    expect(
      inventedPeople(src),
      `${rel} still ships people who teach nothing on this platform. ` +
        `GET /wellness/sessions is the only source of an instructor name in this ` +
        `section — see app/wellness/FeaturedInstructorsSection.tsx (COM-14).`,
    ).toEqual([]);
  });

  it.each(LANE)('$rel declares no rating, review tally, tenure or view count', ({ rel, src }) => {
    expect(
      socialProofKeys(src),
      `${rel} hardcodes social proof. Nothing on this platform rates a wellness ` +
        `instructor, counts their reviews or plays their videos, so every one of ` +
        `these numbers is invented.`,
    ).toEqual([]);
  });

  it.each(LANE)('$rel puts no such number on screen', ({ rel, src }) => {
    expect(socialProofOnScreen(src), `${rel} renders a rating/review/tenure/view figure.`).toEqual(
      [],
    );
  });

  it.each(LANE)('$rel claims no remaining seats', ({ rel, src }) => {
    expect(
      scarcityClaims(src),
      `${rel} prints a seat countdown. Real seats come from the API's spotsLeft ` +
        `(capacity minus enrolments); a literal is manufactured urgency for a class ` +
        `that does not exist.`,
    ).toEqual([]);
  });

  it.each(LANE)('$rel quotes no per-session price', ({ rel, src }) => {
    expect(
      priceLiterals(src),
      `${rel} advertises a price for supply that has no row. Prices in this ` +
        `section are formatClassPrice(class.priceInr) — what the class actually costs.`,
    ).toEqual([]);
  });

  it.each(LANE)('$rel renders no rating star', ({ rel, src }) => {
    expect(ratingStars(src), `${rel} still draws a rating badge.`).toEqual([]);
  });

  it.each(LANE)('$rel contains no button that cannot be clicked', ({ rel, src }) => {
    expect(
      inertButtons(src),
      `${rel} is a server component, so a <button> here can never receive a ` +
        `handler. Either the CTA goes somewhere real (a Link) or it is not a button.`,
    ).toEqual([]);
  });
});

/*
 * The positive half. Deleting the fiction is only half the fix: a marketing page
 * for a service the platform intends to sell has to say what happens when there
 * is no supply and offer a real next step — the shape AW-07 and AW-17 settled
 * on. These assertions stop the fix from decaying into a blank page.
 */
describe('the wellness landing pages still reach real supply', () => {
  it.each(LANE)('$rel renders the live feed, not a fixture', ({ rel, src }) => {
    const code = stripComments(src);
    expect(code, `${rel} no longer mounts the live upcoming-classes section`).toContain(
      'UpcomingClassesSection',
    );
    expect(code, `${rel} no longer mounts the live instructor section`).toContain(
      'FeaturedInstructorsSection',
    );
  });

  it.each(LANE)('$rel offers a real next step', ({ rel, src }) => {
    expect(stripComments(src), `${rel} does not link the bookable catalog`).toContain(
      '/wellness/classes',
    );
  });
});

/*
 * The scanners are only worth having if they can go red. Every fixture below is
 * a verbatim line from the two pages as they stood on prod on 2026-09-09, so a
 * later refactor of a regex that quietly stops matching gets caught here rather
 * than by re-publishing invented supply to devotees.
 */
describe('the scanners detect the exact code that was removed', () => {
  const preFixInstructorRow = `
 { id: 'inst-001', name: 'Aarav Sharma', specialty: 'Hatha Yoga', experience: 12, rating: 4.9, reviewCount: 342, price: 599 },`;

  const preFixScheduleRow = `
 { time: '7:00 AM', title: 'Power Vinyasa', instructor: 'Meera Iyer', duration: '75 min', spots: 5, slot: 'morning' },`;

  const preFixVideoRow = `
 { title: 'Hatha Basics', instructor: 'Aarav Sharma', duration: '25 min', views: '12.4K', level: 'Beginner' },`;

  const preFixScarcityCell = `
 <span className="text-xs" style={{ color: s.spots <= 5 ? '#b91c1c' : 'var(--color-text-faint)' }}>
 {s.spots} spots left
 </span>
 <button className={buttonClass('primary', 'md')}>
 Book
 </button>`;

  const preFixRatingCell = `
 <span className="flex items-center gap-0.5">
 <Star className="w-3 h-3 fill-current" style={{ color: '#D4A438' }} /> {inst.rating}
 </span>
 <span>{inst.reviewCount} reviews</span>`;

  it('flags an instructor fixture row on every channel it offends', () => {
    expect(inventedPeople(preFixInstructorRow)).toEqual(['Aarav Sharma']);
    expect(socialProofKeys(preFixInstructorRow)).toEqual([
      'experience: 12',
      'rating: 4.9',
      'reviewCount: 342',
    ]);
    expect(priceLiterals(preFixInstructorRow)).toEqual(['price: 599']);
  });

  it('flags the invented schedule and its seat count', () => {
    expect(inventedPeople(preFixScheduleRow)).toEqual(['Meera Iyer']);
    expect(scarcityClaims(preFixScheduleRow)).toEqual(['spots: 5']);
  });

  it('flags a library video and its view count', () => {
    expect(socialProofKeys(preFixVideoRow)).toEqual(["views: '12.4K'"]);
  });

  it('flags the rendered scarcity sentence and the button under it', () => {
    expect(scarcityClaims(preFixScarcityCell)).toEqual(['spots left']);
    expect(inertButtons(preFixScarcityCell)).toEqual([
      `<button className={buttonClass('primary', 'md')}>`,
    ]);
  });

  it('flags a rendered rating and review tally', () => {
    expect(ratingStars(preFixRatingCell).length).toBe(1);
    expect(socialProofOnScreen(preFixRatingCell)).toEqual(['inst.rating', 'inst.reviewCount']);
  });

  it('reads past a comment that quotes what was deleted', () => {
    const documented = `// was: name: 'Aarav Sharma', rating: 4.9, reviewCount: 342, price: 599
 {/* the card printed "{s.spots} spots left" above a dead <button>Book</button> */}
 /* removed 2026-09-09 — see app/wellness/FeaturedInstructorsSection.tsx */`;
    expect(inventedPeople(documented)).toEqual([]);
    expect(socialProofKeys(documented)).toEqual([]);
    expect(scarcityClaims(documented)).toEqual([]);
    expect(priceLiterals(documented)).toEqual([]);
    expect(inertButtons(documented)).toEqual([]);
  });

  it('does not flag the English word inside surviving editorial copy', () => {
    // The false positive the first draft of socialProofOnScreen produced: the
    // style guide these pages keep is a list of object literals, and one of its
    // descriptions contains the word "experience".
    const editorial = `
 {
 name: 'Sound Bath',
 description: 'Immersive experience using singing bowls, gongs, and tuning forks.',
 icon: Wind,
 },`;
    expect(socialProofOnScreen(editorial)).toEqual([]);
    expect(socialProofKeys(editorial)).toEqual([]);
  });

  it('does not mistake a URL in a string for a line comment', () => {
    const url = `{ href: 'https://darshya.online/wellness/yoga', rating: 4.9 }`;
    expect(socialProofKeys(url)).toEqual(['rating: 4.9']);
  });

  it('permits a button in a client component, where a handler can attach', () => {
    expect(inertButtons(`'use client';\n<button onClick={go}>Book</button>`)).toEqual([]);
  });
});
