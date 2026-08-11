# apps\web\lib\pitra-dosh.ts

- DoshSeverity · type · L7-L7 — type DoshSeverity = 'mild' | 'moderate' | 'severe';
- LifeArea · type · L8-L8 — type LifeArea = 'progeny' | 'marriage' | 'wealth' | 'health' | 'family' | 'career';
- PitraDoshType · interface · L10-L23 — interface PitraDoshType
- SymptomChecker · interface · L25-L32 — interface SymptomChecker
- getDoshType · function · L287-L289 — function getDoshType(slug: string): PitraDoshType | undefined
- getSymptomChecker · function · L291-L293 — function getSymptomChecker(slug: LifeArea): SymptomChecker | undefined
- diagnoseBySymptom · function · L295-L300 — function diagnoseBySymptom(slug: LifeArea): { checker: SymptomChecker; doshes: PitraDoshType[] } | undefined
