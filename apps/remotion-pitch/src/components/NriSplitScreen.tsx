import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { INK, INK_DIM, SAFFRON, saffronGlow, FONT_DISPLAY, FONT_BODY } from '../tokens';

type Props = { durationFrames: number };

// Gap act — the trust problem made visual. Split screen: left = a chaotic
// WhatsApp thread with a forwarded unverified pandit contact (blurred, grayscale,
// readable but bleak); right = dark/saffron void with the trust-failure words.
// A saffron hairline crack splits the frame. Replaces GapAct's unreadable
// grayscale(0.85) blur(3px) brightness(0.55) screenshot stack.
export const NriSplitScreen: React.FC<Props> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // slow intentional drift (NOT per-frame random() jitter)
  const drift = interpolate(frame, [0, durationFrames], [-8, 8], { extrapolateRight: 'clamp' });

  // crack draws at frame 60
  const crackHeight = interpolate(frame, [60, 78], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // trust-failure words stamp in sequence
  const words = ['No proof.', 'No face.', 'No receipt.'];
  const wordStates = words.map((_, i) => {
    const start = 20 + i * 30;
    const scale = spring({
      frame: frame - start,
      fps,
      config: { damping: 12, stiffness: 110, mass: 0.8 },
      from: 1.3,
      to: 1,
    });
    const opacity = interpolate(
      frame,
      [start, start + 8, start + 22, start + 30],
      [0, 1, 1, 0.25],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );
    return { scale, opacity };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: 'hidden' }}>
      {/* LEFT — bleak WhatsApp thread */}
      <AbsoluteFill
        style={{
          left: 0,
          width: '50%',
          filter: 'grayscale(0.5) brightness(0.7)',
          transform: `translateX(${drift}px)`,
          opacity: 0.85,
        }}
      >
        <div
          style={{ position: 'absolute', inset: 0, background: '#0e1410', padding: '60px 50px' }}
        >
          {/* chat header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              paddingBottom: 16,
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#3a4a3e' }} />
            <div>
              <div
                style={{ fontFamily: FONT_BODY, fontSize: 17, color: '#c8d4cc', fontWeight: 600 }}
              >
                Pandit ji (forwarded)
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: '#6a7a6e' }}>online</div>
            </div>
          </div>
          {/* blurred chaotic messages */}
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { t: 'ji puja karwani hai', me: false, w: '70%' },
              { t: 'haan kar dunga ₹5000 bhej do', me: false, w: '78%' },
              { t: 'video milega?', me: true, w: '40%' },
              { t: 'beta phone pe baat karte hain', me: false, w: '72%' },
              { t: 'receipt chahiye 80G ki', me: true, w: '55%' },
              { t: '...', me: false, w: '12%' },
            ].map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.me ? 'flex-end' : 'flex-start',
                  maxWidth: m.w,
                  background: m.me ? '#054640' : '#1f2a23',
                  padding: '10px 14px',
                  borderRadius: 10,
                  fontFamily: FONT_BODY,
                  fontSize: 15,
                  color: '#b8c4bc',
                  filter: 'blur(1.5px)',
                }}
              >
                {m.t}
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>

      {/* RIGHT — dark void with trust words */}
      <AbsoluteFill
        style={{
          left: '50%',
          width: '50%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <AbsoluteFill
          style={{
            background: `radial-gradient(60% 60% at 50% 50%, ${saffronGlow(0.12)} 0%, transparent 70%)`,
          }}
        />
        {words.map((w, i) => (
          <div
            key={i}
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 64,
              fontWeight: 700,
              color: i === 0 ? SAFFRON : '#8a7e72',
              letterSpacing: '-0.02em',
              transform: `scale(${wordStates[i].scale})`,
              opacity: wordStates[i].opacity,
            }}
          >
            {w}
          </div>
        ))}
        <div
          style={{
            marginTop: 16,
            fontFamily: FONT_BODY,
            fontSize: 20,
            color: INK_DIM,
            fontStyle: 'italic',
            opacity: interpolate(frame, [90, 110], [0, 0.8], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          Just blind faith.
        </div>
      </AbsoluteFill>

      {/* saffron hairline crack down the middle */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          width: 2,
          height: `${crackHeight}%`,
          background: `linear-gradient(180deg, transparent, ${SAFFRON}, ${saffronGlow(0.6)}, transparent)`,
          transform: 'translateX(-50%)',
          boxShadow: `0 0 12px ${saffronGlow(0.8)}`,
        }}
      />
    </AbsoluteFill>
  );
};
