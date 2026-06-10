---
id: R-Q3-E-001
title: "Voice AI Pandit v1 — Whisper STT + Groq LLM + ElevenLabs TTS round-trip <3s"
category: engineering
owner_role: cto
quarter: Q3
month_target: 7
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q2-E-001"]
blocks: ["R-Q3-P-001"]

kpi:
  metric: "voice_pandit_sessions_daily"
  current: 0
  target: 300
  unit: "count"
  source: "posthog"
  query: "posthog-insight-TBD-create-via-ui (events: voice_pandit_session_started filtered last 24h; founder creates Insight in PostHog UI then pastes ID here; target 300 sessions/day by Sep 30)"

revenue_impact:
  amount_inr: 400000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 48
est_cost_inr: 0

success_criteria:
  - "Voice round-trip latency p95 < 3s (mic-stop → audio-play) on Render free + Groq Llama 3.3 + ElevenLabs Turbo v2.5"
  - "300+ daily sessions sustained over 7-day window (PostHog event voice_pandit_session_started)"
  - "User satisfaction (5-star post-session rating) ≥ 4.2/5 median across 100+ rated sessions"
  - "0 PII leaks — Whisper transcripts redacted of phone/email before Groq prompt (test corpus 50 utterances)"

agent_brief:
  context_files:
    - apps/api/src/routes/ask-pandit.ts
    - apps/web/app/ask-pandit/page.tsx
    - apps/web/components/LiveChatWidget.tsx
    - docs/operational-context.md
    - docs/company/02-engineering.md
  prompt_skeleton: |
    Engineering sub-agent. P0 Voice AI Pandit v1 — round-trip < 3s end-to-end.
    Build POST /api/v1/voice-pandit/turn — accept webm audio blob, return mp3 audio blob + transcript text.
    Pipeline: Whisper STT (Groq whisper-large-v3-turbo, $0.04/hr) → Groq Llama-3.3-70b LLM (existing ask-pandit prompt template) → ElevenLabs Turbo v2.5 TTS (hi-IN + en-IN voices).
    Rate-limit 10 turns/IP/hour, PII-redact transcripts before LLM, log latency p50/p95/p99 to PostHog event voice_pandit_turn.
    Wire web UI in apps/web/app/ask-pandit/page.tsx — Push-to-talk button, MediaRecorder audio capture, audio.play() on response.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["voice","ai","pandit","whisper","tts"]
created_at: 2026-06-09T22:02:48.000Z
updated_at: 2026-06-09T22:02:48.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
