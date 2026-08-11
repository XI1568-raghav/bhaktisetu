# apps\web\components\home\_useOnboardingSafe.tsx

- PrimaryIntent · type · L8-L15 — type PrimaryIntent = | 'darshan' | 'puja' | 'wisdom' | 'consult' | 'explore' | null | undefined;
- OnboardingData · type · L17-L22 — type OnboardingData = { primaryIntent?: PrimaryIntent; // Other fields (lang, isNri, etc.) intentionally untyped — they belong to // the real hook and we never read them here. [key: string]: unknown; } | null;
- OnboardingApi · type · L24-L28 — type OnboardingApi = { data: OnboardingData; clearIntent?: () => void; setPrimaryIntent?: (intent: PrimaryIntent) => void; };
- RealHookResult · type · L35-L43 — type RealHookResult = { data?: OnboardingData; // Future-style helpers clearIntent?: () => void; setPrimaryIntent?: (intent: PrimaryIntent) => void; // Current-style helpers set?: (partial: { primaryIntent?: PrimaryIntent } & Record<string, unknown>) => void; reset?: () => void; };
- RealHook · type · L45-L45 — type RealHook = () => RealHookResult;
- loadHook · function · L49-L61 — async function loadHook(): Promise<RealHook | null>
- OnboardingGate · function · L68-L104 — function OnboardingGate({ children, fallback = null, }: { children: (api: OnboardingApi) => ReactNode; fallback?: ReactNode; })
- HookCaller · function · L106-L141 — function HookCaller({ hook, children, }: { hook: RealHook; children: (api: OnboardingApi) => ReactNode; })
