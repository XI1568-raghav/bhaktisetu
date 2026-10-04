// Numerology compute — Pythagorean (life-path, birthday) + Chaldean (name).
// Pure functions, no external deps. Used by /astrology/numerology calculator.
//
// References:
// - Pythagorean: A=1..I=9 then J=1..R=9 then S=1..Z=8 (mod 9 of position).
// - Chaldean: ancient Babylonian-Vedic mapping, no 9 (sacred), A/I/J/Q/Y=1, B/K/R=2, etc.
// - Master numbers 11/22/33 NOT reduced to 2/4/6 in final step (Sepharial / Cheiro convention).

export type NumerologyKind = 'lifePath' | 'birthday' | 'nameChaldean' | 'nameSoul' | 'namePersonality';

export type NumerologyResult = {
 lifePath: number;
 lifePathSteps: string;
 birthday: number;
 nameChaldean: number;
 nameSoul: number;
 namePersonality: number;
 input: { dob: string; name: string };
 meanings: Record<NumerologyKind, NumberMeaning>;
};

export type NumberMeaning = {
 number: number;
 title: string;
 element?: string;
 planet?: string;
 short: string;
 strengths: string[];
 challenges: string[];
 careers: string[];
 luckyDays: string[];
 luckyColors: string[];
 spiritualNote: string;
};

// ─── Pythagorean letter values (a=1..z=8) ───────────────────────────
const PYTH_VALUES: Record<string, number> = {
 a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9,
 j: 1, k: 2, l: 3, m: 4, n: 5, o: 6, p: 7, q: 8, r: 9,
 s: 1, t: 2, u: 3, v: 4, w: 5, x: 6, y: 7, z: 8,
};

// ─── Chaldean letter values (no 9; based on Babylonian sound vibration) ──
const CHALDEAN_VALUES: Record<string, number> = {
 a: 1, i: 1, j: 1, q: 1, y: 1,
 b: 2, k: 2, r: 2,
 c: 3, g: 3, l: 3, s: 3,
 d: 4, m: 4, t: 4,
 e: 5, h: 5, n: 5, x: 5,
 u: 6, v: 6, w: 6,
 o: 7, z: 7,
 f: 8, p: 8,
};

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

// Reduce to single digit unless master (11, 22, 33).
function reduce(n: number, allowMaster = true): number {
 while (n > 9 && (!allowMaster || (n !== 11 && n !== 22 && n !== 33))) {
  n = String(n).split('').reduce((s, d) => s + Number(d), 0);
 }
 return n;
}

function reduceWithTrace(n: number): { value: number; trace: string } {
 const steps: string[] = [String(n)];
 let cur = n;
 while (cur > 9 && cur !== 11 && cur !== 22 && cur !== 33) {
  cur = String(cur).split('').reduce((s, d) => s + Number(d), 0);
  steps.push(String(cur));
 }
 return { value: cur, trace: steps.join(' → ') };
}

// ─── Life Path: sum of DOB digits, reduced ──────────────────────────
export function lifePath(dob: string): { value: number; trace: string } {
 // Accept YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
 const digits = dob.replace(/\D/g, '');
 if (digits.length < 8) return { value: 0, trace: 'invalid date' };
 const sum = digits.split('').reduce((s, d) => s + Number(d), 0);
 return reduceWithTrace(sum);
}

// ─── Birthday number: day of birth, reduced ─────────────────────────
export function birthdayNumber(dob: string): number {
 // Parse day from YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
 const dashIso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
 const slash = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;
 let day = 0;
 if (dashIso.test(dob)) {
  const m = dashIso.exec(dob);
  day = Number(m![3]);
 } else if (slash.test(dob)) {
  const m = slash.exec(dob);
  day = Number(m![1]);
 } else {
  return 0;
 }
 return reduce(day);
}

// ─── Name numerology helpers ────────────────────────────────────────
function nameSum(name: string, map: Record<string, number>, filter: (ch: string) => boolean = () => true): number {
 const cleaned = name.toLowerCase().replace(/[^a-z]/g, '');
 let sum = 0;
 for (const ch of cleaned) {
  if (filter(ch) && map[ch]) sum += map[ch]!;
 }
 return sum;
}

export function nameChaldean(name: string): number {
 return reduce(nameSum(name, CHALDEAN_VALUES));
}

export function nameSoulUrge(name: string): number {
 return reduce(nameSum(name, PYTH_VALUES, (ch) => VOWELS.has(ch)));
}

export function namePersonality(name: string): number {
 return reduce(nameSum(name, PYTH_VALUES, (ch) => !VOWELS.has(ch)));
}

// ─── Number meanings (1-9 + 11/22/33) ───────────────────────────────
const MEANINGS: Record<number, NumberMeaning> = {
 1: {
  number: 1, title: 'The Leader',
  element: 'Fire', planet: 'Sun',
  short: 'Independent, original, pioneering. Born to lead and start new things.',
  strengths: ['Self-reliance', 'Ambition', 'Originality', 'Courage', 'Decisiveness'],
  challenges: ['Stubbornness', 'Loneliness', 'Impatience', 'Ego friction with authority'],
  careers: ['Founder/CEO', 'Surgeon', 'Military officer', 'Inventor', 'Politician'],
  luckyDays: ['Sunday'], luckyColors: ['Gold', 'Orange', 'Yellow'],
  spiritualNote: 'Surya (Sun) rules — Aditya Hridayam stotra daily before sunrise strengthens the 1-vibration.',
 },
 2: {
  number: 2, title: 'The Mediator',
  element: 'Water', planet: 'Moon',
  short: 'Diplomatic, sensitive, cooperative. Thrives in partnerships and emotional environments.',
  strengths: ['Empathy', 'Intuition', 'Patience', 'Peacemaking', 'Receptivity'],
  challenges: ['Indecision', 'Over-sensitivity', 'Dependence', 'Mood swings'],
  careers: ['Counselor', 'Diplomat', 'Nurse', 'HR', 'Artist', 'Musician'],
  luckyDays: ['Monday', 'Friday'], luckyColors: ['White', 'Silver', 'Cream'],
  spiritualNote: 'Chandra (Moon) rules — Soma mantra + drinking from silver glass calms the 2-vibration.',
 },
 3: {
  number: 3, title: 'The Communicator',
  element: 'Fire', planet: 'Jupiter',
  short: 'Creative, expressive, optimistic. Born to teach, inspire, and create.',
  strengths: ['Wisdom', 'Optimism', 'Eloquence', 'Generosity', 'Creativity'],
  challenges: ['Scattered focus', 'Over-talkative', 'Exaggeration', 'Vanity'],
  careers: ['Teacher', 'Writer', 'Lawyer', 'Priest', 'Performer', 'Banker'],
  luckyDays: ['Thursday'], luckyColors: ['Yellow', 'Saffron', 'Purple'],
  spiritualNote: 'Brihaspati (Jupiter) rules — Guru-mantra "Om Gurave Namah" on Thursday boosts 3-vibration.',
 },
 4: {
  number: 4, title: 'The Builder',
  element: 'Earth', planet: 'Rahu',
  short: 'Practical, disciplined, hardworking. Stability through structure and rules.',
  strengths: ['Reliability', 'Discipline', 'Loyalty', 'Endurance', 'Logical mind'],
  challenges: ['Rigidity', 'Sudden reversals', 'Conspiracy-prone thinking', 'Insomnia'],
  careers: ['Engineer', 'Architect', 'Police', 'Researcher', 'IT systems'],
  luckyDays: ['Saturday', 'Sunday'], luckyColors: ['Khaki', 'Brown', 'Gray'],
  spiritualNote: 'Rahu rules — Rahu shanti puja or Durga-saptashati path neutralizes 4-vibration shocks.',
 },
 5: {
  number: 5, title: 'The Free Spirit',
  element: 'Air', planet: 'Mercury',
  short: 'Adventurous, versatile, curious. Born to explore and adapt.',
  strengths: ['Quick learning', 'Wit', 'Adaptability', 'Networking', 'Communication'],
  challenges: ['Restlessness', 'Inconsistency', 'Addictive tendencies', 'Superficiality'],
  careers: ['Sales', 'Marketing', 'Travel writer', 'Trader', 'Journalist'],
  luckyDays: ['Wednesday', 'Friday'], luckyColors: ['Green', 'Sky blue'],
  spiritualNote: 'Budha (Mercury) rules — Vishnu Sahasranama on Wednesday steadies 5-vibration.',
 },
 6: {
  number: 6, title: 'The Nurturer',
  element: 'Earth', planet: 'Venus',
  short: 'Loving, harmonious, responsible. Born for family, art, and beauty.',
  strengths: ['Compassion', 'Aesthetics', 'Service', 'Hospitality', 'Romance'],
  challenges: ['Possessiveness', 'Over-giving', 'Perfectionism', 'Indulgence'],
  careers: ['Designer', 'Chef', 'Doctor', 'Teacher', 'Beauty industry', 'Hospitality'],
  luckyDays: ['Friday', 'Wednesday'], luckyColors: ['Pink', 'White', 'Blue'],
  spiritualNote: 'Shukra (Venus) rules — Lakshmi-mantra + Shukravar vrat on Friday strengthens 6-vibration.',
 },
 7: {
  number: 7, title: 'The Mystic',
  element: 'Water', planet: 'Ketu',
  short: 'Introspective, spiritual, analytical. Born to seek truth beyond surface.',
  strengths: ['Wisdom', 'Intuition', 'Research mind', 'Spiritual depth', 'Detachment'],
  challenges: ['Isolation', 'Skepticism', 'Secrecy', 'Health vulnerabilities'],
  careers: ['Researcher', 'Astrologer', 'Monk', 'Psychologist', 'Detective', 'Writer'],
  luckyDays: ['Monday', 'Sunday'], luckyColors: ['Purple', 'Sea green'],
  spiritualNote: 'Ketu rules — Ganesha-mantra + meditation removes 7-vibration obstacles.',
 },
 8: {
  number: 8, title: 'The Executive',
  element: 'Earth', planet: 'Saturn',
  short: 'Ambitious, authoritative, materially driven. Born for power and long-term success.',
  strengths: ['Discipline', 'Authority', 'Wealth-attraction', 'Endurance', 'Strategy'],
  challenges: ['Karmic delays', 'Health setbacks', 'Loneliness', 'Workaholism'],
  careers: ['CEO', 'Judge', 'Banker', 'Construction', 'Mining', 'Politics'],
  luckyDays: ['Saturday'], luckyColors: ['Black', 'Dark blue', 'Indigo'],
  spiritualNote: 'Shani (Saturn) rules — Hanuman Chalisa daily + Saturday fast pacify 8-vibration karma.',
 },
 9: {
  number: 9, title: 'The Humanitarian',
  element: 'Fire', planet: 'Mars',
  short: 'Compassionate, courageous, idealistic. Born to serve humanity at large.',
  strengths: ['Courage', 'Generosity', 'Leadership', 'Idealism', 'Energy'],
  challenges: ['Anger', 'Impulsiveness', 'Sacrificing self', 'Conflict-prone'],
  careers: ['Soldier', 'Surgeon', 'Activist', 'Athlete', 'Firefighter', 'Reformer'],
  luckyDays: ['Tuesday'], luckyColors: ['Red', 'Crimson'],
  spiritualNote: 'Mangal (Mars) rules — Hanuman-mantra "Om Hanumate Namah" on Tuesday calms 9-vibration aggression.',
 },
 11: {
  number: 11, title: 'The Visionary (Master)',
  element: 'Air', planet: 'Moon (higher octave)',
  short: 'Highly intuitive, spiritually awakened. A master number — gift and burden.',
  strengths: ['Intuition', 'Inspiration', 'Charisma', 'Vision', 'Spiritual leadership'],
  challenges: ['Nervous tension', 'Hyper-sensitivity', 'Burnout', 'Self-doubt'],
  careers: ['Spiritual teacher', 'Inventor', 'Counsellor', 'Author', 'Healer'],
  luckyDays: ['Monday', 'Sunday'], luckyColors: ['Silver', 'White', 'Pale violet'],
  spiritualNote: 'Highest octave of 2 — daily pranayama + meditation channels intensity.',
 },
 22: {
  number: 22, title: 'The Master Builder',
  element: 'Earth', planet: 'Rahu/Saturn (higher octave)',
  short: 'The most powerful number — can build lasting institutions affecting millions.',
  strengths: ['Vision + execution', 'Pragmatic genius', 'Influence', 'Endurance'],
  challenges: ['Crushing weight of potential', 'Workaholism', 'Material attachment'],
  careers: ['Founder of institutions', 'Architect of social change', 'Industrialist'],
  luckyDays: ['Saturday'], luckyColors: ['Dark blue', 'Indigo'],
  spiritualNote: 'Highest octave of 4 — Vishnu Sahasranama + service to institutions channels the load.',
 },
 33: {
  number: 33, title: 'The Master Teacher',
  element: 'Fire', planet: 'Sun (higher octave)',
  short: 'Rare — Christ/Buddha vibration. Selfless service to humanity is the only path.',
  strengths: ['Universal love', 'Healing', 'Wisdom transmission', 'Self-sacrifice'],
  challenges: ['Martyrdom', 'Burnout', 'Misunderstood by world'],
  careers: ['Spiritual master', 'Global healer', 'Humanitarian leader'],
  luckyDays: ['Sunday', 'Friday'], luckyColors: ['Gold', 'White', 'Pink'],
  spiritualNote: 'Highest octave of 6 — Bhagavad Gita study + selfless karma yoga is the prescription.',
 },
};

export function getMeaning(n: number): NumberMeaning {
 return MEANINGS[n] ?? MEANINGS[1]!;
}

export function computeNumerology(dob: string, name: string): NumerologyResult | null {
 const lp = lifePath(dob);
 if (lp.value === 0) return null;
 const bd = birthdayNumber(dob);
 const nc = nameChaldean(name);
 const ns = nameSoulUrge(name);
 const np = namePersonality(name);

 return {
  lifePath: lp.value,
  lifePathSteps: lp.trace,
  birthday: bd,
  nameChaldean: nc,
  nameSoul: ns,
  namePersonality: np,
  input: { dob, name: name.trim() },
  meanings: {
   lifePath: getMeaning(lp.value),
   birthday: getMeaning(bd),
   nameChaldean: getMeaning(nc),
   nameSoul: getMeaning(ns),
   namePersonality: getMeaning(np),
  },
 };
}

// All canonical numbers used in UI dropdowns / SEO listing
export const ALL_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33];

export function listAllMeanings(): NumberMeaning[] {
 return ALL_NUMBERS.map((n) => MEANINGS[n]!).filter(Boolean);
}
