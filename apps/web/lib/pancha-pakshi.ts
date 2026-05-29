export type PakshiSlug = 'vulture' | 'owl' | 'crow' | 'cock' | 'peacock';

export type PakshiElement = 'fire' | 'earth' | 'air' | 'water' | 'space';

export type PakshiActivity = 'rules' | 'eats' | 'walks' | 'sleeps' | 'dies';

export interface PanchaPakshiBird {
 slug: PakshiSlug;
 name: string;
 sanskrit: string;
 tamil: string;
 deity: string;
 element: PakshiElement;
 planet: string;
 direction: string;
 dayCount: number;
 luckyDirection: string;
 luckyColor: string;
 luckyDays: string[];
 personality: string;
 strengths: string[];
 weaknesses: string[];
 careers: string[];
 compatibility: PakshiSlug[];
 incompatibility: PakshiSlug[];
 birthNakshatras: string[];
 mantra: string;
 mantraEnglish: string;
 remedy: string;
}

export const PANCHA_PAKSHI_BIRDS: PanchaPakshiBird[] = [
 {
  slug: 'vulture',
  name: 'Vulture',
  sanskrit: 'गृध्र (Gridhra)',
  tamil: 'புலன் (Pulan)',
  deity: 'Garuda · vehicle of Vishnu',
  element: 'fire',
  planet: 'Sun',
  direction: 'East',
  dayCount: 5,
  luckyDirection: 'East',
  luckyColor: 'Red, copper, orange',
  luckyDays: ['Sunday', 'Tuesday'],
  personality:
   'Sharp-eyed, fearless, dharma-protector. Sees far and acts decisively. Natural leader unbothered by minor obstacles.',
  strengths: [
   'Exceptional foresight and pattern recognition',
   'Courage in crisis — first to act when others freeze',
   'Strong moral compass, intolerant of injustice',
   'Long-distance vision in life planning',
  ],
  weaknesses: [
   'Can be aloof or perceived as cold',
   'Impatient with slow movers',
   'Tendency to circle a problem before striking',
  ],
  careers: ['Defence', 'Surgery', 'Investigative journalism', 'Strategic consulting', 'Judiciary'],
  compatibility: ['owl', 'cock'],
  incompatibility: ['crow'],
  birthNakshatras: ['Bharani', 'Krittika', 'Pushya', 'Hasta', 'Swati', 'Jyestha', 'Mula'],
  mantra: 'ॐ गृध्राय नमः',
  mantraEnglish: 'Om Gridhrāya Namaḥ',
  remedy:
   'Offer red flowers + jaggery water at sunrise facing east on Sunday. Donate red lentils on amavasya. Recite Aditya Hridayam stotram 1× daily on Sundays.',
 },
 {
  slug: 'owl',
  name: 'Owl',
  sanskrit: 'उलूक (Ulooka)',
  tamil: 'ஆந்தை (Aandhai)',
  deity: 'Lakshmi · goddess of wealth',
  element: 'earth',
  planet: 'Saturn',
  direction: 'South',
  dayCount: 4,
  luckyDirection: 'South',
  luckyColor: 'Black, dark blue, indigo',
  luckyDays: ['Saturday', 'Thursday'],
  personality:
   'Deep-thinker, night-worker, wisdom-keeper. Sees what others miss. Patient, methodical, rich in inner life.',
  strengths: [
   'Exceptional research and analysis capacity',
   'Strong intuition, especially after dark',
   'Excellent at long-form planning and patient wealth building',
   'Resourceful in solitude — does best work alone',
  ],
  weaknesses: [
   'Prone to over-thinking and isolation',
   'Slow to commit, often misses fast windows',
   'Can spiral into pessimism without sunlight',
  ],
  careers: ['Research', 'Astrology', 'Finance/investment', 'Forensic work', 'Writing'],
  compatibility: ['vulture', 'crow'],
  incompatibility: ['peacock'],
  birthNakshatras: ['Ashwini', 'Rohini', 'Punarvasu', 'Magha', 'Uttara Phalguni', 'Vishakha', 'Anuradha', 'Shravana'],
  mantra: 'ॐ उलूकाय नमः',
  mantraEnglish: 'Om Ulūkāya Namaḥ',
  remedy:
   'Light a sesame-oil lamp facing south on Saturday evening. Donate black sesame + iron on amavasya. Recite Lakshmi Ashtottara Shatanamavali on Friday nights for wealth attraction.',
 },
 {
  slug: 'crow',
  name: 'Crow',
  sanskrit: 'काक (Kāka)',
  tamil: 'காகை (Kaakai)',
  deity: 'Shani · vehicle of Saturn',
  element: 'air',
  planet: 'Mars',
  direction: 'West',
  dayCount: 4,
  luckyDirection: 'West',
  luckyColor: 'Smoke grey, charcoal, dark red',
  luckyDays: ['Tuesday', 'Saturday'],
  personality:
   'Resourceful, adaptive, networking-natural. Excellent memory, sharp social sense, thrives in groups. Ancestral karma carrier.',
  strengths: [
   'Outstanding memory and ancestor connection',
   'Strong networking and group-action capacity',
   'Adaptive — turns any environment to advantage',
   'Vigilant — early warning of threats',
  ],
  weaknesses: [
   'Can be opportunistic to the point of fault',
   'Restlessness — struggles with solitude',
   'May hoard contacts without depth',
  ],
  careers: ['Sales', 'PR', 'Politics', 'Logistics', 'Recruitment'],
  compatibility: ['owl', 'peacock'],
  incompatibility: ['vulture'],
  birthNakshatras: ['Mrigashira', 'Ardra', 'Purva Phalguni', 'Chitra', 'Purva Ashadha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'],
  mantra: 'ॐ काकाय नमः',
  mantraEnglish: 'Om Kākāya Namaḥ',
  remedy:
   'Feed crows daily at dawn — cooked rice + curd + ghee. Mandatory during Pitru Paksha. Offer black sesame water to peepal tree on Saturdays. Vital for ancestor (pitra) appeasement.',
 },
 {
  slug: 'cock',
  name: 'Cock',
  sanskrit: 'कुक्कुट (Kukkuṭa)',
  tamil: 'சேவல் (Sevai)',
  deity: 'Murugan · god of war',
  element: 'space',
  planet: 'Venus',
  direction: 'North',
  dayCount: 6,
  luckyDirection: 'North',
  luckyColor: 'White, cream, golden yellow',
  luckyDays: ['Friday', 'Wednesday'],
  personality:
   'Early-riser, disciplined, vocal, ritually clean. Punctual to a fault. Natural performer. Loves ceremony and recognition.',
  strengths: [
   'Excellent discipline and routine adherence',
   'Strong vocal/communication ability',
   'Brings energy and order to any group',
   'Daybreak productivity — peak before 9 am',
  ],
  weaknesses: [
   'Can be vain or attention-seeking',
   'Struggles with ambiguity and unstructured time',
   'Crows alarm at minor irritations',
  ],
  careers: ['Performing arts', 'Teaching', 'Hospitality', 'Defence drill', 'Event management'],
  compatibility: ['vulture', 'peacock'],
  incompatibility: ['owl'],
  birthNakshatras: ['Punarvasu', 'Uttara Ashadha', 'Dhanishta', 'Shatabhisha'],
  mantra: 'ॐ कुक्कुटाय नमः',
  mantraEnglish: 'Om Kukkuṭāya Namaḥ',
  remedy:
   'Rise before sunrise and offer water to Surya facing north. Wear white on Fridays. Recite Subrahmanya Bhujanga Stotram on Tuesday mornings to invoke Murugan strength.',
 },
 {
  slug: 'peacock',
  name: 'Peacock',
  sanskrit: 'मयूर (Mayūra)',
  tamil: 'மயில் (Mayil)',
  deity: 'Saraswati & Murugan · vehicle of both',
  element: 'water',
  planet: 'Mercury',
  direction: 'North-East',
  dayCount: 5,
  luckyDirection: 'North-East',
  luckyColor: 'Blue, peacock-green, multi-colour',
  luckyDays: ['Wednesday', 'Friday'],
  personality:
   'Artistic, expressive, intellectually agile. Beauty-loving, communicative, multi-talented. Strong creative and learning ability.',
  strengths: [
   'Outstanding artistic and creative capacity',
   'Sharp intellect — picks up languages and skills fast',
   'Charismatic communicator',
   'Natural teacher and inspirer',
  ],
  weaknesses: [
   'Vanity and showiness — needs admiration',
   'Scattered focus — too many interests',
   'Avoids confrontation, may seem superficial',
  ],
  careers: ['Arts', 'Design', 'Writing', 'Education', 'Media production'],
  compatibility: ['cock', 'crow'],
  incompatibility: ['owl'],
  birthNakshatras: ['Ashlesha', 'Magha', 'Anuradha', 'Uttara Bhadrapada'],
  mantra: 'ॐ मयूराय नमः',
  mantraEnglish: 'Om Mayūrāya Namaḥ',
  remedy:
   'Offer peacock-feather to Murugan or Krishna shrine. Wear blue/green on Wednesdays. Recite Saraswati Vandana before any creative or learning task. Place a peacock feather in the study/altar.',
 },
];

export const ACTIVITIES: { slug: PakshiActivity; label: string; meaning: string; quality: 'best' | 'good' | 'neutral' | 'avoid' | 'worst' }[] = [
 {
  slug: 'rules',
  label: 'Rules (Aalum)',
  meaning: 'Bird at peak power. Best window for important work — signings, beginnings, major action.',
  quality: 'best',
 },
 {
  slug: 'eats',
  label: 'Eats (Unnum)',
  meaning: 'Bird gathering strength. Good for negotiations, money matters, contracts, nourishing activity.',
  quality: 'good',
 },
 {
  slug: 'walks',
  label: 'Walks (Nadakkum)',
  meaning: 'Bird in motion. Neutral. Routine work, travel, exploratory action.',
  quality: 'neutral',
 },
 {
  slug: 'sleeps',
  label: 'Sleeps (Urangum)',
  meaning: 'Bird at low ebb. Avoid major decisions. Rest, plan, study.',
  quality: 'avoid',
 },
 {
  slug: 'dies',
  label: 'Dies (Saavum)',
  meaning: 'Bird at lowest. Worst window — avoid all auspicious work, signings, starts, travel.',
  quality: 'worst',
 },
];

export function getBird(slug: string): PanchaPakshiBird | undefined {
 return PANCHA_PAKSHI_BIRDS.find((b) => b.slug === slug);
}

export function getBirdByNakshatra(nakshatraName: string): PanchaPakshiBird | undefined {
 const target = nakshatraName.trim().toLowerCase();
 return PANCHA_PAKSHI_BIRDS.find((b) =>
  b.birthNakshatras.some((n) => n.toLowerCase() === target),
 );
}

export const ALL_NAKSHATRAS_FOR_DROPDOWN: string[] = Array.from(
 new Set(PANCHA_PAKSHI_BIRDS.flatMap((b) => b.birthNakshatras)),
).sort();

export const ELEMENT_COLOR: Record<PakshiElement, string> = {
 fire: 'border-rose-300 bg-rose-50 text-rose-900',
 earth: 'border-amber-300 bg-amber-50 text-amber-900',
 air: 'border-slate-300 bg-slate-50 text-slate-900',
 water: 'border-sky-300 bg-sky-50 text-sky-900',
 space: 'border-violet-300 bg-violet-50 text-violet-900',
};

export const ACTIVITY_COLOR = {
 best: 'border-emerald-400 bg-emerald-50 text-emerald-900',
 good: 'border-lime-400 bg-lime-50 text-lime-900',
 neutral: 'border-amber-300 bg-amber-50 text-amber-900',
 avoid: 'border-orange-400 bg-orange-50 text-orange-900',
 worst: 'border-rose-400 bg-rose-50 text-rose-900',
} as const;
