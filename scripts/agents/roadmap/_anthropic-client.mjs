// Anthropic client w/ no-silent-swap guarantee.
// - ALWAYS Opus 4.7 (refuses other models per user directive)
// - ModelRejectedError on 403 Free-tier reject — workflow MUST halt (no fallback)
// - 3x exponential retry on 5xx + 429
// - 4xx (non-429) throws immediately
// - AUTO-STREAMING for max_tokens ≥ 8192 OR explicit stream:true
//   (Anthropic SDK throws "Streaming is strongly recommended for operations
//   that may take longer than 10 minutes" otherwise — was killing Decision Agent
//   at 32k tokens on Render bg-worker, observed 2026-06-11)
// Usage: callOpus47({ system?, messages, maxTokens, temperature, tools, client?, retryDelayMs?, stream? })
import Anthropic from '@anthropic-ai/sdk';

const RETRY_DELAYS = [2000, 8000, 30000];

// Auto-switch to streaming above this output budget. SDK warning threshold is
// ~10min wall-clock at typical Opus 4.7 token rate; 8192 is the canonical knee.
const STREAM_TOKEN_THRESHOLD = 8192;

export class ModelRejectedError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ModelRejectedError';
    this.status = status;
  }
}

/**
 * Collect a streaming response into the same shape messages.create() returns,
 * so callers don't need to change their parsing logic.
 *
 * SDK stream yields content_block_start / content_block_delta / content_block_stop
 * + message_start / message_delta / message_stop events. We accumulate text +
 * tool_use blocks + usage so downstream code (.content.filter(c => c.type === 'tool_use')
 * etc) stays unchanged.
 */
async function collectStream(stream) {
  const contentBlocks = []; // [{type: 'text', text: '...'}] | [{type: 'tool_use', id, name, input}]
  let usage = null;
  let stopReason = null;
  let stopSequence = null;
  let id = null;
  let model = null;
  let role = 'assistant';

  for await (const event of stream) {
    if (event.type === 'message_start') {
      id = event.message.id;
      model = event.message.model;
      role = event.message.role || 'assistant';
      usage = event.message.usage || null;
    } else if (event.type === 'content_block_start') {
      // Initialize block at index
      const block = event.content_block;
      if (block.type === 'text') {
        contentBlocks[event.index] = { type: 'text', text: '' };
      } else if (block.type === 'tool_use') {
        contentBlocks[event.index] = { type: 'tool_use', id: block.id, name: block.name, input: {} };
        contentBlocks[event.index].__inputJson = ''; // buffer for partial json
      }
    } else if (event.type === 'content_block_delta') {
      const block = contentBlocks[event.index];
      if (!block) continue;
      const delta = event.delta;
      if (delta.type === 'text_delta') {
        block.text += delta.text;
      } else if (delta.type === 'input_json_delta') {
        block.__inputJson += delta.partial_json;
      }
    } else if (event.type === 'content_block_stop') {
      const block = contentBlocks[event.index];
      if (block && block.type === 'tool_use') {
        try { block.input = JSON.parse(block.__inputJson || '{}'); } catch { block.input = {}; }
        delete block.__inputJson;
      }
    } else if (event.type === 'message_delta') {
      stopReason = event.delta?.stop_reason || stopReason;
      stopSequence = event.delta?.stop_sequence || stopSequence;
      if (event.usage) {
        usage = { ...(usage || {}), output_tokens: event.usage.output_tokens };
      }
    } else if (event.type === 'message_stop') {
      // Final event
    }
  }

  return {
    id,
    type: 'message',
    role,
    model,
    content: contentBlocks.filter(Boolean),
    stop_reason: stopReason,
    stop_sequence: stopSequence,
    usage,
  };
}

export async function callOpus47({ messages, maxTokens = 8000, temperature, tools, system, client, retryDelayMs, stream }) {
  // NOTE: temperature deprecated on Opus 4.7. Default undefined (omitted). Set explicitly only for testing.
  // API key resolution: SDK auto-reads ANTHROPIC_API_KEY internally.
  // Streaming path requires apiKey at iteration time — pass through explicitly
  // if found via any common alternate name. Don't pre-throw if missing; let SDK
  // raise its own (more diagnostic) error, AND ensure SDK can read ANTHROPIC_API_KEY
  // by side-mirroring from alternate names.
  // Common alternate names observed: ANTHROPIC_API_KEY_BLACKBOX_PROXY (this project,
  // Render env), ANTHROPIC_AUTH_TOKEN (some SDK examples), CLAUDE_API_KEY.
  const resolvedKey =
    process.env.ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_API_KEY_BLACKBOX_PROXY ||
    process.env.ANTHROPIC_AUTH_TOKEN ||
    process.env.CLAUDE_API_KEY;
  // Side-mirror so SDK's internal env read also resolves. Idempotent.
  if (resolvedKey && !process.env.ANTHROPIC_API_KEY) {
    process.env.ANTHROPIC_API_KEY = resolvedKey;
  }
  const c = client || new Anthropic({
    apiKey: resolvedKey,
    baseURL: process.env.ANTHROPIC_BASE_URL,
  });
  const delays = retryDelayMs !== undefined ? [retryDelayMs, retryDelayMs, retryDelayMs] : RETRY_DELAYS;

  // User directive: NEVER silent-swap model. Always Opus 4.7.
  // Read env at call-time (not module-load) so tests + runtime overrides both work.
  // Default updated 2026-06-12 to Blackbox proxy convention. Direct Anthropic
  // accepts 'claude-opus-4-7'; Blackbox needs 'blackboxai/anthropic/claude-opus-4.7'.
  // ANTHROPIC_MODEL env wins if set explicitly (Render + GH can override per environment).
  const baseUrl = (process.env.ANTHROPIC_BASE_URL || '').toLowerCase();
  const isBlackbox = /blackbox/.test(baseUrl);
  // 2026-07-10: Blackbox proxy is open-source-only — claude-opus-* returns 403
  // ("Only open-source models are supported"). Only blackboxai/z-ai/glm-5.2 works.
  // Direct Anthropic (non-Blackbox) still uses Opus 4.7. ANTHROPIC_MODEL env wins if set.
  const model = process.env.ANTHROPIC_MODEL ||
    (isBlackbox ? 'blackboxai/z-ai/glm-5.2' : 'claude-opus-4-7');
  if (!/opus-4[\.-]7|glm-5[\.-]2/.test(model)) {
    throw new ModelRejectedError(`Refusing to call unsupported model: ${model}. Set ANTHROPIC_MODEL to an Opus 4.7 variant or blackboxai/z-ai/glm-5.2.`, null);
  }

  // Auto-stream above SDK threshold OR explicit caller request.
  const shouldStream = stream === true || maxTokens >= STREAM_TOKEN_THRESHOLD;

  const baseParams = {
    model,
    max_tokens: maxTokens,
    ...(temperature !== undefined ? { temperature } : {}),
    ...(system ? { system } : {}),
    ...(tools ? { tools } : {}),
    messages,
  };

  let lastErr;
  for (let attempt = 0; attempt <= 3; attempt++) {
    try {
      if (shouldStream) {
        const s = c.messages.stream(baseParams);
        return await collectStream(s);
      }
      return await c.messages.create(baseParams);
    } catch (e) {
      // 403 + "Free tier" / "forbidden" / "access" → ModelRejectedError, NO retry, NO swap
      if (e.status === 403 && /Free tier|forbidden|access/i.test(e.message)) {
        throw new ModelRejectedError(`Blackbox proxy rejected ${model}: ${e.message}`, 403);
      }
      // 4xx other than 429 → throw immediately
      if (e.status >= 400 && e.status < 500 && e.status !== 429) throw e;
      lastErr = e;
      if (attempt === 3) break;
      await new Promise(r => setTimeout(r, delays[attempt]));
    }
  }
  throw lastErr;
}
