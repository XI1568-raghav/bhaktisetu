# apps\web\lib\sapta-rishis.ts

- Rishi · type · L1-L22 — type Rishi = { number: number; slug: string; name: string; sanskrit: string; iast: string; gotra: string; associatedStar: string; associatedStarBayer: string; consort: string; principalSons: string[]; presidingDeity: string; vedaContribution: string; hymnsCount?: string; rishiOfMandala?: string; associatedTirthas: string[]; storySummary: string; keyTeaching: string; principalScriptures: string[]; modernRelevance: string; bestKnownFor: string; };
- rishiSlugs · function · L175-L177 — function rishiSlugs(): string[]
- getRishi · function · L179-L181 — function getRishi(slug: string): Rishi | undefined
