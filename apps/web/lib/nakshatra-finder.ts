// Nakshatra finder — MOVED to @poojly/shared/astrology.
//
// The maths (Julian Day, Lahiri ayanamsa, Meeus moon longitude, pada + rashi
// derivation) now lives in packages/shared/src/astrology/nakshatra-finder.ts
// so apps/mobile runs the SAME code rather than a second copy of it. Nothing
// about the calculation changed; this file is the web-side adapter and the
// stable import path for the pages that already use it.
//
// The one thing it adds is the editorial half of a nakshatra. The shared table
// carries only the computational fields (gana, rashi, lord, …); the web
// nakshatra pages also print `meaning`, `qualities`, `career`,
// `compatibility` and `spiritualPractice`, which live in ./nakshatras. The
// shared result hands back the INDEX, and this file swaps in the rich record
// at that index — so `result.nakshatra` keeps exactly the shape
// NakshatraFinderClient and the baby-name page have always read.

import { NAKSHATRAS, type Nakshatra } from './nakshatras';
import {
 findNakshatra as findNakshatraShared,
 TIMEZONE_OPTIONS as SHARED_TIMEZONE_OPTIONS,
 type NakshatraFinderInput,
 type NakshatraFinderResult as SharedNakshatraFinderResult,
} from '@poojly/shared/astrology';

export type { NakshatraFinderInput };

/** The shared result, with the rich web nakshatra record in place of the core one. */
export type NakshatraFinderResult =
 Omit<SharedNakshatraFinderResult, 'nakshatra'> & { nakshatra: Nakshatra };

export function findNakshatra(input: NakshatraFinderInput): NakshatraFinderResult | null {
 const core = findNakshatraShared(input);
 if (!core) return null;
 const nakshatra = NAKSHATRAS[core.nakshatraIndex];
 // Cannot happen while the two tables agree — apps/web/__tests__/
 // astrology-shared-parity.test.ts is what keeps them agreeing.
 if (!nakshatra) return null;
 return { ...core, nakshatra };
}

/** Common timezone offsets for the dropdown. */
export const TIMEZONE_OPTIONS: Array<{ value: number; label: string }> = SHARED_TIMEZONE_OPTIONS;
