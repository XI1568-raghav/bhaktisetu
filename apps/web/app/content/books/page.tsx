import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { loadAllManifests } from "../../../lib/books";
import { BookCard } from "../../../components/books/BookCard";

export const metadata: Metadata = {
  title: "Sacred Texts — Bhagavad Gita, Ramayana, Upanishads",
  description:
    "Read the Bhagavad Gita (18 chapters), Valmiki Ramayana (Bala Kanda, 77 sargas), and the Upanishads online. Sanskrit + English translations with reader controls.",
  alternates: { canonical: "https://darshya.online/content/books" },
  openGraph: {
    title: "Sacred Texts — Darshya",
    description:
      "Bhagavad Gita, Ramayana, Upanishads — full reader with Sanskrit + English.",
    url: "https://darshya.online/content/books",
    type: "website",
  },
};

export default async function BooksIndexPage() {
  const books = await loadAllManifests();

  return (
    <div className="min-h-[100dvh] bg-[#fbf6ec]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href="/content"
          className="inline-flex items-center gap-1 text-sm text-saffron-700 hover:text-saffron-900 mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          All content
        </Link>

        <header className="mb-10">
          <h1 className="text-4xl sm:text-5xl font-semibold text-surface-900 tracking-tight">
            Sacred Texts
          </h1>
          <p className="mt-3 text-lg text-surface-600 max-w-2xl">
            The foundational scriptures of Sanatana Dharma — Bhagavad Gita,
            Valmiki Ramayana, and the principal Upanishads. Sanskrit alongside
            English translations from public-domain sources (Sri Aurobindo,
            Sir Edwin Arnold, M.N. Dutt).
          </p>
          <p className="mt-2 text-sm text-surface-500">
            We do not fabricate Sanskrit verses. Chapters without verified
            source text are marked &quot;placeholder&quot; or &quot;partial&quot;.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <BookCard key={book.slug} book={book} />
          ))}
        </div>

        {books.length === 0 && (
          <p className="text-center text-surface-500 py-16">
            No books available right now. Please check back soon.
          </p>
        )}
      </div>
    </div>
  );
}
