// Anthropic client w/ no-silent-swap guarantee.
// - ALWAYS Opus 4.7 (refuses other models per user directive)
// - ModelRejectedError on 403 Free-tier reject — workflow MUST halt (no fallback)
// - 3x exponential retry on 5xx + 429
// - 4xx (non-429) throws immediately
// Usage: callOpus47({ system?, messages, maxTokens, temperature, tools, client?, retryDelayMs? })
import Anthropic from '@anthropic-ai/sdk';

const RETRY_DELAYS = [2000, 8000, 30000];

export class ModelRejectedError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ModelRejectedError';
    this.status = status;
  }
}

export async function callOpus47({ messages, maxTokens = 8000, temperature, tools, system, client, retryDelayMs }) {
  // NOTE: temperature deprecated on Opus 4.7. Default undefined (omitted). Set explicitly only for testing.
  const c = client || new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseURL: process.env.ANTHROPIC_BASE_URL,
  });
  const delays = retryDelayMs !== undefined ? [retryDelayMs, retryDelayMs, retryDelayMs] : RETRY_DELAYS;

  // User directive: NEVER silent-swap model. Always Opus 4.7.
  // Read env at call-time (not module-load) so tests + runtime overrides both work.
  const model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-7';
  if (!/opus-4[\.-]7/.test(model)) {
    throw new ModelRejectedError(`Refusing to call non-Opus-4.7 model: ${model}. Set ANTHROPIC_MODEL=claude-opus-4-7.`, null);
  }

  let lastErr;
  for (let attempt = 0; attempt <= 3; attempt++) {
    try {
      return await c.messages.create({
        model,
        max_tokens: maxTokens,
        ...(temperature !== undefined ? { temperature } : {}),
        ...(system ? { system } : {}),
        ...(tools ? { tools } : {}),
        messages,
      });
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
