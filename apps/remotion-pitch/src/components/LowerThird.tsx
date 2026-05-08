import { interpolate, useCurrentFrame } from 'remotion';
import { BG, INK, FONT_BODY } from '../tokens';

export const LowerThird: React.FC<{ text: string; durationFrames: number }> = ({
  text,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  // fade in 0-12, fade out last 12
  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(
    frame,
    [durationFrames - 12, durationFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const opacity = Math.min(fadeIn, fadeOut);
  const slideY = interpolate(frame, [0, 12], [30, 0], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        left: 80,
        bottom: 100,
        opacity,
        transform: `translateY(${slideY}px)`,
      }}
    >
      <div
        style={{
          backgroundColor: `${BG}EE`,
          color: INK,
          fontFamily: FONT_BODY,
          fontSize: 44,
          fontWeight: 600,
          padding: '20px 32px',
          borderRadius: 12,
          letterSpacing: '-0.01em',
          boxShadow: '0 8px 24px rgba(42, 37, 32, 0.18)',
        }}
      >
        {text}
      </div>
    </div>
  );
};
