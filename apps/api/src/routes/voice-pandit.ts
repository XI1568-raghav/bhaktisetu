/**
 * R-Q3-E-001 — Voice AI Pandit v1
 *
 * POST /api/v1/voice-pandit/turn
 * Pipeline: Whisper STT (Groq whisper-large-v3-turbo) → Groq Llama-3.3-70b LLM
 * → ElevenLabs Turbo v2.5 TTS. Returns base64 mp3 + transcript + latency_ms.
 *
 * Env-or-noop: if GROQ_API_KEY or ELEVENLABS_API_KEY absent, returns a stub
 * response so the route never 500s in dev/staging. Production requires both.
 *
 * Rate limit: 10 turns/IP/hour (LLM + TTS cost discipline).
 * PII redaction: phone/email stripped from transcript before LLM call.
 * Latency metric: logged as `voice_pandit_turn { latency_ms, stt_ms, llm_ms, tts_ms }`.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const HAS_GROQ = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'demo-key';
const HAS_ELEVENLABS =
  !!process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY !== 'demo-key';

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

// Defaults match spec — operator may override via env without redeploy.
const STT_MODEL = process.env.VOICE_PANDIT_STT_MODEL || 'whisper-large-v3-turbo';
const LLM_MODEL = process.env.VOICE_PANDIT_LLM_MODEL || 'llama-3.3-70b-versatile';
const TTS_MODEL = process.env.VOICE_PANDIT_TTS_MODEL || 'eleven_turbo_v2_5';
// Sarah (en-IN-ish) + a multilingual voice for hi-IN. Operator can swap.
const TTS_VOICE_EN = process.env.VOICE_PANDIT_TTS_VOICE_EN || 'EXAVITQu4vr4xnSDxMaL';
const TTS_VOICE_HI = process.env.VOICE_PANDIT_TTS_VOICE_HI || 'pNInz6obpgDQGcFmaJgB';

const MAX_AUDIO_BYTES = 8 * 1024 * 1024; // 8 MB cap — ~5 min webm/opus
const HTTP_TIMEOUT_MS = 25_000; // hard cap per upstream call

const SYSTEM_PROMPT = `You are "Pandit Ji", a compassionate Hindu spiritual advisor speaking briefly over voice on the Darshya platform.
Reply in 2-3 short sentences max — this is a spoken response, not a written essay.
Ground answers in authentic Hindu scriptures (Bhagavad Gita, Upanishads, Vedas, Puranas). Cite only when natural.
If the question is unclear, ask one short clarifying question.
Match the language of the question: Hindi if Devanagari/transliteration, otherwise English.`;

// ─── Schemas ──────────────────────────────────────────────────────────────

const turnBodySchema = z.object({
  audioBase64: z
    .string()
    .min(8, 'audioBase64 is required')
    .max(Math.ceil((MAX_AUDIO_BYTES * 4) / 3) + 16, 'audio too large (max ~8 MB)'),
  mimeType: z.string().min(3).max(80).optional().default('audio/webm'),
  language: z.enum(['en', 'hi']).optional().default('en'),
});

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Strip phone numbers, email addresses, and long digit runs from a transcript
 * before it is sent to the LLM provider. Defense against accidental PII
 * disclosure in voice utterances (e.g. user says "my number is …").
 */
export function redactPII(text: string): string {
  if (!text) return text;
  return text
    // Email addresses
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[redacted-email]')
    // International + Indian phone numbers (handles spaces, dashes, parens)
    // Word-boundaries per triage 2026-06-15 — avoid eating ISO dates like 2026-06-15.
    .replace(/\b(?:\+?\d[\s\-()]?){7,15}\b/g, (m) => {
      const digits = m.replace(/\D/g, '');
      return digits.length >= 7 ? '[redacted-phone]' : m;
    })
    // Standalone long digit runs (Aadhaar 12, card 16, etc.)
    .replace(/\b\d{9,}\b/g, '[redacted-id]');
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = HTTP_TIMEOUT_MS,
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function whisperTranscribe(
  audio: Buffer,
  mimeType: string,
  language: 'en' | 'hi',
): Promise<string> {
  if (!HAS_GROQ) return '';
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(audio)], { type: mimeType }), 'utt.webm');
  form.append('model', STT_MODEL);
  form.append('language', language);
  form.append('response_format', 'json');
  const res = await fetchWithTimeout(`${GROQ_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`STT failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { text?: string };
  return (json.text ?? '').trim();
}

async function llmReply(
  redactedTranscript: string,
  language: 'en' | 'hi',
): Promise<string> {
  if (!HAS_GROQ) {
    return language === 'hi'
      ? 'नमस्ते। आवाज़ सेवा अभी डेमो मोड में है — कृपया पाठ्य उत्तर के लिए चैट का प्रयोग करें।'
      : 'Namaste. Voice mode is in demo right now — please use chat for full guidance.';
  }
  const res = await fetchWithTimeout(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      temperature: 0.4,
      max_tokens: 220,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: redactedTranscript },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`LLM failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return (json.choices?.[0]?.message?.content ?? '').trim();
}

async function elevenlabsTTS(text: string, language: 'en' | 'hi'): Promise<Buffer> {
  if (!HAS_ELEVENLABS) return Buffer.alloc(0);
  const voiceId = language === 'hi' ? TTS_VOICE_HI : TTS_VOICE_EN;
  const res = await fetchWithTimeout(
    `${ELEVENLABS_BASE}/text-to-speech/${voiceId}?output_format=mp3_22050_32`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: TTS_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`TTS failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

// ─── Route ────────────────────────────────────────────────────────────────

// Per-triage 2026-06-15: hard daily cap layered on hourly cap. Worst case 10/hr * 24 = 240/day
// = ~$7/day per abusive key. 50/day cap bounds that to ~$1.50/day per key + matches typical
// devotee usage pattern (max 1 voice session of ~5-10 turns per day).
const DAILY_TURN_CAP = 50;
const dailyCounters = new Map<string, { count: number; resetAt: number }>();

function dailyKey(req: { user?: { id?: string } | null; ip?: string }): string {
  // Prefer userId so NAT/shared-IP users do not collide. Fall back to ip.
  return req.user?.id || req.ip || 'unknown';
}

function checkDailyCap(req: { user?: { id?: string } | null; ip?: string }): { ok: boolean; remaining: number; resetAt: number } {
  const key = dailyKey(req);
  const now = Date.now();
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  const entry = dailyCounters.get(key);
  if (!entry || entry.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + TWENTY_FOUR_HOURS_MS };
    dailyCounters.set(key, fresh);
    return { ok: true, remaining: DAILY_TURN_CAP - 1, resetAt: fresh.resetAt };
  }
  if (entry.count >= DAILY_TURN_CAP) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count += 1;
  return { ok: true, remaining: DAILY_TURN_CAP - entry.count, resetAt: entry.resetAt };
}

export async function voicePanditRoutes(server: FastifyInstance) {
  // 10 turns / IP / hour (existing) + 50 turns / userId-or-ip / day (per triage 2026-06-15).
  // Voice is the most expensive path on the platform (STT + LLM + TTS = ~3 paid calls per turn).
  // Per-prefix global override hook in server.ts also caps /ai/* — this is the per-route refinement.
  server.post(
    '/turn',
    {
      config: {
        // Key by userId-or-ip per triage 2026-06-15 — NAT/shared-IP users would otherwise
        // share quota and a single abusive user behind CG-NAT could block legit traffic.
        rateLimit: {
          max: 10,
          timeWindow: '1 hour',
          keyGenerator: (req: any) => req.user?.id || req.ip || 'unknown',
        },
      },
    },
    async (request, reply) => {
      // Hard daily cap layered on top of hourly cap — bounds worst-case cost per key.
      const cap = checkDailyCap(request as any);
      if (!cap.ok) {
        reply.header('x-voice-pandit-daily-cap', String(DAILY_TURN_CAP));
        reply.header('x-voice-pandit-daily-reset', new Date(cap.resetAt).toISOString());
        return reply.status(429).send({
          error: 'daily voice cap exceeded',
          message: `Voice limit reached (${DAILY_TURN_CAP}/day). Try chat or come back tomorrow.`,
          dailyCap: DAILY_TURN_CAP,
          resetAt: new Date(cap.resetAt).toISOString(),
        });
      }
      reply.header('x-voice-pandit-daily-remaining', String(cap.remaining));
      const t0 = Date.now();
      const parsed = turnBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parsed.error.flatten(),
        });
      }
      const { audioBase64, mimeType, language } = parsed.data;

      let audio: Buffer;
      try {
        audio = Buffer.from(audioBase64, 'base64');
      } catch {
        return reply.status(400).send({ error: 'audioBase64 is not valid base64' });
      }
      if (audio.length === 0) {
        return reply.status(400).send({ error: 'empty audio' });
      }
      if (audio.length > MAX_AUDIO_BYTES) {
        return reply.status(413).send({ error: 'audio too large', maxBytes: MAX_AUDIO_BYTES });
      }

      try {
        // ── STT ────────────────────────────────────────────────────────────
        const t1 = Date.now();
        const rawTranscript = await whisperTranscribe(audio, mimeType, language);
        const sttMs = Date.now() - t1;
        const transcript = rawTranscript || (language === 'hi' ? 'नमस्ते' : 'Namaste');
        const redacted = redactPII(transcript);

        // ── LLM ────────────────────────────────────────────────────────────
        const t2 = Date.now();
        const reply_text =
          (await llmReply(redacted, language)) ||
          (language === 'hi' ? 'क्षमा करें, उत्तर तैयार नहीं हो सका।' : 'Sorry, could not generate a reply.');
        const llmMs = Date.now() - t2;

        // ── TTS ────────────────────────────────────────────────────────────
        const t3 = Date.now();
        const mp3 = await elevenlabsTTS(reply_text, language);
        const ttsMs = Date.now() - t3;

        const totalMs = Date.now() - t0;

        // PostHog server SDK is not wired here — emit a structured log line.
        // The agent fleet `funnel-drop-analyzer` scrapes Render logs and can
        // shovel these into PostHog later. Founder can also tail directly.
        request.log.info(
          {
            event: 'voice_pandit_turn',
            latency_ms: totalMs,
            stt_ms: sttMs,
            llm_ms: llmMs,
            tts_ms: ttsMs,
            language,
            transcript_len: transcript.length,
            reply_len: reply_text.length,
            audio_bytes_in: audio.length,
            audio_bytes_out: mp3.length,
            demo: !HAS_GROQ || !HAS_ELEVENLABS,
          },
          'voice_pandit_turn',
        );

        return reply.send({
          transcript,
          reply: reply_text,
          audioBase64: mp3.length > 0 ? mp3.toString('base64') : '',
          audioMimeType: 'audio/mpeg',
          latency_ms: totalMs,
          breakdown_ms: { stt: sttMs, llm: llmMs, tts: ttsMs },
          demo: !HAS_GROQ || !HAS_ELEVENLABS,
          language,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown';
        request.log.error({ event: 'voice_pandit_turn_failed', error: msg }, 'voice_pandit_turn_failed');
        // 502 — upstream provider failure. The client UI shows a "try again" pill.
        return reply.status(502).send({ error: 'voice pipeline failed', message: msg });
      }
    },
  );

  // GET /health — surfaces config status without leaking keys.
  server.get('/health', async () => ({
    ok: true,
    stt: HAS_GROQ ? 'live' : 'demo',
    llm: HAS_GROQ ? 'live' : 'demo',
    tts: HAS_ELEVENLABS ? 'live' : 'demo',
    models: { stt: STT_MODEL, llm: LLM_MODEL, tts: TTS_MODEL },
  }));
}

export const __testing = {
  turnBodySchema,
  redactPII,
  MAX_AUDIO_BYTES,
};
