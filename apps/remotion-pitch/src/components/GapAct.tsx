import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, random } from 'remotion';
import { INK, FONT_DISPLAY } from '../tokens';
import { KineticText } from './KineticText';

// ACT 2 — The Gap / Problem (5–20s)
// Desaturated, blurred screenshots; subtle shake; tension build.
const PROBLEM_SHOTS = [
  'pitch/img/01-home-hero.png',
  'pitch/img/02-temples-grid.png',
  'pitch/img/04-pujas-grid.png',
];

export const GapAct: React.FC<{ durationFrames: number }> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const t = frame / durationFrames;

  // Cycle through 3 problem shots desaturated
  const shotIdx = Math.min(
    Math.floor(t * PROBLEM_SHOTS.length),
    PROBLEM_SHOTS.length - 1,
  );
  const inShotT = (t * PROBLEM_SHOTS.length) - shotIdx;

  // tiny shake
  const shake = (random(`shake-${frame}`) - 0.5) * 6;
  const scale = interpolate(inShotT, [0, 1], [1.05, 1.12]);

  // overlay text — kinetic
  const textOpacity = interpolate(t, [0.15, 0.30, 0.85, 1.0], [0, 1, 1, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0908', overflow: 'hidden' }}>
      <Img
        src={staticFile(PROBLEM_SHOTS[shotIdx])}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translate(${shake}px, ${shake * 0.5}px)`,
          filter: 'grayscale(0.85) blur(3px) brightness(0.55)',
          opacity: 0.7,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(60% 50% at 50% 50%, transparent 0%, rgba(10,9,8,0.7) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: textOpacity,
          gap: 32,
        }}
      >
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 22,
            color: '#888',
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          Today
        </span>
        <KineticText
          text="Scattered trust.|Untrusted priests.|No proof of seva."
          size={88}
          color="#fff"
          weight={700}
          startFrame={30}
          wordStaggerFrames={6}
        />
      </div>
    </AbsoluteFill>
  );
};
