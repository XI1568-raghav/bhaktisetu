# apps\web\lib\onboarding-store.ts

- OnboardingIntent · type · L12-L17 — type OnboardingIntent = | 'darshan' | 'puja' | 'wisdom' | 'consult' | 'explore';
- OnboardingLang · type · L19-L19 — type OnboardingLang = 'en' | 'hi' | 'ta' | 'te' | 'bn' | 'mr';
- OnboardingState · type · L21-L28 — type OnboardingState = { primaryIntent: OnboardingIntent | null; lang: OnboardingLang | null; isNri: boolean | null; completedAt: string | null; currentStep: 0 | 1 | 2 | 3; version: 1; };
- isBrowser · function · L43-L45 — function isBrowser(): boolean
- isValidIntent · function · L47-L56 — function isValidIntent(v: unknown): v is OnboardingIntent | null
- isValidLang · function · L58-L68 — function isValidLang(v: unknown): v is OnboardingLang | null
- isValidStep · function · L70-L72 — function isValidStep(v: unknown): v is 0 | 1 | 2 | 3
- normalize · function · L74-L91 — function normalize(raw: unknown): OnboardingState | null
- getOnboarding · function · L101-L133 — function getOnboarding(): OnboardingState | null
- setOnboarding · function · L135-L149 — function setOnboarding(partial: Partial<OnboardingState>): void
- clearOnboarding · function · L151-L159 — function clearOnboarding(): void
- isOnboardingFlagEnabled · function · L170-L172 — function isOnboardingFlagEnabled(): boolean
