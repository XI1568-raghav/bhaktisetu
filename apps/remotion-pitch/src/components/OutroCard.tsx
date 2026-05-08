import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { BG, INK, SAFFRON, SAFFRON_DEEP, FONT_DISPLAY, FONT_BODY } from '../tokens';

export const OutroCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const urlScale = spring({ frame, fps, config: { damping: 200 }, from: 0.85, to: 1 });
  const urlOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const subOpacity = interpolate(frame, [18, 36], [0, 1], { extrapolateRight: 'clamp' });
  const tagOpacity = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
      <h2
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 140,
          fontWeight: 700,
          color: SAFFRON,
          margin: 0,
          letterSpacing: '-0.04em',
          opacity: urlOpacity,
          transform: `scale(${urlScale})`,
        }}
      >
        darshya.online
      </h2>
      <p
        style={{
          fontFamily: FONT_BODY,
          fontSize: 44,
          color: INK,
          marginTop: 32,
          opacity: subOpacity,
        }}
      >
        Seed round open · founder@darshya.online
      </p>
      <p
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 36,
          fontWeight: 600,
          color: SAFFRON_DEEP,
          marginTop: 28,
          opacity: tagOpacity,
          letterSpacing: '-0.02em',
        }}
      >
        Devotion. Verified.
      </p>
    </AbsoluteFill>
  );
};
