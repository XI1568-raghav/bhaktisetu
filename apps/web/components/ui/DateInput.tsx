'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

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
 * Branded DateInput — ZERO native browser calendar anywhere in DOM.
 *
 * Strategy: visible input is type="text" (no native chrome).
 * Calendar trigger opens a CUSTOM React popover with brand-styled grid.
 * No type="date" anywhere in DOM = no Chrome native popup possible.
 *
 * Features:
 * - Type DD/MM/YYYY directly in text field
 * - Click branded saffron CalendarDays icon → opens custom popover
 * - Month/year navigation with chevrons
 * - Year dropdown for fast 1900→today jumps
 * - Click date → fills field + closes popover
 * - Outside click → closes popover
 * - Respects min/max ISO bounds
 */

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatForDisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function parseFromDisplay(input: string): string {
  const slashMatch = input.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2].padStart(2, '0')}-${slashMatch[1].padStart(2, '0')}`;
  }
  const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return input;
  return '';
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseIso(iso: string): { year: number; month: number; day: number } | null {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return {
    year: parseInt(match[1]!, 10),
    month: parseInt(match[2]!, 10) - 1,
    day: parseInt(match[3]!, 10),
  };
}

function isInRange(iso: string, min?: string, max?: string): boolean {
  if (min && iso < min) return false;
  if (max && iso > max) return false;
  return true;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(value ? formatForDisplay(value) : '');
  const [open, setOpen] = useState(false);

  // Calendar viewport state
  const today = new Date();
  const initial = value ? parseIso(value) : null;
  const [viewYear, setViewYear] = useState(initial?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial?.month ?? today.getMonth());

  useEffect(() => {
    setDisplay(value ? formatForDisplay(value) : '');
    const parsed = value ? parseIso(value) : null;
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setDisplay(raw);
    const iso = parseFromDisplay(raw);
    if (iso && isInRange(iso, min, max)) {
      onChange(iso);
      const parsed = parseIso(iso);
      if (parsed) {
        setViewYear(parsed.year);
        setViewMonth(parsed.month);
      }
    }
  }

  function handleTextBlur() {
    const iso = parseFromDisplay(display);
    if (iso && isInRange(iso, min, max)) {
      onChange(iso);
      setDisplay(formatForDisplay(iso));
    } else if (display && display.length > 0) {
      setDisplay(value ? formatForDisplay(value) : '');
    }
  }

  function selectDate(day: number) {
    const iso = toIso(viewYear, viewMonth, day);
    if (!isInRange(iso, min, max)) return;
    onChange(iso);
    setDisplay(formatForDisplay(iso));
    setOpen(false);
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  // Build calendar grid
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const selectedIso = value;
  const todayIso = toIso(today.getFullYear(), today.getMonth(), today.getDate());

  // Year list for dropdown (1900 to current+5)
  const minYear = 1900;
  const maxYear = today.getFullYear() + 5;
  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) years.push(y);

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      {label && (
        <label className="block text-sm font-semibold text-surface-700 mb-1.5">{label}</label>
      )}
      <div className="relative">
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
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen(!open)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-saffron-500 hover:text-saffron-700 transition-colors"
          aria-label="Open date picker"
        >
          <CalendarDays className="w-5 h-5" />
        </button>
      </div>

      {open && (
        <div
          className="absolute z-50 mt-2 left-0 bg-white border border-surface-200 rounded-xl shadow-xl p-4 w-80"
          style={{ background: 'var(--color-surface, white)' }}
        >
          {/* Header: month nav + year dropdown */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-saffron-50 text-surface-700"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-surface-800">{MONTH_NAMES[viewMonth]}</span>
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="text-sm font-semibold text-surface-800 bg-transparent border border-surface-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-saffron-500/30"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-saffron-50 text-surface-700"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day-of-week header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS_OF_WEEK.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-surface-500 uppercase tracking-wider py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Date grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const iso = toIso(viewYear, viewMonth, day);
              const isSelected = iso === selectedIso;
              const isToday = iso === todayIso;
              const isDisabled = !isInRange(iso, min, max);
              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => selectDate(day)}
                  className={`
                    aspect-square flex items-center justify-center text-sm rounded-lg transition-colors
                    ${isSelected
                      ? 'bg-saffron-600 text-white font-semibold'
                      : isToday
                      ? 'bg-saffron-100 text-saffron-700 font-semibold'
                      : 'text-surface-700 hover:bg-saffron-50'}
                    ${isDisabled ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : ''}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-200">
            <button
              type="button"
              onClick={() => { onChange(''); setDisplay(''); setOpen(false); }}
              className="text-xs font-medium text-surface-600 hover:text-surface-800"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                const iso = todayIso;
                if (isInRange(iso, min, max)) {
                  onChange(iso);
                  setDisplay(formatForDisplay(iso));
                  setOpen(false);
                }
              }}
              className="text-xs font-semibold text-saffron-600 hover:text-saffron-700"
            >
              Today
            </button>
          </div>
        </div>
      )}
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
  // For datetime, keep simpler text+time approach.
  // value ISO format: YYYY-MM-DDTHH:MM
  const [datePart, setDatePart] = useState(value ? value.split('T')[0] ?? '' : '');
  const [timePart, setTimePart] = useState(value ? value.split('T')[1]?.substring(0, 5) ?? '' : '');

  useEffect(() => {
    if (value) {
      const parts = value.split('T');
      setDatePart(parts[0] ?? '');
      setTimePart(parts[1]?.substring(0, 5) ?? '');
    }
  }, [value]);

  function commit(d: string, t: string) {
    if (d && t) onChange(`${d}T${t}`);
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-semibold text-surface-700 mb-1.5">{label}</label>
      )}
      <div className="grid grid-cols-2 gap-2">
        <DateInput
          value={datePart}
          onChange={(v) => { setDatePart(v); commit(v, timePart); }}
          min={min?.split('T')[0]}
          max={max?.split('T')[0]}
          required={required}
        />
        <input
          type="time"
          value={timePart}
          onChange={(e) => { setTimePart(e.target.value); commit(datePart, e.target.value); }}
          required={required}
          className="w-full px-4 py-3 border border-surface-200 rounded-xl text-sm text-surface-800 focus:ring-2 focus:ring-saffron-500/30 focus:border-saffron-500 outline-none transition-all"
        />
      </div>
    </div>
  );
}

export default DateInput;
