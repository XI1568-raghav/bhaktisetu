import { getVerseForDate } from '../lib/daily-verse';

export default function DailyVerse() {
  const verse = getVerseForDate();
  return (
    <div className="bg-gradient-to-br from-saffron-50 to-amber-50 border border-saffron-100 rounded-2xl p-6 my-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-saffron-700">Verse of the Day</h3>
        <span className="text-xs text-surface-500">{verse.source} {verse.reference}</span>
      </div>
      <p className="font-serif text-lg text-surface-900 whitespace-pre-line leading-relaxed">{verse.sanskrit}</p>
      <p className="text-sm text-surface-600 italic mt-3 leading-relaxed">{verse.transliteration}</p>
      <p className="text-surface-800 mt-3 leading-relaxed">{verse.translation}</p>
    </div>
  );
}
