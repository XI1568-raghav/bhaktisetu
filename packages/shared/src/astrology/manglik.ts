// Manglik (Mangal) Dosh calculator — Mars-from-Moon house check.
//
// Moved out of apps/web/lib/manglik.ts unchanged so both clients score the
// same chart identically.
//
// Traditional rule per Brihat Parashara: Mars in houses 1, 2, 4, 7, 8, 12 from
// the lagna (ascendant) creates Mangal Dosh. Modern practice also evaluates
// from chandra (moon) and shukra (venus). Since we don't ask for birth
// latitude/longitude, this tool uses the Moon-based check — widely accepted in
// marriage matching.
//
// Mars longitude computed via simplified Meeus VSOP87 (~0.5° accuracy), fully
// sufficient for 30°-wide house determination.

import { RASHI_LABELS } from './nakshatra-table.js';
import {
 findNakshatra,
 norm360,
 type NakshatraFinderInput,
} from './nakshatra-finder.js';

const DEG_TO_RAD = Math.PI / 180;

/**
 * Mars true longitude (tropical) — simplified Meeus equation of center.
 * Accurate to ~0.5° within 1900-2100.
 */
export function marsTropicalLongitude(jd: number): number {
 const d = jd - 2451545.0;
 const L = 355.4332 + 0.5240207766 * d; // mean longitude
 const M = 19.3870 + 0.5240207766 * d; // mean anomaly
 const M_r = M * DEG_TO_RAD;
 // Equation of center for Mars (e = 0.0934)
 const C =
  10.691 * Math.sin(M_r)
  + 0.623 * Math.sin(2 * M_r)
  + 0.050 * Math.sin(3 * M_r);
 return norm360(L + C);
}

export type ManglikResult = {
 isManglik: boolean;
 severity: 'none' | 'anshik' | 'poorna';
 /** 1-12 */
 marsHouseFromMoon: number;
 marsRashi: string;
 moonRashi: string;
 /** sidereal degrees */
 marsLongitude: number;
 /** sidereal degrees (from the nakshatra finder) */
 moonLongitude: number;
 reasoning: string;
};

// Mars in own/exalted rashi → cancels manglik per traditional rule
const MARS_OWN_OR_EXALTED = new Set([0, 7, 9]); // Aries, Scorpio, Capricorn (exalted)
// Houses where Mars = manglik
const MANGLIK_HOUSES = new Set([1, 2, 4, 7, 8, 12]);
// Severity: 7, 8 = poorna; 1, 2, 4, 12 = anshik
const POORNA_HOUSES = new Set([7, 8]);

export function checkManglik(input: NakshatraFinderInput): ManglikResult | null {
 const nak = findNakshatra(input);
 if (!nak) return null;

 const moonSid = nak.moonSiderealLongitude;
 const moonRashiIdx = Math.floor(moonSid / 30);

 const marsTrop = marsTropicalLongitude(nak.julianDay);
 const marsSid = norm360(marsTrop - nak.ayanamsa);
 const marsRashiIdx = Math.floor(marsSid / 30);

 // House from Moon: count signs from moonRashi (= house 1) to marsRashi
 const houseFromMoon = (marsRashiIdx - moonRashiIdx + 12) % 12 + 1; // 1-12

 const inManglikHouse = MANGLIK_HOUSES.has(houseFromMoon);
 const marsCancels = MARS_OWN_OR_EXALTED.has(marsRashiIdx);

 const marsRashi = RASHI_LABELS[marsRashiIdx]!;
 const moonRashi = RASHI_LABELS[moonRashiIdx]!;

 let severity: ManglikResult['severity'] = 'none';
 let isManglik = false;
 let reasoning = '';

 if (inManglikHouse && !marsCancels) {
  isManglik = true;
  severity = POORNA_HOUSES.has(houseFromMoon) ? 'poorna' : 'anshik';
  reasoning = `Mars is in house ${houseFromMoon} from the Moon (${marsRashi}). Mars in houses 1, 2, 4, 7, 8, or 12 from chandra-lagna creates Mangal Dosh. Houses 7 + 8 cause poorna (full) dosh; houses 1, 2, 4, 12 cause anshik (partial) dosh.`;
 } else if (inManglikHouse && marsCancels) {
  isManglik = false;
  severity = 'none';
  reasoning = `Mars is in house ${houseFromMoon} from the Moon, which is normally a manglik position — BUT Mars is in its own/exalted rashi (${marsRashi}), which traditionally cancels Mangal Dosh.`;
 } else {
  isManglik = false;
  severity = 'none';
  reasoning = `Mars is in house ${houseFromMoon} from the Moon (${marsRashi}). This is not one of the manglik houses (1, 2, 4, 7, 8, 12), so no Mangal Dosh from chandra-lagna.`;
 }

 return {
  isManglik,
  severity,
  marsHouseFromMoon: houseFromMoon,
  marsRashi,
  moonRashi,
  marsLongitude: marsSid,
  moonLongitude: moonSid,
  reasoning,
 };
}

export const MANGLIK_REMEDIES: string[] = [
 'Recite Hanuman Chalisa daily — especially Tuesdays + Saturdays',
 'Mangal Beej Mantra: Om Kraam Kreem Kraum Sah Bhaumaya Namah (108 times)',
 'Donate red lentils (masoor dal), red cloth, or jaggery on Tuesdays',
 'Visit Hanuman / Kartikeya / Mangalnath temple, light a ghee lamp',
 'Wear coral (moonga) ring on the ring finger of the right hand — gemstone consult with pandit first',
 'Manglik–Manglik vivah (marrying another manglik) traditionally cancels the dosh',
 'Kumbh Vivah (symbolic marriage to a pot/peepal/Vishnu idol before real marriage) for severe cases',
 'Mangal Shanti Puja by a qualified pandit — Mars graha shanti',
];

export const CANCELLATION_RULES: string[] = [
 'Mars in own rashi (Aries / Scorpio) cancels the dosh',
 'Mars exalted in Capricorn cancels the dosh',
 'Both partners manglik → dosh cancels each other (Manglik–Manglik vivah)',
 'Mars debilitated or in friendly rashi with benefic aspect → reduced severity',
 'After age 28 (some say 36), the dosh is considered greatly weakened',
 'Strong Jupiter aspect on Mars or 7th house → significant reduction',
];
