import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

type Props = {
  durationFrames: number;
  color?: string;
  direction?: 'horizontal' | 'vertical';
};

// Brief motion-blurred wipe used between major sections.
// Renders inside a Series.Sequence; covers the screen with brand color
// then fades out, simulating a whoosh card.
export const WhooshTransition: React.FC<Props> = ({
  durationFrames,
  color = '#b87333',
  direction = 'horizontal',
}) => {
  const frame = useCurrentFrame();
  const t = frame / durationFrames;
  const x = direction === 'horizontal' ? interpolate(t, [0, 0.5, 1], [-1920, 0, 1920]) : 0;
  const y = direction === 'vertical' ? interpolate(t, [0, 0.5, 1], [-1080, 0, 1080]) : 0;
  const opacity = interpolate(t, [0, 0.4, 0.6, 1], [0, 1, 1, 0]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${direction === 'horizontal' ? '90deg' : '180deg'}, transparent, ${color}, transparent)`,
        transform: `translate(${x}px, ${y}px)`,
        opacity,
        filter: 'blur(20px)',
      }}
    />
  );
};
