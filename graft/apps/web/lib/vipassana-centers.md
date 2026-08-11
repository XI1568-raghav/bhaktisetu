# apps\web\lib\vipassana-centers.ts

- VipassanaLineage · type · L1-L6 — type VipassanaLineage = | 'goenka' | 'mahasi' | 'thai-forest' | 'tibetan-vipassana' | 'imc-lineage';
- VipassanaRegion · type · L8-L8 — type VipassanaRegion = 'india' | 'usa-canada' | 'uk-europe' | 'asia-pacific';
- VipassanaCenter · interface · L10-L30 — interface VipassanaCenter
- getCenter · function · L604-L606 — function getCenter(slug: string): VipassanaCenter | undefined
- centerSlugs · function · L608-L610 — function centerSlugs(): string[]
- byRegion · function · L612-L614 — function byRegion(region: VipassanaRegion): VipassanaCenter[]
- byLineage · function · L616-L618 — function byLineage(lineage: VipassanaLineage): VipassanaCenter[]
