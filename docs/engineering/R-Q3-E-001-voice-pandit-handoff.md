# R-Q3-E-001 Voice AI Pandit v1 — founder handoff

> Status after this PR: scaffolded, tested (15/15 green), wired into `/ask-pandit`.
> Status of KPI (300 sessions/day): in_progress — needs founder secret paste + PostHog insight + organic traffic.

## What shipped in this PR

- **API route**: `POST /api/v1/voice-pandit/turn` (`apps/api/src/routes/voice-pandit.ts`)
  - Accepts `{ audioBase64, mimeType?, language? }`. Caps at 8 MB.
  - Pipeline: Groq `whisper-large-v3-turbo` STT → Groq `llama-3.3-70b-versatile` LLM → ElevenLabs `eleven_turbo_v2_5` TTS.
  - Returns `{ transcript, reply, audioBase64, audioMimeType, latency_ms, breakdown_ms, demo, language }`.
  - Rate limit: **10 turns / IP / hour** (per-route, on top of global 100/min/IP).
  - PII redaction: emails, phone numbers (including +91 formats), Aadhaar-length digit runs stripped before the LLM call.
  - Latency logged as structured `voice_pandit_turn` log line — agent fleet can scrape Render logs into PostHog later.
  - Env-or-noop: when `GROQ_API_KEY` or `ELEVENLABS_API_KEY` is absent the route returns a stub reply with `demo:true` so dev/staging never 500s.
- **GET `/api/v1/voice-pandit/health`** — surfaces stt/llm/tts live-or-demo state without leaking keys.
- **Web widget**: `components/VoicePanditButton.tsx` mounted at top of `/ask-pandit`.
  - Push-to-talk: hold mic → record (`MediaRecorder` webm/opus / mp4 fallback) → release → POST audio → autoplay returned mp3 + render transcript/reply.
  - PostHog `voice_pandit_session_started` + `voice_pandit_turn_complete` + `voice_pandit_session_error` events fired client-side (no-op when PostHog absent).
- **Tests**: 15 vitest cases (`voice-pandit.test.ts`) — schema bounds + 50-utterance PII-redaction corpus + payload caps.

## Success criteria status

| Criterion | Status |
|---|---|
| Round-trip p95 < 3 s on Render free + Groq + ElevenLabs Turbo | **TBD** — needs secrets pasted + first 100 turns observed. Demo mode reports `latency_ms` in response body. |
| 300+ daily sessions sustained 7-day window | **0** — founder secret paste + organic traffic required. Tracked via `voice_pandit_session_started` PostHog event. |
| 4.2/5 median rating across 100+ rated sessions | **deferred** — needs post-session 1-5 star rating UI (next slice). |
| 0 PII leaks (50-utterance test corpus) | **shipped** — 50-utt corpus locked in `voice-pandit.test.ts`. |

## Founder action required (status stays `in_progress` until done)

1. **Render env**: paste `GROQ_API_KEY` + `ELEVENLABS_API_KEY` into the API service. Confirm via:
   ```sh
   curl -s https://api.darshya.online/api/v1/voice-pandit/health
   # expect stt:"live" llm:"live" tts:"live"
   ```
2. **ElevenLabs voice IDs**: defaults are placeholders (`EXAVITQu4vr4xnSDxMaL` Sarah + `pNInz6obpgDQGcFmaJgB` Adam). Pick proper hi-IN + en-IN voices in the ElevenLabs UI, then set `VOICE_PANDIT_TTS_VOICE_HI` + `VOICE_PANDIT_TTS_VOICE_EN` on Render — no redeploy needed.
3. **PostHog Insight**: create an insight filtered to `voice_pandit_session_started` (last 24h count). Paste the insight id back into `docs/roadmap/items/Q3/engineering/001-voice-ai-pandit-v1-whisper-stt-groq-llm-elevenlabs.md` `kpi.query` field (replaces the `posthog-insight-TBD` token).
4. **Founder smoke test**: open https://darshya.online/ask-pandit on a phone, hold the saffron mic, speak "Namaste, om namah shivaya kaise japan karu?", expect <3 s before audio plays back.
5. **Render free-tier cost watch**: voice path = 3 paid calls per turn. Per-IP 10/hr cap protects against runaway. If usage spikes flip `VOICE_PANDIT_STT_MODEL` to `whisper-large-v3` (cheaper-but-slower) or pre-warm a smaller LLM.

## Deferred (next slice — not in scope of this PR)

- Post-session 1-5 star rating UI + persisted rating row.
- Server-side persistence of voice turns (currently in-memory only — transcript lives in client component state until next turn).
- PostHog server-side ingest (today: structured Render logs + client-side capture only).
- Mobile-app push-to-talk parity in `apps/mobile`.
