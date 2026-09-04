import Link from "next/link";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import type { ChapterSummary } from "@poojly/shared";
import { buttonClass } from '../../components/ui/button-recipe';

interface Props {
  bookSlug: string;
  prev: ChapterSummary | null;
  next: ChapterSummary | null;
}

export function ChapterNav({ bookSlug, prev, next }: Props) {
  return (
    <nav className="flex items-center justify-between gap-3 mt-12 pt-6 border-t border-surface-200">
      {prev ? (
        <Link
          href={`/content/books/${bookSlug}/${prev.slug}`}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-100 hover:bg-surface-200 text-surface-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">
            <span className="block text-xs text-surface-500">Previous</span>
            <span className="font-medium">{prev.title}</span>
          </span>
        </Link>
      ) : (
        <span />
      )}

      <Link
        href={`/content/books/${bookSlug}`}
        className="flex items-center gap-1.5 px-3 py-2 text-sm text-saffron-700 hover:text-saffron-900"
      >
        <BookOpen className="w-4 h-4" />
        <span>Contents</span>
      </Link>

      {next ? (
        <Link
          href={`/content/books/${bookSlug}/${next.slug}`}
          className={buttonClass('primary', 'md')}
        >
          <span className="text-sm text-right">
            <span className="block text-xs text-saffron-100">Next</span>
            <span className="font-medium">{next.title}</span>
          </span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
