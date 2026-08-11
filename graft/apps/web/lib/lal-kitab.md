# apps\web\lib\lal-kitab.ts

- GrahaCode · type · L7-L9 — type GrahaCode = | 'surya' | 'chandra' | 'mangal' | 'budh' | 'guru' | 'shukra' | 'shani' | 'rahu' | 'ketu';
- Graha · type · L11-L25 — type Graha = { code: GrahaCode; sanskrit: string; name: string; // English western: string; // Western equivalent nature: 'benefic' | 'malefic' | 'mixed'; element: 'Fire' | 'Water' | 'Earth' | 'Air' | 'Ether'; day: string; // ruling weekday metal: string; color: string; gemstone: string; deity: string; generalUpay: string[]; // 3 universal Farman per graha significance: string; };
- LifeProblem · type · L27-L39 — type LifeProblem = | 'career' | 'marriage' | 'health' | 'wealth' | 'legal-case' | 'family-discord' | 'education' | 'foreign-travel' | 'property' | 'progeny' | 'mental-peace' | 'enemy-trouble';
- ProblemDef · type · L41-L47 — type ProblemDef = { value: LifeProblem; label: string; sanskrit: string; grahas: GrahaCode[]; // most-commonly-afflicting grahas per Lal Kitab description: string; };
- HouseEffect · type · L49-L55 — type HouseEffect = { house: number; // 1..12 sanskrit: string; // bhava name verdict: 'auspicious' | 'neutral' | 'troubling'; effect: string; // short effect string upay: string; // Lal Kitab specific Farman };
- houseLabel · function · L182-L182 — function houseLabel(n: number): string
- getHouseEffects · function · L313-L321 — function getHouseEffects(graha: GrahaCode): HouseEffect[]
- getGraha · function · L323-L327 — function getGraha(code: GrahaCode): Graha
- getProblem · function · L329-L333 — function getProblem(value: LifeProblem): ProblemDef
- ProblemResult · type · L335-L338 — type ProblemResult = { problem: ProblemDef; grahas: Array<{ graha: Graha; troublingHouses: HouseEffect[] }>; };
- diagnoseByProblem · function · L340-L350 — function diagnoseByProblem(value: LifeProblem): ProblemResult
