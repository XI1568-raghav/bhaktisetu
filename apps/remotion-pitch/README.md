# @poojly/remotion-pitch

Darshya 60-second investor pitch reel, authored as a Remotion composition.

## Quick start

```bash
pnpm install
pnpm --filter @poojly/remotion-pitch dev   # Remotion Studio at localhost:3000
pnpm --filter @poojly/remotion-pitch ship  # render + copy MP4 into web/public
```

## Brand tokens

Mirrors `apps/web/app/globals.css`:

| Token | Hex |
|---|---|
| `SAFFRON` | `#b87333` |
| `SAFFRON_DEEP` | `#943B19` |
| `SAFFRON_LIGHT` | `#F99A48` |
| `GOLD` | `#d4a438` |
| `INK` | `#2a2520` |
| `INK_DIM` | `#6b635a` |
| `BG` | `#f5f3ef` |
| `BG_SOFT` | `#faf8f3` |

Display: Cabinet Grotesk 700. Body: Satoshi 400/600.

## Assets reused from web

- Stills: `../web/public/pitch/img/*.png` (13 captures)
- VO audio: `../web/scripts/build/vo.mp3` (regenerate via edge-tts)

## Composition: `<DarshyaPitch>`

60s, 1920x1080, 30fps. PAS arc — Problem · Agitation · Solution · CTA. See
`src/DarshyaPitch.tsx` for the scene table; matches the storyboard table
maintained in `apps/web/scripts/stitch-pitch-video.sh`.
