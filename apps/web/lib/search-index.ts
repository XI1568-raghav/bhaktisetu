import { buildSearchIndex, type SearchIndexEntry } from './content';

export interface SearchHit extends SearchIndexEntry {
  score: number;
}

export function searchKnowledge(query: string, limit = 20): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const idx = buildSearchIndex();
  const hits: SearchHit[] = [];
  for (const e of idx) {
    const hay = `${e.title} ${e.summary} ${e.subTopic ?? ''} ${e.slug}`.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (!hay.includes(t)) { score = 0; break; }
      score += e.title.toLowerCase().includes(t) ? 3 : 1;
      if (e.summary.toLowerCase().includes(t)) score += 1;
    }
    if (score > 0) hits.push({ ...e, score });
  }
  hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return hits.slice(0, limit);
}
