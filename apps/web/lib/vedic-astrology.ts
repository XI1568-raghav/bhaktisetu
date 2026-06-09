// ─── Vedic Astrology Calculation Engine ──────────────────────────────────────
// Client-side sidereal (Lahiri ayanamsa) planetary position calculator.
// Uses simplified astronomical algorithms suitable for birth chart generation.
// Accuracy: ~1-2 degrees for Sun/Moon, approximate for other planets.

// ─── Constants ───────────────────────────────────────────────────────────────

const SIGNS = [
 'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

const SIGNS_HINDI = [
 'मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या',
 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुम्भ', 'मीन',
] as const;

const SIGN_SYMBOLS = [
 '', '', '', '', '', '',
 '', '', '', '', '', '',
] as const;

const NAKSHATRAS = [
 'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha',
 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
] as const;

const NAKSHATRAS_HINDI = [
 'अश्विनी', 'भरणी', 'कृत्तिका', 'रोहिणी', 'मृगशिरा', 'आर्द्रा',
 'पुनर्वसु', 'पुष्य', 'आश्लेषा', 'मघा', 'पूर्वा फाल्गुनी', 'उत्तरा फाल्गुनी',
 'हस्त', 'चित्रा', 'स्वाति', 'विशाखा', 'अनुराधा', 'ज्येष्ठा',
 'मूल', 'पूर्वाषाढ़ा', 'उत्तराषाढ़ा', 'श्रवण', 'धनिष्ठा', 'शतभिषा',
 'पूर्वाभाद्रपद', 'उत्तराभाद्रपद', 'रेवती',
] as const;

// Nakshatra ruling planets for Vimshottari Dasha (in order)
const NAKSHATRA_LORDS = [
 'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu',
 'Jupiter', 'Saturn', 'Mercury', 'Ketu', 'Venus', 'Sun',
 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
 'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu',
 'Jupiter', 'Saturn', 'Mercury',
] as const;

// Vimshottari Dasha periods in years
const DASHA_YEARS: Record<string, number> = {
 Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7,
 Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};

// Dasha sequence (total 120 years)
const DASHA_SEQUENCE = [
 'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
] as const;

// Planet data: name, hindi, mean daily motion (approx degrees/day)
const PLANET_NAMES = {
 Sun: { hindi: 'सूर्य', english: 'Sun (Surya)' },
 Moon: { hindi: 'चन्द्र', english: 'Moon (Chandra)' },
 Mars: { hindi: 'मंगल', english: 'Mars (Mangal)' },
 Mercury: { hindi: 'बुध', english: 'Mercury (Budh)' },
 Jupiter: { hindi: 'गुरु', english: 'Jupiter (Guru)' },
 Venus: { hindi: 'शुक्र', english: 'Venus (Shukra)' },
 Saturn: { hindi: 'शनि', english: 'Saturn (Shani)' },
 Rahu: { hindi: 'राहु', english: 'Rahu' },
 Ketu: { hindi: 'केतु', english: 'Ketu' },
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlanetPosition {
 planet: string;
 planetHindi: string;
 longitude: number; // sidereal longitude in degrees
 sign: string;
 signHindi: string;
 signSymbol: string;
 house: number; // 1-12
 degree: string; // formatted degree within sign
 nakshatra: string;
 nakshatraHindi: string;
 nakshatraPada: number; // 1-4
 status: 'Exalted' | 'Debilitated' | 'Own Sign' | 'Friendly' | 'Neutral' | 'Enemy';
 isRetrograde: boolean;
}

export interface HouseInfo {
 house: number;
 sign: string;
 signHindi: string;
 signSymbol: string;
 planets: string[];
}

export interface DashaPeriod {
 planet: string;
 planetHindi: string;
 startDate: string;
 endDate: string;
 years: number;
 isCurrent: boolean;
}

export interface DoshaInfo {
 name: string;
 nameHindi: string;
 present: boolean;
 description: string;
 severity: 'None' | 'Mild' | 'Moderate' | 'Strong';
 remedy: string;
}

export interface NavamsaHouse {
 house: number; // 1-12, indexed from D9 ascendant
 sign: string;
 signHindi: string;
 signSymbol: string;
 planets: string[];
}

export interface BhuktiPeriod {
 mahadashaPlanet: string;
 mahadashaPlanetHindi: string;
 bhuktiPlanet: string;
 bhuktiPlanetHindi: string;
 startDate: string;
 endDate: string;
 days: number;
}

export interface KundliData {
 name: string;
 birthDate: string;
 birthTime: string;
 birthPlace: string;
 rashi: string;
 rashiHindi: string;
 rashiSymbol: string;
 nakshatra: string;
 nakshatraHindi: string;
 nakshatraPada: number;
 ascendant: string;
 ascendantHindi: string;
 ascendantSymbol: string;
 moonSign: string;
 moonSignHindi: string;
 sunSign: string;
 sunSignHindi: string;
 planetaryPositions: PlanetPosition[];
 houses: HouseInfo[];
 navamsa: NavamsaHouse[];
 dashas: DashaPeriod[];
 currentBhukti: BhuktiPeriod | null;
 doshas: DoshaInfo[];
 ayanamsa: number;
}

// ─── Julian Day Number ───────────────────────────────────────────────────────

export function toJulianDay(year: number, month: number, day: number, hour: number): number {
 // Convert to Julian Day Number using the standard algorithm
 let y = year;
 let m = month;
 if (m <= 2) {
 y -= 1;
 m += 12;
 }
 const A = Math.floor(y / 100);
 const B = 2 - A + Math.floor(A / 4);
 return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + hour / 24 + B - 1524.5;
}

// ─── Lahiri Ayanamsa ─────────────────────────────────────────────────────────

export function getLahiriAyanamsa(jd: number): number {
 // Lahiri ayanamsa. Reference: Indian Astronomical Ephemeris J2000.0 = 23°51'11.5" = 23.85320°.
 // Precession rate ≈ 50.2564 arcsec/year → 5025.64 arcsec/century when T is in centuries.
 // Prior version had unit bug (50.2564 with T-in-centuries → 100× too slow); fixed 2026-06-02.
 const T = (jd - 2451545.0) / 36525.0; // Julian centuries from J2000
 const ayanamsa = 23.85320 + (5025.64 * T + 1.11 * T * T) / 3600;
 return ayanamsa;
}

// ─── Tropical to Sidereal Conversion ─────────────────────────────────────────

export function tropicalToSidereal(tropicalLong: number, ayanamsa: number): number {
 let sidereal = tropicalLong - ayanamsa;
 if (sidereal < 0) sidereal += 360;
 if (sidereal >= 360) sidereal -= 360;
 return sidereal;
}

// ─── Normalize Degrees ───────────────────────────────────────────────────────

function normalizeDeg(deg: number): number {
 let d = deg % 360;
 if (d < 0) d += 360;
 return d;
}

// ─── Sun Position (simplified) ───────────────────────────────────────────────

export function getSunLongitude(jd: number): number {
 const T = (jd - 2451545.0) / 36525.0;
 // Mean longitude
 const L0 = normalizeDeg(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
 // Mean anomaly
 const M = normalizeDeg(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
 const Mrad = M * Math.PI / 180;
 // Equation of center
 const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad)
 + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad)
 + 0.000289 * Math.sin(3 * Mrad);
 // True longitude
 const sunLong = normalizeDeg(L0 + C);
 return sunLong;
}

// ─── Moon Position (simplified) ──────────────────────────────────────────────

export function getMoonLongitude(jd: number): number {
 const T = (jd - 2451545.0) / 36525.0;
 // Mean longitude
 const Lp = normalizeDeg(218.3165 + 481267.8813 * T);
 // Mean anomaly
 const M = normalizeDeg(134.9634 + 477198.8676 * T);
 const Mrad = M * Math.PI / 180;
 // Mean elongation
 const D = normalizeDeg(297.8502 + 445267.1115 * T);
 const Drad = D * Math.PI / 180;
 // Mean anomaly of Sun
 const Ms = normalizeDeg(357.5291 + 35999.0503 * T);
 const Msrad = Ms * Math.PI / 180;
 // Argument of latitude
 const F = normalizeDeg(93.2720 + 483202.0175 * T);
 const Frad = F * Math.PI / 180;

 // Principal perturbation terms
 let moonLong = Lp
 + 6.289 * Math.sin(Mrad)
 + 1.274 * Math.sin(2 * Drad - Mrad)
 + 0.658 * Math.sin(2 * Drad)
 + 0.214 * Math.sin(2 * Mrad)
 - 0.186 * Math.sin(Msrad)
 - 0.114 * Math.sin(2 * Frad);

 return normalizeDeg(moonLong);
}

// ─── Planetary Longitudes (simplified orbital elements) ──────────────────────

export function getPlanetLongitude(planet: string, jd: number): number {
 const T = (jd - 2451545.0) / 36525.0;

 // Simplified mean longitudes and periods
 switch (planet) {
 case 'Mars': {
 const L = normalizeDeg(355.433 + 19140.2993 * T);
 const M = normalizeDeg(19.373 + 19139.8585 * T);
 const Mrad = M * Math.PI / 180;
 return normalizeDeg(L + 6.419 * Math.sin(Mrad) + 0.411 * Math.sin(2 * Mrad));
 }
 case 'Mercury': {
 // Geocentric Mercury via elongation arc around Sun (max ~23°).
 const helio = normalizeDeg(252.250906 + 149472.6746358 * T);
 const sun = getSunLongitude(jd);
 const earthHelio = normalizeDeg(sun + 180);
 const phase = normalizeDeg(helio - earthHelio) * Math.PI / 180;
 return normalizeDeg(sun + 23 * Math.sin(phase));
 }
 case 'Jupiter': {
 const L = normalizeDeg(34.351 + 3034.9057 * T);
 const M = normalizeDeg(20.020 + 3034.6872 * T);
 const Mrad = M * Math.PI / 180;
 return normalizeDeg(L + 5.555 * Math.sin(Mrad) + 0.168 * Math.sin(2 * Mrad));
 }
 case 'Venus': {
 // Geocentric Venus via elongation arc around Sun (max ~45°).
 const helio = normalizeDeg(181.979801 + 58517.8156760 * T);
 const sun = getSunLongitude(jd);
 const earthHelio = normalizeDeg(sun + 180);
 const phase = normalizeDeg(helio - earthHelio) * Math.PI / 180;
 return normalizeDeg(sun + 45 * Math.sin(phase));
 }
 case 'Saturn': {
 const L = normalizeDeg(50.077 + 1222.1138 * T);
 const M = normalizeDeg(317.020 + 1222.1116 * T);
 const Mrad = M * Math.PI / 180;
 return normalizeDeg(L + 6.406 * Math.sin(Mrad) + 0.316 * Math.sin(2 * Mrad));
 }
 case 'Rahu': {
 // Mean North Node of Moon — moves retrograde
 return normalizeDeg(125.044 - 1934.1362 * T);
 }
 case 'Ketu': {
 // Ketu is always 180 degrees from Rahu
 return normalizeDeg(125.044 - 1934.1362 * T + 180);
 }
 default:
 return 0;
 }
}

// ─── Ascendant (Lagna) Calculation ───────────────────────────────────────────

function getAscendant(jd: number, latitude: number, longitude: number): number {
 // Local Sidereal Time
 const T = (jd - 2451545.0) / 36525.0;
 const GMST = normalizeDeg(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T);
 const LST = normalizeDeg(GMST + longitude);
 const LSTrad = LST * Math.PI / 180;

 // Obliquity of ecliptic
 const obliquity = (23.4393 - 0.0130 * T) * Math.PI / 180;
 const latRad = latitude * Math.PI / 180;

 // Ascendant formula
 const y = -Math.cos(LSTrad);
 const x = Math.sin(obliquity) * Math.tan(latRad) + Math.cos(obliquity) * Math.sin(LSTrad);
 let ascendant = Math.atan2(y, x) * 180 / Math.PI;
 ascendant = normalizeDeg(ascendant);

 return ascendant;
}

// ─── Sign from Longitude ─────────────────────────────────────────────────────

export function getSignIndex(longitude: number): number {
 return Math.floor(longitude / 30) % 12;
}

function getDegreeInSign(longitude: number): { degrees: number; minutes: number } {
 const posInSign = longitude % 30;
 const degrees = Math.floor(posInSign);
 const minutes = Math.floor((posInSign - degrees) * 60);
 return { degrees, minutes };
}

function formatDegree(longitude: number): string {
 const { degrees, minutes } = getDegreeInSign(longitude);
 return `${degrees}° ${minutes}'`;
}

// ─── Nakshatra from Moon Longitude ───────────────────────────────────────────

function getNakshatraIndex(moonLong: number): number {
 // Each nakshatra spans 13°20' = 13.3333°
 return Math.floor(moonLong / (360 / 27)) % 27;
}

function getNakshatraPada(moonLong: number): number {
 // Each pada spans 3°20' = 3.3333°
 const nakshatraSpan = 360 / 27;
 const posInNakshatra = moonLong % nakshatraSpan;
 return Math.floor(posInNakshatra / (nakshatraSpan / 4)) + 1;
}

// ─── Planet Status (Dignity) ─────────────────────────────────────────────────

function getPlanetStatus(planet: string, signIndex: number): PlanetPosition['status'] {
 const sign = SIGNS[signIndex]!;

 // Exaltation signs
 const exaltation: Record<string, string> = {
 Sun: 'Aries', Moon: 'Taurus', Mars: 'Capricorn', Mercury: 'Virgo',
 Jupiter: 'Cancer', Venus: 'Pisces', Saturn: 'Libra',
 };

 // Debilitation signs (opposite of exaltation)
 const debilitation: Record<string, string> = {
 Sun: 'Libra', Moon: 'Scorpio', Mars: 'Cancer', Mercury: 'Pisces',
 Jupiter: 'Capricorn', Venus: 'Virgo', Saturn: 'Aries',
 };

 // Own signs (rulership)
 const ownSigns: Record<string, string[]> = {
 Sun: ['Leo'], Moon: ['Cancer'], Mars: ['Aries', 'Scorpio'],
 Mercury: ['Gemini', 'Virgo'], Jupiter: ['Sagittarius', 'Pisces'],
 Venus: ['Taurus', 'Libra'], Saturn: ['Capricorn', 'Aquarius'],
 Rahu: ['Aquarius'], Ketu: ['Scorpio'],
 };

 // Friendly signs
 const friendly: Record<string, string[]> = {
 Sun: ['Aries', 'Sagittarius', 'Cancer', 'Scorpio', 'Pisces'],
 Moon: ['Taurus', 'Cancer', 'Gemini', 'Virgo', 'Leo'],
 Mars: ['Leo', 'Sagittarius', 'Pisces', 'Cancer'],
 Mercury: ['Taurus', 'Leo', 'Libra', 'Aquarius'],
 Jupiter: ['Aries', 'Leo', 'Scorpio', 'Cancer'],
 Venus: ['Gemini', 'Virgo', 'Capricorn', 'Aquarius'],
 Saturn: ['Taurus', 'Gemini', 'Virgo', 'Libra'],
 };

 if (exaltation[planet] === sign) return 'Exalted';
 if (debilitation[planet] === sign) return 'Debilitated';
 if (ownSigns[planet]?.includes(sign)) return 'Own Sign';
 if (friendly[planet]?.includes(sign)) return 'Friendly';
 return 'Neutral';
}

// ─── Retrograde Check (simplified) ───────────────────────────────────────────

function isRetrograde(planet: string, jd: number): boolean {
 // Check if planet appears to move backward by comparing positions
 // 1 day apart
 if (planet === 'Sun' || planet === 'Moon' || planet === 'Rahu' || planet === 'Ketu') return false;
 const long1 = getPlanetLongitude(planet, jd - 0.5);
 const long2 = getPlanetLongitude(planet, jd + 0.5);
 let diff = long2 - long1;
 if (diff > 180) diff -= 360;
 if (diff < -180) diff += 360;
 return diff < 0;
}

// ─── Vimshottari Dasha Calculation ───────────────────────────────────────────

function calculateDashas(moonLong: number, birthJD: number): DashaPeriod[] {
 const nakshatraIndex = getNakshatraIndex(moonLong);
 const nakshatraLord = NAKSHATRA_LORDS[nakshatraIndex]!;

 // How far into the nakshatra the Moon has progressed (0-1 fraction)
 const nakshatraSpan = 360 / 27;
 const progressInNakshatra = (moonLong % nakshatraSpan) / nakshatraSpan;

 // Find starting dasha lord index in sequence
 const lordIndex = DASHA_SEQUENCE.indexOf(nakshatraLord as typeof DASHA_SEQUENCE[number]);

 // Balance of first dasha = (1 - progress) * total dasha years
 const firstDashaYears = DASHA_YEARS[nakshatraLord]!;
 const balance = (1 - progressInNakshatra) * firstDashaYears;

 const dashas: DashaPeriod[] = [];
 const now = new Date();
 const nowJD = toJulianDay(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours() / 24);

 // Convert JD to Date
 function jdToDate(jd: number): Date {
 const z = Math.floor(jd + 0.5);
 const f = jd + 0.5 - z;
 let A: number;
 if (z < 2299161) {
 A = z;
 } else {
 const alpha = Math.floor((z - 1867216.25) / 36524.25);
 A = z + 1 + alpha - Math.floor(alpha / 4);
 }
 const B = A + 1524;
 const C = Math.floor((B - 122.1) / 365.25);
 const D = Math.floor(365.25 * C);
 const E = Math.floor((B - D) / 30.6001);
 const day = B - D - Math.floor(30.6001 * E) + f;
 const month = E < 14 ? E - 1 : E - 13;
 const year = month > 2 ? C - 4716 : C - 4715;
 return new Date(year, month - 1, Math.floor(day));
 }

 let currentJD = birthJD;

 // First dasha (partial)
 const firstEndJD = currentJD + balance * 365.25;
 const firstPlanet = DASHA_SEQUENCE[lordIndex]!;
 dashas.push({
 planet: firstPlanet,
 planetHindi: PLANET_NAMES[firstPlanet as keyof typeof PLANET_NAMES]?.hindi || firstPlanet,
 startDate: formatDate(jdToDate(currentJD)),
 endDate: formatDate(jdToDate(firstEndJD)),
 years: Math.round(balance * 10) / 10,
 isCurrent: nowJD >= currentJD && nowJD < firstEndJD,
 });
 currentJD = firstEndJD;

 // Remaining dashas
 for (let i = 1; i < 9; i++) {
 const idx = (lordIndex + i) % 9;
 const planet = DASHA_SEQUENCE[idx]!;
 const years = DASHA_YEARS[planet]!;
 const endJD = currentJD + years * 365.25;
 dashas.push({
 planet,
 planetHindi: PLANET_NAMES[planet as keyof typeof PLANET_NAMES]?.hindi || planet,
 startDate: formatDate(jdToDate(currentJD)),
 endDate: formatDate(jdToDate(endJD)),
 years,
 isCurrent: nowJD >= currentJD && nowJD < endJD,
 });
 currentJD = endJD;
 }

 return dashas;
}

function formatDate(d: Date): string {
 return d.toISOString().split('T')[0]!;
}

// ─── Dosha Detection ─────────────────────────────────────────────────────────

function detectDoshas(positions: PlanetPosition[], houses: HouseInfo[]): DoshaInfo[] {
 const doshas: DoshaInfo[] = [];

 // 1. Manglik Dosha (Mars in 1, 2, 4, 7, 8, or 12 house)
 const marsPos = positions.find(p => p.planet.includes('Mars'));
 if (marsPos) {
 const manglikHouses = [1, 2, 4, 7, 8, 12];
 const isManglik = manglikHouses.includes(marsPos.house);

 // Cancellation checks
 let cancelled = false;
 let severity: DoshaInfo['severity'] = 'None';
 if (isManglik) {
 severity = 'Strong';
 // Mars in own sign or exalted reduces severity
 if (marsPos.status === 'Own Sign' || marsPos.status === 'Exalted') {
 severity = 'Mild';
 cancelled = true;
 }
 // Mars in 2nd house in Gemini/Virgo cancels
 if (marsPos.house === 2 && (marsPos.sign === 'Gemini' || marsPos.sign === 'Virgo')) {
 severity = 'None';
 cancelled = true;
 }
 }

 doshas.push({
 name: 'Manglik Dosha',
 nameHindi: 'मांगलिक दोष',
 present: isManglik && !cancelled,
 severity: isManglik ? severity : 'None',
 description: isManglik
 ? `Mars is placed in the ${marsPos.house}${getOrdinalSuffix(marsPos.house)} house, indicating Manglik Dosha.${cancelled ? ' However, it is partially cancelled.' : ''}`
 : 'Mars is not in a Manglik-causing house. No Manglik Dosha present.',
 remedy: isManglik
 ? 'Chant Hanuman Chalisa on Tuesdays. Perform Mangal Shanti Puja. Wear a red coral gemstone after consultation.'
 : '',
 });
 }

 // 2. Kaal Sarp Dosha (all planets between Rahu and Ketu)
 const rahuPos = positions.find(p => p.planet.includes('Rahu'));
 const ketuPos = positions.find(p => p.planet.includes('Ketu'));
 if (rahuPos && ketuPos) {
 const rahuLong = rahuPos.longitude;
 const ketuLong = ketuPos.longitude;
 const otherPlanets = positions.filter(p => !p.planet.includes('Rahu') && !p.planet.includes('Ketu'));

 // Check if all planets are on one side of the Rahu-Ketu axis
 let allOnOneSide = true;
 const direction = rahuLong < ketuLong ? 1 : -1;

 for (const p of otherPlanets) {
 const inRange = direction > 0
 ? (p.longitude >= rahuLong && p.longitude <= ketuLong)
 : (p.longitude >= ketuLong || p.longitude <= rahuLong);
 // For simplicity, check if they're hemmed between Rahu-Ketu
 if (!isLongBetween(p.longitude, rahuLong, ketuLong)) {
 allOnOneSide = false;
 break;
 }
 }

 doshas.push({
 name: 'Kaal Sarp Dosha',
 nameHindi: 'काल सर्प दोष',
 present: allOnOneSide,
 severity: allOnOneSide ? 'Moderate' : 'None',
 description: allOnOneSide
 ? 'All planets are hemmed between Rahu and Ketu, indicating Kaal Sarp Dosha. This can cause delays and obstacles in various life areas.'
 : 'Planets are not confined between the Rahu-Ketu axis. No Kaal Sarp Dosha.',
 remedy: allOnOneSide
 ? 'Perform Kaal Sarp Dosha Nivaran Puja at Trimbakeshwar or Ujjain. Chant Rahu mantra on Saturdays.'
 : '',
 });
 }

 // 3. Sade Sati check (Saturn transiting over natal Moon +/- 1 sign)
 const moonPos = positions.find(p => p.planet.includes('Moon'));
 const saturnPos = positions.find(p => p.planet.includes('Saturn'));
 if (moonPos && saturnPos) {
 const moonSignIdx = getSignIndex(moonPos.longitude);
 const saturnSignIdx = getSignIndex(saturnPos.longitude);
 const diff = Math.abs(moonSignIdx - saturnSignIdx);
 const isSadeSati = diff <= 1 || diff >= 11;

 doshas.push({
 name: 'Sade Sati',
 nameHindi: 'साढ़े साती',
 present: isSadeSati,
 severity: isSadeSati ? 'Moderate' : 'None',
 description: isSadeSati
 ? 'Saturn is transiting near your natal Moon sign, indicating the Sade Sati period. This is a period of transformation and life lessons.'
 : 'Saturn is not near your Moon sign. Sade Sati is not active in the birth chart.',
 remedy: isSadeSati
 ? 'Worship Lord Shani on Saturdays. Light a sesame oil lamp. Chant "Om Sham Shanicharaya Namah" 108 times.'
 : '',
 });
 }

 // 4. Pitra Dosha (Sun afflicted by Rahu/Ketu)
 const sunPos = positions.find(p => p.planet.includes('Sun'));
 if (sunPos && rahuPos && ketuPos) {
 const sunRahuConj = Math.abs(sunPos.longitude - rahuPos.longitude) < 15 || Math.abs(sunPos.longitude - rahuPos.longitude) > 345;
 const sunKetuConj = Math.abs(sunPos.longitude - ketuPos.longitude) < 15 || Math.abs(sunPos.longitude - ketuPos.longitude) > 345;

 const hasPitrDosha = sunRahuConj || sunKetuConj;

 doshas.push({
 name: 'Pitra Dosha',
 nameHindi: 'पितृ दोष',
 present: hasPitrDosha,
 severity: hasPitrDosha ? 'Mild' : 'None',
 description: hasPitrDosha
 ? `Sun is conjunct with ${sunRahuConj ? 'Rahu' : 'Ketu'}, indicating Pitra Dosha. Ancestral karmic debts may cause obstacles.`
 : 'No affliction on the Sun by Rahu or Ketu. No significant Pitra Dosha.',
 remedy: hasPitrDosha
 ? 'Perform Pitra Tarpan during Pitru Paksha. Offer food to Brahmins and feed crows on Amavasya.'
 : '',
 });
 }

 return doshas;
}

function isLongBetween(long: number, from: number, to: number): boolean {
 if (from <= to) {
 return long >= from && long <= to;
 }
 return long >= from || long <= to;
}

function getOrdinalSuffix(n: number): string {
 if (n === 1) return 'st';
 if (n === 2) return 'nd';
 if (n === 3) return 'rd';
 return 'th';
}

// ─── City Coordinates (common Indian cities) ─────────────────────────────────

interface CityCoords {
 lat: number;
 lng: number;
 timezone: number; // UTC offset in hours
}

const CITY_COORDS: Record<string, CityCoords> = {
 'delhi': { lat: 28.6139, lng: 77.2090, timezone: 5.5 },
 'new delhi': { lat: 28.6139, lng: 77.2090, timezone: 5.5 },
 'mumbai': { lat: 19.0760, lng: 72.8777, timezone: 5.5 },
 'bombay': { lat: 19.0760, lng: 72.8777, timezone: 5.5 },
 'kolkata': { lat: 22.5726, lng: 88.3639, timezone: 5.5 },
 'calcutta': { lat: 22.5726, lng: 88.3639, timezone: 5.5 },
 'chennai': { lat: 13.0827, lng: 80.2707, timezone: 5.5 },
 'madras': { lat: 13.0827, lng: 80.2707, timezone: 5.5 },
 'bangalore': { lat: 12.9716, lng: 77.5946, timezone: 5.5 },
 'bengaluru': { lat: 12.9716, lng: 77.5946, timezone: 5.5 },
 'hyderabad': { lat: 17.3850, lng: 78.4867, timezone: 5.5 },
 'ahmedabad': { lat: 23.0225, lng: 72.5714, timezone: 5.5 },
 'pune': { lat: 18.5204, lng: 73.8567, timezone: 5.5 },
 'jaipur': { lat: 26.9124, lng: 75.7873, timezone: 5.5 },
 'lucknow': { lat: 26.8467, lng: 80.9462, timezone: 5.5 },
 'kanpur': { lat: 26.4499, lng: 80.3319, timezone: 5.5 },
 'nagpur': { lat: 21.1458, lng: 79.0882, timezone: 5.5 },
 'indore': { lat: 22.7196, lng: 75.8577, timezone: 5.5 },
 'bhopal': { lat: 23.2599, lng: 77.4126, timezone: 5.5 },
 'varanasi': { lat: 25.3176, lng: 83.0062, timezone: 5.5 },
 'banaras': { lat: 25.3176, lng: 83.0062, timezone: 5.5 },
 'patna': { lat: 25.6093, lng: 85.1376, timezone: 5.5 },
 'chandigarh': { lat: 30.7333, lng: 76.7794, timezone: 5.5 },
 'surat': { lat: 21.1702, lng: 72.8311, timezone: 5.5 },
 'coimbatore': { lat: 11.0168, lng: 76.9558, timezone: 5.5 },
 'kochi': { lat: 9.9312, lng: 76.2673, timezone: 5.5 },
 'thiruvananthapuram': { lat: 8.5241, lng: 76.9366, timezone: 5.5 },
 'dehradun': { lat: 30.3165, lng: 78.0322, timezone: 5.5 },
 'rishikesh': { lat: 30.0869, lng: 78.2676, timezone: 5.5 },
 'haridwar': { lat: 29.9457, lng: 78.1642, timezone: 5.5 },
 'ujjain': { lat: 23.1793, lng: 75.7849, timezone: 5.5 },
 'nashik': { lat: 20.0063, lng: 73.7898, timezone: 5.5 },
 'amritsar': { lat: 31.6340, lng: 74.8723, timezone: 5.5 },
 'guwahati': { lat: 26.1445, lng: 91.7362, timezone: 5.5 },
 'agra': { lat: 27.1767, lng: 78.0081, timezone: 5.5 },
 'mathura': { lat: 27.4924, lng: 77.6737, timezone: 5.5 },
 'vrindavan': { lat: 27.5755, lng: 77.7013, timezone: 5.5 },
 'ayodhya': { lat: 26.7997, lng: 82.2041, timezone: 5.5 },
 'puri': { lat: 19.8135, lng: 85.8312, timezone: 5.5 },
 'tirupati': { lat: 13.6288, lng: 79.4192, timezone: 5.5 },
 'dwarka': { lat: 22.2394, lng: 68.9678, timezone: 5.5 },
 'goa': { lat: 15.2993, lng: 74.1240, timezone: 5.5 },
 'shimla': { lat: 31.1048, lng: 77.1734, timezone: 5.5 },
 'manali': { lat: 32.2396, lng: 77.1887, timezone: 5.5 },
 'srinagar': { lat: 34.0837, lng: 74.7973, timezone: 5.5 },
 'ranchi': { lat: 23.3441, lng: 85.3096, timezone: 5.5 },
 'raipur': { lat: 21.2514, lng: 81.6296, timezone: 5.5 },
 'bhubaneswar': { lat: 20.2961, lng: 85.8245, timezone: 5.5 },
 'mysore': { lat: 12.2958, lng: 76.6394, timezone: 5.5 },
 'mysuru': { lat: 12.2958, lng: 76.6394, timezone: 5.5 },
 'madurai': { lat: 9.9252, lng: 78.1198, timezone: 5.5 },
 // International
 'london': { lat: 51.5074, lng: -0.1278, timezone: 0 },
 'new york': { lat: 40.7128, lng: -74.0060, timezone: -5 },
 'los angeles': { lat: 34.0522, lng: -118.2437, timezone: -8 },
 'chicago': { lat: 41.8781, lng: -87.6298, timezone: -6 },
 'san francisco': { lat: 37.7749, lng: -122.4194, timezone: -8 },
 'toronto': { lat: 43.6532, lng: -79.3832, timezone: -5 },
 'dubai': { lat: 25.2048, lng: 55.2708, timezone: 4 },
 'singapore': { lat: 1.3521, lng: 103.8198, timezone: 8 },
 'sydney': { lat: -33.8688, lng: 151.2093, timezone: 10 },
 'kathmandu': { lat: 27.7172, lng: 85.3240, timezone: 5.75 },
 'colombo': { lat: 6.9271, lng: 79.8612, timezone: 5.5 },
 'dhaka': { lat: 23.8103, lng: 90.4125, timezone: 6 },
};

function getCityCoordinates(place: string): CityCoords {
 const normalized = place.toLowerCase().trim().replace(/,.*/, '').trim();
 const found = CITY_COORDS[normalized];
 if (found) return found;

 // Try partial match
 for (const [key, val] of Object.entries(CITY_COORDS)) {
 if (normalized.includes(key) || key.includes(normalized)) {
 return val;
 }
 }

 // Default: New Delhi
 return { lat: 28.6139, lng: 77.2090, timezone: 5.5 };
}

// ─── D9 Navamsa Chart ────────────────────────────────────────────────────────
// Parashara rule: each rasi (30°) split into 9 parts of 3°20'. Starting navamsa
// sign depends on rasi nature (movable / fixed / dual). Render in same 12-house
// wheel keyed by D9 ascendant.

function getNavamsaSignIndex(siderealLong: number): number {
 const signIdx0 = Math.floor(siderealLong / 30); // 0..11
 const degInSign = siderealLong - signIdx0 * 30; // 0..30
 const navIdx = Math.floor(degInSign / (30 / 9)); // 0..8
 let startSign: number;
 const sign1 = signIdx0 + 1;
 if (sign1 === 1 || sign1 === 4 || sign1 === 7 || sign1 === 10) {
  startSign = sign1; // movable
 } else if (sign1 === 2 || sign1 === 5 || sign1 === 8 || sign1 === 11) {
  startSign = ((sign1 + 8 - 1) % 12) + 1; // fixed → 9th
 } else {
  startSign = ((sign1 + 4 - 1) % 12) + 1; // dual → 5th
 }
 return (startSign + navIdx - 1 - 1 + 12) % 12; // back to 0..11
}

function buildNavamsa(
 planetLongitudes: Record<string, number>,
 ascSid: number,
): NavamsaHouse[] {
 const ascNavIdx = getNavamsaSignIndex(ascSid);
 const planetNavSigns: Record<string, number> = {};
 for (const [planet, long] of Object.entries(planetLongitudes)) {
  planetNavSigns[planet] = getNavamsaSignIndex(long);
 }
 const houses: NavamsaHouse[] = [];
 for (let i = 0; i < 12; i++) {
  const houseSignIdx = (ascNavIdx + i) % 12;
  const planetsHere: string[] = [];
  for (const [planet, navIdx] of Object.entries(planetNavSigns)) {
   if (navIdx === houseSignIdx) {
    const meta = PLANET_NAMES[planet as keyof typeof PLANET_NAMES];
    planetsHere.push(meta?.english?.split(' (')[0] ?? planet);
   }
  }
  houses.push({
   house: i + 1,
   sign: SIGNS[houseSignIdx]!,
   signHindi: SIGNS_HINDI[houseSignIdx]!,
   signSymbol: SIGN_SYMBOLS[houseSignIdx]!,
   planets: planetsHere,
  });
 }
 return houses;
}

// ─── Vimshottari Bhukti ──────────────────────────────────────────────────────
// Sub-period within current mahadasha. Each bhukti = (mahaYears × bhuktiYears) / 120.

function computeCurrentBhukti(dashas: DashaPeriod[]): BhuktiPeriod | null {
 const current = dashas.find((d) => d.isCurrent);
 if (!current) return null;
 const mahaStart = new Date(current.startDate).getTime();
 const mahaPlanet = current.planet;
 const mahaYears = DASHA_YEARS[mahaPlanet]!;
 const lordIdx = DASHA_SEQUENCE.indexOf(mahaPlanet as typeof DASHA_SEQUENCE[number]);
 const nowMs = Date.now();
 let cursor = mahaStart;
 for (let i = 0; i < 9; i++) {
  const bhuktiPlanet = DASHA_SEQUENCE[(lordIdx + i) % 9]!;
  const bhuktiYears = DASHA_YEARS[bhuktiPlanet]!;
  const bhuktiDays = (mahaYears * bhuktiYears) / 120 * 365.25;
  const endMs = cursor + bhuktiDays * 86400000;
  if (nowMs >= cursor && nowMs < endMs) {
   return {
    mahadashaPlanet: mahaPlanet,
    mahadashaPlanetHindi: current.planetHindi,
    bhuktiPlanet,
    bhuktiPlanetHindi: PLANET_NAMES[bhuktiPlanet as keyof typeof PLANET_NAMES]?.hindi ?? bhuktiPlanet,
    startDate: formatDate(new Date(cursor)),
    endDate: formatDate(new Date(endMs)),
    days: Math.round(bhuktiDays),
   };
  }
  cursor = endMs;
 }
 return null;
}

// ─── Main Calculation Function ───────────────────────────────────────────────

export function calculateKundli(
 name: string,
 birthDate: string, // YYYY-MM-DD
 birthTime: string, // HH:MM
 birthPlace: string,
 /** Direct lat/lng/tz override — bypasses getCityCoordinates() silent New Delhi fallback. */
 coordsOverride?: { lat: number; lng: number; tzOffset: number },
): KundliData {
 // Parse date and time
 const [yearStr, monthStr, dayStr] = birthDate.split('-');
 const [hourStr, minuteStr] = birthTime.split(':');
 const year = parseInt(yearStr!, 10);
 const month = parseInt(monthStr!, 10);
 const day = parseInt(dayStr!, 10);
 const hour = parseInt(hourStr!, 10);
 const minute = parseInt(minuteStr!, 10);

 // Get coordinates — prefer direct override (from CityAutocomplete) over string lookup (fallback-prone).
 const coords = coordsOverride
   ? { latitude: coordsOverride.lat, longitude: coordsOverride.lng, timezone: coordsOverride.tzOffset }
   : getCityCoordinates(birthPlace);

 // Convert local time to UT
 const utHour = hour + minute / 60 - coords.timezone;

 // Calculate Julian Day
 const jd = toJulianDay(year, month, day, utHour);

 // Calculate Ayanamsa
 const ayanamsa = getLahiriAyanamsa(jd);

 // Calculate tropical positions and convert to sidereal
 const sunTrop = getSunLongitude(jd);
 const moonTrop = getMoonLongitude(jd);
 const ascTrop = getAscendant(jd, coords.latitude, coords.longitude);

 const sunSid = tropicalToSidereal(sunTrop, ayanamsa);
 const moonSid = tropicalToSidereal(moonTrop, ayanamsa);
 const ascSid = tropicalToSidereal(ascTrop, ayanamsa);

 // Calculate all planet sidereal longitudes
 const planetLongitudes: Record<string, number> = {
 Sun: sunSid,
 Moon: moonSid,
 Mars: tropicalToSidereal(getPlanetLongitude('Mars', jd), ayanamsa),
 Mercury: tropicalToSidereal(getPlanetLongitude('Mercury', jd), ayanamsa),
 Jupiter: tropicalToSidereal(getPlanetLongitude('Jupiter', jd), ayanamsa),
 Venus: tropicalToSidereal(getPlanetLongitude('Venus', jd), ayanamsa),
 Saturn: tropicalToSidereal(getPlanetLongitude('Saturn', jd), ayanamsa),
 Rahu: tropicalToSidereal(getPlanetLongitude('Rahu', jd), ayanamsa),
 Ketu: tropicalToSidereal(getPlanetLongitude('Ketu', jd), ayanamsa),
 };

 // Ascendant sign index determines house assignment
 const ascSignIndex = getSignIndex(ascSid);

 // Build planetary positions
 const planetaryPositions: PlanetPosition[] = Object.entries(planetLongitudes).map(([planet, long]) => {
 const signIdx = getSignIndex(long);
 // House = (planet sign index - ascendant sign index + 12) % 12 + 1
 const house = ((signIdx - ascSignIndex + 12) % 12) + 1;
 const nIdx = getNakshatraIndex(long);

 return {
 planet: PLANET_NAMES[planet as keyof typeof PLANET_NAMES]?.english || planet,
 planetHindi: PLANET_NAMES[planet as keyof typeof PLANET_NAMES]?.hindi || planet,
 longitude: Math.round(long * 100) / 100,
 sign: SIGNS[signIdx]!,
 signHindi: SIGNS_HINDI[signIdx]!,
 signSymbol: SIGN_SYMBOLS[signIdx]!,
 house,
 degree: formatDegree(long),
 nakshatra: NAKSHATRAS[nIdx]!,
 nakshatraHindi: NAKSHATRAS_HINDI[nIdx]!,
 nakshatraPada: getNakshatraPada(long),
 status: getPlanetStatus(planet, signIdx),
 isRetrograde: isRetrograde(planet, jd),
 };
 });

 // Build houses
 const houses: HouseInfo[] = [];
 for (let i = 0; i < 12; i++) {
 const houseSignIdx = (ascSignIndex + i) % 12;
 const houseNum = i + 1;
 const planetsInHouse = planetaryPositions
 .filter(p => p.house === houseNum)
 .map(p => {
 const shortName = p.planet.split(' (')[0]!;
 return p.isRetrograde ? `${shortName}(R)` : shortName;
 });

 houses.push({
 house: houseNum,
 sign: SIGNS[houseSignIdx]!,
 signHindi: SIGNS_HINDI[houseSignIdx]!,
 signSymbol: SIGN_SYMBOLS[houseSignIdx]!,
 planets: planetsInHouse,
 });
 }

 // Moon-based results
 const moonSignIdx = getSignIndex(moonSid);
 const moonNakshatraIdx = getNakshatraIndex(moonSid);
 const moonNakshatraPada = getNakshatraPada(moonSid);
 const sunSignIdx = getSignIndex(sunSid);

 // Calculate Dasha periods
 const dashas = calculateDashas(moonSid, jd);
 const currentBhukti = computeCurrentBhukti(dashas);

 // D9 Navamsa chart — uses sidereal longitudes already computed
 const navamsa = buildNavamsa(planetLongitudes, ascSid);

 // Detect Doshas
 const doshas = detectDoshas(planetaryPositions, houses);

 return {
 name,
 birthDate,
 birthTime,
 birthPlace,
 rashi: SIGNS[moonSignIdx]!,
 rashiHindi: SIGNS_HINDI[moonSignIdx]!,
 rashiSymbol: SIGN_SYMBOLS[moonSignIdx]!,
 nakshatra: NAKSHATRAS[moonNakshatraIdx]!,
 nakshatraHindi: NAKSHATRAS_HINDI[moonNakshatraIdx]!,
 nakshatraPada: moonNakshatraPada,
 ascendant: SIGNS[ascSignIndex]!,
 ascendantHindi: SIGNS_HINDI[ascSignIndex]!,
 ascendantSymbol: SIGN_SYMBOLS[ascSignIndex]!,
 moonSign: SIGNS[moonSignIdx]!,
 moonSignHindi: SIGNS_HINDI[moonSignIdx]!,
 sunSign: SIGNS[sunSignIdx]!,
 sunSignHindi: SIGNS_HINDI[sunSignIdx]!,
 planetaryPositions,
 houses,
 navamsa,
 dashas,
 currentBhukti,
 doshas,
 ayanamsa: Math.round(ayanamsa * 100) / 100,
 };
}
