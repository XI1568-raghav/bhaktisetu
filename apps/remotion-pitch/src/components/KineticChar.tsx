import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_DISPLAY } from '../tokens';

type Props = {
  text: string; // single line; `|` forces a line break
  size?: number;
  color?: string;
  weight?: number;
  startFrame?: number; // delay before first char reveal
  charStaggerFrames?: number; // delay between chars (1-2 for fast, 3-4 slower)
  align?: 'center' | 'left';
  lineHeight?: number;
};

// Char-level kinetic typography — letters slide up + fade in one-by-one with a
// spring overshoot. Used for hero lines ("Devotion, verified.", "10,000 km away.")
// where per-character motion reads as premium agency craft. For word-level motion
// use the existing KineticText component.
export const KineticChar: React.FC<Props> = ({
  text,
  size = 84,
  color = '#fff',
  weight = 700,
  startFrame = 0,
  charStaggerFrames = 2,
  align = 'center',
  lineHeight = 1.05,
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
            fontFamily: FONT_DISPLAY,
            fontSize: size,
            fontWeight: weight,
            color,
            letterSpacing: '-0.03em',
            lineHeight,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: align === 'center' ? 'center' : 'flex-start',
          }}
        >
          {line.split('').map((ch, ci) => {
            // preserve spaces (don't collapse) — render a non-breaking space width
            if (ch === ' ') {
              const charStart = startFrame + li * 8 + ci * charStaggerFrames;
              const opacity = interpolate(frame - charStart, [0, 6], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              return (
                <span key={ci} style={{ display: 'inline-block', opacity, width: '0.3em' }}>
                  &nbsp;
                </span>
              );
            }
            const charStart = startFrame + li * 8 + ci * charStaggerFrames;
            const local = frame - charStart;
            const y = spring({
              frame: local,
              fps,
              config: { damping: 13, stiffness: 120, mass: 0.7 },
              from: 50,
              to: 0,
            });
            const opacity = interpolate(local, [0, 6], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <span
                key={ci}
                style={{
                  display: 'inline-block',
                  transform: `translateY(${y}px)`,
                  opacity,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
