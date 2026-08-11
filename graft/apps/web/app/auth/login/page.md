# apps\web\app\auth\login\page.tsx

- safeRedirect · function · L26-L37 — function safeRedirect(raw: string | null, fallback: string): string
- AuthTab · type · L39-L39 — type AuthTab = 'email' | 'phone';
- Step · type · L40-L40 — type Step = 'input' | 'otp';
- GoogleIcon · function · L42-L63 — function GoogleIcon({ className }: { className?: string })
- LoginPage · function · L65-L679 — function LoginPage()
- formatPhoneDisplay · function · L136-L140 — formatPhoneDisplay = (value: string)
- handleEmailLogin · function · L144-L166 — handleEmailLogin = async ()
- handleSendOtp · function · L170-L192 — handleSendOtp = async ()
- handleOtpChange · function · L194-L217 — handleOtpChange = (index: number, value: string)
- handleOtpKeyDown · function · L219-L223 — handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>)
- handleResendOtp · function · L262-L282 — handleResendOtp = async ()
