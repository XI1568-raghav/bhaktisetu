import Link from "next/link";
import type { BookManifest } from "@poojly/shared";

export function BookCard({ book }: { book: BookManifest }) {
  const chapterCount =
    book.structure === "kandas"
      ? (book.kandas ?? []).reduce((s, k) => s + k.sargaCount, 0)
      : book.chapters.length;

  return (
    <Link
      href={`/content/books/${book.slug}`}
      className="group rounded-xl overflow-hidden border border-saffron-200/50 bg-white hover:shadow-xl hover:border-saffron-400/60 transition-all"
    >
      <div className="relative aspect-[3/4] bg-gradient-to-br from-saffron-100 to-amber-50 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={book.coverImage}
          alt={book.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="p-4">
        {book.titleSanskrit && (
          <p
            className="text-sm text-saffron-700 mb-1"
            style={{ fontFamily: "var(--font-noto-devanagari)" }}
          >
            {book.titleSanskrit}
          </p>
        )}
        <h3 className="font-semibold text-surface-800 leading-tight">
          {book.title}
        </h3>
        {book.subtitle && (
          <p className="text-sm text-surface-500 mt-1 line-clamp-2">
            {book.subtitle}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between text-xs text-surface-500">
          <span>{chapterCount} {book.structure === "kandas" ? "sargas" : "chapters"}</span>
          {book.translator && (
            <span className="truncate ml-2">tr. {book.translator}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
