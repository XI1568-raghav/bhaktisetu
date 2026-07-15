import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from 'remotion';
import { BG, INK, SAFFRON, saffronGlow, FONT_DISPLAY } from '../tokens';
import { KineticText } from './KineticText';

// ACT 1 — Hook (0–5s)
// Bold minimalist title card, slow zoom on hero, "Devotion is broken." beat.
export const HookAct: React.FC<{ durationFrames: number }> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / durationFrames;

  // logo scale spring
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 60 },
    from: 0.7,
    to: 1,
  });

  // hero image slow zoom 1.0 -> 1.10
  const heroScale = interpolate(t, [0, 1], [1.02, 1.1]);
  const heroOpacity = interpolate(t, [0.4, 0.7], [0, 0.32], { extrapolateRight: 'clamp' });

  // title fade out near end so next act takes over
  const titleOpacity = interpolate(t, [0, 0.15, 0.75, 1], [0, 1, 1, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: 'hidden' }}>
      {/* faint hero image behind title to ground in product */}
      <Img
        src={staticFile('pitch/img/01-home-hero.png')}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${heroScale})`,
          opacity: heroOpacity,
          filter: 'blur(2px)',
        }}
      />
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${BG}E0, ${BG}F5)` }} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: titleOpacity,
          gap: 24,
        }}
      >
        <h1
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 220,
            fontWeight: 700,
            color: SAFFRON,
            letterSpacing: '-0.04em',
            margin: 0,
            transform: `scale(${logoScale})`,
            textShadow: `0 4px 24px ${saffronGlow(0.2)}`,
          }}
        >
          DARSHYA
        </h1>
        <KineticText
          text="Devotion. Verified."
          size={56}
          color={INK}
          weight={600}
          startFrame={20}
          wordStaggerFrames={5}
        />
      </div>
    </AbsoluteFill>
  );
};
