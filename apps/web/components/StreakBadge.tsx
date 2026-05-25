import { Flame } from 'lucide-react';

interface Props {
  days: number;
  longest?: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function StreakBadge({ days, longest, size = 'md' }: Props) {
  const sizes = {
    sm: { wrap: 'px-2 py-1 text-xs', icon: 'w-3 h-3' },
    md: { wrap: 'px-3 py-1.5 text-sm', icon: 'w-4 h-4' },
    lg: { wrap: 'px-4 py-2 text-base', icon: 'w-5 h-5' },
  } as const;
  const s = sizes[size];
  const active = days > 0;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${s.wrap} ${
        active ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' : 'bg-surface-100 text-surface-500'
      }`}
      title={longest !== undefined ? `Longest: ${longest} days` : undefined}
    >
      <Flame className={s.icon} />
      {days} day{days === 1 ? '' : 's'}
    </span>
  );
}
