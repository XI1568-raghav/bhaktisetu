# apps\api\src\services\temple.service.ts

- TempleListParams · interface · L5-L15 — interface TempleListParams
- TempleService · class · L17-L449 — class TempleService
- findAll · method · L21-L120 — async findAll(params: TempleListParams)
- findBySlug · method · L125-L207 — async findBySlug(slug: string)
- findNearby · method · L213-L279 — async findNearby(lat: number, lng: number, radiusKm: number = 25)
- search · method · L284-L334 — async search(query: string, page: number = 1, limit: number = 20)
- getReviews · method · L339-L398 — async getReviews(templeSlug: string, page: number = 1, limit: number = 10)
- getTemplePujas · method · L403-L448 — async getTemplePujas(templeSlug: string)
