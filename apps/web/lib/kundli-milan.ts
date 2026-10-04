// Ashtakoot Guna Milan — MOVED to @poojly/shared/astrology.
//
// The 36-point marriage scorer now lives in
// packages/shared/src/astrology/kundli-milan.ts so apps/mobile runs the same
// Ashtakoot rather than bouncing devotees to this website. Implementation
// unchanged; this file is the stable web import path.
//
// `allNakshatraOptions` moved with it — it is the dropdown both clients fill
// from, so it belongs next to the table it reads.

export { computeMilan, allNakshatraOptions } from '@poojly/shared/astrology';

export type {
 NakshatraSlug,
 RashiName,
 GunaScore,
 MilanReport,
} from '@poojly/shared/astrology';
