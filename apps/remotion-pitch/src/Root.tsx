import { Composition } from 'remotion';
import { DarshyaDemo, FPS, DURATION_FRAMES, ASPECTS } from './DarshyaDemo';

// 60fps SaaS demo reel — pure vector UI, beat-synced to synthesized future-bass.
//   - DarshyaDemo-HD     (1920x1080, 60fps) — fast master (same 60fps smoothness)
//   - DarshyaDemo-4K     (3840x2160, 60fps) — UHD master spec (slow render)
//   - DarshyaDemo-9x16   (1080x1920, 60fps) — Reels/Shorts center-safe
export const Root = () => {
  return (
    <>
      <Composition
        id="DarshyaDemo-HD"
        component={DarshyaDemo}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={ASPECTS.hd.width}
        height={ASPECTS.hd.height}
        defaultProps={{ aspect: 'hd' }}
      />
      <Composition
        id="DarshyaDemo-4K"
        component={DarshyaDemo}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={ASPECTS.landscape.width}
        height={ASPECTS.landscape.height}
        defaultProps={{ aspect: 'landscape' }}
      />
      <Composition
        id="DarshyaDemo-9x16"
        component={DarshyaDemo}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={ASPECTS.portrait.width}
        height={ASPECTS.portrait.height}
        defaultProps={{ aspect: 'portrait' }}
      />
    </>
  );
};
