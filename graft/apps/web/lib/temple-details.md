# apps\web\lib\temple-details.ts

- DeityType · type · L6-L6 — type DeityType = 'Shiva' | 'Vishnu' | 'Shakti' | 'Ganesha' | 'Sikh' | 'Other';
- PujaOffering · interface · L8-L15 — interface PujaOffering
- TempleDetailRich · interface · L17-L72 — interface TempleDetailRich
- getTempleDetail · function · L2009-L2011 — function getTempleDetail(slug: string): TempleDetailRich | null
- getAllTempleDetails · function · L2013-L2015 — function getAllTempleDetails(): TempleDetailRich[]
- getSimilarTemples · function · L2017-L2023 — function getSimilarTemples(slug: string, limit = 3): TempleDetailRich[]
- filterTempleDetails · function · L2026-L2045 — function filterTempleDetails(params: { state?: string; deityType?: DeityType | 'All'; search?: string; }): TempleDetailRich[]
