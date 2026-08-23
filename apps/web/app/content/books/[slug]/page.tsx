import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import {
  loadManifest,
  listBookSlugs,
} from "../../../../lib/books";
import { ChapterTOC } from "../../../../components/books/ChapterTOC";
import { ContinueReadingCTA } from "../../../../components/books/ContinueReadingCTA";
import { H1 } from '../../../../components/ui/heading-recipe';

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  const slugs = await listBookSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const book = await loadManifest(slug);
  if (!book) return {};
  const url = `https://darshya.online/content/books/${book.slug}`;
  return {
    title: `${book.title} — Read Online`,
    description: book.description,
    alternates: { canonical: url },
    openGraph: {
      title: book.title,
      description: book.description,
      url,
      type: "book",
      images: book.coverImage ? [{ url: book.coverImage }] : undefined,
    },
  };
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const book = await loadManifest(slug);
  if (!book) notFound();

  const ldJson = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    alternateName: book.titleSanskrit,
    description: book.description,
    inLanguage: book.language,
    bookFormat: "https://schema.org/EBook",
    image: book.coverImage,
    ...(book.translator && { translator: { "@type": "Person", name: book.translator } }),
  };

  return (
    <div className="min-h-[100dvh] bg-[#fbf6ec]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href="/content/books"
          className="inline-flex items-center gap-1 text-sm text-saffron-700 hover:text-saffron-900 mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          All sacred texts
        </Link>

        <header className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 mb-12">
          <div className="aspect-[3/4] rounded-xl overflow-hidden border border-saffron-200 bg-white shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img width={300} height={400} 
              src={book.coverImage}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            {book.titleSanskrit && (
              <p
                className="text-xl text-saffron-700 mb-2"
                style={{ fontFamily: "var(--font-noto-devanagari)" }}
              >
                {book.titleSanskrit}
              </p>
            )}
            <h1 className={H1.catalogue}>
              {book.title}
            </h1>
            {book.subtitle && (
              <p className="text-lg text-surface-600 mt-2">{book.subtitle}</p>
            )}
            {book.tradition && (
              <p className="text-sm text-saffron-700 mt-1">{book.tradition}</p>
            )}
            <p className="mt-4 text-base text-surface-700 leading-relaxed">
              {book.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-surface-500">
              {book.translator && <span>Translator: {book.translator}</span>}
              {book.license && <span>License: {book.license}</span>}
            </div>

            <div className="mt-6">
              <ContinueReadingCTA bookSlug={book.slug} />
            </div>
          </div>
        </header>

        <section>
          <h2 className="text-2xl font-semibold text-surface-900 mb-6">Contents</h2>
          <ChapterTOC book={book} />
        </section>
      </div>
    </div>
  );
}
