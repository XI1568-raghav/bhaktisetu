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

For now, Expo falls back to its default icon — **acceptable for Expo Go testing, but required for app-store submission.**
