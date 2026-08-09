# apps\api\src\lib\feature-flags.ts

- CacheEntry · interface · L15-L18 — interface CacheEntry
- cacheKey · function · L22-L24 — function cacheKey(flagKey: string, userId: string): string
- DecideResponse · interface · L26-L28 — interface DecideResponse
- postDecide · function · L30-L50 — async function postDecide( userId: string, ): Promise<Record<string, boolean | string>>
- isFeatureEnabled · function · L57-L79 — async function isFeatureEnabled( flagKey: string, userId: string, ): Promise<boolean>
- getFeatureFlag · function · L85-L103 — async function getFeatureFlag( flagKey: string, userId: string, ): Promise<boolean | string | undefined>
- __clearFeatureFlagCache · function · L106-L108 — function __clearFeatureFlagCache(): void
