import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  loadManifest,
  loadChapter,
  listBookSlugs,
  nextChapter,
  prevChapter,
} from "../../../../../lib/books";
import { ReaderClient } from "../../../../../components/books/ReaderClient";

type Params = { slug: string; chapter: string[] };

export async function generateStaticParams(): Promise<Params[]> {
  const slugs = await listBookSlugs();
  const out: Params[] = [];
  for (const slug of slugs) {
    const m = await loadManifest(slug);
    if (!m) continue;
    for (const c of m.chapters) {
      out.push({ slug, chapter: c.slug.split("/") });
    }
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug, chapter } = await params;
  const chapterSlug = chapter.join("/");
  const [book, ch] = await Promise.all([
    loadManifest(slug),
    loadChapter(slug, chapterSlug),
  ]);
  if (!book || !ch) return {};
  const url = `https://darshya.online/content/books/${slug}/${chapterSlug}`;
  const title = `${book.title} — Chapter ${ch.number}: ${ch.title}`;
  return {
    title,
    description: `${book.title}, Chapter ${ch.number}: ${ch.title}. ${book.description}`,
    alternates: { canonical: url },
    openGraph: {
      images: ['/images/golden-temple-og.jpg'],
      title,
      description: `${book.title} · Chapter ${ch.number}`,
      url,
      type: "article",
    },
  };
}

export default async function ChapterReaderPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug, chapter } = await params;
  const chapterSlug = chapter.join("/");
  const [book, ch] = await Promise.all([
    loadManifest(slug),
    loadChapter(slug, chapterSlug),
  ]);
  if (!book || !ch) notFound();

  // Navigation across the flat chapters array (works for both kanda and chapter structures
  // because manifests always include a flat `chapters` list with compound slugs preserved).
  const prev = prevChapter(book, chapterSlug);
  const next = nextChapter(book, chapterSlug);

  return (
    <ReaderClient
      chapter={ch}
      bookTitle={book.title}
      prev={prev}
      next={next}
    />
  );
}
