'use client';

import { useState } from 'react';
import type { GlossaryEntry } from '../lib/glossary';

interface Props {
  term: string;
  entry: GlossaryEntry;
}

export default function GlossaryTooltip({ term, entry }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="border-b border-dotted border-saffron-500 text-saffron-700 hover:text-saffron-800 cursor-help"
        aria-label={`Glossary: ${term}`}
      >
        {term}
      </button>
      {open && (
        <span className="absolute z-50 left-0 top-full mt-1 w-64 p-3 bg-white border border-surface-200 shadow-lg rounded-lg text-xs text-surface-700">
          <span className="block font-bold text-surface-900 mb-1">
            {entry.term}
            {entry.devanagari && <span className="ml-2 text-saffron-600 font-serif">{entry.devanagari}</span>}
          </span>
          <span className="block">{entry.meaning}</span>
        </span>
      )}
    </span>
  );
}
