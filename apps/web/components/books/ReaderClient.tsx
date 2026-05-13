"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_READER_PREFERENCES,
  type Chapter,
  type ChapterSummary,
  type ReaderPreferences,
} from "@poojly/shared";
import { useReadingProgress } from "@poojly/api-client";
import { useAuth } from "../../lib/auth-context";
import { Verse } from "./Verse";
import { ChapterNav } from "./ChapterNav";
import { ScrollProgressBar } from "./ScrollProgressBar";
import { ReaderControls } from "./ReaderControls";

const PREFS_STORAGE_KEY = "poojly_reader_prefs";

interface Props {
  chapter: Chapter;
  bookTitle: string;
  prev: ChapterSummary | null;
  next: ChapterSummary | null;
}

function loadPrefs(): ReaderPreferences {
  if (typeof window === "undefined") return DEFAULT_READER_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_READER_PREFERENCES;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_READER_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_READER_PREFERENCES;
  }
}

function savePrefs(p: ReaderPreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function ReaderClient({ chapter, bookTitle, prev, next }: Props) {
  const { isAuthenticated } = useAuth();
  const { save } = useReadingProgress(chapter.bookSlug, { isAuthenticated });
  const [prefs, setPrefs] = useState<ReaderPreferences>(DEFAULT_READER_PREFERENCES);

  // Load persisted prefs on mount.
  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  const handlePrefs = useCallback((next: ReaderPreferences) => {
    setPrefs(next);
    savePrefs(next);
  }, []);

  const handleScroll = useCallback(
    (percent: number) => {
      save({
        bookSlug: chapter.bookSlug,
        chapterSlug: chapter.slug,
        chapterNumber: chapter.number,
        scrollPercent: percent,
      });
    },
    [save, chapter.bookSlug, chapter.slug, chapter.number]
  );

  return (
    <div
      data-reader-theme={prefs.theme}
      data-reader-font-size={prefs.fontSize}
      className="min-h-screen"
    >
      <ScrollProgressBar onChange={handleScroll} />

      <article className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <header className="mb-8 pb-6 border-b border-[var(--reader-rule)]">
          <p className="text-xs uppercase tracking-widest reader-verse-num mb-2">
            {bookTitle} · Chapter {chapter.number}
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">
            {chapter.title}
          </h1>
          {chapter.titleSanskrit && (
            <p
              className="reader-sanskrit text-xl mt-2"
              style={{ fontFamily: "var(--font-noto-devanagari)" }}
            >
              {chapter.titleSanskrit}
            </p>
          )}
          {chapter.subtitle && (
            <p className="reader-translit text-base mt-2">{chapter.subtitle}</p>
          )}
          {chapter.translator && (
            <p className="reader-translit text-sm mt-3">
              Translated by {chapter.translator}
            </p>
          )}
          {chapter.partial && chapter.partialNote && (
            <div className="mt-4 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm">
              <strong>Partial chapter.</strong> {chapter.partialNote}
            </div>
          )}
          {chapter.placeholder && (
            <div className="mt-4 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm">
              <strong>Placeholder chapter.</strong>{" "}
              {chapter.placeholderNote ??
                "Verses for this chapter are not yet available. We do not fabricate Sanskrit text."}
            </div>
          )}
        </header>

        {chapter.verses.length === 0 ? (
          <p className="reader-translit text-center py-12">
            No verses available for this chapter yet.
          </p>
        ) : (
          <div className="space-y-1">
            {chapter.verses.map((v) => (
              <Verse key={v.number} verse={v} prefs={prefs} />
            ))}
          </div>
        )}

        <ChapterNav bookSlug={chapter.bookSlug} prev={prev} next={next} />
      </article>

      <ReaderControls prefs={prefs} onChange={handlePrefs} />
    </div>
  );
}
