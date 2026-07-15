# @poojly/remotion-pitch

Darshya's 10/10 animated SaaS product demo reel — a ~75s, 60fps, pure-vector film
with a synthesized future-bass score where every visual hit is beat-synced. Built
to the Master Creative Prompt spec (Teamble/Apple/Stripe vibe): dark base
`#0D0D12`, glowing saffron brand, glassmorphism panels, oversized cursor, kinetic
typography (masked/cascade/scale), zoom-through/whip-pan/shatter transitions,
3-5 words/screen, rapid pacing.

**No screenshots, no WebMs, no voiceover.** Every screen is a simplified 2.5D
vector asset that animates (skeleton→content morph, chart-from-zero, toggles,
loading bars) and is directed by a stylized cursor. The music is synthesized
programmatically (numpy/scipy DSP) — no licensed tracks.

## Architecture

5 scenes, durations locked to the music structure (buildup 0-15s, drop 15-60s,
outro 60-75s):

1. **Hook** (0-10s) — problem word types out, cursor clicks, shatter → logo
2. **Core Value** (10-25s) — "Meet Darshya" + 3 UI cards slide in + Sync button + chime
3. **Magic** (25-45s) — zoom into AI Pandit chat, glowing border, Gita verse streams
4. **Speed** (45-60s) — rapid 5-cut montage: darshan LIVE, kundli, dashboard, toggles, checks
5. **CTA** (60-75s) — pull back to ecosystem, "Devotion. Verified.", logo + URL + CTA

## Beat sync — the crux

`scripts/synth-music.py` generates `public/pitch/audio/music.wav` (future-bass:
buildup → drop → outro, 4-on-the-floor kick, syncopated snare, supersaw stabs)
**and** `beatmap.json` — a frame-precise map of every kick/snare/stab at 60fps.
`src/beat.ts` imports it; scenes anchor reveals/transitions to beat frames so
every UI pop and text reveal lands exactly on a kick/snare/stab. SFX stems
(whoosh/click/chime/pop) are layered on exact frames via `<Sequence>`+`<Audio>`.

## Compositions (Root.tsx)

| id                 | resolution | fps | purpose                             |
| ------------------ | ---------- | --- | ----------------------------------- |
| `DarshyaDemo-HD`   | 1920×1080  | 60  | fast master (same 60fps smoothness) |
| `DarshyaDemo-4K`   | 3840×2160  | 60  | UHD master spec (slow render)       |
| `DarshyaDemo-9x16` | 1080×1920  | 60  | Reels/Shorts center-safe            |

All scenes are authored at 4K coordinate space; HD and 9x16 scale the 4K content
to fit so every coordinate stays correct.

## Quick start

```bash
pnpm install

# regenerate the music + beat map + SFX (run after changing the score)
python scripts/synth-music.py

# render
pnpm build:hd      # ~1.5-2h at 1080p60 (fast master)
pnpm build:9x16    # Reels cut
pnpm build:4k      # 4K UHD (5h+ — run overnight)

# ship to web
pnpm ship
```

## Files

- `src/DarshyaDemo.tsx` — the 5-scene composition + root
- `src/beat.ts` — beat-map import + sync helpers (`kick(n)`, `hitPulse`, `appearOn`)
- `src/components/Primitives.tsx` — MeshGradient, GlassPanel, Cursor, Phone/Laptop
  frames, KineticType, Skeleton, Toggle, ChartFromZero, LoadingBar, Badge
- `src/components/VectorUI.tsx` — vector Darshya screens (Home, PujaCard, AiChat,
  Darshan, Kundli, Dashboard) — no screenshots
- `src/components/Transitions.tsx` — ZoomThrough, WhipPan, Shatter, CircleReveal, Scene
- `scripts/synth-music.py` — music + SFX + beat map synthesizer
- `public/pitch/audio/` — music.wav, beatmap.json, sfx-\*.wav
- `public/fonts/` — Cabinet Grotesk + Satoshi (Fontshare woff2)

## Brand tokens

Dark-mode palette in `src/tokens.ts`: `VOID #0D0D12` base, `SAFFRON #E16318` +
`GOLD #d4a438` glowing accents, mesh-gradient helpers, easing presets
(no linear — custom bezier/spring only). Display: Cabinet Grotesk. Body: Satoshi.
