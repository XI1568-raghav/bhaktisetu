# apps\web\lib\category-tree.ts

- CategoryItem · type · L1-L5 — type CategoryItem = { label: string; href: string; description: string; };
- AccentColor · type · L7-L7 — type AccentColor = 'saffron' | 'indigo' | 'emerald' | 'amber';
- CategoryKey · type · L9-L9 — type CategoryKey = 'worship' | 'library' | 'astrology' | 'yatra' | 'shop';
- LibrarySubGroup · type · L11-L16 — type LibrarySubGroup = { heading: string; hubHref: string; hubLabel: string; items: CategoryItem[]; };
- Category · type · L18-L27 — type Category = { key: CategoryKey; label: string; tagline: string; accentColor: AccentColor; items: CategoryItem[]; featured?: { label: string; href: string; sublabel?: string }; /** Only set for `library` · drives 4-col LibraryMegaPanel layout. */ subGroups?: LibrarySubGroup[]; };
- getCategory · function · L222-L224 — function getCategory(key: CategoryKey): Category | undefined
