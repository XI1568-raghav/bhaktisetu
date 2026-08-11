# apps\web\lib\auth-context.tsx

- UserRole · type · L15-L15 — type UserRole = 'devotee' | 'priest' | 'store_owner' | 'astrologer' | 'wellness_instructor' | 'gaushala_manager' | 'temple_manager' | 'admin';
- toApiRole · function · L19-L21 — function toApiRole(role: UserRole): string
- fromApiRole · function · L22-L25 — function fromApiRole(role: string | undefined | null): UserRole
- AuthUser · interface · L27-L39 — interface AuthUser
- AuthSession · interface · L41-L46 — interface AuthSession
- AuthContextValue · interface · L48-L60 — interface AuthContextValue
- SignUpData · interface · L62-L68 — interface SignUpData
- handleForEmail · function · L215-L234 — function handleForEmail(email: string): string
- makeDemoSession · function · L236-L244 — function makeDemoSession(email = 'devotee@demo.com'): AuthSession
- getRoleDashboardPath · function · L252-L272 — function getRoleDashboardPath(role: UserRole): string
- getRoleLabel · function · L274-L286 — function getRoleLabel(role: UserRole): string
- setCookie · function · L290-L293 — function setCookie(name: string, value: string, days: number = 7)
- getCookie · function · L295-L298 — function getCookie(name: string): string | null
- removeCookie · function · L300-L302 — function removeCookie(name: string)
- AuthProvider · function · L317-L733 — function AuthProvider({ children }: { children: ReactNode })
- loadSession · function · L367-L441 — async function loadSession()
- useAuth · function · L737-L743 — function useAuth(): AuthContextValue
