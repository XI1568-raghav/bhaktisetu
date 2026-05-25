'use client';

import { useState } from 'react';
import Quiz from '../../../../components/Quiz';
import StreakBadge from '../../../../components/StreakBadge';
import { useAuth } from '../../../../lib/auth-context';

interface Props {
  lessonId: string;
  quiz: { q: string; options: string[]; correct: number; explanation?: string }[];
}

interface CompleteResult {
  success: boolean;
  newBadges?: string[];
  streak?: { currentDays: number; longestDays: number; lastActiveDay: string };
}

export default function LessonClient({ lessonId, quiz }: Props) {
  const { session } = useAuth();
  const [result, setResult] = useState<CompleteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete(score: number, total: number) {
    const pct = Math.round((score / total) * 100);
    if (!session?.accessToken) {
      setResult({ success: true, streak: { currentDays: 1, longestDays: 1, lastActiveDay: new Date().toISOString() } });
      return;
    }
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
      const url = `${base.replace(/\/$/, '')}/api/v1/lessons/complete`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify({ lessonId, score: pct }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: CompleteResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save progress');
    }
  }

  return (
    <div>
      <Quiz questions={quiz} onComplete={handleComplete} />
      {result && (
        <div className="mt-4 p-4 bg-saffron-50 border border-saffron-200 rounded-xl">
          <div className="flex items-center gap-3 flex-wrap">
            {result.streak && <StreakBadge days={result.streak.currentDays} longest={result.streak.longestDays} />}
            {result.newBadges?.map((b) => (
              <span key={b} className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">{b}</span>
            ))}
          </div>
          <p className="text-xs text-surface-600 mt-2">Progress saved.</p>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
