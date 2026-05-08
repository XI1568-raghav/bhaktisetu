import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { INK } from '../tokens';
import { LowerThird } from './LowerThird';

type Props = {
  src: string;             // e.g. 'pitch/img/01-home-hero.png'
  caption: string;
  durationFrames: number;
  zoom?: 'in' | 'out' | 'none';
  panY?: number;           // px to drift vertically over scene
  tilt?: number;           // degrees (0–6)
};

export const ImageScene: React.FC<Props> = ({
  src,
  caption,
  durationFrames,
  zoom = 'in',
  panY = 0,
  tilt = 0,
}) => {
  const frame = useCurrentFrame();
  const t = frame / durationFrames;

  const scale = zoom === 'in'
    ? interpolate(t, [0, 1], [1.02, 1.10])
    : zoom === 'out'
      ? interpolate(t, [0, 1], [1.10, 1.02])
      : 1.04;

  const translateY = interpolate(t, [0, 1], [0, panY]);

  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: 'hidden' }}>
      <Img
        src={staticFile(src)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translateY(${translateY}px) rotate(${tilt}deg)`,
          transformOrigin: 'center',
        }}
      />
      <LowerThird text={caption} durationFrames={durationFrames} />
    </AbsoluteFill>
  );
};
