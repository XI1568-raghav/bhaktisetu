'use client';

import { useRef } from 'react';
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

export function DateInput({
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
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          required={required}
          className="w-full px-4 py-3 pr-12 border border-surface-200 rounded-xl text-sm text-surface-800 focus:ring-2 focus:ring-saffron-500/30 focus:border-saffron-500 outline-none transition-all [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
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
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-saffron-500 hover:text-saffron-700 transition-colors pointer-events-auto"
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
          className="w-full px-4 py-3 pr-12 border border-surface-200 rounded-xl text-sm text-surface-800 focus:ring-2 focus:ring-saffron-500/30 focus:border-saffron-500 outline-none transition-all [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
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
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-saffron-500 hover:text-saffron-700 transition-colors pointer-events-auto"
        >
          <CalendarDays className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default DateInput;
