# apps\web\lib\bhakti-saints.ts

- BhaktiSaint · type · L1-L26 — type BhaktiSaint = { slug: string; name: string; sanskrit: string; iast: string; era: string; birthYear?: string; deathYear?: string; birthPlace: string; region: string; tradition: string; deity: string; guru?: string; principalWorks: string[]; signatureVerse?: { devanagari: string; iast: string; translation: string; reference: string; }; storySummary: string; keyTeaching: string; associatedPlaces: string[]; modernRelevance: string; bestKnownFor: string; };
- bhaktiSaintSlugs · function · L481-L483 — function bhaktiSaintSlugs(): string[]
- getBhaktiSaint · function · L485-L487 — function getBhaktiSaint(slug: string): BhaktiSaint | undefined
