// Vastu Shastra — 8-direction room placement scorer per Mayamatam +
// Vishwakarma Prakash + Brihat Samhita. Pure data + scoring, no astronomy.
// 8 dishas × 5 mahabhuta. Each room has ideal / acceptable / avoid directions
// with shastric reasoning. Composite score 0..100 per placement.

export type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export type Disha = {
 code: Direction;
 sanskrit: string;       // Devanagari
 name: string;           // English label
 deity: string;          // presiding lord
 planet: string;         // ruling graha
 element: 'Earth' | 'Water' | 'Fire' | 'Air' | 'Ether';
 nature: 'auspicious' | 'neutral' | 'fierce';
 significance: string;
};

export const DISHAS: Disha[] = [
 { code: 'N',  sanskrit: 'उत्तर',   name: 'North',       deity: 'Kubera',  planet: 'Mercury', element: 'Water', nature: 'auspicious', significance: 'Wealth, prosperity, career growth. Lord of treasure.' },
 { code: 'NE', sanskrit: 'ईशान्य',  name: 'North-East',  deity: 'Ishana',  planet: 'Jupiter', element: 'Water', nature: 'auspicious', significance: 'Most sacred zone (Ishan kona). Spiritual energy, clarity, wisdom. Where puja + water belong.' },
 { code: 'E',  sanskrit: 'पूर्व',    name: 'East',        deity: 'Indra',   planet: 'Sun',     element: 'Air',   nature: 'auspicious', significance: 'Sunrise direction. Health, vitality, fame. Best for main entrance + study.' },
 { code: 'SE', sanskrit: 'आग्नेय',   name: 'South-East',  deity: 'Agni',    planet: 'Venus',   element: 'Fire',  nature: 'neutral',    significance: 'Fire zone (Agni kona). Kitchen + electrical equipment belong here.' },
 { code: 'S',  sanskrit: 'दक्षिण',   name: 'South',       deity: 'Yama',    planet: 'Mars',    element: 'Fire',  nature: 'fierce',     significance: 'Lord of dharma + death. Heavy-mass zone — store rooms, vaults. Never water or septic.' },
 { code: 'SW', sanskrit: 'नैऋत्य',  name: 'South-West',  deity: 'Niruti',  planet: 'Rahu',    element: 'Earth', nature: 'fierce',     significance: 'Heaviest, most stable zone. Master bedroom + heavy storage. Never doors or windows here.' },
 { code: 'W',  sanskrit: 'पश्चिम',   name: 'West',        deity: 'Varuna',  planet: 'Saturn',  element: 'Water', nature: 'neutral',    significance: 'Lord of waters. Stability, gains through profession. Children’s bedroom + dining.' },
 { code: 'NW', sanskrit: 'वायव्य',  name: 'North-West',  deity: 'Vayu',    planet: 'Moon',    element: 'Air',   nature: 'neutral',    significance: 'Wind zone (Vayu kona). Guest room + toilet + storage. Energy of movement + change.' },
];

export type RoomType =
 | 'pooja-room'
 | 'main-entrance'
 | 'kitchen'
 | 'master-bedroom'
 | 'children-bedroom'
 | 'guest-bedroom'
 | 'living-room'
 | 'dining-room'
 | 'study-room'
 | 'bathroom'
 | 'toilet'
 | 'store-room'
 | 'staircase'
 | 'water-tank'
 | 'septic-tank';

export type RoomDef = {
 value: RoomType;
 label: string;
 sanskrit: string;
 ideal: Direction[];       // primary placement (+50 each)
 acceptable: Direction[];  // secondary (+25)
 avoid: Direction[];       // strict avoid (-50)
 shastra: string;          // one-line reasoning
};

export const ROOMS: RoomDef[] = [
 { value: 'pooja-room',       label: 'Pooja room',           sanskrit: 'पूजा गृह',     ideal: ['NE'],        acceptable: ['E', 'N'],          avoid: ['S', 'SW', 'SE'],     shastra: 'Ishan kona is sacred zone — idols face East or West; devotee faces East/North while praying.' },
 { value: 'main-entrance',    label: 'Main entrance',        sanskrit: 'मुख्य द्वार',  ideal: ['N', 'E', 'NE'], acceptable: ['NW', 'SE'],     avoid: ['SW', 'S'],            shastra: 'East/North entrance receives morning prana. SW entrance considered Niruti — root cause of household disputes.' },
 { value: 'kitchen',          label: 'Kitchen',              sanskrit: 'पाकशाला',     ideal: ['SE'],        acceptable: ['NW'],              avoid: ['NE', 'SW', 'N'],     shastra: 'Agni kona is the fire-element zone. Cook facing East. NE kitchen burns household wealth.' },
 { value: 'master-bedroom',   label: 'Master bedroom',       sanskrit: 'शयन कक्ष',    ideal: ['SW'],        acceptable: ['S', 'W'],          avoid: ['NE', 'SE'],          shastra: 'SW is heavy-earth zone — stability + authority for head of family. Sleep head-south or head-east.' },
 { value: 'children-bedroom', label: 'Children’s bedroom', sanskrit: 'बाल कक्ष',  ideal: ['W', 'NW'],   acceptable: ['N', 'E'],          avoid: ['SW'],                 shastra: 'West aids studies + memory (Saturn). Avoid SW — children there overpower parents.' },
 { value: 'guest-bedroom',    label: 'Guest bedroom',        sanskrit: 'अतिथि कक्ष',  ideal: ['NW'],        acceptable: ['S', 'W'],          avoid: ['NE'],                 shastra: 'Vayu kona governs transient stays. Guests in NE overstay — wisdom of Vayu = movement.' },
 { value: 'living-room',      label: 'Living room',          sanskrit: 'बैठक',         ideal: ['NE', 'E', 'N'], acceptable: ['NW'],           avoid: ['SW'],                 shastra: 'Open-energy zones for social activity. SW heavy-storage clashes with light social use.' },
 { value: 'dining-room',      label: 'Dining room',          sanskrit: 'भोजन कक्ष',   ideal: ['W'],         acceptable: ['E', 'SE'],         avoid: ['SW', 'NE'],          shastra: 'Diners face East / North while eating. West dining promotes proper digestion (Saturn rules slow processes).' },
 { value: 'study-room',       label: 'Study room',           sanskrit: 'अध्ययन कक्ष', ideal: ['E', 'NE'],   acceptable: ['N', 'W'],          avoid: ['S', 'SW'],            shastra: 'Sun (E) + Jupiter (NE) zones build focus + memory. Student faces East while studying.' },
 { value: 'bathroom',         label: 'Bathroom (bath only)', sanskrit: 'स्नानगृह',    ideal: ['E', 'N'],    acceptable: ['NW'],              avoid: ['NE', 'SW', 'SE'],    shastra: 'Bathing zone — East morning sun is sterilizing. Keep separate from toilet where possible.' },
 { value: 'toilet',           label: 'Toilet (WC)',          sanskrit: 'शौचालय',      ideal: ['NW', 'W'],   acceptable: ['S'],               avoid: ['NE', 'E', 'SE'],     shastra: 'Drainage to NW or W. Toilet in NE is the single worst Vastu dosha — destroys wealth + spiritual energy.' },
 { value: 'store-room',       label: 'Store room',           sanskrit: 'भंडार कक्ष',  ideal: ['SW', 'S'],   acceptable: ['W', 'NW'],         avoid: ['NE'],                 shastra: 'Heavy items in heavy zones. Grain + valuables in SW. NE storage blocks fresh prana inflow.' },
 { value: 'staircase',        label: 'Staircase',            sanskrit: 'सोपान',       ideal: ['S', 'SW', 'W'], acceptable: ['SE', 'NW'],     avoid: ['NE'],                 shastra: 'Stairs in heavy zones. Always clockwise ascending. Centre (brahmasthan) must remain open + empty.' },
 { value: 'water-tank',       label: 'Underground water',    sanskrit: 'भू-जल',       ideal: ['NE', 'N'],   acceptable: ['E'],               avoid: ['SE', 'SW', 'S'],     shastra: 'NE underground water (well/borewell/sump) is Brahma’s blessing. SW or fire-zone water = ruin.' },
 { value: 'septic-tank',      label: 'Septic tank',          sanskrit: 'मल कुंड',     ideal: ['NW'],        acceptable: ['W'],               avoid: ['NE', 'E', 'SE', 'N'], shastra: 'Septic must be in air/water-discharge zones. Never under NE — entire house karma corrupts.' },
];

export type Placement = {
 room: RoomType;
 roomLabel: string;
 roomSanskrit: string;
 chosen: Direction;
 score: number;             // 0..100
 verdict: 'excellent' | 'good' | 'acceptable' | 'avoid';
 reasoning: string;         // shastric one-liner
 disha: Disha;
};

export type VastuResult = {
 facing: Direction;
 facingDisha: Disha;
 placements: Placement[];
 overallScore: number;      // mean across placements
 verdict: 'excellent' | 'good' | 'acceptable' | 'needs-correction';
 strengths: string[];
 dosha: string[];           // doshas to fix
};

export type VastuInput = {
 facing: Direction;           // direction the main entrance faces
 rooms: Array<{ room: RoomType; chosen: Direction }>;
};

export function getDisha(code: Direction): Disha {
 return DISHAS.find((d) => d.code === code) ?? DISHAS[0]!;
}

export function getRoom(value: RoomType): RoomDef {
 return ROOMS.find((r) => r.value === value) ?? ROOMS[0]!;
}

function scoreSingle(room: RoomDef, chosen: Direction): { score: number; verdict: Placement['verdict']; reasoning: string } {
 const baseline = 50;
 let raw = baseline;
 let kind: 'ideal' | 'acceptable' | 'avoid' | 'neutral' = 'neutral';

 if (room.ideal.includes(chosen)) { raw += 40; kind = 'ideal'; }
 else if (room.acceptable.includes(chosen)) { raw += 20; kind = 'acceptable'; }
 else if (room.avoid.includes(chosen)) { raw -= 50; kind = 'avoid'; }
 else { raw -= 10; kind = 'neutral'; }

 const score = Math.max(0, Math.min(100, raw));
 let verdict: Placement['verdict'];
 if (kind === 'ideal') verdict = 'excellent';
 else if (kind === 'acceptable') verdict = 'good';
 else if (kind === 'neutral') verdict = 'acceptable';
 else verdict = 'avoid';

 const reasoning =
  kind === 'ideal'      ? `Ideal direction. ${room.shastra}`
  : kind === 'acceptable' ? `Acceptable secondary. ${room.shastra}`
  : kind === 'avoid'    ? `Vastu dosha — strongly avoid. ${room.shastra}`
  :                       `Not ideal but workable. ${room.shastra}`;

 return { score, verdict, reasoning };
}

export function computeVastu(input: VastuInput): VastuResult {
 const facingDisha = getDisha(input.facing);
 const placements: Placement[] = input.rooms.map(({ room, chosen }) => {
  const def = getRoom(room);
  const { score, verdict, reasoning } = scoreSingle(def, chosen);
  return {
   room,
   roomLabel: def.label,
   roomSanskrit: def.sanskrit,
   chosen,
   score,
   verdict,
   reasoning,
   disha: getDisha(chosen),
  };
 });

 const overallScore = placements.length
  ? Math.round(placements.reduce((s, p) => s + p.score, 0) / placements.length)
  : 0;

 const strengths = placements
  .filter((p) => p.verdict === 'excellent')
  .map((p) => `${p.roomLabel} in ${p.disha.name} — ${p.disha.deity}’s blessing`);

 const dosha = placements
  .filter((p) => p.verdict === 'avoid')
  .map((p) => `${p.roomLabel} in ${p.disha.name} (${p.disha.sanskrit}) — ${p.disha.deity} zone clashes with this room’s nature`);

 let overall: VastuResult['verdict'] = 'acceptable';
 if (overallScore >= 80) overall = 'excellent';
 else if (overallScore >= 65) overall = 'good';
 else if (overallScore >= 45) overall = 'acceptable';
 else overall = 'needs-correction';

 return {
  facing: input.facing,
  facingDisha,
  placements,
  overallScore,
  verdict: overall,
  strengths,
  dosha,
 };
}

// Default placement suggestion per room — for "show me ideal layout" mode.
export function suggestIdealLayout(): Record<RoomType, Direction> {
 const out = {} as Record<RoomType, Direction>;
 for (const r of ROOMS) out[r.value] = r.ideal[0]!;
 return out;
}
