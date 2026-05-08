import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { BG, INK, SAFFRON, FONT_DISPLAY } from '../tokens';

export const IntroCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 80 },
    from: 0.6,
    to: 1,
  });

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const tagOpacity = interpolate(frame, [18, 36], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
      <h1
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 220,
          fontWeight: 700,
          color: SAFFRON,
          letterSpacing: '-0.04em',
          margin: 0,
          transform: `scale(${titleScale})`,
          opacity: titleOpacity,
        }}
      >
        DARSHYA
      </h1>
      <p
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 56,
          fontWeight: 600,
          color: INK,
          marginTop: 40,
          opacity: tagOpacity,
          letterSpacing: '-0.02em',
        }}
      >
        Devotion. Verified.
      </p>
    </AbsoluteFill>
  );
};
