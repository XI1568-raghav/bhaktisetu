"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { useReadingProgress } from "@poojly/api-client";
import { useAuth } from "../../lib/auth-context";
import { buttonClass } from '../../components/ui/button-recipe';

interface Props {
  bookSlug: string;
}

export function ContinueReadingCTA({ bookSlug }: Props) {
  const { isAuthenticated } = useAuth();
  const { progress, isLoading } = useReadingProgress(bookSlug, { isAuthenticated });

  if (isLoading || !progress) return null;

  return (
    <Link
      href={`/content/books/${bookSlug}/${progress.chapterSlug}`}
      className={buttonClass('primary', 'md', 'shadow-md hover:shadow-lg')}
    >
      <BookOpen className="w-5 h-5" />
      <div className="text-left">
        <div className="text-xs text-saffron-100">Continue reading</div>
        <div className="font-semibold text-sm">
          Chapter {progress.chapterNumber}{" "}
          <span className="text-saffron-100 font-normal">
            · {Math.round(progress.scrollPercent)}%
          </span>
        </div>
      </div>
    </Link>
  );
}
