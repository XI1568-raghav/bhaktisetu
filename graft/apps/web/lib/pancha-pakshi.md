# apps\web\lib\pancha-pakshi.ts

- PakshiSlug · type · L1-L1 — type PakshiSlug = 'vulture' | 'owl' | 'crow' | 'cock' | 'peacock';
- PakshiElement · type · L3-L3 — type PakshiElement = 'fire' | 'earth' | 'air' | 'water' | 'space';
- PakshiActivity · type · L5-L5 — type PakshiActivity = 'rules' | 'eats' | 'walks' | 'sleeps' | 'dies';
- PanchaPakshiBird · interface · L7-L30 — interface PanchaPakshiBird
- getBird · function · L243-L245 — function getBird(slug: string): PanchaPakshiBird | undefined
- getBirdByNakshatra · function · L247-L252 — function getBirdByNakshatra(nakshatraName: string): PanchaPakshiBird | undefined
