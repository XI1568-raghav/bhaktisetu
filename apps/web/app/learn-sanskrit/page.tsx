import type { Metadata } from 'next';
import { getAllLessons } from '../../lib/sanskrit-lessons-catalog';
import LessonCard from '../../components/LessonCard';

export const metadata: Metadata = {
  alternates: { canonical: 'https://darshya.online/learn-sanskrit' },
  title: 'Learn Sanskrit — Lessons, Streaks, Badges',
  description: 'Bite-sized Sanskrit lessons with quizzes. Build a daily streak. Earn badges as you progress from Devanagari basics to classical grammar.',
};

export default function LearnSanskritPage() {
  const lessons = getAllLessons();
  const byLevel = {
    beginner: lessons.filter((l) => l.level === 'beginner'),
    intermediate: lessons.filter((l) => l.level === 'intermediate'),
    advanced: lessons.filter((l) => l.level === 'advanced'),
  };
  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="text-4xl mb-2">अ आ इ ई</div>
        <h1 className="text-4xl font-bold text-surface-900">Learn Sanskrit</h1>
        <p className="text-surface-600 mt-2 max-w-2xl">
          From the first letter of Devanagari to the verses of the Gita — one short lesson at a time. Quizzes after each lesson. Daily streak tracking. Badges to keep you going.
        </p>
      </header>

      {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
        byLevel[level].length > 0 && (
          <section key={level} className="my-8">
            <h2 className="text-2xl font-bold text-surface-900 mb-3 capitalize">{level}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {byLevel[level].map((l) => (
                <LessonCard
                  key={l.id}
                  id={l.id}
                  title={l.title}
                  subtitle={l.subtitle}
                  level={l.level}
                  minutes={l.minutes}
                />
              ))}
            </div>
          </section>
        )
      ))}
    </main>
  );
}
