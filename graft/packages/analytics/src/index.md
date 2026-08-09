# packages\analytics\src\index.ts

- AnalyticsConfig · interface · L9-L16 — interface AnalyticsConfig
- UserTraits · interface · L18-L28 — interface UserTraits
- EventProperties · interface · L30-L32 — interface EventProperties
- initAnalytics · function · L44-L75 — function initAnalytics(config: AnalyticsConfig): void
- identifyUser · function · L82-L89 — function identifyUser( userId: string, traits?: UserTraits ): void
- resetUser · function · L94-L98 — function resetUser(): void
- trackEvent · function · L103-L110 — function trackEvent( eventName: string, properties?: EventProperties ): void
- trackPageView · function · L115-L126 — function trackPageView( pageName?: string, properties?: EventProperties ): void
- setSuperProperties · function · L131-L137 — function setSuperProperties( properties: EventProperties ): void
- isFeatureEnabled · function · L142-L146 — function isFeatureEnabled(flagKey: string): boolean
- getFeatureFlag · function · L151-L157 — function getFeatureFlag( flagKey: string ): string | boolean | undefined
- setGroup · function · L162-L170 — function setGroup( groupType: string, groupKey: string, groupProperties?: EventProperties ): void
