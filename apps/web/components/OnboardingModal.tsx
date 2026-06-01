'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Video, Flame, BookOpen, MessageCircleQuestion, Compass, MapPin, Globe2, type LucideIcon } from 'lucide-react';
import {
  ONBOARDING_LANGUAGE_KEY,
  type OnboardingIntent,
  type OnboardingLang,
} from '../lib/onboarding-store';
import { useOnboarding } from '../lib/use-onboarding';

type Props = {
  open: boolean;
  onClose: () => void;
};

const INTENT_OPTIONS: {
  key: OnboardingIntent;
  icon: LucideIcon;
  title: string;
  caption: string;
  href: string | null;
}[] = [
  { key: 'darshan', icon: Video, title: 'Live Darshan', caption: 'Watch from home', href: '/darshan' },
  { key: 'puja', icon: Flame, title: 'Book a Puja', caption: 'At a temple', href: '/pujas' },
  { key: 'wisdom', icon: BookOpen, title: 'Read & Learn', caption: 'Scriptures, more', href: '/content' },
  { key: 'consult', icon: MessageCircleQuestion, title: 'Talk to a Pandit', caption: 'AI guidance', href: '/ask-pandit' },
  { key: 'explore', icon: Compass, title: 'Just exploring', caption: 'Show me around', href: null },
];

const LANG_OPTIONS: {
  code: OnboardingLang;
  label: string;
  native: string;
  active: boolean;
}[] = [
  { code: 'en', label: 'English', native: 'English', active: true },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', active: true },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', active: false },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', active: false },
  { code: 'bn', label: 'Bengali', native: 'বাংলা', active: false },
  { code: 'mr', label: 'Marathi', native: 'मराठी', active: false },
];

const NRI_OPTIONS: { value: boolean; icon: LucideIcon; title: string; caption: string }[] = [
  { value: false, icon: MapPin, title: 'India', caption: 'Pay in INR' },
  { value: true, icon: Globe2, title: 'Outside India', caption: 'NRI / Diaspora' },
];

function track(event: string, props: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent('darshya:posthog', { detail: { event, props } }),
    );
  } catch {
    /* noop */
  }
}

export default function OnboardingModal({ open, onClose }: Props) {
  const { data, set } = useOnboarding();
  const [step, setStep] = useState<1 | 2 | 3>(() => {
    const cs = data?.currentStep;
    if (cs === 1) return 2;
    if (cs === 2) return 3;
    return 1;
  });
  const dialogRef = useRef<HTMLDivElement>(null);

  // Initialize step from store when first opened.
  useEffect(() => {
    if (!open) return;
    const cs = data?.currentStep ?? 0;
    setStep(cs === 1 ? 2 : cs === 2 ? 3 : 1);
    track('onboarding_opened', { fromStep: cs });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape closes; basic focus trap (Tab cycles inside dialog).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Auto-focus the panel on mount.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      dialogRef.current?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  const handleSkip = useCallback(() => {
    track('onboarding_skipped', { atStep: step });
    onClose();
  }, [onClose, step]);

  const handleSelectIntent = useCallback(
    (intent: OnboardingIntent) => {
      set({ primaryIntent: intent, currentStep: 1 });
      track('onboarding_intent_selected', { intent });
      setStep(2);
    },
    [set],
  );

  const handleSelectLang = useCallback(
    (lang: OnboardingLang) => {
      set({ lang, currentStep: 2 });
      track('onboarding_lang_selected', { lang });
      // Back-compat: LanguageSwitcher reads from poojly_language directly.
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(ONBOARDING_LANGUAGE_KEY, lang);
        } catch {
          /* noop */
        }
      }
      setStep(3);
    },
    [set],
  );

  const handleSelectNri = useCallback(
    (isNri: boolean) => {
      const completedAt = new Date().toISOString();
      set({ isNri, currentStep: 3, completedAt });
      track('onboarding_completed', {
        intent: data?.primaryIntent,
        lang: data?.lang,
        isNri,
      });
      onClose();
      // Route the user to the surface that matches their intent.
      const intent = data?.primaryIntent;
      const target =
        intent === 'darshan'
          ? '/darshan'
          : intent === 'puja'
            ? '/pujas'
            : intent === 'wisdom'
              ? '/content'
              : intent === 'consult'
                ? '/ask-pandit'
                : null;
      if (target && typeof window !== 'undefined') {
        window.location.assign(target);
      }
    },
    [data?.lang, data?.primaryIntent, onClose, set],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        tabIndex={-1}
        className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl outline-none animate-in fade-in-0 zoom-in-95 sm:slide-in-from-bottom-2 max-h-[92vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close onboarding"
          className="absolute top-3 right-3 p-2 rounded-full text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pt-6">
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              aria-hidden="true"
              className={
                i === step
                  ? 'w-2.5 h-2.5 rounded-full bg-saffron-600'
                  : 'w-2.5 h-2.5 rounded-full bg-surface-200'
              }
            />
          ))}
        </div>

        <div className="px-6 pb-6 pt-4 sm:px-8 sm:pb-8">
          {step === 1 && (
            <Step1
              onPick={handleSelectIntent}
              onSkip={handleSkip}
              selected={data?.primaryIntent ?? null}
            />
          )}
          {step === 2 && (
            <Step2
              onPick={handleSelectLang}
              onBack={() => setStep(1)}
              onSkip={handleSkip}
              selected={data?.lang ?? null}
            />
          )}
          {step === 3 && (
            <Step3
              onPick={handleSelectNri}
              onBack={() => setStep(2)}
              onSkip={handleSkip}
              selected={data?.isNri ?? null}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Intent ──────────────────────────────────────────────────────────

function Step1({
  onPick,
  onSkip,
  selected,
}: {
  onPick: (i: OnboardingIntent) => void;
  onSkip: () => void;
  selected: OnboardingIntent | null;
}) {
  return (
    <div>
      <h2 id="onboarding-title" className="text-xl font-semibold text-surface-800 text-center">
        What brings you here today?
      </h2>
      <p className="text-sm text-surface-500 text-center mt-1">
        We&rsquo;ll tailor your home screen.
      </p>

      <div className="grid grid-cols-2 gap-3 mt-6">
        {INTENT_OPTIONS.map((opt, idx) => {
          const Icon = opt.icon;
          const isSelected = selected === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onPick(opt.key)}
              aria-pressed={isSelected}
              className={
                (idx === INTENT_OPTIONS.length - 1 ? 'col-span-2 sm:col-span-2 ' : '') +
                'flex flex-col items-start gap-2 p-4 text-left rounded-xl border transition-all ' +
                (isSelected
                  ? 'border-saffron-500 bg-saffron-50 shadow-sm'
                  : 'border-surface-200 hover:border-saffron-300 hover:bg-saffron-50/40')
              }
            >
              <span
                aria-hidden="true"
                className={
                  'inline-flex items-center justify-center w-10 h-10 rounded-lg ' +
                  (isSelected
                    ? 'bg-saffron-500/15 text-saffron-700'
                    : 'bg-surface-100 text-surface-600')
                }
              >
                <Icon className="w-5 h-5" />
              </span>
              <span className="text-sm font-semibold text-surface-800">{opt.title}</span>
              <span className="text-xs text-surface-500">{opt.caption}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-surface-500 hover:text-surface-700"
        >
          Skip
        </button>
        <span className="text-xs text-surface-400">Step 1 of 3</span>
      </div>
    </div>
  );
}

// ─── Step 2: Language ────────────────────────────────────────────────────────

function Step2({
  onPick,
  onBack,
  onSkip,
  selected,
}: {
  onPick: (l: OnboardingLang) => void;
  onBack: () => void;
  onSkip: () => void;
  selected: OnboardingLang | null;
}) {
  return (
    <div>
      <h2 id="onboarding-title" className="text-xl font-semibold text-surface-800 text-center">
        Choose your language
      </h2>
      <p className="text-sm text-surface-500 text-center mt-1">
        You can change this anytime.
      </p>

      <ul className="mt-6 divide-y divide-surface-100 border border-surface-200 rounded-xl overflow-hidden">
        {LANG_OPTIONS.map((opt) => {
          const isSelected = selected === opt.code;
          return (
            <li key={opt.code}>
              <button
                type="button"
                onClick={() => opt.active && onPick(opt.code)}
                disabled={!opt.active}
                aria-pressed={isSelected}
                className={
                  'w-full flex items-center justify-between px-4 py-3 text-left transition-colors ' +
                  (opt.active
                    ? isSelected
                      ? 'bg-saffron-50 text-saffron-700'
                      : 'hover:bg-surface-50 text-surface-700'
                    : 'opacity-50 cursor-not-allowed text-surface-500')
                }
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">
                    {opt.native}
                    {opt.code !== 'en' && opt.code !== 'hi' && (
                      <span className="ml-2 text-xs font-normal text-surface-400">/ {opt.label}</span>
                    )}
                  </span>
                  <span className="text-xs text-surface-400">{opt.label}</span>
                </div>
                {!opt.active && (
                  <span className="text-[10px] uppercase tracking-wide font-semibold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">
                    coming soon
                  </span>
                )}
                {isSelected && opt.active && (
                  <span className="text-xs font-semibold text-saffron-600">Selected</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-surface-500 hover:text-surface-700"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-surface-500 hover:text-surface-700"
          >
            Skip
          </button>
        </div>
        <span className="text-xs text-surface-400">Step 2 of 3</span>
      </div>
    </div>
  );
}

// ─── Step 3: NRI ─────────────────────────────────────────────────────────────

function Step3({
  onPick,
  onBack,
  onSkip,
  selected,
}: {
  onPick: (b: boolean) => void;
  onBack: () => void;
  onSkip: () => void;
  selected: boolean | null;
}) {
  return (
    <div>
      <h2 id="onboarding-title" className="text-xl font-semibold text-surface-800 text-center">
        Where are you based?
      </h2>
      <p className="text-sm text-surface-500 text-center mt-1">
        Helps us show the right currency &amp; offerings.
      </p>

      <div className="grid grid-cols-2 gap-3 mt-6">
        {NRI_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selected === opt.value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onPick(opt.value)}
              aria-pressed={isSelected}
              className={
                'flex flex-col items-start gap-2 p-4 text-left rounded-xl border transition-all ' +
                (isSelected
                  ? 'border-saffron-500 bg-saffron-50 shadow-sm'
                  : 'border-surface-200 hover:border-saffron-300 hover:bg-saffron-50/40')
              }
            >
              <span
                aria-hidden="true"
                className={
                  'inline-flex items-center justify-center w-10 h-10 rounded-lg ' +
                  (isSelected
                    ? 'bg-saffron-500/15 text-saffron-700'
                    : 'bg-surface-100 text-surface-600')
                }
              >
                <Icon className="w-5 h-5" />
              </span>
              <span className="text-sm font-semibold text-surface-800">{opt.title}</span>
              <span className="text-xs text-surface-500">{opt.caption}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-surface-500 hover:text-surface-700"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-surface-500 hover:text-surface-700"
          >
            Skip
          </button>
        </div>
        <span className="text-xs text-surface-400">Step 3 of 3</span>
      </div>
    </div>
  );
}
