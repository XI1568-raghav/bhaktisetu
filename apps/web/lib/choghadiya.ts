// Choghadiya — MOVED to @poojly/shared/astrology.
//
// The 8+8 daily muhurat periods, and the Almanac-for-Computers sunrise/sunset
// solver they are built on, now live in
// packages/shared/src/astrology/choghadiya.ts so apps/mobile computes them
// offline instead of opening this website.
//
// Note this is NOT the same source as the API's panchang: apps/api's
// `computeRahuKaal` reads sunrise/sunset out of a hardcoded per-city monthly
// CITY_TIMES table and emits only Rahu Kaal. The solver below takes real
// lat/lng and yields the full set. Implementation unchanged; this file is the
// stable web import path.

export {
 computeChoghadiya,
 CITY_OPTIONS,
 CHOGHADIYA_QUALITY,
 CHOGHADIYA_RULER,
 CHOGHADIYA_BEST_FOR,
} from '@poojly/shared/astrology';

export type {
 ChoghadiyaKind,
 ChoghadiyaQuality,
 ChoghadiyaPeriod,
 ChoghadiyaDay,
 ChoghadiyaInput,
} from '@poojly/shared/astrology';
