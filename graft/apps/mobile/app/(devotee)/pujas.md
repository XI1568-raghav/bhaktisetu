# apps\mobile\app\(devotee)\pujas.tsx

- PujaCategory · type · L16-L16 — type PujaCategory = 'all' | 'shiva' | 'vishnu' | 'devi' | 'ganesh' | 'navagraha';
- Puja · interface · L18-L34 — interface Puja
- inferCategory · function · L150-L158 — function inferCategory(deity: string): Exclude<PujaCategory, 'all'>
- PujasScreen · function · L239-L344 — function PujasScreen()
- onRefresh · function · L275-L279 — async function onRefresh()
