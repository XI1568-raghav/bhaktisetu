# apps\mobile\lib\auth-context.tsx

- makeDemoSession · function · L147-L154 — function makeDemoSession(): AuthSession
- loadStored · function · L169-L176 — async function loadStored<T>(key: string): Promise<T | null>
- storeJson · function · L178-L188 — async function storeJson(key: string, value: unknown | null): Promise<void>
- getStoredAccessToken · function · L194-L197 — async function getStoredAccessToken(): Promise<string | undefined>
- setOnAuthExpired · function · L215-L217 — function setOnAuthExpired(fn: (() => void) | null): void
- onUnauthorisedMobile · function · L226-L238 — async function onUnauthorisedMobile(): Promise<void>
- SignUpData · interface · L242-L248 — interface SignUpData
- AuthContextValue · interface · L252-L272 — interface AuthContextValue
- AuthProvider · function · L278-L550 — function AuthProvider({ children }: { children: ReactNode })
- load · function · L303-L358 — async function load()
- useAuth · function · L552-L558 — function useAuth(): AuthContextValue
