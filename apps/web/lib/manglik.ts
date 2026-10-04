// Manglik (Mangal) Dosh — MOVED to @poojly/shared/astrology.
//
// The Mars-from-Moon house check now lives in
// packages/shared/src/astrology/manglik.ts so apps/mobile runs the same
// calculation. Implementation unchanged; this file is the stable web import
// path.

export {
 checkManglik,
 marsTropicalLongitude,
 MANGLIK_REMEDIES,
 CANCELLATION_RULES,
} from '@poojly/shared/astrology';

export type { ManglikResult } from '@poojly/shared/astrology';
