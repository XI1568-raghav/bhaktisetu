# apps\web\lib\samskaras.ts

- SamskaraStage · type · L1-L1 — type SamskaraStage = 'prenatal' | 'childhood' | 'student' | 'householder' | 'final';
- Samskara · type · L3-L17 — type Samskara = { number: number; slug: string; name: string; sanskrit: string; iast: string; stage: SamskaraStage; timing: string; purpose: string; ritualSummary: string; keyElements: string[]; whoPerforms: string; modernRelevance: string; scripturalReference?: string; };
- samskaraSlugs · function · L252-L254 — function samskaraSlugs(): string[]
- getSamskara · function · L256-L258 — function getSamskara(slug: string): Samskara | undefined
