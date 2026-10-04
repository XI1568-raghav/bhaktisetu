// Numerology — MOVED to @poojly/shared/astrology.
//
// Pythagorean (life-path, birthday) + Chaldean (name) numerology now lives in
// packages/shared/src/astrology/numerology.ts so apps/mobile can run it too.
// The implementation is unchanged; this file is the stable web import path.
//
// Do not reimplement any of it here. A second copy drifts, and this repo has
// already paid that bill: wedding prices differed 5x between web and mobile
// because each app hardcoded its own.

export {
 lifePath,
 birthdayNumber,
 nameChaldean,
 nameSoulUrge,
 namePersonality,
 getMeaning,
 computeNumerology,
 listAllMeanings,
 ALL_NUMBERS,
} from '@poojly/shared/astrology';

export type {
 NumerologyKind,
 NumerologyResult,
 NumberMeaning,
} from '@poojly/shared/astrology';
