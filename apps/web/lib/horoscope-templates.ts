// Daily horoscope template engine for /astrology/horoscope/[rashi]/today.
// 80 deterministic short paragraphs keyed by (element × area × index).
// WHY templates: stay within traditional Vedic framing (gochar, tithi tone,
// vaara lord) without making medical/financial guarantees. Each template is
// neutral and reflective rather than predictive of fixed outcomes.

export type ElementKey = 'fire' | 'earth' | 'air' | 'water';
export type AreaKey = 'career' | 'love' | 'finance' | 'health';
export type PakshaKind = 'shukla' | 'krishna';

const TEMPLATES: Record<ElementKey, Record<AreaKey, readonly string[]>> = {
  fire: {
    career: [
      'A spark of initiative serves you well at work today. Lead with conviction but listen before deciding.',
      'Leadership opportunities surface; respond with measured enthusiasm rather than impulse.',
      'Your assertive energy moves a stalled project forward. Keep ego in check around peers.',
      'Quick decisions favoured, yet revisit major commitments after the afternoon for clarity.',
      'Visibility rises today; senior figures notice your effort. Document outcomes for later reference.',
    ],
    love: [
      'Warmth and spontaneity bring closeness. Avoid sharp words when emotions run hot.',
      'A bold gesture is appreciated by your partner. Singles attract attention through confidence.',
      'Passion runs strong; channel it into shared activity rather than disagreement.',
      'Express gratitude clearly today; small acknowledgements deepen bonds.',
      'A heart-to-heart conversation, kept honest and brief, resolves lingering tension.',
    ],
    finance: [
      'Income-related movement is possible; verify details before signing anything.',
      'Avoid speculative bets today and prefer steady, planned spending.',
      'A long-pending receivable may surface; follow up courteously.',
      'Review subscriptions and recurring outflows; small trims compound over months.',
      'Consult before committing to a new venture; second opinions add perspective.',
    ],
    health: [
      'Stamina is favourable; a brisk walk or light cardio supports the day.',
      'Stay hydrated and avoid excess heat; pace activity through the afternoon.',
      'Mind heat-related discomforts like acidity; favour cooling, simple meals.',
      'Sleep schedule matters today; an earlier wind-down restores energy.',
      'Brief pranayama in the morning steadies the nervous system.',
    ],
  },
  earth: {
    career: [
      'Patient, systematic work pays off; finish what was left open last week.',
      'Practical decisions favour you. Build on what already works rather than restarting.',
      'A reliable colleague returns a favour; a small collaboration moves smoothly.',
      'Document your process today; it will help during a future review.',
      'Negotiations tilt your way when you stay calm and let facts speak.',
    ],
    love: [
      'Steady gestures matter more than grand ones; reliability is your strength.',
      'A quiet evening together restores the relationship balance.',
      'Honest, slow conversation deepens trust. Avoid rushing emotional decisions.',
      'Practical support is welcomed; small acts of service speak loudly.',
      'A shared meal or walk renews the bond without need for spectacle.',
    ],
    finance: [
      'Conservative choices serve you well; postpone any large discretionary spend.',
      'Review savings and emergency-fund balance; small additions strengthen the base.',
      'A long-term investment plan deserves a fresh look today.',
      'Verify documents and statements; clerical errors may surface.',
      'Avoid lending today; finances of others remain their own responsibility.',
    ],
    health: [
      'Routine and rhythm support you today; keep meal timings consistent.',
      'Joint or back-related discomfort responds to gentle stretching.',
      'Favour wholesome, warm food; avoid heavy or fried items at night.',
      'A short outdoor break refreshes the body and clears the mind.',
      'Hydration and adequate rest do more than any intense workout today.',
    ],
  },
  air: {
    career: [
      'Communication-rich tasks flow well; writing and presenting are favoured.',
      'A useful conversation opens an unexpected door; remain curious.',
      'Networking quietly yields more than direct asks today.',
      'Multiple small wins are likely; consolidate before taking on more.',
      'Clarity of thought is sharp; outline a longer-term plan in writing.',
    ],
    love: [
      'Light conversation refreshes the relationship; avoid heavy debate today.',
      'Curiosity about your partner\'s day strengthens connection.',
      'Singles benefit from social settings; group gatherings hold quiet promise.',
      'Written notes or messages carry weight today; send a thoughtful one.',
      'A shared idea or plan sparks renewed energy in the bond.',
    ],
    finance: [
      'Research before commitment; clear data trims unnecessary risk.',
      'Compare options today rather than making a final decision.',
      'A small administrative task — paperwork or filing — saves time later.',
      'Networking may surface useful financial information; verify independently.',
      'Avoid distraction-buying; pause before discretionary online purchases.',
    ],
    health: [
      'Mental energy is high; balance it with physical movement.',
      'Breathwork and mindful pauses support nervous-system balance.',
      'Reduce screen exposure in the evening for deeper rest.',
      'Light, easy-to-digest food suits the day better than heavy fare.',
      'Short walks between tasks restore focus more than caffeine.',
    ],
  },
  water: {
    career: [
      'Intuition is reliable today; trust the read on people and timing.',
      'Creative or empathetic roles flourish; a thoughtful approach wins favour.',
      'Quiet, behind-the-scenes work yields better results than seeking visibility.',
      'A mentor or senior\'s perspective clarifies a recurring puzzle.',
      'Slow, considered emails serve you better than rapid replies.',
    ],
    love: [
      'Emotional depth is welcome; sincere listening matters most today.',
      'A small ritual together — tea, prayer, walk — strengthens warmth.',
      'Vulnerability shared honestly deepens trust between partners.',
      'Singles may feel a quiet attraction; let it unfold without forcing pace.',
      'Family ties feel meaningful today; a brief call brings comfort.',
    ],
    finance: [
      'Intuition about money decisions runs strong; cross-check with facts.',
      'Charitable or family-related expense may arise; budget gently.',
      'Long-term financial security feels more important than quick gains today.',
      'Postpone speculative trades; conservative review serves better.',
      'A consultation with someone experienced clarifies a pending choice.',
    ],
    health: [
      'Rest, gentle yoga, or meditation restores balance better than exertion.',
      'Stay mindful of fluid intake; warm water through the day supports digestion.',
      'Emotional rest matters today; protect your evening from heavy news.',
      'A short oil massage or warm bath calms the nervous system.',
      'Early sleep and a quiet morning routine carry the day.',
    ],
  },
};

const PAKSHA_TONE: Record<PakshaKind, string> = {
  shukla: 'The waxing Moon (Shukla Paksha) brings expansive, growth-oriented energy — well suited to new starts.',
  krishna: 'The waning Moon (Krishna Paksha) favours completion, reflection, and inward focus over fresh beginnings.',
};

const DAY_LORD: Record<number, { lord: string; tone: string }> = {
  0: { lord: 'Surya (Sun)', tone: 'authority, vitality, and recognition themes are emphasised' },
  1: { lord: 'Chandra (Moon)', tone: 'emotion, intuition, and home themes come forward' },
  2: { lord: 'Mangal (Mars)', tone: 'courage, initiative, and decisive action are highlighted' },
  3: { lord: 'Budh (Mercury)', tone: 'communication, learning, and trade activities are favoured' },
  4: { lord: 'Brihaspati (Jupiter)', tone: 'wisdom, ethics, and growth-oriented decisions are favoured' },
  5: { lord: 'Shukra (Venus)', tone: 'beauty, partnership, and creative pursuits are highlighted' },
  6: { lord: 'Shani (Saturn)', tone: 'discipline, patience, and structured effort yield results' },
};

// Day-of-week (0=Sun..6=Sat) name for an IST date.
const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function dayOfYearIST(date: Date): number {
  // WHY: IST DOY anchors lucky-of-the-day rotation so results match local astrology convention.
  const ist = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  const parts = ist.split('-');
  const y = Number(parts[0]!);
  const m = Number(parts[1]!);
  const d = Number(parts[2]!);
  const start = Date.UTC(y, 0, 1);
  const cur = Date.UTC(y, m - 1, d);
  return Math.floor((cur - start) / 86400000) + 1;
}

export function istDateParts(date: Date): {
  iso: string;
  dayName: string;
  prettyDate: string;
  dow: number;
} {
  const tz = 'Asia/Kolkata';
  const iso = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  const prettyDate = new Intl.DateTimeFormat('en-IN', { timeZone: tz, day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  // WHY: Build a Date in IST midnight to derive weekday consistently.
  const parts = iso.split('-');
  const y = Number(parts[0]!);
  const m = Number(parts[1]!);
  const d = Number(parts[2]!);
  const utcAtIstMidnight = Date.UTC(y, m - 1, d, -5, -30, 0); // 00:00 IST = 18:30 UTC prior day
  const dow = new Date(utcAtIstMidnight).getUTCDay();
  const dayName = DOW_NAMES[dow]!;
  return { iso, dayName, prettyDate, dow };
}

export function pickArea(element: ElementKey, area: AreaKey, doy: number): string {
  const list = TEMPLATES[element][area];
  const idx = doy % list.length;
  return list[idx]!;
}

export function pakshaFromTithi(tithi: string): PakshaKind {
  // WHY: Tithi names from daily-horoscope contain "(Shukla)"/"(Krishna)"; Purnima is end-Shukla, Amavasya end-Krishna.
  if (tithi.toLowerCase().includes('krishna') || tithi.toLowerCase().includes('amavasya')) return 'krishna';
  return 'shukla';
}

export function buildGeneralPrediction(args: {
  rashiEnglish: string;
  element: ElementKey;
  tithi: string;
  dow: number;
  rulingPlanet: string;
}): string {
  const { rashiEnglish, element, tithi, dow, rulingPlanet } = args;
  const paksha = pakshaFromTithi(tithi);
  const dayLord = DAY_LORD[dow]!;
  const elementOpener: Record<ElementKey, string> = {
    fire: `As a fire sign, ${rashiEnglish} natives feel a noticeable lift in drive today.`,
    earth: `As an earth sign, ${rashiEnglish} natives find practical matters move forward steadily today.`,
    air: `As an air sign, ${rashiEnglish} natives benefit from clarity of thought and conversation today.`,
    water: `As a water sign, ${rashiEnglish} natives tune into intuition and emotional currents today.`,
  };
  const lordResonance = rulingPlanet.toLowerCase().includes(dayLord.lord.split(' ')[0]!.toLowerCase())
    ? `With your ruling planet (${rulingPlanet}) governing today's vaara, the day's tone aligns naturally with your nature — use it for considered, meaningful action.`
    : `Today's vaara is governed by ${dayLord.lord}, so ${dayLord.tone}.`;
  const closer = paksha === 'shukla'
    ? 'Begin with a brief sankalp before any important task; the lunar phase supports forward momentum.'
    : 'Prioritise finishing pending matters; the lunar phase favours closure over launch.';
  return `${elementOpener[element]} ${PAKSHA_TONE[paksha]} ${lordResonance} Tithi today is ${tithi}, so plan engagements with that energy in mind. ${closer}`;
}

export function elementOfRashi(rawElement: string): ElementKey {
  const e = rawElement.toLowerCase();
  if (e.includes('fire') || e.includes('agni')) return 'fire';
  if (e.includes('earth') || e.includes('prithvi')) return 'earth';
  if (e.includes('air') || e.includes('vayu')) return 'air';
  return 'water';
}

// Day-of-year lucky color rotation among a small Hindu-auspicious palette,
// blended with the rashi\'s own canonical lucky color.
const PALETTE = ['Saffron', 'Yellow', 'Red', 'Green', 'White', 'Pink', 'Gold', 'Orange', 'Blue', 'Maroon'] as const;

export function luckyColorOfDay(rashiLuckyColor: string, doy: number): string {
  if (doy % 3 === 0) return rashiLuckyColor;
  return PALETTE[doy % PALETTE.length]!;
}

export function luckyNumberOfDay(rashiLuckyNumber: number, doy: number): number {
  // WHY: rotate within 1..12 anchored on the rashi\'s base lucky number, deterministic by DOY.
  const base = ((rashiLuckyNumber + doy * 3) % 12);
  return base === 0 ? 12 : base;
}
