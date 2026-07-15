import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { BG, INK, SAFFRON, SAFFRON_DEEP, GOLD, saffronGlow, FONT_DISPLAY } from '../tokens';
import { DiyaGlow } from './DiyaGlow';

type Props = { durationFrames: number };

// Thematic resolution: "Devotion, verified." locks in as a kinetic stamp with a
// saffron seal scale-stamping 1.4->1. The frame holds. Bed drops to silence
// before this in the mix. Pure kinetic — the emotional anchor of the film.
export const TrustLockup: React.FC<Props> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stampIn = spring({
    frame: frame - 4,
    fps,
    config: { damping: 14, stiffness: 120, mass: 1 },
    from: 60,
    to: 0,
  });
  const stampOpacity = interpolate(frame, [4, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sealScale = spring({
    frame: frame - 14,
    fps,
    config: { damping: 8, stiffness: 130, mass: 0.7 },
    from: 1.6,
    to: 1,
  });
  const sealOpacity = interpolate(frame, [14, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const sealRotate = interpolate(frame, [14, 26], [-20, -8], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(45% 45% at 50% 50%, ${saffronGlow(0.18)} 0%, transparent 70%)`,
        }}
      />
      <DiyaGlow count={20} intensity={0.6} seed="trust" />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 28,
          transform: `translateY(${stampIn}px)`,
          opacity: stampOpacity,
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 110,
            fontWeight: 700,
            color: INK,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            textAlign: 'center',
          }}
        >
          Devotion, <span style={{ color: SAFFRON }}>verified.</span>
        </div>

        {/* saffron seal */}
        <div
          style={{
            opacity: sealOpacity,
            transform: `scale(${sealScale}) rotate(${sealRotate}deg)`,
          }}
        >
          <svg width="110" height="110" viewBox="0 0 110 110">
            <circle cx="55" cy="55" r="50" fill="none" stroke={SAFFRON} strokeWidth="2" />
            <circle
              cx="55"
              cy="55"
              r="42"
              fill={saffronGlow(0.15)}
              stroke={SAFFRON}
              strokeWidth="1.5"
            />
            <path id="seal-top" d="M 55 13 A 42 42 0 0 1 97 55" fill="none" />
            <text
              fontFamily="Satoshi, sans-serif"
              fontSize="9"
              fill={SAFFRON_DEEP}
              letterSpacing="2"
            >
              <textPath href="#seal-top" startOffset="50%" textAnchor="middle">
                VERIFIED DEVOTION
              </textPath>
            </text>
            <text
              x="55"
              y="50"
              textAnchor="middle"
              fontFamily="Cabinet Grotesk, sans-serif"
              fontSize="22"
              fontWeight="700"
              fill={SAFFRON_DEEP}
            >
              ✓
            </text>
            <text
              x="55"
              y="66"
              textAnchor="middle"
              fontFamily="Satoshi, sans-serif"
              fontSize="8"
              fill={SAFFRON_DEEP}
            >
              DARSHYA
            </text>
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};
