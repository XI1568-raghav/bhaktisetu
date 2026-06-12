# Sanskrit Voice Tutor v1 — Product Spec

> **Roadmap item**: R-Q3-P-001 (P0) · **Authored**: 2026-06-13

## Mission

Pronunciation-graded Sanskrit learning starting with 20 starter mantras. Devotee speaks → AI grades pronunciation → suggests fixes.

## Non-goals

1. Full Sanskrit grammar curriculum (not a Duolingo replacement)
2. Translation engine
3. Devanagari typing practice
4. Verse memorization w/o pronunciation focus

## 20 starter mantras

| # | Mantra | Length | Difficulty |
|---|---|---|---|
| 1 | Gayatri Mantra | 24 syllables | Med |
| 2 | Maha Mrityunjaya | 32 syllables | Med |
| 3 | Om Namah Shivaya | 5 syllables | Easy |
| 4 | Om Namo Bhagavate Vasudevaya | 12 syllables | Easy |
| 5 | Shanti Mantra (Sahana Vavatu) | 30 syllables | Med |
| 6 | Hanuman Chalisa opening (Sri Guru) | 14 syllables | Easy |
| 7 | Vishnu Sahasranama opening (Visvam Vishnurvashatkaro) | 20 syllables | Hard |
| 8 | Lalita Sahasranama opening | 25 syllables | Hard |
| 9 | Soundarya Lahari Verse 1 | 32 syllables | Hard |
| 10 | Rudri prashna 1 | 18 syllables | Med |
| 11 | Surya Namaskara mantras × 12 | combined | Med |
| 12 | Ganesh Stotram (Pranamya Shirasa Devam) | 28 syllables | Med |
| 13 | Saraswati Vandana (Ya Kundendu) | 32 syllables | Med |
| 14 | Lakshmi Ashtottara opening | 16 syllables | Easy |
| 15 | Durga Stotram (Ya Devi) | 24 syllables | Med |
| 16 | Krishna Ashtakam Verse 1 | 32 syllables | Hard |
| 17 | Hare Krishna mahamantra | 32 syllables | Easy |
| 18 | Pavamana Mantra (Asato Ma) | 32 syllables | Med |
| 19 | Tvameva Mata | 22 syllables | Easy |
| 20 | Mangalacharanam (Yad Akṣaram) | 28 syllables | Med |

## Grading pipeline

1. User taps mantra → sees text + Devanagari + Roman transliteration
2. Hears reference pronunciation (recorded by senior pandit)
3. Records own pronunciation
4. Whisper STT → phoneme extraction (use montreal forced aligner OR phoneme-level whisper)
5. Compare to reference phoneme map
6. Output: score 0-100, plus specific fix suggestions ("emphasize 'a' in 'Bhagavate'")

## Pricing

- Free: 5 mantras + 3 attempts/day
- Premium ₹99/mo: all 20 mantras + unlimited + voice playback download
- Library expansion v2: +50 mantras post-traction

## Data model

```prisma
model SanskritMantra {
  id              String  @id @default(uuid()) @db.Uuid
  slug            String  @unique
  name            String
  devanagariText  String  @map("devanagari_text")
  romanTranslit   String  @map("roman_translit")
  englishMeaning  String  @map("english_meaning")
  referenceAudioUrl String @map("reference_audio_url")
  difficulty      String  // "easy" | "medium" | "hard"
  syllableCount   Int     @map("syllable_count")
}

model SanskritAttempt {
  id              String  @id @default(uuid()) @db.Uuid
  userId          String  @map("user_id") @db.Uuid
  mantraId        String  @map("mantra_id") @db.Uuid
  audioRecordingUrl String @map("audio_recording_url")
  scorePercent    Int     @map("score_percent") // 0-100
  phonemeErrors   Json    @map("phoneme_errors")
  createdAt       DateTime @default(now()) @map("created_at")

  @@index([userId, mantraId])
}
```

## Founder action

- [ ] Recruit senior pandit (per R-Q4-P-001 §Q4) to record 20 reference audios — ₹500/mantra = ₹10K one-time
- [ ] Engineering ticket R-Q3-P-001b: implement spec
- [ ] Free-tier voice infra: Whisper API ($0.006/min) — 20 mantras × 30 attempts/user/mo × 30s avg = ~$0.50/active user/mo

## Closes

R-Q3-P-001 — spec shipped.
