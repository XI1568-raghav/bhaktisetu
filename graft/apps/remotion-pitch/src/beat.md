# apps\remotion-pitch\src\beat.ts

- BeatEvent · type · L7-L7 — type BeatEvent = { kind: string; t: number; frame: number; label: string };
- byKind · function · L20-L21 — byKind = (kind: string)
- kick · function · L28-L28 — kick = (n: number)
- snare · function · L29-L29 — snare = (n: number)
- stab · function · L30-L30 — stab = (n: number)
- sec · function · L33-L33 — sec = (s: number, fps = MUSIC_FPS)
- distToLast · function · L37-L50 — distToLast = (frame: number, events: BeatEvent[])
- hitPulse · function · L54-L58 — hitPulse = (frame: number, events: BeatEvent[], decayFrames = 18)
- appearOn · function · L62-L71 — appearOn = (frame: number, beatFrame: number, fps = MUSIC_FPS)
