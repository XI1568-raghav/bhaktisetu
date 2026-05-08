import { interpolate, useCurrentFrame } from 'remotion';
import { SAFFRON, INK, FONT_BODY } from '../tokens';

type Props = {
  x: number;                 // anchor (px from left)
  y: number;                 // anchor (px from top)
  text: string;
  startFrame?: number;
  durationFrames: number;
  side?: 'left' | 'right' | 'top' | 'bottom';
  lineLength?: number;
};

// Apple-style thin-line callout pointer used for feature deep-dive shots.
export const Callout: React.FC<Props> = ({
  x,
  y,
  text,
  startFrame = 0,
  durationFrames,
  side = 'right',
  lineLength = 220,
}) => {
  const frame = useCurrentFrame() - startFrame;
  const lineProgress = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const labelOpacity = interpolate(frame, [12, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fadeOut = interpolate(
    frame,
    [durationFrames - 14, durationFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const opacity = Math.min(1, fadeOut);

  const lineLen = lineLength * lineProgress;
  const sideMap = {
    right: { lineStyle: { left: x, top: y, width: lineLen, height: 1 }, labelStyle: { left: x + lineLength + 12, top: y - 16 } },
    left: { lineStyle: { left: x - lineLen, top: y, width: lineLen, height: 1 }, labelStyle: { left: x - lineLength - 200, top: y - 16 } },
    top: { lineStyle: { left: x, top: y - lineLen, width: 1, height: lineLen }, labelStyle: { left: x + 12, top: y - lineLength - 36 } },
    bottom: { lineStyle: { left: x, top: y, width: 1, height: lineLen }, labelStyle: { left: x + 12, top: y + lineLength + 4 } },
  } as const;
  const cfg = sideMap[side];

  return (
    <div style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', ...cfg.lineStyle, background: SAFFRON }} />
      <div
        style={{
          position: 'absolute',
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: SAFFRON,
          left: x - 6,
          top: y - 6,
          opacity: lineProgress,
          boxShadow: `0 0 16px ${SAFFRON}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          ...cfg.labelStyle,
          opacity: labelOpacity,
          background: '#fff',
          color: INK,
          fontFamily: FONT_BODY,
          fontWeight: 600,
          fontSize: 22,
          padding: '8px 14px',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </div>
    </div>
  );
};
