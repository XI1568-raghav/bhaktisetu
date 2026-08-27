import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getLesson, getAllLessons } from '../../../../lib/sanskrit-lessons-catalog';
import MdxRender from '../../../../components/MdxRender';
import LessonClient from './LessonClient';
import { H1 } from '../../../../components/ui/heading-recipe';

interface Params { id: string }

export function generateStaticParams() {
  return getAllLessons().map((l) => ({ id: l.id }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const l = getLesson(id);
  if (!l) return { title: 'Lesson not found' };
  return {
    title: `${l.title} — Learn Sanskrit`,
    alternates: { canonical: `https://darshya.online/learn-sanskrit/lesson/${id}` },
    description: l.intro,
  };
}

export default async function LessonPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const lesson = getLesson(id);
  if (!lesson) notFound();
  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/learn-sanskrit" className="inline-flex items-center gap-1 text-sm text-saffron-700 hover:text-saffron-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to lessons
      </Link>
      <header className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-saffron-700 mb-1">{lesson.level} - {lesson.minutes} min</div>
        <h1 className={H1.catalogue}>{lesson.title}</h1>
        {lesson.subtitle && <p className="prose-lead text-surface-600 mt-2">{lesson.subtitle}</p>}
        <p className="text-surface-700 mt-3">{lesson.intro}</p>
      </header>
      <MdxRender body={lesson.body} />
      <LessonClient lessonId={lesson.id} quiz={lesson.quiz} />
    </main>
  );
}
