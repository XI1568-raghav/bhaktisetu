import React from 'react';
import GlossaryTooltip from './GlossaryTooltip';
import { lookupTerm } from '../lib/glossary';

interface Props {
  body: string;
  glossaryTerms?: string[];
}

function renderInline(text: string, glossarySet: Set<string>, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) {
      out.push(...renderPlain(text.slice(last, m.index), glossarySet, `${keyPrefix}-p${i++}`));
    }
    const tok = m[0];
    if (tok.startsWith('**')) {
      out.push(<strong key={`${keyPrefix}-b${i++}`}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith('*')) {
      out.push(<em key={`${keyPrefix}-i${i++}`}>{tok.slice(1, -1)}</em>);
    } else if (tok.startsWith('`')) {
      out.push(
        <code key={`${keyPrefix}-c${i++}`} className="bg-surface-100 text-saffron-700 px-1.5 py-0.5 rounded text-sm font-mono">
          {tok.slice(1, -1)}
        </code>
      );
    } else {
      const link = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        out.push(
          <a key={`${keyPrefix}-a${i++}`} href={link[2]} className="text-saffron-600 underline hover:text-saffron-700" target={link[2]!.startsWith('http') ? '_blank' : undefined} rel={link[2]!.startsWith('http') ? 'noreferrer' : undefined}>
            {link[1]}
          </a>
        );
      }
    }
    last = m.index + tok.length;
  }
  if (last < text.length) {
    out.push(...renderPlain(text.slice(last), glossarySet, `${keyPrefix}-p${i++}`));
  }
  return out;
}

function renderPlain(text: string, glossarySet: Set<string>, keyPrefix: string): React.ReactNode[] {
  if (glossarySet.size === 0) return [text];
  const words = text.split(/(\s+|[.,;:!?()])/);
  return words.map((w, idx) => {
    const clean = w.trim();
    if (clean && glossarySet.has(clean.toLowerCase())) {
      const entry = lookupTerm(clean);
      if (entry) {
        return <GlossaryTooltip key={`${keyPrefix}-g${idx}`} term={w} entry={entry} />;
      }
    }
    return w;
  });
}

export default function MdxRender({ body, glossaryTerms = [] }: Props) {
  const glossarySet = new Set(glossaryTerms.map((t) => t.toLowerCase()));
  const lines = body.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let blockIdx = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) { i++; continue; }
    if (line.startsWith('```')) {
      const start = i + 1;
      let end = start;
      while (end < lines.length && !lines[end]!.startsWith('```')) end++;
      blocks.push(
        <pre key={`bk-${blockIdx++}`} className="bg-surface-900 text-saffron-100 rounded-xl p-4 overflow-x-auto text-sm my-4">
          <code>{lines.slice(start, end).join('\n')}</code>
        </pre>
      );
      i = end + 1;
      continue;
    }
    if (line.startsWith('### ')) {
      blocks.push(<h3 key={`h-${blockIdx++}`} className="text-xl font-bold text-surface-900 mt-6 mb-2">{renderInline(line.slice(4), glossarySet, `h${blockIdx}`)}</h3>);
      i++; continue;
    }
    if (line.startsWith('## ')) {
      blocks.push(<h2 key={`h-${blockIdx++}`} className="text-2xl font-bold text-surface-900 mt-8 mb-3">{renderInline(line.slice(3), glossarySet, `h${blockIdx}`)}</h2>);
      i++; continue;
    }
    if (line.startsWith('# ')) {
      blocks.push(<h1 key={`h-${blockIdx++}`} className="text-3xl font-bold text-surface-900 mt-8 mb-4">{renderInline(line.slice(2), glossarySet, `h${blockIdx}`)}</h1>);
      i++; continue;
    }
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i]!.startsWith('> ')) {
        quoteLines.push(lines[i]!.slice(2));
        i++;
      }
      blocks.push(
        <blockquote key={`bq-${blockIdx++}`} className="border-l-4 border-saffron-400 bg-saffron-50 pl-4 py-2 my-4 italic text-surface-700">
          {quoteLines.map((q, qi) => (<p key={qi}>{renderInline(q, glossarySet, `bq${blockIdx}-${qi}`)}</p>))}
        </blockquote>
      );
      continue;
    }
    if (line.match(/^[-*]\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i]!.match(/^[-*]\s+/)) {
        items.push(lines[i]!.replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={`ul-${blockIdx++}`} className="list-disc list-inside space-y-1 my-3 text-surface-700">
          {items.map((it, ii) => (<li key={ii}>{renderInline(it, glossarySet, `ul${blockIdx}-${ii}`)}</li>))}
        </ul>
      );
      continue;
    }
    if (line.match(/^\d+\.\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i]!.match(/^\d+\.\s+/)) {
        items.push(lines[i]!.replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={`ol-${blockIdx++}`} className="list-decimal list-inside space-y-1 my-3 text-surface-700">
          {items.map((it, ii) => (<li key={ii}>{renderInline(it, glossarySet, `ol${blockIdx}-${ii}`)}</li>))}
        </ol>
      );
      continue;
    }
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length && lines[i]!.trim() && !lines[i]!.match(/^([#>\-*\d`]|\d+\.)/)) {
      paraLines.push(lines[i]!);
      i++;
    }
    blocks.push(
      <p key={`p-${blockIdx++}`} className="text-surface-700 leading-relaxed my-3">
        {renderInline(paraLines.join(' '), glossarySet, `p${blockIdx}`)}
      </p>
    );
  }
  return <div className="prose-article">{blocks}</div>;
}
