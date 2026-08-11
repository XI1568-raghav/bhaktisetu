# apps\web\lib\numerology.ts

- NumerologyKind · type · L9-L9 — type NumerologyKind = 'lifePath' | 'birthday' | 'nameChaldean' | 'nameSoul' | 'namePersonality';
- NumerologyResult · type · L11-L20 — type NumerologyResult = { lifePath: number; lifePathSteps: string; birthday: number; nameChaldean: number; nameSoul: number; namePersonality: number; input: { dob: string; name: string }; meanings: Record<NumerologyKind, NumberMeaning>; };
- NumberMeaning · type · L22-L34 — type NumberMeaning = { number: number; title: string; element?: string; planet?: string; short: string; strengths: string[]; challenges: string[]; careers: string[]; luckyDays: string[]; luckyColors: string[]; spiritualNote: string; };
- reduce · function · L58-L63 — function reduce(n: number, allowMaster = true): number
- reduceWithTrace · function · L65-L73 — function reduceWithTrace(n: number): { value: number; trace: string }
- lifePath · function · L76-L82 — function lifePath(dob: string): { value: number; trace: string }
- birthdayNumber · function · L85-L100 — function birthdayNumber(dob: string): number
- nameSum · function · L103-L110 — function nameSum(name: string, map: Record<string, number>, filter: (ch: string) => boolean = () => true): number
- nameChaldean · function · L112-L114 — function nameChaldean(name: string): number
- nameSoulUrge · function · L116-L118 — function nameSoulUrge(name: string): number
- namePersonality · function · L120-L122 — function namePersonality(name: string): number
- getMeaning · function · L248-L250 — function getMeaning(n: number): NumberMeaning
- computeNumerology · function · L252-L276 — function computeNumerology(dob: string, name: string): NumerologyResult | null
- listAllMeanings · function · L281-L283 — function listAllMeanings(): NumberMeaning[]
