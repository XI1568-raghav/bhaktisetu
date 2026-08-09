# apps\remotion-pitch\src\components\Primitives.tsx

- MeshGradient · function · L32-L75 — Renders the animated, brand-colored mesh gradient background that visually separates reel sections, with deterministic per-blob sinusoidal drift over the dark base.
- GlassPanel · function · L80-L105 — Provides the universal frosted-glass container (translucent fill, backdrop blur, hairline border, layered soft shadow) that hosts all UI mockups in the reel.
- Cursor · function · L110-L190 — Renders the oversized glowing saffron cursor that guides the viewer's eye and emits a scale-pulse plus expanding ripple when a click frame is reached.
- PhoneFrame · function · L195-L231 — Draws a stylized, proportionally-scaled phone bezel with notch and optional saffron glow to frame vector UI content as a mobile mockup.
- LaptopFrame · function · L233-L291 — Draws a stylized laptop bezel with screen, camera dot, and base to frame vector UI content as a desktop mockup.
- KineticType · function · L296-L427 — Animates headline text with beat-synced reveals — masked line wipe, dynamic scale-up, or word-by-word cascade — for the reel's kinetic typography moments.
- Skeleton · function · L431-L449 — Renders shimmering gray placeholder bars that represent UI content 'building itself' before real content morphs in.
- Toggle · function · L452-L493 — Renders an animated on/off switch whose knob springs between positions and whose track lights up with a saffron-gold gradient when enabled.
- ChartFromZero · function · L496-L532 — Animates a bar chart whose bars spring from zero to staggered pseudo-random peaks, visualizing metrics growth in the demo.
- LoadingBar · function · L535-L567 — Animates a glowing progress bar that fills linearly from 0 to 100% over a configurable frame window.
- Badge · function · L570-L615 — Renders a pill-shaped notification badge that pops in with a spring scale to highlight labels or alerts in the mockup UI.
