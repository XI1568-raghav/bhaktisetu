// Vimshottari Mahadasha calculator — 120-yr planetary timeline from
// janma nakshatra. Standard sequence + durations per Brihat Parashara
// Hora Shastra (chapter on dashas).
//
// The 27 nakshatras cycle through 9 dasha lords in groups of 3
// (Ketu→Venus→Sun→Moon→Mars→Rahu→Jupiter→Saturn→Mercury, then repeat).
// At birth, the remaining portion of the current mahadasha is prorated
// by how far the moon has travelled into the janma nakshatra.

import { findNakshatra, type NakshatraFinderInput } from './nakshatra-finder';

export type DashaLord =
 | 'Ketu' | 'Venus' | 'Sun' | 'Moon' | 'Mars'
 | 'Rahu' | 'Jupiter' | 'Saturn' | 'Mercury';

// Sequence per Brihat Parashara — also the order of nakshatra lords
// (Ashwini=Ketu, Bharani=Venus, Krittika=Sun, ... then repeating every 9).
const SEQUENCE: DashaLord[] = [
 'Ketu', 'Venus', 'Sun', 'Moon', 'Mars',
 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
];

// Years per mahadasha — sums to 120
const DURATION_YEARS: Record<DashaLord, number> = {
 Ketu: 7,
 Venus: 20,
 Sun: 6,
 Moon: 10,
 Mars: 7,
 Rahu: 18,
 Jupiter: 16,
 Saturn: 19,
 Mercury: 17,
};

const NAK_SIZE = 360 / 27;

export type MahadashaPeriod = {
 lord: DashaLord;
 startDate: string;      // YYYY-MM-DD
 endDate: string;
 years: number;
 isCurrent: boolean;
 antardashas?: AntardashaPeriod[];
};

export type AntardashaPeriod = {
 lord: DashaLord;
 startDate: string;
 endDate: string;
 years: number;
 isCurrent: boolean;
};

export type DashaResult = {
 janmaLord: DashaLord;
 janmaNakshatra: string;
 birthBalanceYears: number; // remaining yrs in first mahadasha at birth
 timeline: MahadashaPeriod[];
 currentMahadasha: MahadashaPeriod | null;
 currentAntardasha: AntardashaPeriod | null;
};

// Years.fraction → milliseconds for date math
const YR_MS = 365.2425 * 24 * 3600 * 1000;

function addYears(iso: string, years: number): string {
 const t = new Date(iso).getTime() + years * YR_MS;
 const d = new Date(t);
 return d.toISOString().slice(0, 10);
}

function lordFromNakIndex(nakIdx: number): DashaLord {
 // Ashwini(0)=Ketu, Bharani(1)=Venus, ... cycles every 9
 return SEQUENCE[nakIdx % 9]!;
}

export function computeDasha(input: NakshatraFinderInput, asOfDate?: string): DashaResult | null {
 const nak = findNakshatra(input);
 if (!nak) return null;

 const janmaLord = lordFromNakIndex(nak.nakshatraIndex);
 // Fraction of nakshatra ALREADY elapsed at birth
 const elapsedFrac = nak.padaLongitude / NAK_SIZE;
 const fullYears = DURATION_YEARS[janmaLord];
 const balanceYears = fullYears * (1 - elapsedFrac);

 const today = asOfDate ?? new Date().toISOString().slice(0, 10);
 const birthIso = `${input.dob}T${input.time || '12:00'}:00`;

 const timeline: MahadashaPeriod[] = [];

 // First (partial) mahadasha — starts at birth, runs for balanceYears
 let cursorIso = birthIso.slice(0, 10);
 const firstEnd = addYears(cursorIso, balanceYears);
 timeline.push({
  lord: janmaLord,
  startDate: cursorIso,
  endDate: firstEnd,
  years: balanceYears,
  isCurrent: false,
 });
 cursorIso = firstEnd;

 // Subsequent full mahadashas — start from lord AFTER janmaLord in sequence,
 // continue for ~120 yrs total from birth
 const startIdx = SEQUENCE.indexOf(janmaLord);
 let i = 1;
 // 120-yr cycle = 9 mahadashas. We already shipped the partial first → 8 full
 // more makes one full cycle. Add one more cycle to cover long lives + future
 // generations (most charts only need ~120 yrs from birth though).
 while (i <= 9) {
  const lord = SEQUENCE[(startIdx + i) % 9]!;
  const yrs = DURATION_YEARS[lord];
  const end = addYears(cursorIso, yrs);
  timeline.push({
   lord,
   startDate: cursorIso,
   endDate: end,
   years: yrs,
   isCurrent: false,
  });
  cursorIso = end;
  i += 1;
 }

 // Mark current mahadasha + compute antardashas for it
 const todayTs = new Date(today).getTime();
 let currentMahadasha: MahadashaPeriod | null = null;
 let currentAntardasha: AntardashaPeriod | null = null;

 for (const md of timeline) {
  const startTs = new Date(md.startDate).getTime();
  const endTs = new Date(md.endDate).getTime();
  if (todayTs >= startTs && todayTs < endTs) {
   md.isCurrent = true;
   md.antardashas = computeAntardashas(md, today);
   currentMahadasha = md;
   currentAntardasha = md.antardashas.find((a) => a.isCurrent) ?? null;
   break;
  }
 }

 return {
  janmaLord,
  janmaNakshatra: nak.nakshatra.name,
  birthBalanceYears: balanceYears,
  timeline,
  currentMahadasha,
  currentAntardasha,
 };
}

// Antardasha (sub-period) lords cycle through all 9 starting from the
// mahadasha lord itself. Duration of each = (mahadasha yrs × antardasha lord
// yrs) / 120.
function computeAntardashas(md: MahadashaPeriod, today: string): AntardashaPeriod[] {
 const startIdx = SEQUENCE.indexOf(md.lord);
 const out: AntardashaPeriod[] = [];
 let cursor = md.startDate;
 const todayTs = new Date(today).getTime();
 for (let i = 0; i < 9; i += 1) {
  const lord = SEQUENCE[(startIdx + i) % 9]!;
  const yrs = (md.years * DURATION_YEARS[lord]) / 120;
  const end = addYears(cursor, yrs);
  const startTs = new Date(cursor).getTime();
  const endTs = new Date(end).getTime();
  const isCurrent = todayTs >= startTs && todayTs < endTs;
  out.push({
   lord,
   startDate: cursor,
   endDate: end,
   years: yrs,
   isCurrent,
  });
  cursor = end;
 }
 return out;
}

export const DASHA_LORD_PLANET_HINDI: Record<DashaLord, string> = {
 Ketu: 'केतु',
 Venus: 'शुक्र',
 Sun: 'सूर्य',
 Moon: 'चंद्र',
 Mars: 'मंगल',
 Rahu: 'राहु',
 Jupiter: 'गुरु',
 Saturn: 'शनि',
 Mercury: 'बुध',
};

export const DASHA_LORD_NATURE: Record<DashaLord, string> = {
 Ketu: 'spiritual detachment, moksha-pursuit, sudden upheavals + intuitive insights',
 Venus: 'love, marriage, luxury, art, vehicles, comforts, sensuality',
 Sun: 'authority, government, father, leadership, recognition, ego work',
 Moon: 'mother, emotions, public life, travel, mind, popularity',
 Mars: 'energy, courage, property, siblings, conflicts, sports + military matters',
 Rahu: 'foreign things, technology, ambition, sudden gains/losses, unconventional paths',
 Jupiter: 'wisdom, children, dharma, teachers, wealth via knowledge, spiritual growth',
 Saturn: 'discipline, hard work, delays, longevity, service, karma resolution',
 Mercury: 'communication, business, learning, travel, networking, intellectual pursuits',
};
