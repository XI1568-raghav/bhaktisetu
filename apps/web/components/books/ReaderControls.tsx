"use client";

import { useState } from "react";
import { Settings2, Type, Sun, BookText, Moon } from "lucide-react";
import type {
  ReaderPreferences,
  ReaderTheme,
  ReaderFontSize,
} from "@poojly/shared";

interface Props {
  prefs: ReaderPreferences;
  onChange: (next: ReaderPreferences) => void;
}

const THEMES: { key: ReaderTheme; label: string; Icon: typeof Sun }[] = [
  { key: "saffron", label: "Saffron", Icon: Sun },
  { key: "sepia", label: "Sepia", Icon: BookText },
  { key: "night", label: "Night", Icon: Moon },
];

const SIZES: ReaderFontSize[] = ["sm", "md", "lg", "xl"];

export function ReaderControls({ prefs, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const update = (patch: Partial<ReaderPreferences>) =>
    onChange({ ...prefs, ...patch });

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div
          role="dialog"
          aria-label="Reader settings"
          className="absolute bottom-14 right-0 w-72 bg-white rounded-xl shadow-2xl border border-surface-200 p-4 space-y-4"
        >
          <div>
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
              Theme
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {THEMES.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => update({ theme: key })}
                  aria-pressed={prefs.theme === key}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    prefs.theme === key
                      ? "bg-saffron-100 border-saffron-400 text-saffron-800"
                      : "bg-white border-surface-200 text-surface-600 hover:border-surface-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
              Text size
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update({ fontSize: s })}
                  aria-pressed={prefs.fontSize === s}
                  className={`py-2 rounded-lg font-semibold border transition-colors ${
                    prefs.fontSize === s
                      ? "bg-saffron-100 border-saffron-400 text-saffron-800"
                      : "bg-white border-surface-200 text-surface-600 hover:border-surface-300"
                  } ${
                    s === "sm" ? "text-xs" : s === "md" ? "text-sm" : s === "lg" ? "text-base" : "text-lg"
                  }`}
                >
                  Aa
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
              Show
            </p>
            <div className="space-y-1.5">
              <Toggle
                label="Sanskrit"
                checked={prefs.showSanskrit}
                onChange={(v) => update({ showSanskrit: v })}
              />
              <Toggle
                label="Transliteration"
                checked={prefs.showTransliteration}
                onChange={(v) => update({ showTransliteration: v })}
              />
              <Toggle
                label="English"
                checked={prefs.showEnglish}
                onChange={(v) => update({ showEnglish: v })}
              />
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Reader settings"
        aria-expanded={open}
        className="w-12 h-12 rounded-full bg-saffron-600 text-white shadow-xl flex items-center justify-center hover:bg-saffron-700 transition-colors"
      >
        {open ? <Type className="w-5 h-5" /> : <Settings2 className="w-5 h-5" />}
      </button>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 cursor-pointer text-sm text-surface-700">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked ? "bg-saffron-600" : "bg-surface-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </button>
    </label>
  );
}

// Test surface
export const __testing = { THEMES, SIZES };
