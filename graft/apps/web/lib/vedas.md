# apps\web\lib\vedas.ts

- Veda · type · L1-L30 — type Veda = { number: number; slug: string; name: string; sanskrit: string; iast: string; meaning: string; approxDate: string; totalMantras: number; mandalaOrKandaCount: number; mandalaLabel: string; shakhasExtant: number; shakhasOriginal: number; principalDeities: string[]; primaryFocus: string; associatedPriest: string; associatedPriestRole: string; summary: string; fourParts: { samhita: string; brahmana: string; aranyaka: string; upanishad: string; }; principalUpanishads: string[]; famousHymns: { name: string; reference: string; significance: string }[]; oralPreservation: string; modernRelevance: string; bestKnownFor: string; };
- vedaSlugs · function · L176-L178 — function vedaSlugs(): string[]
- getVeda · function · L180-L182 — function getVeda(slug: string): Veda | undefined
