# apps\web\lib\feature-flags.ts

- UseFeatureFlagOptions · interface · L5-L7 — interface UseFeatureFlagOptions<T extends boolean | string>
- useFeatureFlag · function · L9-L36 — function useFeatureFlag<T extends boolean | string = boolean>( flagKey: string, options: UseFeatureFlagOptions<T> = {}, ): T | undefined
- update · function · L21-L25 — update = ()
- getClientFeatureFlag · function · L38-L48 — function getClientFeatureFlag<T extends boolean | string>( flagKey: string, defaultValue: T, ): T
