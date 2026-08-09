# apps\web\components\temples\TemplesBrowser.tsx

- DeityTypeFilter · type · L20-L20 — type DeityTypeFilter = 'All' | 'Shiva' | 'Vishnu' | 'Shakti' | 'Ganesha' | 'Sikh' | 'Other';
- SortMode · type · L21-L21 — type SortMode = 'popularity' | 'alphabetical' | 'state';
- TempleCardData · interface · L23-L42 — interface TempleCardData
- deityFallbackKey · function · L44-L52 — function deityFallbackKey(deityType: DeityTypeFilter): string
- TemplesBrowser · function · L63-L284 — function TemplesBrowser({ temples, total, }: { temples: TempleCardData[]; total: number; })
- resetFilters · function · L136-L142 — resetFilters = ()
- TempleCard · function · L286-L361 — function TempleCard({ temple }: { temple: TempleCardData })
