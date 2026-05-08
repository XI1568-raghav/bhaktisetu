import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { BG, INK, SAFFRON, FONT_DISPLAY, FONT_BODY } from '../tokens';
import { BrowserMockup } from './BrowserMockup';

// ACT 5 — The Payoff / CTA (60–75s)
// Browser mockup of darshya.online on glowing background, tagline reveal.
export const PayoffAct: React.FC<{ durationFrames: number }> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const t = frame / durationFrames;

  const mockupOpacity = interpolate(t, [0, 0.15], [0, 1], { extrapolateRight: 'clamp' });
  const taglineOpacity = interpolate(t, [0.25, 0.45], [0, 1], { extrapolateRight: 'clamp' });
  const urlOpacity = interpolate(t, [0.5, 0.7], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {/* radial saffron glow background */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(60% 50% at 50% 50%, rgba(184,115,51,0.20) 0%, rgba(184,115,51,0.04) 60%, transparent 100%)',
        }}
      />
      <div style={{ position: 'absolute', inset: 0, opacity: mockupOpacity }}>
        <BrowserMockup
          src="pitch/img/01-home-hero.png"
          url="darshya.online"
          width={1500}
          glow
          durationFrames={durationFrames}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 80,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 48,
            fontWeight: 700,
            color: INK,
            letterSpacing: '-0.02em',
            opacity: taglineOpacity,
          }}
        >
          Devotion, verified.
        </div>
        <div
          style={{
            marginTop: 20,
            fontFamily: FONT_BODY,
            fontSize: 28,
            color: SAFFRON,
            opacity: urlOpacity,
            fontWeight: 600,
          }}
        >
          darshya.online
        </div>
      </div>
    </AbsoluteFill>
  );
};
