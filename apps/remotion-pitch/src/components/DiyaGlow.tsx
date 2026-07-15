import { AbsoluteFill, random, useCurrentFrame } from 'remotion';
import { saffronGlow, goldGlow } from '../tokens';

type Props = {
  count?: number; // number of embers
  intensity?: number; // base opacity multiplier
  seed?: string; // deterministic seed
  area?: 'full' | 'bottom'; // where embers originate
};

// Warm floating ember field — diya-glow atmosphere for Hook/Payoff/Outro.
// Deterministic via random(`${seed}-${i}`) so every render is identical.
// Pure CSS radial gradients, no external assets. Embers rise + drift + twinkle.
export const DiyaGlow: React.FC<Props> = ({
  count = 24,
  intensity = 1,
  seed = 'diya',
  area = 'bottom',
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      {Array.from({ length: count }).map((_, i) => {
        const r = (k: string) => random(`${seed}-${i}-${k}`);
        const xPct = r('x') * 100; // 0-100% across
        const yStart = area === 'bottom' ? 95 : r('ys') * 100;
        const size = 4 + r('s') * 10; // 4-14px
        const speed = 0.3 + r('v') * 0.6; // rise speed
        const swayAmp = 8 + r('sw') * 18; // px horizontal sway
        const swayFreq = 0.02 + r('sf') * 0.03;
        const phase = r('p') * Math.PI * 2;
        const drift = r('d') * 0.5 + 0.5;
        const gold = r('g') > 0.6; // some embers gold, most saffron

        // rise: y moves up over the film; wrap handled by opacity falloff
        const rise = (frame * speed) % 320;
        const y = yStart - rise;
        const x = xPct + Math.sin(frame * swayFreq + phase) * swayAmp * 0.1;
        const twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(frame * 0.06 + phase));
        const opacity = twinkle * intensity * drift;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              borderRadius: '50%',
              background: gold
                ? `radial-gradient(circle, ${goldGlow(0.95)} 0%, ${goldGlow(0)} 70%)`
                : `radial-gradient(circle, ${saffronGlow(0.95)} 0%, ${saffronGlow(0)} 70%)`,
              opacity,
              filter: 'blur(2px)',
              transform: `translate(-50%, -50%) scale(${0.8 + twinkle * 0.4})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
