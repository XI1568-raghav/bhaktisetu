/**
 * Transport for the Ask Pandit chat (POST /ai/chat, server-sent events).
 *
 * WHY THIS IS NOT INLINE IN AiChat.tsx (QA finding 17, reopened). The component
 * treated ANY exception between `fetch` and the last SSE byte as "the AI backend
 * is unreachable" and replaced the answer with the canned library text plus the
 * "AI guide is unavailable" notice, even though the API was healthy:
 *   1. It sent its own localStorage id (`conv_<ts>_<rand>`) as `conversationId`.
 *      For a signed-in user the API looks that id up in a UUID column, so it
 *      answered 404/500 and the devotee got the fallback; only anonymous users
 *      (and a bare curl) worked. The id is now sent only if the server issued it.
 *   2. A connection cut mid-answer (proxy idle reset, tab backgrounded) threw
 *      from `reader.read()` after the real answer had started to render, and the
 *      catch overwrote it with the fallback. Partial text is now kept.
 *   3. A single transient failure (cold dyno 502/503, reset) went straight to
 *      the fallback. It now retries once first, and a stall is bounded by an
 *      idle timeout instead of hanging or giving up early.
 */

export const AI_CHAT_STALL_TIMEOUT_MS = 45_000;
export const AI_CHAT_RETRY_DELAY_MS = 1_200;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isServerConversationId(id: string | null | undefined): id is string {
  return typeof id === 'string' && UUID_RE.test(id);
}

export interface AiChatEvent {
  type: string;
  [key: string]: unknown;
}

export interface AiChatRequest {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  onEvent: (event: AiChatEvent) => void;
  fetchImpl?: typeof fetch;
  stallTimeoutMs?: number;
  retryDelayMs?: number;
}

export type AiChatResult =
  | { kind: 'paywall'; message?: string }
  | { kind: 'ok'; interrupted: boolean };

export class AiChatUnavailableError extends Error {}

class RetryableError extends Error {
  constructor(
    message: string,
    readonly dropConversationId = false,
  ) {
    super(message);
  }
}

function parseLine(line: string, onEvent: (e: AiChatEvent) => void): boolean {
  if (!line.startsWith('data:')) return false;
  const json = line.slice(5).trim();
  if (!json) return false;
  try {
    const event = JSON.parse(json) as AiChatEvent;
    onEvent(event);
    return event.type === 'text' || (event.type === 'done' && !!event.fullContent);
  } catch {
    return false; // malformed event: skip, never abort the answer
  }
}

async function attempt(
  req: AiChatRequest,
  body: Record<string, unknown>,
): Promise<AiChatResult> {
  const doFetch = req.fetchImpl ?? fetch;
  const stallMs = req.stallTimeoutMs ?? AI_CHAT_STALL_TIMEOUT_MS;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const arm = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => controller.abort(), stallMs);
  };
  let gotText = false;

  try {
    arm();
    let res: Response;
    try {
      res = await doFetch(req.url, {
        method: 'POST',
        headers: req.headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      throw new RetryableError('network');
    }

    if (res.status === 402) {
      const data = await res.json().catch(() => ({}));
      return { kind: 'paywall', message: (data as { message?: string }).message };
    }
    if (!res.ok) {
      // 400/404: the server rejected our conversation id; retry as a new one.
      throw new RetryableError(`HTTP ${res.status}`, res.status === 400 || res.status === 404);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new RetryableError('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    try {
      for (;;) {
        arm();
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';
        for (const line of lines) if (parseLine(line, req.onEvent)) gotText = true;
      }
      if (buffer) if (parseLine(buffer, req.onEvent)) gotText = true;
    } catch {
      if (gotText) return { kind: 'ok', interrupted: true };
      throw new RetryableError('stream');
    }
    if (!gotText) throw new RetryableError('empty stream');
    return { kind: 'ok', interrupted: false };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Resolves with the outcome, or throws AiChatUnavailableError once the request
 * has genuinely failed twice without delivering any answer text.
 */
export async function requestAiChat(req: AiChatRequest): Promise<AiChatResult> {
  let body = req.body;
  for (let tries = 0; tries < 2; tries++) {
    try {
      return await attempt(req, body);
    } catch (err) {
      if (!(err instanceof RetryableError)) throw new AiChatUnavailableError('unavailable');
      if (err.dropConversationId) {
        const { conversationId: _drop, ...rest } = body;
        body = rest;
      }
      if (tries === 1) break;
      await new Promise((r) => setTimeout(r, req.retryDelayMs ?? AI_CHAT_RETRY_DELAY_MS));
    }
  }
  throw new AiChatUnavailableError('unavailable');
}
