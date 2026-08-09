# apps\web\lib\puranas.ts

- PuranaAlignment · type · L1-L1 — type PuranaAlignment = 'sattvic' | 'rajasic' | 'tamasic';
- Purana · type · L3-L17 — type Purana = { number: number; slug: string; name: string; sanskrit: string; iast: string; alignment: PuranaAlignment; presidingDeity: 'Vishnu' | 'Shiva' | 'Brahma' | 'Devi' | 'Mixed'; verseCount: number; centralTheme: string; summary: string; notableStories: string[]; whyRead: string; bestKnownFor: string; };
- puranaSlugs · function · L294-L296 — function puranaSlugs(): string[]
- getPurana · function · L298-L300 — function getPurana(slug: string): Purana | undefined
