'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, AlertTriangle } from 'lucide-react';
import { findCity, formatCityLabel, type CityRecord } from '../../lib/indian-cities';

interface Props {
  value: CityRecord | null;
  onChange: (city: CityRecord | null) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function CityAutocomplete({
  value,
  onChange,
  placeholder = 'Type city name...',
  required,
  className,
}: Props) {
  const [query, setQuery] = useState(value?.name ?? '');
  const [results, setResults] = useState<CityRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [notFound, setNotFound] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = 'city-autocomplete-list';

  const search = useCallback((q: string) => {
    const found = findCity(q);
    setResults(found);
    setOpen(found.length > 0);
    setActiveIdx(-1);
    setNotFound(q.length >= 3 && found.length === 0);
  }, []);

  const select = useCallback(
    (city: CityRecord) => {
      setQuery(city.name);
      onChange(city);
      setOpen(false);
      setNotFound(false);
      setResults([]);
    },
    [onChange],
  );

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (value) onChange(null); // clear selection when user types
    search(v);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      select(results[activeIdx]!);
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Tab' && activeIdx >= 0) {
      select(results[activeIdx]!);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-saffron-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={activeIdx >= 0 ? `city-opt-${activeIdx}` : undefined}
          aria-autocomplete="list"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && search(query)}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className="w-full pl-10 pr-4 py-3 border border-surface-200 rounded-xl text-sm text-surface-800 placeholder:text-surface-400 focus:ring-2 focus:ring-saffron-500/30 focus:border-saffron-500 outline-none transition-all"
        />
      </div>

      {/* Selected city confirmation */}
      {value && (
        <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          <MapPin className="w-3 h-3" />
          {formatCityLabel(value)}
        </div>
      )}

      {/* Unknown city warning */}
      {notFound && !value && (
        <div className="mt-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-amber-800 bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          City not found in database. Select from the list for accurate results.
        </div>
      )}

      {/* Dropdown */}
      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 bg-white border border-surface-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
        >
          {results.map((city, i) => (
            <li
              key={`${city.name}-${city.state ?? city.country}`}
              id={`city-opt-${i}`}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={() => select(city)}
              onMouseEnter={() => setActiveIdx(i)}
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                i === activeIdx
                  ? 'bg-saffron-50 text-saffron-900'
                  : 'text-surface-700 hover:bg-surface-50'
              }`}
            >
              <div className="font-medium">
                {city.name}
                {city.state && <span className="text-surface-400 font-normal">, {city.state}</span>}
              </div>
              <div className="text-xs text-surface-400 mt-0.5">
                {Math.abs(city.lat).toFixed(2)}{city.lat >= 0 ? 'N' : 'S'}, {Math.abs(city.lng).toFixed(2)}{city.lng >= 0 ? 'E' : 'W'}
                {city.country !== 'IN' && ` · ${city.country}`}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
