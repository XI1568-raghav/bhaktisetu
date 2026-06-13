# Sanskrit Voice Tutor — Pronunciation Guide + Audio Playback

> **Roadmap item**: R-Q3-E-015 (P2) · **Authored**: 2026-06-13

## Goal

Q3 ship Sanskrit voice tutor. Per-shloka pronunciation guide + audio playback + slow/fast mode. Educational engagement layer.

## Per-shloka data

For 60+ shlokas (per R-Q2-M-004 Sanskrit voice library):
- Devanagari text
- Roman transliteration
- IAST transliteration (academic precision)
- English meaning
- Audio recording (pandit-recorded, 60sec/shloka)
- Slow audio (0.5x for learning)
- Word-by-word breakdown

## /sanskrit-tutor page

- Browse 60 shlokas by category (Vedic / Stotras / Aartis)
- Per-shloka detail page:
  - Devanagari + transliteration + meaning
  - Audio player w/ slow/fast toggle
  - Word-by-word highlights synced w/ audio
  - "Practice mode": record your voice + compare to pandit

## Tech

- HTML5 audio player
- Web Speech API for user voice recording
- Pronunciation comparison via waveform similarity (basic, V1)

## Engineering tickets

- R-Q3-E-015a: Audio library 60 recordings
- R-Q3-E-015b: Per-shloka detail page UI
- R-Q3-E-015c: Word-by-word sync
- R-Q3-E-015d: Practice mode (record + compare)

## Q3 success

- 60 shlokas live w/ audio
- 1K+ /sanskrit-tutor MAU
- 30%+ practice-mode usage

## Closes

R-Q3-E-015 — spec shipped.
