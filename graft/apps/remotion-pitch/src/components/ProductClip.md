# apps\remotion-pitch\src\components\ProductClip.tsx

- Props · type · L4-L13 — type Props = { src: string; // staticFile path to webm, e.g. 'pitch/video/06-darshan-live.webm' durationFrames: number; trimBefore?: number; // seconds to skip into the clip frame?: 'browser' | 'phone' | 'none'; // bezel style url?: string; // browser chrome url opacity?: number; // for low-opacity context usage startMuted?: boolean; // webms are silent anyway; keep true vignette?: boolean; };
- ProductClip · function · L19-L193 — ProductClip: React.FC<Props> = ({ src, durationFrames, trimBefore = 0, frame: frameStyle = 'browser', url = 'darshya.online', opacity = 1, startMuted = true, vignette = true, })
- Dot · function · L195-L197 — Dot: React.FC<{ color: string }> = ({ color })
