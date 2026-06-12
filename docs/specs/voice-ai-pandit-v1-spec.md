# Voice AI Pandit v1 Spec — Whisper STT + Groq LLM + ElevenLabs TTS

> **Roadmap item**: R-Q3-E-001 (P0) · **Authored**: 2026-06-12 · **Depends on**: R-Q2-E-001 AI Pandit MVP (text LLM proxy ships first)
>
> **Goal**: voice-first Q&A round-trip <3 sec for AI Pandit chat. Devotee asks Sanskrit/Hindi question verbally → AI Pandit answers verbally.

## Pipeline

```
[user mic input] → [Whisper STT] → [text question] →
[Groq LLM w/ Pandit system prompt] → [text answer] →
[ElevenLabs TTS Hindi voice] → [user speaker output]
```

Round-trip target: <3 sec including network.

## Component specs

### 1. STT — Whisper

- Model: whisper-1 (OpenAI) OR whisper-large-v3 self-hosted on RunPod
- Languages supported: Hindi, Sanskrit, English, Tamil, Telugu, Bengali, Marathi, Gujarati
- API: OpenAI Whisper API (cheaper) OR Groq Whisper (faster) OR self-host
- Cost: ~$0.006/min via OpenAI; ~$0.0005/min self-hosted on RunPod (after upfront)

### 2. LLM — Groq + system prompt

- Provider: Groq (per R-Q2-E-001)
- Model: llama-3.3-70b-versatile (free tier)
- System prompt: see R-Q2-E-001 spec (Pandit persona w/ Vedic knowledge constraints + safety guardrails)
- Speed: Groq ~500 tok/sec → 2-sec response for 1000 tokens

### 3. TTS — ElevenLabs

- Voice cloning: Pandit-style Hindi voice (paid ElevenLabs plan ~$22/mo for 100K chars)
- Voice options: pre-built Hindi male / South Indian Brahmin tone variants
- Cost: $0.000054 per char ($0.05 per Mahabharata verse roughly)
- Latency: ~500ms for short responses

### 4. Real-time orchestration

- Use server-side streaming: STT result → LLM stream → TTS stream → user
- WebSocket for low-latency audio chunks
- Fallback to HTTP polling for browsers w/o WebSocket support

## Cost model (per voice session)

| Step | Per-session cost (avg 3-question conversation, 60 sec total audio) |
|---|---|
| STT (1 min audio) | $0.006 |
| LLM (1500 tokens) | $0 (Groq free tier) |
| TTS (3 responses × 150 chars avg = 450 chars) | $0.024 |
| **Total per voice session** | **$0.030** |

At ₹2.50/session, 1000 sessions/day = ₹2,500/day = ₹75K/month. Sustainable on paid AI-Pandit ₹199/mo subscription tier (3 voice sessions/day average = ~₹2.50/session margin).

## Pricing tiers

- **Free tier**: 3 text questions/day, NO voice
- **AI Pandit ₹199/mo**: unlimited text, 5 voice sessions/day
- **AI Pandit Pro ₹499/mo**: unlimited voice + priority STT model

## Implementation skeleton

```typescript
// apps/api/src/lib/ai/voice-pipeline.ts
export async function processVoiceQuery(
  audioBuffer: Buffer,
  userId: string,
  conversationId: string,
): Promise<{ audioOut: Buffer; textIn: string; textOut: string }> {
  // 1. STT
  const stt = await whisper.transcribe(audioBuffer, { language: 'hi' });
  const textIn = stt.text;

  // 2. LLM
  const llmStream = groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: AI_PANDIT_SYSTEM_PROMPT },
      ...await loadConversationHistory(conversationId),
      { role: 'user', content: textIn },
    ],
    stream: true,
  });

  // 3. TTS streaming
  const audioOut = await elevenlabs.streamSynthesis({
    voice_id: 'hi-pandit-male',
    text_stream: llmStream,
  });

  return { audioOut, textIn, textOut: /* accumulated */ };
}
```

## Safety guardrails

Voice AI inherits all R-Q2-E-001 safety constraints, PLUS:

- NEVER pronounce mantras in audio output (could be misappropriated; only summary/meaning OK)
- Disclaimer at session start: "I am AI, not a replacement for live pandit consultation"
- Refuse predictions ("Will I get married?") — defer to live astrologer
- No mantra audio downloads (user can't save the audio file)

## Founder action

```markdown
- [ ] DEPENDS ON: R-Q2-E-001 text MVP ships first
- [ ] Activate ElevenLabs paid plan ($22/mo) once R-Q2-E-001 has 50+ paying users
- [ ] Activate OpenAI Whisper API key (or migrate to self-host on RunPod if scale demands)
- [ ] Recruit native Hindi pandit-tone voice for ElevenLabs cloning (separate, sensitive)
- [ ] Engineering ticket R-Q3-E-001b: implement pipeline above
```

## Out of scope

- Voice cloning of specific living pandits (legal + ethical issues)
- Voice in non-Indian languages (defer to v2)
- Voice OUTPUT only (input always text v1 — too risky w/o NLP filtering — defer)
- Real-time interruption / barge-in (UX nicety, defer)

## Closes

R-Q3-E-001 — spec shipped. Engineering deferred until R-Q2-E-001 text MVP proves traction.
