/**
 * Cohere embed-multilingual-v3 — 1024-dim vectors covering 100+
 * languages including Hindi, Sanskrit, Tamil, Bengali. Free trial
 * tier: 1000 calls/min, no monthly cap (rate-limited).
 *
 * Used for semantic search across mantras, aartis, content, temples
 * so users searching "shanti mantra for peace" in any language match
 * relevant items even when the title is in Devanagari.
 *
 * If COHERE_API_KEY is unset, generateEmbedding returns null and the
 * search route falls back to LIKE-based matching.
 */

const apiKey = process.env.COHERE_API_KEY;
const enabled = !!apiKey;

const MODEL = 'embed-multilingual-v3.0';
const DIMENSIONS = 1024;

type InputType = 'search_document' | 'search_query' | 'classification' | 'clustering';

interface CohereEmbedResponse {
  embeddings: number[][];
  id?: string;
  message?: string;
}

/**
 * Generate a single embedding. Use 'search_document' when storing,
 * 'search_query' when querying — Cohere optimises each direction.
 */
export async function generateEmbedding(
  text: string,
  inputType: InputType = 'search_document',
): Promise<number[] | null> {
  if (!enabled) return null;
  const trimmed = text.replace(/\s+/g, ' ').trim().slice(0, 2048);
  if (!trimmed) return null;
  try {
    const res = await fetch('https://api.cohere.com/v1/embed', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        texts: [trimmed],
        input_type: inputType,
        embedding_types: ['float'],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as CohereEmbedResponse;
    return data.embeddings?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Batch embed up to 96 texts per call (Cohere limit). Returns an array
 * aligned with the input — null entries indicate the text was empty
 * or the request failed. Used by the seed/backfill scripts.
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  inputType: InputType = 'search_document',
): Promise<(number[] | null)[]> {
  if (!enabled) return texts.map(() => null);
  const trimmed = texts.map((t) => t.replace(/\s+/g, ' ').trim().slice(0, 2048));
  const nonEmptyIdx = trimmed
    .map((t, i) => (t ? i : -1))
    .filter((i) => i >= 0);
  if (nonEmptyIdx.length === 0) return texts.map(() => null);
  try {
    const res = await fetch('https://api.cohere.com/v1/embed', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        texts: nonEmptyIdx.map((i) => trimmed[i]),
        input_type: inputType,
        embedding_types: ['float'],
      }),
    });
    if (!res.ok) return texts.map(() => null);
    const data = (await res.json()) as CohereEmbedResponse;
    const out: (number[] | null)[] = texts.map(() => null);
    nonEmptyIdx.forEach((origIdx, k) => {
      out[origIdx] = data.embeddings?.[k] ?? null;
    });
    return out;
  } catch {
    return texts.map(() => null);
  }
}

/**
 * Format a JS number[] as a pgvector literal — '[0.12,-0.34,...]'.
 * Postgres rejects NaN/Infinity in vector literals, so we sanitise.
 */
export function toPgVector(values: number[]): string {
  return `[${values.map((v) => (Number.isFinite(v) ? v.toFixed(6) : '0')).join(',')}]`;
}

export const embeddings = { enabled, model: MODEL, dimensions: DIMENSIONS };
