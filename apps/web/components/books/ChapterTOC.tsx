import Link from "next/link";
import type { BookManifest } from "@poojly/shared";

interface Props {
  book: BookManifest;
}

export function ChapterTOC({ book }: Props) {
  if (book.structure === "kandas" && book.kandas?.length) {
    return (
      <div className="space-y-8">
        {book.kandas.map((kanda) => {
          const chapters = book.chapters.filter((c) => c.kanda === kanda.slug);
          return (
            <section key={kanda.slug}>
              <header className="mb-3">
                <h2 className="text-xl font-semibold text-saffron-800">
                  {kanda.name}
                  {kanda.nameSanskrit && (
                    <span
                      className="text-base text-saffron-600 ml-2"
                      style={{ fontFamily: "var(--font-noto-devanagari)" }}
                    >
                      {kanda.nameSanskrit}
                    </span>
                  )}
                </h2>
                {kanda.description && (
                  <p className="text-sm text-surface-600 mt-1">{kanda.description}</p>
                )}
              </header>
              <ChapterList book={book} chapters={chapters} />
            </section>
          );
        })}
      </div>
    );
  }

  return <ChapterList book={book} chapters={book.chapters} />;
}

function ChapterList({
  book,
  chapters,
}: {
  book: BookManifest;
  chapters: BookManifest["chapters"];
}) {
  return (
    <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {chapters.map((c) => (
        <li key={c.slug}>
          <Link
            href={`/content/books/${book.slug}/${c.slug}`}
            className="flex items-baseline justify-between gap-3 px-3 py-2.5 rounded-lg border border-surface-200 hover:border-saffron-400 hover:bg-saffron-50 transition-colors"
          >
            <span className="flex items-baseline gap-2 min-w-0">
              <span className="text-xs font-mono text-saffron-700 shrink-0 w-7 text-right">
                {c.number}
              </span>
              <span className="text-sm font-medium text-surface-800 truncate">
                {c.title}
              </span>
            </span>
            <span className="text-xs text-surface-400 shrink-0">
              {c.placeholder ? "stub" : c.partial ? "partial" : c.verseCount ? `${c.verseCount}v` : ""}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
