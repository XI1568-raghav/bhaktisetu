# apps\web\components\SelfOnboardForm.tsx

- OnboardRole · type · L7-L12 — type OnboardRole = | 'TEMPLE' | 'PRIEST' | 'ASTROLOGER' | 'WELLNESS_INSTRUCTOR' | 'GAUSHALA';
- SelfOnboardFormProps · interface · L14-L18 — interface SelfOnboardFormProps
- SelfOnboardForm · function · L30-L178 — function SelfOnboardForm({ role, ctaLabel, extraFields }: SelfOnboardFormProps)
- onSubmit · function · L35-L70 — async function onSubmit(event: FormEvent<HTMLFormElement>)
- ExtraInput · function · L180-L208 — function ExtraInput(props: { name: string; label: string; required?: boolean; type?: 'text' | 'number'; placeholder?: string; min?: number; max?: number; })
- ExtraSelect · function · L210-L241 — function ExtraSelect(props: { name: string; label: string; options: { value: string; label: string }[]; required?: boolean; })
- ExtraCheckbox · function · L243-L250 — function ExtraCheckbox(props: { name: string; label: string })
