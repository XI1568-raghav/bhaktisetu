import type { Verse as VerseType, ReaderPreferences } from "@poojly/shared";

interface Props {
  verse: VerseType;
  prefs: ReaderPreferences;
}

export function Verse({ verse, prefs }: Props) {
  const showSa = prefs.showSanskrit && !!verse.sanskrit;
  const showTr = prefs.showTransliteration && !!verse.transliteration;
  const showEn = prefs.showEnglish && !!verse.english;

  return (
    <article id={`verse-${verse.number}`} className="reader-verse" data-verse={verse.number}>
      <div className="reader-verse-num mb-2">VERSE {verse.number}</div>
      {showSa && (
        <div className="reader-sanskrit text-lg whitespace-pre-line">
          {verse.sanskrit}
        </div>
      )}
      {showTr && (
        <div className="reader-translit text-base mt-2 whitespace-pre-line">
          {verse.transliteration}
        </div>
      )}
      {showEn && (
        <div className="reader-english text-base mt-3 whitespace-pre-line">
          {verse.english}
        </div>
      )}
      {verse.commentary && (
        <div className="reader-commentary whitespace-pre-line">
          {verse.commentary}
        </div>
      )}
    </article>
  );
}
