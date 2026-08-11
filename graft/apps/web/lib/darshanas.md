# apps\web\lib\darshanas.ts

- DarshanaPair · type · L1-L1 — type DarshanaPair = 'logic-atomism' | 'enumeration-discipline' | 'ritual-knowledge';
- Darshana · type · L3-L22 — type Darshana = { number: number; slug: string; name: string; sanskrit: string; iast: string; founder: string; foundingText: string; foundingTextSanskrit: string; approxDate: string; pair: DarshanaPair; centralThesis: string; summary: string; keyConcepts: string[]; pramanas: string[]; liberationPath: string; keyTexts: string[]; modernRelevance: string; bestKnownFor: string; };
- darshanaSlugs · function · L193-L195 — function darshanaSlugs(): string[]
- getDarshana · function · L197-L199 — function getDarshana(slug: string): Darshana | undefined
