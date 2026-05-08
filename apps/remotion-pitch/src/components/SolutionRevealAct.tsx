import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { BG, SAFFRON, INK, FONT_DISPLAY } from '../tokens';
import { KineticText } from './KineticText';

// ACT 3 — The Solution Intro (20–35s)
// Hard cut from desaturated problem to pristine full-color hero.
// Smooth push-in 1.0 -> 1.15 with parallax. "Meet Darshya." kinetic reveal.
export const SolutionRevealAct: React.FC<{ durationFrames: number }> = ({
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / durationFrames;

  // hero zoom-in
  const heroScale = interpolate(t, [0, 1], [1.0, 1.15]);
  const heroOpacity = interpolate(t, [0, 0.05, 0.85, 1], [0.6, 1, 1, 1]);

  // "Meet Darshya" springs in around 1s
  const meetIn = spring({
    frame: frame - 18,
    fps,
    config: { damping: 14, stiffness: 110 },
    from: 0,
    to: 1,
  });

  // Saffron flash on Act 3 entry
  const flash = interpolate(t, [0, 0.04, 0.14], [1, 0.7, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: 'hidden' }}>
      <Img
        src={staticFile('pitch/img/01-home-hero.png')}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${heroScale})`,
          opacity: heroOpacity,
        }}
      />
      {/* saffron reveal flash */}
      <AbsoluteFill style={{ background: SAFFRON, opacity: flash }} />

      {/* Vignette fade for cinematic feel */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(70% 70% at 50% 50%, transparent 50%, rgba(0,0,0,0.45) 100%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: '0 0 160px',
          gap: 16,
        }}
      >
        <div
          style={{
            transform: `translateY(${(1 - meetIn) * 40}px)`,
            opacity: meetIn,
          }}
        >
          <span
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 24,
              color: SAFFRON,
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            Introducing
          </span>
        </div>
        <KineticText
          text="Darshya.|The trust layer for devotion."
          size={72}
          color="#fff"
          weight={700}
          startFrame={28}
          wordStaggerFrames={5}
        />
      </div>
    </AbsoluteFill>
  );
};
