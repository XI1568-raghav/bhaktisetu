// Rahu Kalam / Yamaganda / Gulika — MOVED to @poojly/shared/astrology.
//
// The three daily inauspicious octets now live in
// packages/shared/src/astrology/rahu-kalam.ts, built on the shared choghadiya
// sunrise/sunset solver, so apps/mobile can compute them for any city without
// a round trip. Implementation unchanged; this file is the stable web import
// path.

export {
 computeRahuKalam,
 CITY_OPTIONS,
 DOSHA_LABEL,
 DOSHA_SANSKRIT,
 DOSHA_RULER,
 DOSHA_AVOID,
} from '@poojly/shared/astrology';

export type {
 DoshaKind,
 DoshaWindow,
 RahuKalamDay,
 RahuKalamInput,
} from '@poojly/shared/astrology';
