# apps\web\lib\yoga-sutras.ts

- YogaPada · type · L1-L15 — type YogaPada = { number: 1 | 2 | 3 | 4; slug: string; sanskrit: string; english: string; iast: string; sutraCount: number; centralFocus: string; audience: string; summary: string; keyConcepts: string[]; keySutras: Array<{ ref: string; sanskrit: string; iast: string; translation: string; commentary?: string }>; practicePillars?: string[]; takeaway: string; };
- padaSlugs · function · L211-L213 — function padaSlugs(): string[]
- getPada · function · L215-L217 — function getPada(slug: string): YogaPada | undefined
