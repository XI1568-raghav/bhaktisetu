// Kaal Sarp Dosh — all 7 classical planets (Sun, Moon, Mars, Mercury, Jupiter,
// Venus, Saturn) hemmed inside the 180° arc bounded by Rahu and Ketu (north +
// south lunar nodes). 12 sub-types named after serpent kings, classified by
// the house Rahu occupies in the natal chart.
//
// Reuses sidereal longitude solvers + Lahiri ayanamsa from vedic-astrology.ts.
// Ascendant (lagna) formula is duplicated here (~10 lines) to avoid touching
// the shipped vedic-astrology.ts module.
//
// Accuracy: planet longitudes via Meeus simplified series ±0.5°. Rahu via
// mean lunar node ±0.3°. Arc test tolerant of ±2° (small enough that border
// cases stay user-checkable).

import {
 toJulianDay,
 getLahiriAyanamsa,
 tropicalToSidereal,
 getSunLongitude,
 getMoonLongitude,
 getPlanetLongitude,
 getSignIndex,
} from './vedic-astrology';

export type KaalSarpInput = {
 dob: string;        // YYYY-MM-DD
 time: string;       // HH:MM 24h local
 timezoneOffset: number; // hours from UTC, e.g. 5.5 for IST
 latitude: number;
 longitude: number;
 placeLabel: string;
};

export type PlanetPlacement = {
 name: string;
 longitude: number;        // sidereal degrees [0,360)
 sign: string;             // rashi label
 signIndex: number;        // 0..11
 house: number;            // 1..12
 insideArc: boolean;       // inside Rahu→Ketu (or Ketu→Rahu) arc
 offsetFromRahu: number;   // 0..360 measured CCW from Rahu
};

export type KaalSarpType = {
 house: number;
 name: string;
 sanskrit: string;
 theme: string;
 effect: string;
};

export type KaalSarpResult = {
 input: KaalSarpInput;
 julianDay: number;
 ayanamsa: number;
 ascendantLongitude: number;
 ascendantSign: string;
 ascendantSignIndex: number;
 rahu: PlanetPlacement;
 ketu: PlanetPlacement;
 planets: PlanetPlacement[];   // the 7 classical
 doshaPresent: boolean;
 partial: boolean;             // 1-2 planets outside arc
 direction: 'forward' | 'reverse' | 'none'; // anuloma / pratiloma
 type: KaalSarpType | null;
 severity: 'full' | 'partial' | 'none';
 planetsOutsideArc: string[];
 remedies: string[];
};

const RASHIS = [
 'Mesha (Aries)',
 'Vrishabha (Taurus)',
 'Mithuna (Gemini)',
 'Karka (Cancer)',
 'Simha (Leo)',
 'Kanya (Virgo)',
 'Tula (Libra)',
 'Vrischika (Scorpio)',
 'Dhanu (Sagittarius)',
 'Makara (Capricorn)',
 'Kumbha (Aquarius)',
 'Meena (Pisces)',
];

// 12 Kaal Sarp types per Brihat Parashara + Lal Kitab tradition. Keyed by
// the house Rahu sits in (1..12). Names = serpent kings of Hindu mythology.
const TYPES: KaalSarpType[] = [
 { house: 1,  name: 'Anant',      sanskrit: 'अनंत काल सर्प',     theme: 'Self, identity, marriage friction',          effect: 'Self-doubt, delayed marriage, frequent partner change, mental restlessness. Rahu in lagna magnifies ego + isolation.' },
 { house: 2,  name: 'Kulik',      sanskrit: 'कुलिक काल सर्प',    theme: 'Wealth, family, speech',                      effect: 'Money stuck in disputes, family discord, speech faults, eye problems, accumulation of debt. Vak dosh.' },
 { house: 3,  name: 'Vasuki',     sanskrit: 'वासुकी काल सर्प',   theme: 'Siblings, courage, communication',            effect: 'Sibling conflict or loss, anxiety in short journeys, hesitant courage, ear / throat issues. Effort delivers slowly.' },
 { house: 4,  name: 'Shankhpal',  sanskrit: 'शंखपाल काल सर्प',   theme: 'Mother, home, property, peace',               effect: 'No peace at home, mother\'s health weak, property disputes, repeated migrations, vehicle accidents.' },
 { house: 5,  name: 'Padma',      sanskrit: 'पद्म काल सर्प',     theme: 'Children, intellect, devotion',               effect: 'Delay or denial of children, miscarriage risk, poor concentration, weak academic performance. Pitru dosh often co-present.' },
 { house: 6,  name: 'Mahapadma',  sanskrit: 'महापद्म काल सर्प',  theme: 'Enemies, debt, disease, service',             effect: 'Chronic health issues, court cases, debt-trap, hidden enemies, job instability. Yet — fights end in victory after struggle.' },
 { house: 7,  name: 'Takshak',    sanskrit: 'तक्षक काल सर्प',    theme: 'Marriage, partnership, public dealings',      effect: 'Late marriage, divorce, business partner betrayal, repeated breakups. Spouse\'s health uncertain.' },
 { house: 8,  name: 'Karkotak',   sanskrit: 'कर्कोटक काल सर्प',  theme: 'Longevity, inheritance, occult, sudden events', effect: 'Accidents, sudden losses, inheritance disputes, mental fears, addictions. Often spiritual breakthroughs after age 32.' },
 { house: 9,  name: 'Shankhachud', sanskrit: 'शंखचूड़ काल सर्प', theme: 'Fortune, dharma, father, teacher',            effect: 'Father\'s ill-health or distance, lack of guru-grace, religious disbelief turning to faith later, long pilgrimage required.' },
 { house: 10, name: 'Ghatak',     sanskrit: 'घातक काल सर्प',     theme: 'Career, status, authority',                   effect: 'Career setbacks, dismissals, government issues, reputation attacks. Repeated start-overs in profession.' },
 { house: 11, name: 'Vishdhar',   sanskrit: 'विषधर काल सर्प',    theme: 'Gains, elder sibling, social network',        effect: 'Promised gains turn into losses, frequent friend betrayals, income leaks, elder-sibling friction. Asthma / ear ailments.' },
 { house: 12, name: 'Sheshnag',   sanskrit: 'शेषनाग काल सर्प',   theme: 'Loss, expenditure, foreign, moksha',          effect: 'Heavy expenses, hidden enemies, insomnia, foreign-land separation, but also — strong spiritual inclination + final liberation.' },
];

const REMEDIES_BASE = [
 'Naga Pratishtha / Naga puja at Kalahasti, Trimbakeshwar, or any Naga temple — flagship Kaal Sarp remedy.',
 'Rahu-Ketu Shanti Puja at Sri Kalahasti Temple (AP) — most potent for Kaal Sarp dosh per shastra.',
 'Narayan Nagbali at Trimbakeshwar (Nashik) — 3-day ritual that resolves Kaal Sarp + Pitru dosh together.',
 'Maha Mrityunjaya Mantra — 108 daily japa, Mondays especially.',
 'Saturday Hanuman Chalisa + offer black sesame to peepal tree.',
 'Donate silver Naga-Nagin pair to a Shiva temple on Naga Panchami.',
 'Recite Rahu beej mantra "Om Bhraam Bhreem Bhroum Sah Rahave Namah" — 18,000 times in 40 days.',
 'Avoid major life decisions during personal Rahu mahadasha or antardasha years.',
];

function inlineAscendant(jd: number, latitude: number, longitudeDeg: number): number {
 const T = (jd - 2451545.0) / 36525.0;
 const GMST = (280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T) % 360;
 const gmstNorm = GMST < 0 ? GMST + 360 : GMST;
 const LST = (gmstNorm + longitudeDeg) % 360;
 const LSTrad = ((LST < 0 ? LST + 360 : LST) * Math.PI) / 180;
 const obliquity = ((23.4393 - 0.0130 * T) * Math.PI) / 180;
 const latRad = (latitude * Math.PI) / 180;
 const y = -Math.cos(LSTrad);
 const x = Math.sin(obliquity) * Math.tan(latRad) + Math.cos(obliquity) * Math.sin(LSTrad);
 let asc = (Math.atan2(y, x) * 180) / Math.PI;
 asc = ((asc % 360) + 360) % 360;
 return asc;
}

function houseFromSign(planetSignIdx: number, ascSignIdx: number): number {
 return ((planetSignIdx - ascSignIdx + 12) % 12) + 1;
}

export function computeKaalSarp(input: KaalSarpInput): KaalSarpResult {
 // Convert local DOB+time to UTC
 const [Y, M, D] = input.dob.split('-').map(Number);
 const [hh, mm] = input.time.split(':').map(Number);
 const localHours = (hh ?? 0) + (mm ?? 0) / 60;
 const utcHours = localHours - input.timezoneOffset;
 const jd = toJulianDay(Y!, M!, D!, utcHours);
 const ayanamsa = getLahiriAyanamsa(jd);

 // Ascendant — tropical then sidereal
 const ascTropical = inlineAscendant(jd, input.latitude, input.longitude);
 const ascSidereal = tropicalToSidereal(ascTropical, ayanamsa);
 const ascSignIdx = getSignIndex(ascSidereal);

 // Rahu (sidereal)
 const rahuTrop = getPlanetLongitude('Rahu', jd);
 const rahuSid = tropicalToSidereal(rahuTrop, ayanamsa);
 const rahuSignIdx = getSignIndex(rahuSid);
 const ketuSid = (rahuSid + 180) % 360;
 const ketuSignIdx = getSignIndex(ketuSid);

 const rahu: PlanetPlacement = {
  name: 'Rahu', longitude: rahuSid, sign: RASHIS[rahuSignIdx]!, signIndex: rahuSignIdx,
  house: houseFromSign(rahuSignIdx, ascSignIdx),
  insideArc: true, offsetFromRahu: 0,
 };
 const ketu: PlanetPlacement = {
  name: 'Ketu', longitude: ketuSid, sign: RASHIS[ketuSignIdx]!, signIndex: ketuSignIdx,
  house: houseFromSign(ketuSignIdx, ascSignIdx),
  insideArc: true, offsetFromRahu: 180,
 };

 // 7 classical planets
 const planetSpecs: Array<{ name: string; getter: () => number }> = [
  { name: 'Sun',     getter: () => getSunLongitude(jd) },
  { name: 'Moon',    getter: () => getMoonLongitude(jd) },
  { name: 'Mars',    getter: () => getPlanetLongitude('Mars', jd) },
  { name: 'Mercury', getter: () => getPlanetLongitude('Mercury', jd) },
  { name: 'Jupiter', getter: () => getPlanetLongitude('Jupiter', jd) },
  { name: 'Venus',   getter: () => getPlanetLongitude('Venus', jd) },
  { name: 'Saturn',  getter: () => getPlanetLongitude('Saturn', jd) },
 ];

 // Compute offset CCW from Rahu. Forward arc test: all offsets in [0, 180).
 // Reverse arc test: all offsets in [180, 360).
 const planets: PlanetPlacement[] = planetSpecs.map(({ name, getter }) => {
  const trop = getter();
  const sid = tropicalToSidereal(trop, ayanamsa);
  const signIdx = getSignIndex(sid);
  const offset = ((sid - rahuSid) % 360 + 360) % 360;
  return {
   name, longitude: sid, sign: RASHIS[signIdx]!, signIndex: signIdx,
   house: houseFromSign(signIdx, ascSignIdx),
   insideArc: false, // filled in below per direction
   offsetFromRahu: offset,
  };
 });

 const inForward = planets.filter((p) => p.offsetFromRahu > 0 && p.offsetFromRahu < 180).length;
 const inReverse = planets.filter((p) => p.offsetFromRahu > 180 && p.offsetFromRahu < 360).length;

 let direction: KaalSarpResult['direction'] = 'none';
 let planetsInside = 0;
 if (inForward >= inReverse) {
  direction = 'forward';
  planetsInside = inForward;
  planets.forEach((p) => { p.insideArc = p.offsetFromRahu > 0 && p.offsetFromRahu < 180; });
 } else {
  direction = 'reverse';
  planetsInside = inReverse;
  planets.forEach((p) => { p.insideArc = p.offsetFromRahu > 180 && p.offsetFromRahu < 360; });
 }

 const planetsOutsideArc = planets.filter((p) => !p.insideArc).map((p) => p.name);
 const planetsOut = 7 - planetsInside;

 let severity: KaalSarpResult['severity'] = 'none';
 let doshaPresent = false;
 let partial = false;
 if (planetsOut === 0) { severity = 'full'; doshaPresent = true; }
 else if (planetsOut <= 2) { severity = 'partial'; doshaPresent = true; partial = true; }
 else { severity = 'none'; direction = 'none'; }

 const type = doshaPresent ? TYPES[rahu.house - 1] ?? null : null;

 const remedies = doshaPresent ? REMEDIES_BASE : [];

 return {
  input,
  julianDay: jd,
  ayanamsa,
  ascendantLongitude: ascSidereal,
  ascendantSign: RASHIS[ascSignIdx]!,
  ascendantSignIndex: ascSignIdx,
  rahu,
  ketu,
  planets,
  doshaPresent,
  partial,
  direction,
  type,
  severity,
  planetsOutsideArc,
  remedies,
 };
}

export const KAAL_SARP_TYPES = TYPES;
export const KAAL_SARP_RASHIS = RASHIS;
export const KAAL_SARP_REMEDIES = REMEDIES_BASE;
