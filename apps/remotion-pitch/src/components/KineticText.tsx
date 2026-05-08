import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_DISPLAY } from '../tokens';

type Props = {
  text: string;                    // single line or `|` for forced break
  size?: number;
  color?: string;
  weight?: number;
  startFrame?: number;             // delay before first word reveal
  wordStaggerFrames?: number;      // delay between words
  align?: 'center' | 'left';
};

// Apple-style kinetic typography: words slide in from below with overshoot,
// settle, then fade out at scene end (handled by parent Sequence).
export const KineticText: React.FC<Props> = ({
  text,
  size = 84,
  color = '#fff',
  weight = 700,
  startFrame = 0,
  wordStaggerFrames = 4,
  align = 'center',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = text.split('|').map((l) => l.trim());

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: align === 'center' ? 'center' : 'flex-start',
        padding: align === 'left' ? '0 80px' : 0,
        gap: 16,
        pointerEvents: 'none',
      }}
    >
      {lines.map((line, li) => (
        <div
          key={li}
          style={{
            display: 'flex',
            gap: '0.32em',
            flexWrap: 'wrap',
            justifyContent: align === 'center' ? 'center' : 'flex-start',
          }}
        >
          {line.split(' ').map((word, wi) => {
            const wordStart = startFrame + (li * 6) + wi * wordStaggerFrames;
            const local = frame - wordStart;
            const y = spring({
              frame: local,
              fps,
              config: { damping: 12, stiffness: 110, mass: 0.8 },
              from: 60,
              to: 0,
            });
            const opacity = interpolate(local, [0, 8], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <span
                key={wi}
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: size,
                  fontWeight: weight,
                  color,
                  letterSpacing: '-0.03em',
                  display: 'inline-block',
                  transform: `translateY(${y}px)`,
                  opacity,
                  lineHeight: 1.05,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
