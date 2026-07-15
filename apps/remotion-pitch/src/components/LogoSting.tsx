import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { BG, INK, INK_DIM, SAFFRON, GOLD, saffronGlow, FONT_DISPLAY, FONT_BODY } from '../tokens';
import { DiyaGlow } from './DiyaGlow';

type Props = {
  durationFrames: number;
  variant?: 'reveal' | 'outro';
};

// The DARSHYA wordmark reveal (Hook solution beat) + the outro hold. Spring
// scale-in 0.7->1, saffron underline draws left-to-right, DiyaGlow embers bloom.
// Replaces the blurred-hero open in the old HookAct. No PNG behind it.
export const LogoSting: React.FC<Props> = ({ durationFrames, variant = 'reveal' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 60, mass: 1.1 },
    from: 0.7,
    to: 1,
  });
  const wordOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const underlineWidth = interpolate(frame, [14, 28], [0, 260], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tagOpacity = interpolate(frame, [24, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const urlOpacity =
    variant === 'outro'
      ? interpolate(frame, [40, 56], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;

  // saffron flash for reveal variant
  const flash =
    variant === 'reveal'
      ? interpolate(frame, [0, 3, 12], [0.9, 0.6, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: variant === 'outro' ? BG : INK,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
      }}
    >
      {/* saffron flash */}
      {variant === 'reveal' && <AbsoluteFill style={{ background: SAFFRON, opacity: flash }} />}

      {/* warm glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(40% 40% at 50% 50%, ${saffronGlow(0.25)} 0%, transparent 70%)`,
        }}
      />
      <DiyaGlow count={28} intensity={variant === 'outro' ? 0.7 : 1} seed={variant} />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          transform: `scale(${scale})`,
          opacity: wordOpacity,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 180,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '-0.04em',
            lineHeight: 1,
          }}
        >
          DARSHYA
        </div>
        {/* saffron underline */}
        <div
          style={{
            height: 4,
            background: `linear-gradient(90deg, ${SAFFRON}, ${GOLD})`,
            width: underlineWidth,
            margin: '20px auto 0',
            borderRadius: 2,
            boxShadow: `0 0 16px ${saffronGlow(0.7)}`,
          }}
        />
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          marginTop: 36,
          opacity: tagOpacity,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 32,
            fontWeight: 600,
            color: variant === 'outro' ? INK_DIM : '#fff',
          }}
        >
          {variant === 'outro' ? 'your bridge to sacred traditions' : 'Devotion, verified.'}
        </div>
        {variant === 'outro' && (
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 24,
              color: GOLD,
              fontWeight: 600,
              marginTop: 16,
              opacity: urlOpacity,
              letterSpacing: '0.04em',
            }}
          >
            darshya.online
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
