# apps\api\src\services\provider.service.ts

- ProviderTypeKey · type · L5-L5 — type ProviderTypeKey = 'pandit' | 'store' | 'astrologer' | 'wellness' | 'gaushala' | 'temple';
- ProviderFilters · interface · L7-L15 — interface ProviderFilters
- ProviderListResult · interface · L17-L22 — interface ProviderListResult
- ReviewInput · interface · L24-L30 — interface ReviewInput
- stripProviderPii · function · L189-L195 — function stripProviderPii<T extends Record<string, unknown>>(p: T): Record<string, unknown>
- ProviderService · class · L197-L584 — class ProviderService
- getProviders · method · L198-L216 — async getProviders(type: ProviderTypeKey, filters: ProviderFilters): Promise<ProviderListResult>
- enrichRatingFields · method · L224-L262 — private async enrichRatingFields( type: ProviderTypeKey, p: Record<string, unknown>, ): Promise<Record<string, unknown>>
- getProviderById · method · L264-L300 — async getProviderById(type: ProviderTypeKey, id: string): Promise<Record<string, unknown> | null>
- updateProvider · method · L302-L316 — async updateProvider(type: ProviderTypeKey, id: string, userId: string, updates: Record<string, unknown>): Promise<Record<string, unknown> | null>
- addReview · method · L318-L353 — async addReview(input: ReviewInput): Promise<{ review: Record<string, unknown>; message: string }>
- queryProviders · method · L357-L481 — private async queryProviders(type: ProviderTypeKey, filters: ProviderFilters, page: number, limit: number): Promise<ProviderListResult>
- queryProviderById · method · L483-L504 — private async queryProviderById(type: ProviderTypeKey, id: string): Promise<Record<string, unknown> | null>
- updateProviderProfile · method · L506-L550 — private async updateProviderProfile(type: ProviderTypeKey, id: string, userId: string, updates: Record<string, unknown>): Promise<Record<string, unknown> | null>
- getMockProviders · method · L552-L583 — private getMockProviders(type: ProviderTypeKey, filters: ProviderFilters, page: number, limit: number): ProviderListResult
