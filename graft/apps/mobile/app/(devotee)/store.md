# apps\mobile\app\(devotee)\store.tsx

- StoreCategory · type · L22-L22 — type StoreCategory = 'all' | 'puja-items' | 'idols' | 'books' | 'rudraksha' | 'clothing';
- Product · interface · L24-L34 — interface Product
- ProductCard · function · L139-L195 — function ProductCard({ product }: { product: Product })
- inferStoreCategory · function · L197-L204 — function inferStoreCategory(handle?: string | null, title?: string | null): Exclude<StoreCategory, 'all'>
- StoreScreen · function · L206-L314 — function StoreScreen()
- onRefresh · function · L236-L240 — async function onRefresh()
