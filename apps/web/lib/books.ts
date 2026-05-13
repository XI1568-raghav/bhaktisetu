// Server-only book loader. Reads JSON from /public/books at request time
// (works for both static export and edge runtime — files are part of bundle).

import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { BookManifest, Chapter, ChapterSummary } from "@poojly/shared";

const BOOKS_ROOT = path.join(process.cwd(), "public", "books");

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const CHAPTER_SLUG_RE = /^[a-z0-9][a-z0-9-/]{0,127}$/;

function safeBookSlug(slug: string): string {
  if (!SLUG_RE.test(slug)) {
    throw new Error(`Invalid book slug: ${slug}`);
  }
  return slug;
}

function safeChapterSlug(slug: string): string {
  if (!CHAPTER_SLUG_RE.test(slug) || slug.includes("..")) {
    throw new Error(`Invalid chapter slug: ${slug}`);
  }
  return slug;
}

export async function listBookSlugs(): Promise<string[]> {
  try {
    const entries = await fs.readdir(BOOKS_ROOT, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((name) => SLUG_RE.test(name))
      .sort();
  } catch {
    return [];
  }
}

export async function loadManifest(bookSlug: string): Promise<BookManifest | null> {
  const slug = safeBookSlug(bookSlug);
  const file = path.join(BOOKS_ROOT, slug, "manifest.json");
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as BookManifest;
  } catch {
    return null;
  }
}

export async function loadAllManifests(): Promise<BookManifest[]> {
  const slugs = await listBookSlugs();
  const manifests = await Promise.all(slugs.map((s) => loadManifest(s)));
  return manifests.filter((m): m is BookManifest => m !== null);
}

export async function loadChapter(
  bookSlug: string,
  chapterSlug: string
): Promise<Chapter | null> {
  const bk = safeBookSlug(bookSlug);
  const ch = safeChapterSlug(chapterSlug);
  // Compound slugs like "bala/sarga-1" → /kandas/bala/sargas/sarga-1.json
  const isCompound = ch.includes("/");
  const file = isCompound
    ? path.join(BOOKS_ROOT, bk, "kandas", ...ch.split("/").slice(0, -1), "sargas", `${ch.split("/").slice(-1)[0]}.json`)
    : path.join(BOOKS_ROOT, bk, "chapters", `${ch}.json`);
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as Chapter;
  } catch {
    return null;
  }
}

export function nextChapter(
  manifest: BookManifest,
  currentSlug: string
): ChapterSummary | null {
  const idx = manifest.chapters.findIndex((c) => c.slug === currentSlug);
  if (idx === -1 || idx >= manifest.chapters.length - 1) return null;
  return manifest.chapters[idx + 1] ?? null;
}

export function prevChapter(
  manifest: BookManifest,
  currentSlug: string
): ChapterSummary | null {
  const idx = manifest.chapters.findIndex((c) => c.slug === currentSlug);
  if (idx <= 0) return null;
  return manifest.chapters[idx - 1] ?? null;
}

// Test surface
export const __testing = { safeBookSlug, safeChapterSlug, BOOKS_ROOT };
