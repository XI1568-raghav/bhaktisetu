'use client';

import { useRef, useState, useEffect } from 'react';
import { CalendarDays } from 'lucide-react';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

/**
 * Branded DateInput — fully suppresses native browser date picker.
 *
 * Strategy: visible input is type="text" (no native chrome at all).
 * Hidden input is type="date" used only for showPicker() API when
 * user clicks the CalendarDays icon. Value syncs bidirectionally.
 *
 * This is the ONLY reliable cross-browser way to prevent Chrome/Edge
 * from opening native calendar popup on input click.
 */
export function DateInput({
  value,
  onChange,
  min,
  max,
  label,
  required,
  className,
}: DateInputProps) {
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [display, setDisplay] = useState(value ? formatForDisplay(value) : '');

  // Sync external value changes to display
  useEffect(() => {
    setDisplay(value ? formatForDisplay(value) : '');
  }, [value]);

  function formatForDisplay(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  }

  function parseFromDisplay(input: string): string {
    // Accept DD/MM/YYYY or DD-MM-YYYY or YYYY-MM-DD
    const slashMatch = input.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (slashMatch) return `${slashMatch[3]}-${slashMatch[2].padStart(2, '0')}-${slashMatch[1].padStart(2, '0')}`;
    const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return input;
    return '';
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setDisplay(raw);
    const iso = parseFromDisplay(raw);
    if (iso) onChange(iso);
  }

  function handleTextBlur() {
    const iso = parseFromDisplay(display);
    if (iso) {
      onChange(iso);
      setDisplay(formatForDisplay(iso));
    } else if (display && display.length > 0) {
      // Invalid format typed — reset to last valid value
      setDisplay(value ? formatForDisplay(value) : '');
    }
  }

  function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const iso = e.target.value;
    onChange(iso);
    setDisplay(formatForDisplay(iso));
  }

  function openPicker() {
    try {
      hiddenRef.current?.showPicker?.();
    } catch {
      hiddenRef.current?.focus();
      hiddenRef.current?.click();
    }
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      {label && (
        <label className="block text-sm font-semibold text-surface-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {/* Visible text input — no native date chrome */}
        <input
          type="text"
          value={display}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          placeholder="DD/MM/YYYY"
          required={required}
          inputMode="numeric"
          autoComplete="off"
          className="w-full px-4 py-3 pr-12 border border-surface-200 rounded-xl text-sm text-surface-800 placeholder:text-surface-400 focus:ring-2 focus:ring-saffron-500/30 focus:border-saffron-500 outline-none transition-all"
        />
        {/* Hidden native date input — only used for showPicker() API */}
        <input
          ref={hiddenRef}
          type="date"
          value={value}
          onChange={handlePickerChange}
          min={min}
          max={max}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />
        {/* Branded picker trigger */}
        <button
          type="button"
          tabIndex={-1}
          onClick={openPicker}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-saffron-500 hover:text-saffron-700 transition-colors"
          aria-label="Open date picker"
        >
          <CalendarDays className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export function DateTimeInput({
  value,
  onChange,
  min,
  max,
  label,
  required,
  className,
}: DateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`relative ${className ?? ''}`}>
      {label && (
        <label className="block text-sm font-semibold text-surface-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          required={required}
          className="w-full px-4 py-3 pr-12 border border-surface-200 rounded-xl text-sm text-surface-800 focus:ring-2 focus:ring-saffron-500/30 focus:border-saffron-500 outline-none transition-all appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-clear-button]:hidden"
          style={{ colorScheme: 'light' }}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => {
            try {
              inputRef.current?.showPicker?.();
            } catch {
              inputRef.current?.focus();
            }
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-saffron-500 hover:text-saffron-700 transition-colors"
        >
          <CalendarDays className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default DateInput;
