import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { SAFFRON, SAFFRON_DEEP, saffronGlow } from '../tokens';

type Props = {
  durationFrames: number;
  direction?: 'horizontal' | 'vertical';
};

// Saffron masked wipe between major acts. A soft saffron panel sweeps across
// using a clip-path inset reveal — no motion-blur gradient, no copper, no
// magic-number translate. Replaces the old blur(20px) #b87333 wipe.
export const WhooshTransition: React.FC<Props> = ({ durationFrames, direction = 'horizontal' }) => {
  const frame = useCurrentFrame();
  const t = frame / durationFrames;

  // panel sweeps across: inset shrinks L->R (or T->B) to reveal, then grows back
  const sweep = interpolate(t, [0, 0.5, 1], [100, 0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const inset = direction === 'horizontal' ? `0 ${sweep}% 0 0` : `${sweep}% 0 0 0`;

  const opacity = interpolate(t, [0, 0.35, 0.65, 1], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${
          direction === 'horizontal' ? '90deg' : '180deg'
        }, ${SAFFRON_DEEP}, ${SAFFRON})`,
        clipPath: `inset(${inset})`,
        opacity,
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(50% 50% at 50% 50%, ${saffronGlow(
            0.5,
          )} 0%, transparent 70%)`,
        }}
      />
    </AbsoluteFill>
  );
};
