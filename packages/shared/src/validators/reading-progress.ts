import { z } from "zod";

// ──────────────────────────────────────────────
// Reading Progress — Zod Validators
// ──────────────────────────────────────────────

const SLUG_REGEX = /^[a-z0-9][a-z0-9-/]{0,127}$/;

export const readingProgressUpsertSchema = z.object({
  bookSlug: z.string().regex(SLUG_REGEX, "Invalid bookSlug"),
  chapterSlug: z.string().regex(SLUG_REGEX, "Invalid chapterSlug"),
  chapterNumber: z.number().int().positive().max(10000),
  scrollPercent: z.number().min(0).max(100),
  lastVerse: z.number().int().positive().max(10000).optional(),
});

export const readingProgressQuerySchema = z.object({
  bookSlug: z.string().regex(SLUG_REGEX, "Invalid bookSlug"),
});

export type ReadingProgressUpsert = z.infer<typeof readingProgressUpsertSchema>;
export type ReadingProgressQuery = z.infer<typeof readingProgressQuerySchema>;
