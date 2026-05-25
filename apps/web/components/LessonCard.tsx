import Link from 'next/link';
import { Lock, CheckCircle2, Circle } from 'lucide-react';

interface Props {
  id: string;
  title: string;
  subtitle?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  minutes: number;
  locked?: boolean;
  completed?: boolean;
  score?: number;
}

const LEVEL_COLOR = {
  beginner: 'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced: 'bg-purple-100 text-purple-700',
} as const;

export default function LessonCard({ id, title, subtitle, level, minutes, locked, completed, score }: Props) {
  const inner = (
    <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
      locked ? 'bg-surface-50 border-surface-100 opacity-60' :
      completed ? 'bg-white border-emerald-200 hover:border-emerald-400' :
      'bg-white border-surface-200 hover:border-saffron-400 hover:shadow-sm'
    }`}>
      <div className="shrink-0 mt-0.5">
        {locked ? <Lock className="w-5 h-5 text-surface-400" /> :
         completed ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> :
         <Circle className="w-5 h-5 text-surface-300" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${LEVEL_COLOR[level]}`}>{level}</span>
          <span className="text-xs text-surface-500">{minutes} min</span>
          {completed && score !== undefined && (
            <span className="text-xs font-semibold text-emerald-700">{score}%</span>
          )}
        </div>
        <h3 className="font-bold text-surface-900 leading-tight">{title}</h3>
        {subtitle && <p className="text-sm text-surface-600 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
  if (locked) return inner;
  return <Link href={`/learn-sanskrit/lesson/${id}`}>{inner}</Link>;
}
