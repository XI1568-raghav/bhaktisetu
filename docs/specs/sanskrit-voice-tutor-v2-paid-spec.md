# Sanskrit Voice Tutor v2 — Paid Tier + Advanced Mantras + Pronunciation Grading

> **Roadmap item**: R-Q4-P-004 (P0) · **Authored**: 2026-06-13 · **Extends**: R-Q3-P-001 v1

## v2 changes from v1

| | v1 (R-Q3-P-001) | v2 (this spec) |
|---|---|---|
| Mantras | 20 starter | 50 advanced added (70 total) |
| Pronunciation | Score 0-100 + 3 fix suggestions | Score + phoneme-level error map + audio playback comparison |
| Paid tier | ₹99/mo (5 mantras, 3 attempts/day) | ₹199/mo (all 70, unlimited) + Pro ₹499/mo (everything + voice download + personalized AI tutor) |
| Voice library | 1 reference voice | 3 voice options (Smarta / Vaishnav / Tamil Iyer styles) |
| Progress tracking | Per-mantra score history | Per-mantra + per-phoneme weakness analysis + recommended next mantra |

## 50 advanced mantras (v2 additions)

Each cluster covers a sampradaya / tradition deeply:

### Smarta (15 mantras)

Includes: Rudri Prashna 2-5, Shri Sukta, Devi Mahatmya invocations, Skanda Stotra, Aditya Hridayam, etc.

### Vaishnav (15 mantras)

Includes: Vishnu Sahasranama excerpts, Lalita Sahasranama excerpts, Garbha Stuti, Hari Stotra, Govinda Damodara Stotra, Madhurashtakam, etc.

### Saiva (10 mantras)

Includes: Linga Ashtakam, Bilva Ashtakam, Rudri full, Shiva Manasa Puja, etc.

### Tamil Saiva tradition (5 mantras)

Includes: Thiruvasagam excerpts (Tamil), Kanda Sashti Kavacham, Murugan Ashtakam, etc.

### Bengali Shakta (5 mantras)

Includes: Kali Stotra, Durga Saptashati invocation, Chandi Stotra excerpts, etc.

## Pro-tier features

### Personalized AI tutor

User can ask follow-up questions in chat:
- "How do I pronounce 'ksh' correctly?"
- "What does this verse mean?"
- "When should I recite this mantra?"

Backend: Groq LLM w/ Sanskrit-knowledge system prompt (cross-ref R-Q2-E-001 AI Pandit MVP).

### Voice download

User can download their best recording per mantra for personal practice playback. ZIP archive.

### Progress dashboard

Per-mantra trend chart, phoneme weakness summary, recommended next mantra.

## Economics

- Pro ₹499/mo × 100 users by Q4-end = ₹50K MRR
- Standard ₹199/mo × 500 users by Q4-end = ₹1L MRR
- Free tier: 70 mantras, 1 attempt/day each → drives upgrades

Total Sanskrit tutor MRR potential: ~₹1.5L by Q4. Niche product but tight margin.

## Engineering tickets

- R-Q4-P-004a: 50 mantra reference audio recording (₹500/mantra × 50 = ₹25K one-time)
- R-Q4-P-004b: phoneme-level scoring algorithm (Whisper phoneme-mode OR Montreal forced aligner)
- R-Q4-P-004c: 3 voice library (₹500/mantra × 50 × 2 extra voices = ₹50K one-time)
- R-Q4-P-004d: AI tutor chat (extends R-Q2-E-001)
- R-Q4-P-004e: voice download
- R-Q4-P-004f: progress dashboard

## Closes

R-Q4-P-004 — spec shipped.
