# apps\remotion-pitch\src\components\ImageScene.tsx

- Props · type · L5-L12 — type Props = { src: string; // e.g. 'pitch/img/01-home-hero.png' caption: string; durationFrames: number; zoom?: 'in' | 'out' | 'none'; panY?: number; // px to drift vertically over scene tilt?: number; // degrees (0–6) };
- ImageScene · function · L14-L48 — ImageScene: React.FC<Props> = ({ src, caption, durationFrames, zoom = 'in', panY = 0, tilt = 0, })
