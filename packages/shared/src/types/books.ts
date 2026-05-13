// ──────────────────────────────────────────────
// @poojly/shared — Books / Reader Domain Types
// ──────────────────────────────────────────────

export type BookLanguage = "sa" | "en" | "hi";

export type BookStructure = "chapters" | "kandas";

export interface Verse {
  number: number;
  sanskrit?: string;
  transliteration?: string;
  english?: string;
  hindi?: string;
  commentary?: string;
}

export interface Chapter {
  bookSlug: string;
  slug: string;
  number: number;
  title: string;
  titleSanskrit?: string;
  subtitle?: string;
  translator?: string;
  kanda?: string;
  kandaName?: string;
  placeholder?: boolean;
  placeholderNote?: string;
  partial?: boolean;
  partialNote?: string;
  verses: Verse[];
}

export interface ChapterSummary {
  slug: string;
  number: number;
  title: string;
  titleSanskrit?: string;
  subtitle?: string;
  kanda?: string;
  verseCount?: number;
  shippedVerses?: number;
  placeholder?: boolean;
  partial?: boolean;
}

export interface Kanda {
  slug: string;
  name: string;
  nameSanskrit?: string;
  sargaCount: number;
  description?: string;
}

export interface BookManifest {
  slug: string;
  title: string;
  titleSanskrit?: string;
  subtitle?: string;
  tradition?: string;
  language: BookLanguage[];
  translator?: string;
  coverImage: string;
  description: string;
  license?: string;
  structure: BookStructure;
  kandas?: Kanda[];
  chapters: ChapterSummary[];
}

export interface ReadingProgress {
  bookSlug: string;
  chapterSlug: string;
  chapterNumber: number;
  scrollPercent: number;
  lastVerse?: number;
  updatedAt: string;
}

export type ReaderTheme = "saffron" | "sepia" | "night";
export type ReaderFontSize = "sm" | "md" | "lg" | "xl";

export interface ReaderPreferences {
  theme: ReaderTheme;
  fontSize: ReaderFontSize;
  showSanskrit: boolean;
  showTransliteration: boolean;
  showEnglish: boolean;
}

export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  theme: "saffron",
  fontSize: "md",
  showSanskrit: true,
  showTransliteration: true,
  showEnglish: true,
};
