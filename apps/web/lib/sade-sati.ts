// Sade Sati (Shani Sade Sati) + Dhaiya calculator.
//
// Sade Sati = Saturn transits 12th, 1st, 2nd rashi from natal Moon — total
// 7.5 years (~2.5 yrs per phase) per Brihat Parashara / Phaladeepika.
//   Phase 1 ("rising"  / Pratyamsa)   — Saturn in 12th from moon
//   Phase 2 ("peak"   / Janma Shani)  — Saturn in 1st from moon
//   Phase 3 ("setting" / Uttarardha)  — Saturn in 2nd from moon
//
// Dhaiya / Kantaka Shani = Saturn in 4th OR 8th from moon (~2.5 yrs each,
// considered tougher than the other 7 non-sade-sati rashis but lighter than
// the actual sade sati phases).
//
// Saturn longitude — simplified Meeus VSOP87 (~1° accuracy), sufficient for
// 30°-wide rashi determination + 2.5-yr phase transitions.

import { findNakshatra, type NakshatraFinderInput } from './nakshatra-finder';

const DEG_TO_RAD = Math.PI / 180;
const SATURN_DAYS_PER_RASHI = 365.25 * 29.4571 / 12; // ~896 days

function norm360(d: number): number {
 const r = d % 360;
 return r < 0 ? r + 360 : r;
}

// Tropical longitude of Saturn for a given Julian Day.
// L = mean longitude, M = mean anomaly, C = equation of center (e≈0.0542).
function saturnTropicalLongitude(jd: number): number {
 const d = jd - 2451545.0;
 const L = 50.0775 + 0.0334442282 * d;
 const M = 317.0207 + 0.0334442282 * d;
 const M_r = M * DEG_TO_RAD;
 const C =
  6.20 * Math.sin(M_r)
  + 0.21 * Math.sin(2 * M_r)
  + 0.01 * Math.sin(3 * M_r);
 return norm360(L + C);
}

// Approximate ayanamsa for a JD (Lahiri linear fit, mirrors nakshatra-finder).
function ayanamsaForJD(jd: number): number {
 const yearsFromJ2000 = (jd - 2451545.0) / 365.25;
 return 23.853 + 0.013963 * yearsFromJ2000;
}

// Julian Day for an ISO date string (UT 00:00).
function jdForISODate(iso: string): number {
 const [yy, mm, dd] = iso.split('-').map(Number);
 const Y = yy!;
 const M = mm!;
 const D = dd!;
 const yr = M <= 2 ? Y - 1 : Y;
 const mo = M <= 2 ? M + 12 : M;
 const A = Math.floor(yr / 100);
 const B = 2 - A + Math.floor(A / 4);
 return Math.floor(365.25 * (yr + 4716)) + Math.floor(30.6001 * (mo + 1)) + D + B - 1524.5;
}

// Sidereal rashi index (0-11) for Saturn on a given JD.
function saturnRashiOn(jd: number): number {
 const trop = saturnTropicalLongitude(jd);
 const sid = norm360(trop - ayanamsaForJD(jd));
 return Math.floor(sid / 30);
}

export type SadeSatiPhaseKind =
 | 'rising'       // 12th from moon
 | 'peak'         // 1st from moon (janma shani)
 | 'setting'      // 2nd from moon
 | 'dhaiya-4th'   // 4th from moon (kantaka shani)
 | 'dhaiya-8th'   // 8th from moon (ardha-kantaka shani)
 | 'normal';      // other 7 rashis

export type SadeSatiPhase = {
 kind: SadeSatiPhaseKind;
 startDate: string; // YYYY-MM-DD
 endDate: string;
 saturnRashi: string;
 isCurrent: boolean;
 ageStart: number;  // age at start of phase
 ageEnd: number;
};

export type SadeSatiResult = {
 moonRashi: string;
 moonRashiIdx: number;
 currentSaturnRashi: string;
 currentPhase: SadeSatiPhaseKind;
 currentPhaseLabel: string;
 currentPhaseDescription: string;
 phases: SadeSatiPhase[]; // sade sati + dhaiya phases through 90 yrs
 reasoning: string;
};

const RASHIS = [
 'Mesha (Aries)', 'Vrishabha (Taurus)', 'Mithuna (Gemini)', 'Karka (Cancer)',
 'Simha (Leo)', 'Kanya (Virgo)', 'Tula (Libra)', 'Vrischika (Scorpio)',
 'Dhanu (Sagittarius)', 'Makara (Capricorn)', 'Kumbha (Aquarius)', 'Meena (Pisces)',
];

const PHASE_LABEL: Record<SadeSatiPhaseKind, string> = {
 'rising': 'Sade Sati — Phase 1 (Rising / Pratyamsa)',
 'peak': 'Sade Sati — Phase 2 (Peak / Janma Shani)',
 'setting': 'Sade Sati — Phase 3 (Setting / Uttarardha)',
 'dhaiya-4th': 'Kantaka Shani — Dhaiya (4th from Moon)',
 'dhaiya-8th': 'Ardha-Kantaka — Dhaiya (8th from Moon)',
 'normal': 'No Sade Sati / Dhaiya',
};

const PHASE_DESC: Record<SadeSatiPhaseKind, string> = {
 'rising':
  'Saturn enters the 12th house from your natal Moon. Often felt as financial pressure, sleep disruption, expenditure, distancing from familiar comforts, and the start of karmic restructuring. Effects build gradually — this is the warm-up phase. Use it to clear debts, simplify, and prepare.',
 'peak':
  'Saturn in your natal Moon rashi — the central, most intense 2.5 years of sade sati. Major life recalibration: career shifts, family dynamics, health vigilance, emotional weight. Traditional texts describe this as the most demanding period, but also the deepest opportunity for character + wisdom. Discipline + dharmic action minimize the difficulty.',
 'setting':
  'Saturn in the 2nd house from your natal Moon. Focus shifts to wealth, speech, and family. Income may be tested, but with Saturn\'s discipline-blessing, you can structure new long-term financial foundations. The end is in sight — Saturn is leaving your immediate emotional sphere.',
 'dhaiya-4th':
  'Kantaka Shani (the "thorn") — Saturn in the 4th from Moon for 2.5 years. Tradition warns of friction in home, mother\'s wellbeing, real-estate, vehicles, and inner-peace. Lighter than sade sati but still consequential — handle property + family decisions carefully.',
 'dhaiya-8th':
  'Ardha-Kantaka — Saturn in the 8th from Moon for 2.5 years. Tradition associates this with health, longevity, in-laws, and sudden change. Less intense than full sade sati but a period for health vigilance + caution around speculation + inheritance matters.',
 'normal':
  'Saturn is not in 12th / 1st / 2nd / 4th / 8th from your natal Moon. You are not currently in sade sati or dhaiya — Saturn\'s transit through these houses produces effects per its natural significations (work, structure, longevity) without the karmic intensification.',
};

// Sade Sati standard remedies (Shani Shanti).
export const SADE_SATI_REMEDIES: string[] = [
 'Recite Hanuman Chalisa daily — Hanuman is the traditional remedy for Shani affliction',
 'Light a mustard-oil (sarson tel) diya before Lord Hanuman on Saturdays',
 'Shani Beej Mantra: Om Praam Preem Praum Sah Shanaye Namah (108 times)',
 'Donate black sesame (til), black urad dal, black cloth, or iron on Saturdays',
 'Visit a Shani temple — Shani Shingnapur (Maharashtra) or any Navagraha temple — light lamp',
 'Recite Dasaratha Shani Stotra or Shani Chalisa on Saturdays',
 'Feed crows + cows + the poor on Saturdays — Shani Daan',
 'Wear blue sapphire (neelam) ONLY after pandit consult — wrong gemstone amplifies Shani trouble',
 'Avoid lying, harming others, exploitation — Shani is the karmic justice planet',
 'Honor elders, mentors, the disabled, and laborers — Shani signifies these archetypes',
];

export const SADE_SATI_DOS_DONTS: { dos: string[]; donts: string[] } = {
 dos: [
  'Hard work + discipline + long-term planning yield long-term reward',
  'Simplify life, reduce unnecessary expenses, clear debts',
  'Daily exercise, regular sleep, vegetarian diet',
  'Charity to needy + service to elders',
  'Spiritual practice — meditation, mantra, scripture study',
 ],
 donts: [
  'Avoid speculation, gambling, get-rich-quick schemes',
  'Avoid major property + vehicle purchases without careful muhurat',
  'Avoid conflict + harsh speech with family + colleagues',
  'Avoid alcohol + intoxicants — Shani amplifies their damage',
  'Avoid signing long-term contracts on a Saturday without pandit consult',
 ],
};

function isoFromJD(jd: number): string {
 const date = new Date((jd - 2440587.5) * 86400000);
 const y = date.getUTCFullYear();
 const m = String(date.getUTCMonth() + 1).padStart(2, '0');
 const d = String(date.getUTCDate()).padStart(2, '0');
 return `${y}-${m}-${d}`;
}

function classifyPhase(saturnRashiIdx: number, moonRashiIdx: number): SadeSatiPhaseKind {
 const offset = (saturnRashiIdx - moonRashiIdx + 12) % 12; // 0..11
 // 0 = 1st house, 1 = 2nd, 3 = 4th, 7 = 8th, 11 = 12th
 if (offset === 11) return 'rising';
 if (offset === 0) return 'peak';
 if (offset === 1) return 'setting';
 if (offset === 3) return 'dhaiya-4th';
 if (offset === 7) return 'dhaiya-8th';
 return 'normal';
}

export function computeSadeSati(input: NakshatraFinderInput, asOfDate?: string): SadeSatiResult | null {
 const nak = findNakshatra(input);
 if (!nak) return null;

 const moonRashiIdx = Math.floor(nak.moonSiderealLongitude / 30);
 const birthJD = nak.julianDay;

 const today = asOfDate ? new Date(asOfDate) : new Date();
 const todayJD = jdForISODate(today.toISOString().slice(0, 10));

 const currentSaturnRashiIdx = saturnRashiOn(todayJD);
 const currentPhase = classifyPhase(currentSaturnRashiIdx, moonRashiIdx);

 // Walk Saturn through birth → birth + 90 yrs, sampled every ~30 days
 // to detect rashi transitions. When transition detected, refine with
 // narrower scan to get within ~1 day of crossing.
 const phases: SadeSatiPhase[] = [];
 const STEP = 30;       // days
 const REFINE = 1;      // day
 const END_JD = birthJD + 90 * 365.25;

 let prevRashi = saturnRashiOn(birthJD);
 let prevPhaseKind = classifyPhase(prevRashi, moonRashiIdx);
 let segStartJD = birthJD;

 for (let jd = birthJD + STEP; jd <= END_JD; jd += STEP) {
  const r = saturnRashiOn(jd);
  if (r !== prevRashi) {
   // Refine crossing
   let lo = jd - STEP;
   let hi = jd;
   while (hi - lo > REFINE) {
    const mid = (lo + hi) / 2;
    if (saturnRashiOn(mid) === prevRashi) lo = mid;
    else hi = mid;
   }
   const crossJD = hi;

   // Close current segment
   const newPhaseKind = classifyPhase(r, moonRashiIdx);
   if (prevPhaseKind !== 'normal') {
    phases.push({
     kind: prevPhaseKind,
     startDate: isoFromJD(segStartJD),
     endDate: isoFromJD(crossJD),
     saturnRashi: RASHIS[prevRashi]!,
     isCurrent: false,
     ageStart: Math.max(0, (segStartJD - birthJD) / 365.25),
     ageEnd: (crossJD - birthJD) / 365.25,
    });
   }
   prevRashi = r;
   prevPhaseKind = newPhaseKind;
   segStartJD = crossJD;
  }
 }
 // Tail segment
 if (prevPhaseKind !== 'normal') {
  phases.push({
   kind: prevPhaseKind,
   startDate: isoFromJD(segStartJD),
   endDate: isoFromJD(END_JD),
   saturnRashi: RASHIS[prevRashi]!,
   isCurrent: false,
   ageStart: (segStartJD - birthJD) / 365.25,
   ageEnd: (END_JD - birthJD) / 365.25,
  });
 }

 // Mark current
 const todayISO = today.toISOString().slice(0, 10);
 for (const p of phases) {
  if (p.startDate <= todayISO && todayISO < p.endDate) {
   p.isCurrent = true;
  }
 }

 let reasoning: string;
 if (currentPhase === 'normal') {
  reasoning = `Saturn is currently in ${RASHIS[currentSaturnRashiIdx]} — neither the 12th, 1st, 2nd, 4th, nor 8th rashi from your natal Moon (${RASHIS[moonRashiIdx]}). You are not in sade sati or dhaiya right now.`;
 } else {
  const offset = (currentSaturnRashiIdx - moonRashiIdx + 12) % 12;
  const houseName = offset === 11 ? '12th' : offset === 0 ? '1st (Janma Shani)' : offset === 1 ? '2nd' : offset === 3 ? '4th' : '8th';
  reasoning = `Saturn is currently in ${RASHIS[currentSaturnRashiIdx]}, which is the ${houseName} house from your natal Moon (${RASHIS[moonRashiIdx]}). This places you in: ${PHASE_LABEL[currentPhase]}.`;
 }

 return {
  moonRashi: RASHIS[moonRashiIdx]!,
  moonRashiIdx,
  currentSaturnRashi: RASHIS[currentSaturnRashiIdx]!,
  currentPhase,
  currentPhaseLabel: PHASE_LABEL[currentPhase],
  currentPhaseDescription: PHASE_DESC[currentPhase],
  phases,
  reasoning,
 };
}

export const PHASE_KIND_LABEL = PHASE_LABEL;
export const PHASE_KIND_DESCRIPTION = PHASE_DESC;
export { SATURN_DAYS_PER_RASHI };
