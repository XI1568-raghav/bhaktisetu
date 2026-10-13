import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { selectKundli } from '../kundli-chart';
import {
  badgeLabel,
  selectLessonProgress,
  EMPTY_LESSON_PROGRESS,
} from '../lesson-progress';
import {
  buildGurukulApplication,
  effectiveApplicantType,
  guardianRequired,
  GurukulApplicationError,
} from '../gurukul-application';
import { fetchWithBudget, FetchBudgetError, readErrorMessage } from '../fetch-budget';

/**
 * DV-01 — devotee-lane contract regressions.
 *
 * Every case below is a defect that was LIVE in `app/(devotee)` and invisible
 * to `tsc`, because each screen asserted a hand-written interface over an
 * untyped `res.json()` / `unknown` payload. The fixtures are the routes' own
 * reply objects, copied field-for-field from the handlers cited on each block.
 */

function screenSource(name: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../app/(devotee)/${name}`, import.meta.url)),
    'utf8',
  );
}

/**
 * The screen's source with comments removed.
 *
 * Every fix in this lane documents the key it stopped reading, so a bare
 * `toContain('g.programs')` matches the explanation rather than the defect.
 * These assertions are about CODE.
 */
function screenCode(name: string): string {
  return screenSource(name)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

// ─── kundli ───────────────────────────────────────────────────────────────────
//
// `POST /api/v1/astrology/kundli` -> `{ kundli: KundliPayload }`
// (apps/api/src/lib/astrology.ts:145-162 + :240-262). Copied verbatim.

const KUNDLI_REPLY = {
  kundli: {
    source: 'computed',
    warning: 'Astrology API key not configured — using local sidereal calculations.',
    name: 'Arjun Sharma',
    dob: '1995-08-21',
    tob: '14:32',
    location: 'Varanasi, India',
    ayanamsa: 23.8712,
    rashi: { english: 'Taurus', sanskrit: 'Vrishabha', hindi: 'वृषभ', symbol: '♉', lord: 'Venus' },
    sunSign: { english: 'Leo', sanskrit: 'Simha', hindi: 'सिंह' },
    nakshatra: { name: 'Rohini', hindi: 'रोहिणी', pada: 3 },
    lagna: { english: 'Scorpio', sanskrit: 'Vrishchika', hindi: 'वृश्चिक' },
    planetaryPositions: [
      { planet: 'Sun', sign: 'Leo', signHindi: 'सिंह', degree: '04.71', house: 10 },
      { planet: 'Moon', sign: 'Taurus', signHindi: 'वृषभ', degree: '16.02', house: 7 },
    ],
    dasha: {
      current: {
        planet: 'Jupiter',
        planetHindi: 'गुरु',
        startDate: '2021-04-02',
        endDate: '2037-04-02',
        years: 16,
      },
      sequence: [],
    },
    interpretation: ['Your Moon sits in Vrishabha.', 'Guru dasha runs to 2037.'],
    signature: 'kr_1x9abc',
  },
};

describe('DV-01 kundli — the screen read seven keys the route never sends', () => {
  it('reads the four cardinal placements off the real payload', () => {
    const chart = selectKundli(KUNDLI_REPLY);
    expect(chart).not.toBeNull();
    expect(chart!.lagna).toBe('Scorpio');
    expect(chart!.rashi).toBe('Taurus');
    expect(chart!.rashiLord).toBe('Venus');
    expect(chart!.sunSign).toBe('Leo');
    expect(chart!.nakshatra).toBe('Rohini');
    expect(chart!.nakshatraPada).toBe(3);
  });

  it('flattens the objects the screen used to render straight into <Text>', () => {
    // `sunSign`, `nakshatra` and `dasha` ARE keys on the payload — and each is
    // an OBJECT. `<Text>{object}</Text>` throws "Objects are not valid as a
    // React child" in React Native, so a healthy 200 crashed the screen. Every
    // value the reader returns must therefore be a primitive or null.
    const chart = selectKundli(KUNDLI_REPLY)!;
    for (const value of [
      chart.lagna,
      chart.rashi,
      chart.sunSign,
      chart.nakshatra,
      chart.warning,
      chart.source,
      chart.signature,
    ]) {
      expect(value === null || typeof value === 'string').toBe(true);
    }
    expect(typeof chart.currentDasha!.planet).toBe('string');
  });

  it('maps planetaryPositions -> planets and keeps degree as the server sent it', () => {
    const chart = selectKundli(KUNDLI_REPLY)!;
    expect(chart.planets).toHaveLength(2);
    expect(chart.planets[0]).toEqual({
      planet: 'Sun',
      sign: 'Leo',
      degree: '04.71',
      house: 10,
    });
  });

  it('carries the server interpretation instead of an invented summary', () => {
    expect(selectKundli(KUNDLI_REPLY)!.interpretation).toEqual([
      'Your Moon sits in Vrishabha.',
      'Guru dasha runs to 2037.',
    ]);
  });

  it('returns null for the 400 body and for the invented shape', () => {
    expect(selectKundli({ error: 'dob must be YYYY-MM-DD' })).toBeNull();
    expect(selectKundli(null)).toBeNull();
    expect(selectKundli({ kundli: {} })).toBeNull();
    // The shape the screen used to declare. It must NOT be readable as a chart.
    expect(
      selectKundli({ kundli: { ascendant: 'Scorpio', moonSign: 'Taurus', summary: 'x' } }),
    ).toBeNull();
  });

  it('the screen no longer names any of the invented keys', () => {
    const src = screenCode('kundli.tsx');
    for (const dead of ['result.ascendant', 'result.moonSign', 'result.summary', 'p.name']) {
      expect(src, `kundli.tsx still reads ${dead}`).not.toContain(dead);
    }
    expect(src).toContain('selectKundli');
  });
});

// ─── lessons ──────────────────────────────────────────────────────────────────
//
// `GET /api/v1/lessons` -> `{success, progress[], streak, badges[]}`
// (apps/api/src/routes/lessons.ts:42-58). Copied verbatim.

const LESSONS_REPLY = {
  success: true,
  progress: [
    { lessonId: 'l01-devanagari-vowels', score: 100, completedAt: '2026-09-01T10:00:00.000Z' },
    { lessonId: 'l03-namaste', score: 67, completedAt: '2026-09-02T10:00:00.000Z' },
  ],
  streak: { currentDays: 4, longestDays: 9, lastActiveDay: '2026-09-02T00:00:00.000Z' },
  badges: [
    { key: 'first-lesson', earnedAt: '2026-09-01T10:00:00.000Z' },
    { key: 'streak-3', earnedAt: '2026-09-02T10:00:00.000Z' },
  ],
};

describe('DV-01 learn-sanskrit — `progress`, not `lessons`', () => {
  it('reads completions off `progress` (the screen read `lessons` and crashed)', () => {
    const p = selectLessonProgress(LESSONS_REPLY);
    expect(p.completed.map((c) => c.lessonId)).toEqual([
      'l01-devanagari-vowels',
      'l03-namaste',
    ]);
    expect(p.completed[0]!.score).toBe(100);
  });

  it('reads badge `key`/`earnedAt`, not the invented `id`/`awardedAt`', () => {
    const p = selectLessonProgress(LESSONS_REPLY);
    expect(p.badges).toEqual([
      { key: 'first-lesson', earnedAt: '2026-09-01T10:00:00.000Z' },
      { key: 'streak-3', earnedAt: '2026-09-02T10:00:00.000Z' },
    ]);
    expect(badgeLabel('first-lesson')).toBe('First lesson');
    // A badge the server adds before this table does must still render.
    expect(badgeLabel('lessons-100')).toBe('Lessons 100');
  });

  it('reads the streak the route actually sends', () => {
    expect(selectLessonProgress(LESSONS_REPLY).streak).toEqual({
      currentDays: 4,
      longestDays: 9,
    });
  });

  it('reads the DB-less / synthetic-user reply as a real empty state', () => {
    expect(
      selectLessonProgress({ success: true, progress: [], streak: null, badges: [] }),
    ).toEqual(EMPTY_LESSON_PROGRESS);
  });

  it('never throws on a shape it does not recognise', () => {
    expect(() => selectLessonProgress(undefined)).not.toThrow();
    expect(selectLessonProgress({ lessons: [{ lessonId: 'x' }] }).completed).toEqual([]);
  });

  it('the screen no longer dereferences `.lessons`', () => {
    const src = screenCode('learn-sanskrit.tsx');
    expect(src).not.toContain('progress?.lessons');
    expect(src).not.toContain('badges: []');
    expect(src).not.toContain('b.id');
    expect(src).toContain('selectLessonProgress');
  });
});

// ─── gurukul application ──────────────────────────────────────────────────────
//
// `POST /api/v1/gurukul-applications` submitSchema + refine
// (apps/api/src/routes/gurukul-applications.ts:11-29).

const PROGRAM_ID = '2b4a4f9e-1c4d-4a2f-9f1b-6a3c8d5e7f01';

const ADULT_FORM = {
  programId: PROGRAM_ID,
  applicantType: 'self' as const,
  studentName: 'Arjun Sharma',
  studentAgeYears: '24',
  consentSigned: true,
  statement: 'I wish to study the Krishna Yajurveda in the traditional manner for four years.',
};

describe('DV-01 gurukul-apply — the refine the screen could not satisfy', () => {
  it('posts `parent` for a minor, which is the only value the refine accepts', () => {
    // if (age < 18 && applicantType !== 'parent') -> REJECT.
    expect(effectiveApplicantType('self', 16)).toBe('parent');
    expect(effectiveApplicantType('self', 18)).toBe('self');
    expect(effectiveApplicantType('parent', 24)).toBe('parent');

    const body = buildGurukulApplication({
      ...ADULT_FORM,
      applicantType: 'self',
      studentAgeYears: '16',
      guardianName: 'Meera Sharma',
      guardianRelation: 'Mother',
      guardianPhone: '9876543210',
    });
    expect(body.applicantType).toBe('parent');
    expect(body.studentAgeYears).toBe(16);
  });

  it('demands guardian details exactly when the refine does', () => {
    expect(guardianRequired('self', 17)).toBe(true);
    expect(guardianRequired('parent', 30)).toBe(true);
    expect(guardianRequired('self', 18)).toBe(false);

    expect(() =>
      buildGurukulApplication({ ...ADULT_FORM, studentAgeYears: '16' }),
    ).toThrow(GurukulApplicationError);
  });

  it('omits guardian keys entirely for an adult self-application', () => {
    const body = buildGurukulApplication(ADULT_FORM);
    expect(body).toEqual({
      programId: PROGRAM_ID,
      applicantType: 'self',
      studentName: 'Arjun Sharma',
      studentAgeYears: 24,
      consentSigned: true,
      statement: ADULT_FORM.statement,
    });
    expect('guardianName' in body).toBe(false);
  });

  it('enforces every bound the schema declares', () => {
    // programId: z.string().uuid()
    expect(() => buildGurukulApplication({ ...ADULT_FORM, programId: 'not-a-uuid' })).toThrow();
    // studentName: min(2)
    expect(() => buildGurukulApplication({ ...ADULT_FORM, studentName: 'A' })).toThrow();
    // studentAgeYears: int().min(3).max(80)
    expect(() => buildGurukulApplication({ ...ADULT_FORM, studentAgeYears: '2' })).toThrow();
    expect(() => buildGurukulApplication({ ...ADULT_FORM, studentAgeYears: '81' })).toThrow();
    expect(() => buildGurukulApplication({ ...ADULT_FORM, studentAgeYears: '19.5' })).toThrow();
    // statement: min(20)
    expect(() => buildGurukulApplication({ ...ADULT_FORM, statement: 'too short' })).toThrow();
    // consentSigned: the refine requires it true on every branch
    expect(() => buildGurukulApplication({ ...ADULT_FORM, consentSigned: false })).toThrow();
    // studentEmail: z.string().email().optional()
    expect(() => buildGurukulApplication({ ...ADULT_FORM, studentEmail: 'nope' })).toThrow();
    // guardianAadhaarLast4: regex(/^\d{4}$/) — a 3-digit entry 400s the whole POST
    expect(() =>
      buildGurukulApplication({
        ...ADULT_FORM,
        applicantType: 'parent',
        guardianName: 'Meera Sharma',
        guardianRelation: 'Mother',
        guardianPhone: '9876543210',
        guardianAadhaarLast4: '123',
      }),
    ).toThrow();
  });

  it('the screen builds its body through the checked builder', () => {
    const src = screenCode('gurukul-apply.tsx');
    expect(src).toContain('buildGurukulApplication');
    expect(src).not.toContain('await res.text()');
  });
});

// ─── gurukul portal ───────────────────────────────────────────────────────────

describe('DV-01 gurukul-portal — programs and Alert.prompt', () => {
  it('no longer reads `programs` off /gurukuls/mine/list', () => {
    // serializeGurukul (apps/api/src/routes/gurukuls.ts:44-64) has no
    // `programs` key, so `g.programs.length` threw on every owned gurukul.
    const src = screenCode('gurukul-portal.tsx');
    expect(src).not.toContain('g.programs');
  });

  it('no longer uses Alert.prompt, which is a no-op on Android', () => {
    const src = screenCode('gurukul-portal.tsx');
    expect(src).not.toContain('Alert.prompt');
    expect(src).toContain('<Modal');
  });
});

// ─── the request budget ───────────────────────────────────────────────────────

describe('DV-01 fetch budget — the infinite-spinner P0 on hand-rolled fetches', () => {
  const realFetch = globalThis.fetch;

  it('settles a fetch that never resolves', async () => {
    globalThis.fetch = (() => new Promise<Response>(() => {})) as typeof fetch;
    try {
      await expect(fetchWithBudget('https://example.test/x', {}, 20)).rejects.toBeInstanceOf(
        FetchBudgetError,
      );
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it('marks our own deadline as a timeout and a dead socket as not', async () => {
    globalThis.fetch = (() => new Promise<Response>(() => {})) as typeof fetch;
    try {
      await fetchWithBudget('https://example.test/x', {}, 10);
      expect.unreachable('should have rejected');
    } catch (err) {
      expect((err as FetchBudgetError).timedOut).toBe(true);
    } finally {
      globalThis.fetch = realFetch;
    }

    globalThis.fetch = (() =>
      Promise.reject(new TypeError('Network request failed'))) as typeof fetch;
    try {
      await fetchWithBudget('https://example.test/x');
      expect.unreachable('should have rejected');
    } catch (err) {
      expect(err).toBeInstanceOf(FetchBudgetError);
      expect((err as FetchBudgetError).timedOut).toBe(false);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it('returns a non-2xx Response untouched — a 400 is an answer, not a failure', async () => {
    globalThis.fetch = (() =>
      Promise.resolve(new Response('{"error":"nope"}', { status: 400 }))) as typeof fetch;
    try {
      const res = await fetchWithBudget('https://example.test/x');
      expect(res.status).toBe(400);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it('reads the sentence a zod 400 actually carries', async () => {
    const zod = new Response(
      JSON.stringify({
        error: 'Bad Request',
        details: { fieldErrors: { guardianPhone: ['String must contain at least 8 character(s)'] }, formErrors: [] },
      }),
      { status: 400 },
    );
    expect(await readErrorMessage(zod)).toBe(
      'guardianPhone: String must contain at least 8 character(s)',
    );

    const refine = new Response(
      JSON.stringify({
        error: 'Bad Request',
        details: {
          fieldErrors: {},
          formErrors: ['Minors must apply via parent applicantType with guardian fields + consent.'],
        },
      }),
      { status: 400 },
    );
    expect(await readErrorMessage(refine)).toBe(
      'Minors must apply via parent applicantType with guardian fields + consent.',
    );

    const plain = new Response(JSON.stringify({ error: 'Program not available' }), { status: 404 });
    expect(await readErrorMessage(plain)).toBe('Program not available');

    const empty = new Response('not json', { status: 500 });
    expect(await readErrorMessage(empty)).toBe('Request failed (HTTP 500).');
  });

  it('every hand-rolled fetch in the devotee lane goes through the budget', () => {
    for (const screen of [
      'gurukul-apply.tsx',
      'gurukul-portal.tsx',
      'learn-sanskrit.tsx',
      'lesson.tsx',
      'puja-book.tsx',
      'checkout.tsx',
    ]) {
      const src = screenCode(screen);
      // `fetchWithBudget(` ends in `Budget(`, so a bare call is one whose
      // `fetch(` is not preceded by `With`.
      expect(src, `${screen} still calls a bare fetch`).not.toMatch(
        /(?<!With)(?<!authed)[Ff]etch\(\s*`?\$\{apiBase/,
      );
      // authedFetch (lib/authed-fetch.ts) is fetchWithBudget + the 401 refresh.
      expect(src, `${screen} does not import the budget`).toMatch(/fetchWithBudget|authedFetch/);
    }
  });
});

// ─── lesson score ─────────────────────────────────────────────────────────────

describe('DV-01 lesson — the score posted was one answer stale', () => {
  it('computes the final score off the answer array being committed', () => {
    // `submitProgress()` was called in the same tick as `setAnswers(next)`, so
    // it read the PREVIOUS `answers` and posted a score missing the last
    // question: three correct answers out of three were recorded as 67%.
    const quiz = [{ correct: 1 }, { correct: 1 }, { correct: 3 }];
    const next = [1, 1, 3];
    const stale = [1, 1];
    const score = (answers: number[]) =>
      Math.round((answers.filter((a, i) => a === quiz[i]?.correct).length / quiz.length) * 100);
    expect(score(stale)).toBe(67);
    expect(score(next)).toBe(100);

    const src = screenCode('lesson.tsx');
    expect(src).toContain('submitProgress(Math.round');
    expect(src).not.toContain('submitProgress();');
  });

  it('says so when a completed lesson was not recorded', () => {
    const src = screenCode('lesson.tsx');
    expect(src).toContain("'signed-out'");
    expect(src).toContain('Not saved');
  });
});
