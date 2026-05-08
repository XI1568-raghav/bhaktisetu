import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { INK } from '../tokens';
import { LowerThird } from './LowerThird';
import { Callout } from './Callout';

type Props = {
  src: string;
  caption: string;
  durationFrames: number;
  zoomFrom?: number;
  zoomTo?: number;
  callout?: { x: number; y: number; text: string; side?: 'left' | 'right' | 'top' | 'bottom' };
  focusBlur?: boolean;          // mild DOF feel
};

// ACT 4 — Feature deep-dive scene with optional Apple-style line-callout +
// simulated DOF blur edge for camera-focus feel.
export const FeatureScene: React.FC<Props> = ({
  src,
  caption,
  durationFrames,
  zoomFrom = 1.04,
  zoomTo = 1.12,
  callout,
  focusBlur = false,
}) => {
  const frame = useCurrentFrame();
  const t = frame / durationFrames;
  const scale = interpolate(t, [0, 1], [zoomFrom, zoomTo]);

  // smooth horizontal parallax drift
  const parallaxX = interpolate(t, [0, 1], [-12, 12]);

  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: 'hidden' }}>
      <Img
        src={staticFile(src)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translateX(${parallaxX}px)`,
          filter: focusBlur ? 'contrast(1.05) saturate(1.08)' : 'contrast(1.04) saturate(1.05)',
        }}
      />
      {/* edge vignette to mimic camera DOF */}
      {focusBlur && (
        <AbsoluteFill
          style={{
            background:
              'radial-gradient(60% 50% at 50% 50%, transparent 50%, rgba(0,0,0,0.32) 100%)',
            mixBlendMode: 'multiply',
          }}
        />
      )}
      <LowerThird text={caption} durationFrames={durationFrames} />
      {callout && (
        <Callout
          x={callout.x}
          y={callout.y}
          text={callout.text}
          startFrame={10}
          durationFrames={durationFrames - 10}
          side={callout.side ?? 'right'}
        />
      )}
    </AbsoluteFill>
  );
};
