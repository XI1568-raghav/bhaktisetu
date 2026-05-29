// Ashtakoot (8-fold) Guna Milan compute — Vedic marriage compatibility scorer.
// Pure functions, no external deps. Input = both partners' nakshatra slug.
// Output = 36-point breakdown with verdict + Manglik check (separate input).
//
// References: Brihat Parashara Hora Shastra ch. 26 (Ashtakuta Vivah Milan),
// Muhurta Chintamani, Daivagya Vilasa. Tables cross-verified against Sri Mandir,
// AstroSage, Drik Panchang publicly-published values 2024-2025.

import { NAKSHATRAS, type Nakshatra } from './nakshatras';

export type NakshatraSlug = string;
export type RashiName =
 | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer' | 'Leo' | 'Virgo'
 | 'Libra' | 'Scorpio' | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

// 12 rashis canonical order (0-indexed)
const RASHIS: RashiName[] = [
 'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

// Many nakshatras straddle two rashis. We use the PRIMARY rashi (the rashi
// where the first pada falls) for Ashtakoot. Per shastra this is acceptable
// for nakshatra-based milan; pada-precise milan needs full birth-time chart.
function primaryRashi(nak: Nakshatra): RashiName {
 const r = (nak.rashi.split('-')[0] ?? nak.rashi).trim() as RashiName;
 return r;
}

function rashiIndex(r: RashiName): number {
 return RASHIS.indexOf(r);
}

// ─── 1. VARNA (1 point) ─────────────────────────────────────────────
// Brahmin > Kshatriya > Vaishya > Shudra. Female varna must be ≤ male's.
type Varna = 'Brahmin' | 'Kshatriya' | 'Vaishya' | 'Shudra';
const RASHI_VARNA: Record<RashiName, Varna> = {
 Cancer: 'Brahmin', Scorpio: 'Brahmin', Pisces: 'Brahmin',
 Aries: 'Kshatriya', Leo: 'Kshatriya', Sagittarius: 'Kshatriya',
 Taurus: 'Vaishya', Virgo: 'Vaishya', Capricorn: 'Vaishya',
 Gemini: 'Shudra', Libra: 'Shudra', Aquarius: 'Shudra',
};
const VARNA_RANK: Record<Varna, number> = { Brahmin: 4, Kshatriya: 3, Vaishya: 2, Shudra: 1 };

function scoreVarna(maleNak: Nakshatra, femaleNak: Nakshatra): number {
 const mv = RASHI_VARNA[primaryRashi(maleNak)];
 const fv = RASHI_VARNA[primaryRashi(femaleNak)];
 // Female varna should be ≤ male's. Same or lower = 1, higher = 0.
 return VARNA_RANK[fv] <= VARNA_RANK[mv] ? 1 : 0;
}

// ─── 2. VASHYA (2 points) ───────────────────────────────────────────
// Mutual attraction / power balance. 5 categories from rashi.
type Vashya = 'Chatushpada' | 'Manava' | 'Jalachara' | 'Vanachara' | 'Keeta';
const RASHI_VASHYA: Record<RashiName, Vashya> = {
 Aries: 'Chatushpada', Taurus: 'Chatushpada',
 Gemini: 'Manava', Virgo: 'Manava', Libra: 'Manava', Aquarius: 'Manava',
 Cancer: 'Jalachara', Pisces: 'Jalachara', Capricorn: 'Jalachara',
 Leo: 'Vanachara',
 Scorpio: 'Keeta',
 Sagittarius: 'Manava',
};
// Simplified Vashya score table: same = 2, friendly = 1, neutral = 0.5, enemy = 0
function scoreVashya(maleNak: Nakshatra, femaleNak: Nakshatra): number {
 const mv = RASHI_VASHYA[primaryRashi(maleNak)];
 const fv = RASHI_VASHYA[primaryRashi(femaleNak)];
 if (mv === fv) return 2;
 // Cross-category (per BPHS table)
 const friendlyPairs: [Vashya, Vashya][] = [
  ['Manava', 'Chatushpada'], ['Chatushpada', 'Manava'],
  ['Manava', 'Vanachara'], ['Vanachara', 'Manava'],
  ['Jalachara', 'Manava'], ['Manava', 'Jalachara'],
 ];
 if (friendlyPairs.some(([a, b]) => a === mv && b === fv)) return 1;
 // Keeta with Jalachara = enemy
 if ((mv === 'Keeta' && fv === 'Jalachara') || (mv === 'Jalachara' && fv === 'Keeta')) return 0;
 return 0.5;
}

// ─── 3. TARA (3 points) ─────────────────────────────────────────────
// Destiny. Count female's nakshatra from male's (and vice versa) mod 9.
// Janma(1)=bad, Sampat(2)=good, Vipat(3)=bad, Kshema(4)=good,
// Pratyak(5)=bad, Sadhana(6)=good, Naidhana(7)=bad, Mitra(8)=good, Param-Mitra(9)=good
const TARA_GOOD = [2, 4, 6, 8, 9]; // 0-indexed: index 0 = Janma (count 1)
function taraCount(fromIdx: number, toIdx: number): number {
 const diff = (toIdx - fromIdx + 27) % 27;
 return (diff % 9) + 1; // 1..9
}
function scoreTara(maleNak: Nakshatra, femaleNak: Nakshatra): number {
 const mIdx = NAKSHATRAS.findIndex((n) => n.slug === maleNak.slug);
 const fIdx = NAKSHATRAS.findIndex((n) => n.slug === femaleNak.slug);
 // Count female from male AND male from female; each contributes 1.5 if good
 const t1 = taraCount(mIdx, fIdx);
 const t2 = taraCount(fIdx, mIdx);
 let score = 0;
 if (TARA_GOOD.includes(t1)) score += 1.5;
 if (TARA_GOOD.includes(t2)) score += 1.5;
 return score;
}

// ─── 4. YONI (4 points) ─────────────────────────────────────────────
// Sexual compatibility — 14 animal pairs from nakshatra
type Yoni =
 | 'Horse' | 'Elephant' | 'Sheep' | 'Serpent' | 'Dog' | 'Cat' | 'Rat'
 | 'Cow' | 'Buffalo' | 'Tiger' | 'Deer' | 'Monkey' | 'Mongoose' | 'Lion';
const NAK_YONI: Record<string, Yoni> = {
 'ashwini': 'Horse', 'shatabhisha': 'Horse',
 'bharani': 'Elephant', 'revati': 'Elephant',
 'pushya': 'Sheep', 'krittika': 'Sheep',
 'rohini': 'Serpent', 'mrigashira': 'Serpent',
 'mula': 'Dog', 'magha': 'Rat',
 'purva-phalguni': 'Rat', 'uttara-phalguni': 'Cow',
 'uttara-bhadrapada': 'Cow',
 'swati': 'Buffalo', 'hasta': 'Buffalo',
 'chitra': 'Tiger', 'vishakha': 'Tiger',
 'jyeshtha': 'Deer', 'anuradha': 'Deer',
 'purva-ashadha': 'Monkey', 'shravana': 'Monkey',
 'ardra': 'Dog',
 'punarvasu': 'Cat', 'ashlesha': 'Cat',
 'dhanishta': 'Lion', 'purva-bhadrapada': 'Lion',
 'uttara-ashadha': 'Mongoose',
};
// Yoni enemy pairs (mutual bitter enmity = 0 pts)
const YONI_ENEMIES: Array<[Yoni, Yoni]> = [
 ['Cow', 'Tiger'], ['Elephant', 'Lion'], ['Horse', 'Buffalo'],
 ['Dog', 'Deer'], ['Serpent', 'Mongoose'], ['Cat', 'Rat'],
 ['Monkey', 'Sheep'],
];
function yoniScore(my: Yoni, fy: Yoni): number {
 if (my === fy) return 4; // same yoni
 const isEnemy = YONI_ENEMIES.some(([a, b]) => (a === my && b === fy) || (a === fy && b === my));
 if (isEnemy) return 0;
 // Otherwise neutral or friendly — assign 2-3 per BPHS table simplification
 return 2;
}
function scoreYoni(maleNak: Nakshatra, femaleNak: Nakshatra): number {
 const my = NAK_YONI[maleNak.slug];
 const fy = NAK_YONI[femaleNak.slug];
 if (!my || !fy) return 2; // safe default
 return yoniScore(my, fy);
}

// ─── 5. GRAHA MAITRI (5 points) ──────────────────────────────────────
// Mental compatibility from rashi-lord friendship
type Planet = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn';
const RASHI_LORD: Record<RashiName, Planet> = {
 Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
 Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
 Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};
const FRIENDS: Record<Planet, Planet[]> = {
 Sun: ['Moon', 'Mars', 'Jupiter'],
 Moon: ['Sun', 'Mercury'],
 Mars: ['Sun', 'Moon', 'Jupiter'],
 Mercury: ['Sun', 'Venus'],
 Jupiter: ['Sun', 'Moon', 'Mars'],
 Venus: ['Mercury', 'Saturn'],
 Saturn: ['Mercury', 'Venus'],
};
const ENEMIES: Record<Planet, Planet[]> = {
 Sun: ['Venus', 'Saturn'],
 Moon: [],
 Mars: ['Mercury'],
 Mercury: ['Moon'],
 Jupiter: ['Mercury', 'Venus'],
 Venus: ['Sun', 'Moon'],
 Saturn: ['Sun', 'Moon', 'Mars'],
};
type Relation = 'friend' | 'enemy' | 'neutral';
function relation(a: Planet, b: Planet): Relation {
 if (a === b) return 'friend';
 if (FRIENDS[a].includes(b)) return 'friend';
 if (ENEMIES[a].includes(b)) return 'enemy';
 return 'neutral';
}
function scoreGrahaMaitri(maleNak: Nakshatra, femaleNak: Nakshatra): number {
 const ml = RASHI_LORD[primaryRashi(maleNak)];
 const fl = RASHI_LORD[primaryRashi(femaleNak)];
 const rMF = relation(ml, fl);
 const rFM = relation(fl, ml);
 if (rMF === 'friend' && rFM === 'friend') return 5;
 if ((rMF === 'friend' && rFM === 'neutral') || (rMF === 'neutral' && rFM === 'friend')) return 4;
 if (rMF === 'neutral' && rFM === 'neutral') return 3;
 if ((rMF === 'friend' && rFM === 'enemy') || (rMF === 'enemy' && rFM === 'friend')) return 1;
 if ((rMF === 'neutral' && rFM === 'enemy') || (rMF === 'enemy' && rFM === 'neutral')) return 0.5;
 return 0; // mutual enemy
}

// ─── 6. GANA (6 points) ──────────────────────────────────────────────
// Temperament from nakshatra.gana (already in data)
function scoreGana(maleNak: Nakshatra, femaleNak: Nakshatra): number {
 const mg = maleNak.gana;
 const fg = femaleNak.gana;
 if (mg === fg) return 6;
 const pair = [mg, fg].sort().join('-');
 if (pair === 'Deva-Manushya') return 5;
 if (pair === 'Manushya-Rakshasa') return 1; // some give 0; BPHS leans 1
 if (pair === 'Deva-Rakshasa') return 0;
 return 0;
}

// ─── 7. BHAKOOT (7 points) ───────────────────────────────────────────
// Family welfare from rashi distance
function scoreBhakoot(maleNak: Nakshatra, femaleNak: Nakshatra): number {
 const mIdx = rashiIndex(primaryRashi(maleNak));
 const fIdx = rashiIndex(primaryRashi(femaleNak));
 const diff1 = (fIdx - mIdx + 12) % 12 + 1;
 const diff2 = (mIdx - fIdx + 12) % 12 + 1;
 // Bad pairs: 6-8, 9-5, 12-2
 const bad = [[6, 8], [8, 6], [9, 5], [5, 9], [12, 2], [2, 12]];
 if (bad.some(([a, b]) => a === diff1 && b === diff2)) return 0;
 return 7;
}

// ─── 8. NADI (8 points) ──────────────────────────────────────────────
// Health & progeny — from nakshatra Nadi assignment (Aadi/Madhya/Antya)
type Nadi = 'Aadi' | 'Madhya' | 'Antya';
const NAK_NADI: Record<string, Nadi> = {
 'ashwini': 'Aadi', 'ardra': 'Aadi', 'punarvasu': 'Aadi',
 'uttara-phalguni': 'Aadi', 'hasta': 'Aadi', 'jyeshtha': 'Aadi',
 'mula': 'Aadi', 'shatabhisha': 'Aadi', 'purva-bhadrapada': 'Aadi',
 'bharani': 'Madhya', 'mrigashira': 'Madhya', 'pushya': 'Madhya',
 'purva-phalguni': 'Madhya', 'chitra': 'Madhya', 'anuradha': 'Madhya',
 'purva-ashadha': 'Madhya', 'dhanishta': 'Madhya', 'uttara-bhadrapada': 'Madhya',
 'krittika': 'Antya', 'rohini': 'Antya', 'ashlesha': 'Antya',
 'magha': 'Antya', 'swati': 'Antya', 'vishakha': 'Antya',
 'uttara-ashadha': 'Antya', 'shravana': 'Antya', 'revati': 'Antya',
};
function scoreNadi(maleNak: Nakshatra, femaleNak: Nakshatra): number {
 const mn = NAK_NADI[maleNak.slug];
 const fn = NAK_NADI[femaleNak.slug];
 if (!mn || !fn) return 8;
 return mn === fn ? 0 : 8;
}

// ─── COMBINED REPORT ─────────────────────────────────────────────────
export type GunaScore = {
 name: string;
 max: number;
 score: number;
 desc: string;
};

export type MilanReport = {
 male: { slug: string; name: string; sanskrit: string; rashi: RashiName };
 female: { slug: string; name: string; sanskrit: string; rashi: RashiName };
 gunas: GunaScore[];
 total: number;
 maxTotal: number;
 verdict: string;
 verdictLevel: 'excellent' | 'good' | 'acceptable' | 'caution' | 'avoid';
 hasNadiDosh: boolean;
 hasBhakootDosh: boolean;
 hasGanaDosh: boolean;
 manglikNote?: string;
};

export function computeMilan(maleNakSlug: string, femaleNakSlug: string, opts?: { maleManglik?: boolean; femaleManglik?: boolean }): MilanReport | null {
 const maleNak = NAKSHATRAS.find((n) => n.slug === maleNakSlug);
 const femaleNak = NAKSHATRAS.find((n) => n.slug === femaleNakSlug);
 if (!maleNak || !femaleNak) return null;

 const varnaPts = scoreVarna(maleNak, femaleNak);
 const vashyaPts = scoreVashya(maleNak, femaleNak);
 const taraPts = scoreTara(maleNak, femaleNak);
 const yoniPts = scoreYoni(maleNak, femaleNak);
 const grahaPts = scoreGrahaMaitri(maleNak, femaleNak);
 const ganaPts = scoreGana(maleNak, femaleNak);
 const bhakootPts = scoreBhakoot(maleNak, femaleNak);
 const nadiPts = scoreNadi(maleNak, femaleNak);

 const gunas: GunaScore[] = [
  { name: 'Varna', max: 1, score: varnaPts, desc: 'Spiritual/work compatibility' },
  { name: 'Vashya', max: 2, score: vashyaPts, desc: 'Mutual attraction & influence' },
  { name: 'Tara', max: 3, score: taraPts, desc: 'Destiny & well-being' },
  { name: 'Yoni', max: 4, score: yoniPts, desc: 'Sexual & physical compatibility' },
  { name: 'Graha Maitri', max: 5, score: grahaPts, desc: 'Mental & intellectual harmony' },
  { name: 'Gana', max: 6, score: ganaPts, desc: 'Temperament compatibility' },
  { name: 'Bhakoot', max: 7, score: bhakootPts, desc: 'Family welfare & prosperity' },
  { name: 'Nadi', max: 8, score: nadiPts, desc: 'Health & progeny' },
 ];

 const total = gunas.reduce((s, g) => s + g.score, 0);

 let verdictLevel: MilanReport['verdictLevel'];
 let verdict: string;
 if (total >= 31) {
  verdictLevel = 'excellent';
  verdict = 'Excellent match. Exceedingly rare. Shastra-favorable in every dimension.';
 } else if (total >= 24) {
  verdictLevel = 'good';
  verdict = 'Very good match. Recommended by shastra without reservation.';
 } else if (total >= 18) {
  verdictLevel = 'acceptable';
  verdict = 'Acceptable match. Shastra-favorable; check dosh sections below for remedies.';
 } else if (total >= 12) {
  verdictLevel = 'caution';
  verdict = 'Below recommended threshold (18). Marriage possible only with detailed paid consultation + remedies.';
 } else {
  verdictLevel = 'avoid';
  verdict = 'Strongly inadvisable per shastra. Consult a pandit before proceeding.';
 }

 const hasNadiDosh = nadiPts === 0;
 const hasBhakootDosh = bhakootPts === 0;
 const hasGanaDosh = ganaPts <= 1 && maleNak.gana !== femaleNak.gana;

 let manglikNote: string | undefined;
 if (opts?.maleManglik && opts?.femaleManglik) {
  manglikNote = 'Both partners are Manglik — Mangal-bhanga (mutual cancellation) applies. Safe to proceed on Manglik front.';
 } else if (opts?.maleManglik || opts?.femaleManglik) {
  manglikNote = 'One partner is Manglik and the other is not. Severe cases require kumbh-vivah remedy before marriage. Mild Manglik often cancels via Saturn/Mars aspect — paid consultation recommended.';
 }

 return {
  male: { slug: maleNak.slug, name: maleNak.name, sanskrit: maleNak.sanskritName, rashi: primaryRashi(maleNak) },
  female: { slug: femaleNak.slug, name: femaleNak.name, sanskrit: femaleNak.sanskritName, rashi: primaryRashi(femaleNak) },
  gunas,
  total,
  maxTotal: 36,
  verdict,
  verdictLevel,
  hasNadiDosh,
  hasBhakootDosh,
  hasGanaDosh,
  manglikNote,
 };
}

export function allNakshatraOptions(): Array<{ slug: string; label: string }> {
 return NAKSHATRAS.map((n) => ({ slug: n.slug, label: `${n.name} (${n.sanskritName})` }));
}
