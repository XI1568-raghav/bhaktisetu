# apps\web\lib\baby-names.ts

- Gender · type · L12-L12 — type Gender = 'boy' | 'girl' | 'all';
- BabyName · type · L14-L19 — type BabyName = { name: string; meaning: string; deity?: string; gender: 'boy' | 'girl'; };
- syllablesForNakshatra · function · L474-L476 — function syllablesForNakshatra(slug: string): [string, string, string, string] | null
- namesStartingWith · function · L478-L482 — function namesStartingWith(syllable: string, gender: Gender = 'all'): BabyName[]
- NakshatraNameReport · type · L484-L487 — type NakshatraNameReport = { nakshatra: Nakshatra; padas: Array<{ pada: number; syllable: string; names: BabyName[] }>; };
- nakshatraNameReport · function · L489-L499 — function nakshatraNameReport(slug: string, gender: Gender = 'all'): NakshatraNameReport | null
- allNakshatraOptions · function · L501-L503 — function allNakshatraOptions(): Array<{ slug: string; label: string }>
