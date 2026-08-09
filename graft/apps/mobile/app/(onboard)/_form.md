# apps\mobile\app\(onboard)\_form.tsx

- OnboardRole · type · L20-L25 — type OnboardRole = | 'TEMPLE' | 'PRIEST' | 'ASTROLOGER' | 'WELLNESS_INSTRUCTOR' | 'GAUSHALA';
- SelfOnboardResponse · interface · L27-L31 — interface SelfOnboardResponse
- OnboardScreenProps · interface · L33-L49 — interface OnboardScreenProps
- OnboardScreen · function · L51-L268 — function OnboardScreen({ role, eyebrow, title, subtitle, benefits, ctaLabel, renderExtras, }: OnboardScreenProps)
- setExtra · function · L69-L71 — function setExtra(key: string, value: string | boolean)
- handleSubmit · function · L106-L113 — function handleSubmit()
- ExtraTextInputProps · interface · L270-L279 — interface ExtraTextInputProps
- ExtraTextField · function · L281-L306 — function ExtraTextField({ label, placeholder, required, keyboardType, value, onChange, busy, }: ExtraTextInputProps)
- ExtraSelectProps · interface · L308-L315 — interface ExtraSelectProps
- ExtraSelectField · function · L317-L349 — function ExtraSelectField({ label, options, value, onChange, required, busy, }: ExtraSelectProps)
- ExtraCheckboxProps · interface · L351-L356 — interface ExtraCheckboxProps
- ExtraCheckboxField · function · L358-L372 — function ExtraCheckboxField({ label, value, onChange, busy }: ExtraCheckboxProps)
