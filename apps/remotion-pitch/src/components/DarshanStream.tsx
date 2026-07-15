import {
  AbsoluteFill,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from 'remotion';
import { INK, SAFFRON, SAFFRON_DEEP, saffronGlow, GOLD, FONT_DISPLAY, FONT_BODY } from '../tokens';

type Props = {
  durationFrames: number;
  templeName?: string;
  phoneFrame?: boolean; // true = phone bezel, false = full-bleed
};

// HERO MOMENT 1 — Live Darshan. Phase 1: saffron spinner + "Connecting to
// Golden Temple…". Phase 2: brief INK fill. Phase 3: real 06-darshan-live.webm
// plays inside a phone bezel with a pulsing ● LIVE badge + viewer count ticking
// up. The buffer->LIVE transition is the cinematic "it's happening" beat.
export const DarshanStream: React.FC<Props> = ({
  durationFrames,
  templeName = 'Golden Temple',
  phoneFrame = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // phases (at 30fps): connecting 0-45, flash 45-54, live 54+
  const flashFrame = 45;
  const liveStart = 54;
  const connecting = frame < flashFrame;
  const flashing = frame >= flashFrame && frame < liveStart;
  const live = frame >= liveStart;

  // spinner rotation
  const spin = frame * 12;
  const connectOpacity = interpolate(frame, [0, 8, flashFrame - 6, flashFrame], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // LIVE badge pulse
  const liveBadgeOpacity = interpolate(frame, [liveStart, liveStart + 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const livePulse = 0.6 + 0.4 * Math.sin(frame * 0.3);
  const liveBadgeScale = spring({
    frame: frame - liveStart,
    fps,
    config: { damping: 12, stiffness: 130 },
    from: 0.6,
    to: 1,
  });

  // viewer count tick-up
  const viewers = live ? Math.floor((frame - liveStart) * 1.7) + 1240 : 0;

  // flash
  const flashOpacity = interpolate(frame, [flashFrame, flashFrame + 4, liveStart], [0, 0.9, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: INK,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* saffron flash */}
      <AbsoluteFill style={{ background: SAFFRON, opacity: flashOpacity }} />

      {/* warm ambient glow behind the device */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(45% 40% at 50% 50%, ${saffronGlow(0.25)} 0%, transparent 70%)`,
        }}
      />

      {/* device */}
      <div
        style={{
          width: phoneFrame ? 440 : 1200,
          height: phoneFrame ? 940 : 675,
          borderRadius: phoneFrame ? 52 : 16,
          overflow: 'hidden',
          background: '#000',
          border: phoneFrame ? '12px solid #1a1a1a' : 'none',
          boxShadow: `0 40px 100px rgba(0,0,0,0.6), 0 12px 40px ${saffronGlow(0.3)}`,
          position: 'relative',
        }}
      >
        {/* connecting state */}
        {connecting && (
          <AbsoluteFill
            style={{
              background: INK,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 28,
              opacity: connectOpacity,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                border: `4px solid ${saffronGlow(0.2)}`,
                borderTopColor: SAFFRON,
                transform: `rotate(${spin}deg)`,
              }}
            />
            <div
              style={{
                fontFamily: FONT_BODY,
                fontSize: 22,
                color: '#c9c0b6',
                letterSpacing: '0.02em',
              }}
            >
              Connecting to {templeName}…
            </div>
          </AbsoluteFill>
        )}

        {/* brief INK fill during flash */}
        {flashing && <AbsoluteFill style={{ background: INK }} />}

        {/* live footage */}
        {live && (
          <>
            <OffthreadVideo
              src={staticFile('pitch/video/06-darshan-live.webm')}
              startFrom={60}
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {/* warm grade to unify footage to brand */}
            <AbsoluteFill
              style={{
                background: `linear-gradient(180deg, ${saffronGlow(0.05)} 0%, transparent 30%, transparent 70%, ${saffronGlow(0.12)} 100%)`,
                mixBlendMode: 'overlay',
              }}
            />

            {/* LIVE badge */}
            <div
              style={{
                position: 'absolute',
                top: 24,
                right: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(4px)',
                padding: '8px 14px',
                borderRadius: 999,
                opacity: liveBadgeOpacity,
                transform: `scale(${liveBadgeScale})`,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#ff3b30',
                  opacity: livePulse,
                  boxShadow: '0 0 8px #ff3b30',
                }}
              />
              <span
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#fff',
                  letterSpacing: '0.08em',
                }}
              >
                LIVE
              </span>
            </div>

            {/* viewer count */}
            <div
              style={{
                position: 'absolute',
                bottom: 24,
                left: 24,
                fontFamily: FONT_BODY,
                fontSize: 15,
                color: '#fff',
                background: 'rgba(0,0,0,0.5)',
                padding: '6px 12px',
                borderRadius: 8,
                opacity: liveBadgeOpacity,
              }}
            >
              👁 {viewers.toLocaleString('en-IN')} watching
            </div>

            {/* temple name lower */}
            <div
              style={{
                position: 'absolute',
                bottom: 24,
                right: 24,
                textAlign: 'right',
                opacity: liveBadgeOpacity,
              }}
            >
              <div
                style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: '#fff' }}
              >
                {templeName}
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: GOLD }}>
                Harmandir Sahib · Amritsar
              </div>
            </div>
          </>
        )}
      </div>
    </AbsoluteFill>
  );
};
