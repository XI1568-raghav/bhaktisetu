# Darshya Mobile Assets

## Logo source

`logo.svg` is the canonical Darshya brand mark — a shikhara (temple peak) silhouette enclosing a diya (oil lamp) with flame. Saffron `#EA580C` background matches the app splash `backgroundColor`.

## Generating PNG icons for Expo

Expo requires PNG (not SVG) for app icons and splash. Until a designer provides final assets, render PNGs from `logo.svg`:

```bash
# Using sharp / svg-to-png / Inkscape / online tool — generate these sizes:
# - icon.png            1024x1024  (iOS + Android base)
# - adaptive-icon.png   1024x1024  (Android adaptive foreground)
# - splash.png          1284x2778  (iOS launch screen)
# - favicon.png         48x48      (web fallback)
```

Then add to `app.json`:

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#EA580C"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#EA580C"
      }
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

## Current icon set (regenerated 2026-09-02)

All three raster icons are derived from the same composited artwork. Originals are
kept alongside as `*.bak` — nothing was deleted.

| File | Size | PNG colour type | Contents |
|---|---|---|---|
| `icon.png` | 1024x1024 | 2 (RGB, **no alpha**) | Full artwork flattened onto `#EA580C`. |
| `adaptive-icon.png` | 1024x1024 | 6 (RGBA) | Android adaptive **foreground only** — transparent, no plate. |
| `notification-icon.png` | 96x96 | 6 (RGBA) | Pure-white temple silhouette on transparency. |
| `icon-with-alpha.png.bak` | 1024x1024 | 6 (RGBA) | Original `icon.png`, kept for reference. |
| `adaptive-icon-original.png.bak` | 1024x1024 | 6 (RGBA) | Original `adaptive-icon.png` (was byte-identical to `icon.png`). |

Why each one is shaped the way it is:

- **`icon.png` has no alpha channel on purpose.** The original was colour type 6
  and 3.89% fully transparent (the rounded corners). App Store Connect rejects
  icons containing an alpha channel with **ITMS-90717**. It is flattened onto the
  brand saffron `#EA580C`, not white — white would leave a pale ring where the
  rounded corners used to be. iOS applies its own corner mask, so the square is
  correct.
- **`adaptive-icon.png` is a real foreground, not a copy of `icon.png`.** The two
  files used to be byte-identical. Android composites the foreground on a 108dp
  canvas and only the inner 72dp is ever visible, so the old file was cropped by
  every launcher: the shikhara apex sat at y=110 of 1024 and the base at y=849,
  both outside the visible window. It also baked in its own orange plate while
  `app.json` already paints `backgroundColor: "#EA580C"` behind it — an orange
  plate inset inside an orange mask.

  The plate is now colour-keyed out (safe precisely because Android repaints the
  identical `#EA580C` behind it) and the glyph is rescaled so its bounding box is
  406x548 spanning x 309-714, y 238-785. Max content radius from centre is 341px
  = 66.6% of the canvas diameter, i.e. the whole glyph sits inside the 72dp
  visible circle and cannot be clipped by any launcher mask shape.
- **`notification-icon.png` is alpha-only artwork.** Android tints the small icon
  and treats every non-transparent pixel as the tint colour, so the RGB plane is
  forced to pure white (measured: 2102 visible pixels, 0 non-white) and the shape
  lives entirely in the alpha channel. Content is 65x88 inside 96x96 — the 22dp
  keyline of a 24dp icon at xxxhdpi.

If a designer supplies final artwork, regenerate all three from `logo.svg` and
keep these same constraints.

For now, Expo falls back to its default icon — **acceptable for Expo Go testing, but required for app-store submission.**
