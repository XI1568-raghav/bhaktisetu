# apps\remotion-pitch\src\components\BrowserMockup.tsx

- Props · type · L4-L10 — type Props = { src: string; url?: string; width?: number; // 1920 default; downscale for "device on background" glow?: boolean; durationFrames: number; };
- BrowserMockup · function · L14-L103 — BrowserMockup: React.FC<Props> = ({ src, url = 'darshya.online', width = 1500, glow = true, durationFrames, })
- dot · function · L105-L110 — dot = (c: string): React.CSSProperties
