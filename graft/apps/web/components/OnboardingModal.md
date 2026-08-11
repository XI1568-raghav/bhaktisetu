# apps\web\components\OnboardingModal.tsx

- Props · type · L12-L15 — type Props = { open: boolean; onClose: () => void; };
- track · function · L50-L59 — function track(event: string, props: Record<string, unknown> = {}): void
- OnboardingModal · function · L61-L258 — function OnboardingModal({ open, onClose }: Props)
- onKey · function · L93-L114 — function onKey(e: KeyboardEvent)
- Step1 · function · L262-L328 — function Step1({ onPick, onSkip, selected, }: { onPick: (i: OnboardingIntent) => void; onSkip: () => void; selected: OnboardingIntent | null; })
- Step2 · function · L332-L415 — function Step2({ onPick, onBack, onSkip, selected, }: { onPick: (l: OnboardingLang) => void; onBack: () => void; onSkip: () => void; selected: OnboardingLang | null; })
- Step3 · function · L419-L495 — function Step3({ onPick, onBack, onSkip, selected, }: { onPick: (b: boolean) => void; onBack: () => void; onSkip: () => void; selected: boolean | null; })
