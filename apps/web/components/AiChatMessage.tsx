'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check, BookOpen } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Citation {
  source: string;
  reference: string;
  sanskrit: string;
  transliteration: string;
  english: string;
  hindi: string;
}

interface AiChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp?: string;
  isStreaming?: boolean;
}

// ─── Citation Card ────────────────────────────────────────────────────────────

function CitationCard({ citation }: { citation: Citation }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-saffron-200 rounded-lg overflow-hidden bg-saffron-50/50 mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-saffron-100/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-saffron-600 shrink-0" />
          <span className="text-sm font-medium text-saffron-800 truncate">
            {citation.reference}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-saffron-500 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-saffron-500 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-saffron-200">
          <div className="pt-2">
            <p className="text-sm font-devanagari font-[family-name:var(--font-noto-devanagari)] text-stone-800 leading-relaxed">
              {citation.sanskrit}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500 italic">
              {citation.transliteration}
            </p>
          </div>
          <div>
            <p className="text-sm text-stone-700">{citation.english}</p>
          </div>
          <div>
            <p className="text-sm font-devanagari font-[family-name:var(--font-noto-devanagari)] text-stone-600">
              {citation.hindi}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Simple Markdown Renderer ─────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode {
  // Split into paragraphs
  const paragraphs = text.split('\n\n');

  return paragraphs.map((paragraph, pIdx) => {
    // Handle headings
    if (paragraph.startsWith('### ')) {
      return (
        <h3 key={pIdx} className="text-base font-semibold text-stone-800 mt-3 mb-1">
          {paragraph.substring(4)}
        </h3>
      );
    }
    if (paragraph.startsWith('## ')) {
      return (
        <h2 key={pIdx} className="text-lg font-semibold text-stone-800 mt-3 mb-1">
          {paragraph.substring(3)}
        </h2>
      );
    }

    // Handle bullet lists
    const lines = paragraph.split('\n');
    const isList = lines.every((line) => line.startsWith('- ') || line.startsWith('* ') || line.trim() === '');

    if (isList && lines.some((l) => l.startsWith('- ') || l.startsWith('* '))) {
      return (
        <ul key={pIdx} className="list-disc list-inside space-y-1 my-2">
          {lines
            .filter((line) => line.startsWith('- ') || line.startsWith('* '))
            .map((line, lIdx) => (
              <li key={lIdx} className="text-sm text-stone-700">
                {renderInlineMarkdown(line.substring(2))}
              </li>
            ))}
        </ul>
      );
    }

    // Handle numbered lists
    const isNumberedList = lines.every(
      (line) => /^\d+\.\s/.test(line) || line.trim() === ''
    );

    if (isNumberedList && lines.some((l) => /^\d+\.\s/.test(l))) {
      return (
        <ol key={pIdx} className="list-decimal list-inside space-y-1 my-2">
          {lines
            .filter((line) => /^\d+\.\s/.test(line))
            .map((line, lIdx) => (
              <li key={lIdx} className="text-sm text-stone-700">
                {renderInlineMarkdown(line.replace(/^\d+\.\s/, ''))}
              </li>
            ))}
        </ol>
      );
    }

    // Regular paragraph — may contain line breaks
    return (
      <p key={pIdx} className="text-sm text-stone-700 my-1.5 leading-relaxed">
        {lines.map((line, lIdx) => (
          <span key={lIdx}>
            {lIdx > 0 && <br />}
            {renderInlineMarkdown(line)}
          </span>
        ))}
      </p>
    );
  });
}

function renderInlineMarkdown(text: string): React.ReactNode {
  // Process bold, italic, and inline code
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Italic: *text*
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    // Inline code: `text`
    const codeMatch = remaining.match(/`(.+?)`/);

    // Find the earliest match
    const matches = [
      boldMatch ? { type: 'bold', match: boldMatch, index: boldMatch.index! } : null,
      italicMatch ? { type: 'italic', match: italicMatch, index: italicMatch.index! } : null,
      codeMatch ? { type: 'code', match: codeMatch, index: codeMatch.index! } : null,
    ].filter(Boolean) as { type: string; match: RegExpMatchArray; index: number }[];

    if (matches.length === 0) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    const earliest = matches.sort((a, b) => a.index - b.index)[0]!;

    // Add text before the match
    if (earliest.index > 0) {
      parts.push(<span key={key++}>{remaining.substring(0, earliest.index)}</span>);
    }

    // Add the matched element
    if (earliest.type === 'bold') {
      parts.push(
        <strong key={key++} className="font-semibold text-stone-800">
          {earliest.match[1]}
        </strong>
      );
    } else if (earliest.type === 'italic') {
      parts.push(
        <em key={key++} className="italic text-stone-600">
          {earliest.match[1]}
        </em>
      );
    } else if (earliest.type === 'code') {
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 bg-stone-100 rounded text-xs font-mono text-saffron-800"
        >
          {earliest.match[1]}
        </code>
      );
    }

    remaining = remaining.substring(earliest.index + earliest.match[0].length);
  }

  return <>{parts}</>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AiChatMessage({
  role,
  content,
  citations,
  timestamp,
  isStreaming,
}: AiChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  };

  if (role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] md:max-w-[70%]">
          <div className="bg-saffron-600 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
          </div>
          {timestamp && (
            <p className="text-xs text-stone-400 mt-1 text-right">{timestamp}</p>
          )}
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%] md:max-w-[75%]">
        {/* Avatar */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 gradient-saffron rounded-full flex items-center justify-center shrink-0 mt-1 text-white text-xs font-bold shadow-sm">
            Om
          </div>

          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-stone-100">
              {/* Message content */}
              <div className="prose prose-sm max-w-none">
                {renderMarkdown(content)}
              </div>

              {/* Streaming cursor */}
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-saffron-500 animate-pulse ml-0.5 rounded-sm" />
              )}

              {/* Copy button */}
              {!isStreaming && content.length > 0 && (
                <div className="flex justify-end mt-2 pt-2 border-t border-stone-50">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-xs text-stone-400 hover:text-saffron-600 transition-colors"
                    title="Copy response"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Scripture citations */}
            {citations && citations.length > 0 && !isStreaming && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-stone-500 font-medium ml-1">
                  Scripture References:
                </p>
                {citations.map((citation, idx) => (
                  <CitationCard key={idx} citation={citation} />
                ))}
              </div>
            )}

            {timestamp && (
              <p className="text-xs text-stone-400 mt-1 ml-1">{timestamp}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
