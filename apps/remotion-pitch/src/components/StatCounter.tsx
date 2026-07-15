import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { BG, INK, INK_DIM, SAFFRON, GOLD, saffronGlow, FONT_DISPLAY, FONT_BODY } from '../tokens';

type Stat = {
  value: number | string;
  prefix?: string;
  suffix?: string;
  label: string;
  icon?: string;
  sublabel?: string;
};

type Props = {
  durationFrames: number;
  stats: Stat[];
};

// Count-up stat cards for the Proof act. ONLY honest, live-verifiable numbers:
// 1,635+ pages, ₹15/min, 12 Jyotirlingas. Each card slides in with a spring and
// the numeric value counts 0->target. Pure TSX, no screenshot.
export const StatCounter: React.FC<Props> = ({ durationFrames, stats }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(50% 50% at 50% 50%, ${saffronGlow(0.08)} 0%, transparent 70%)`,
        }}
      />
      <div style={{ display: 'flex', gap: 32 }}>
        {stats.map((s, i) => {
          const slide = spring({
            frame: frame - i * 8,
            fps,
            config: { damping: 18, stiffness: 120 },
            from: 60,
            to: 0,
          });
          const opacity = interpolate(frame, [i * 8, i * 8 + 10], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const isNum = typeof s.value === 'number';
          const count = isNum
            ? Math.min(
                s.value as number,
                Math.floor(
                  interpolate(frame, [i * 8 + 6, i * 8 + 36], [0, s.value as number], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  }),
                ),
              )
            : s.value;
          return (
            <div
              key={i}
              style={{
                width: 360,
                padding: '36px 32px',
                background: '#fff',
                borderRadius: 20,
                border: `1px solid ${saffronGlow(0.18)}`,
                boxShadow: `0 12px 40px rgba(0,0,0,0.08), 0 4px 12px ${saffronGlow(0.1)}`,
                transform: `translateY(${slide}px)`,
                opacity,
              }}
            >
              {s.icon && <div style={{ fontSize: 36, marginBottom: 12 }}>{s.icon}</div>}
              <div
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 64,
                  fontWeight: 700,
                  color: SAFFRON,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                {s.prefix}
                {typeof count === 'number' ? count.toLocaleString('en-IN') : count}
                {s.suffix}
              </div>
              <div
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 22,
                  fontWeight: 700,
                  color: INK,
                  marginTop: 14,
                }}
              >
                {s.label}
              </div>
              {s.sublabel && (
                <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: INK_DIM, marginTop: 6 }}>
                  {s.sublabel}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
