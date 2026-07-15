import {
  AbsoluteFill,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from 'remotion';
import { BG, INK, INK_DIM, SAFFRON, GOLD, saffronGlow, FONT_DISPLAY, FONT_BODY } from '../tokens';

type Props = {
  durationFrames: number;
};

// HERO MOMENT 4 — Astrology. A 12-rashi (zodiac) SVG wheel draws in via
// stroke-dasharray, then rotates with a spring, a fixed saffron pointer marks
// the current rashi. Daily horoscope text + ₹15/min consultation count-up beside.
// Real 08-astrology.webm plays behind at low opacity.
const RASHIS = [
  { sym: '♈', name: 'Mesha' },
  { sym: '♉', name: 'Vrishabha' },
  { sym: '♊', name: 'Mithuna' },
  { sym: '♋', name: 'Karka' },
  { sym: '♌', name: 'Simha' },
  { sym: '♍', name: 'Kanya' },
  { sym: '♎', name: 'Tula' },
  { sym: '♏', name: 'Vrishchika' },
  { sym: '♐', name: 'Dhanu' },
  { sym: '♑', name: 'Makara' },
  { sym: '♒', name: 'Kumbha' },
  { sym: '♓', name: 'Meena' },
];

export const KundliWheel: React.FC<Props> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // wheel draw-in then rotate
  const drawProgress = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rotation = spring({
    frame: frame - 25,
    fps,
    config: { damping: 200, stiffness: 60 },
    from: 0,
    to: 360,
  });
  const wheelOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // pointer highlights Simha (index 4) as "today's rashi"
  const currentIdx = 4;
  const highlightOpacity = interpolate(frame, [30, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ₹15/min count-up
  const price = Math.min(
    15,
    Math.floor(
      interpolate(frame, [20, 50], [0, 15], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }),
    ),
  );

  const cx = 300,
    cy = 300,
    rOuter = 240,
    rInner = 150;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, display: 'flex', alignItems: 'center' }}>
      {/* faint background footage */}
      <AbsoluteFill style={{ opacity: 0.18 }}>
        <OffthreadVideo
          src={staticFile('pitch/video/08-astrology.webm')}
          startFrom={0}
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{ background: `linear-gradient(90deg, ${BG} 0%, ${BG}cc 40%, transparent 100%)` }}
      />

      {/* wheel on the left */}
      <div
        style={{
          position: 'relative',
          width: 600,
          height: 600,
          marginLeft: 100,
          opacity: wheelOpacity,
        }}
      >
        {/* pointer at top */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: highlightOpacity,
            zIndex: 5,
          }}
        >
          <svg width="40" height="48" viewBox="0 0 40 48">
            <path d="M20 48 L4 12 L36 12 Z" fill={SAFFRON} stroke={GOLD} strokeWidth="1.5" />
          </svg>
        </div>

        <svg
          width="600"
          height="600"
          viewBox="0 0 600 600"
          style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'center' }}
        >
          {/* outer ring */}
          <circle
            cx={cx}
            cy={cy}
            r={rOuter}
            fill="none"
            stroke={SAFFRON}
            strokeWidth="2"
            strokeDasharray={2 * Math.PI * rOuter}
            strokeDashoffset={2 * Math.PI * rOuter * (1 - drawProgress)}
          />
          <circle
            cx={cx}
            cy={cy}
            r={rInner}
            fill="none"
            stroke={saffronGlow(0.5)}
            strokeWidth="1.5"
            strokeDasharray={2 * Math.PI * rInner}
            strokeDashoffset={2 * Math.PI * rInner * (1 - drawProgress)}
          />

          {/* 12 segments */}
          {RASHIS.map((r, i) => {
            const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const nextAngle = ((i + 1) / 12) * Math.PI * 2 - Math.PI / 2;
            const x1 = cx + Math.cos(angle) * rInner;
            const y1 = cy + Math.sin(angle) * rInner;
            const x2 = cx + Math.cos(angle) * rOuter;
            const y2 = cy + Math.sin(angle) * rOuter;
            const tx = cx + Math.cos((angle + nextAngle) / 2) * ((rInner + rOuter) / 2);
            const ty = cy + Math.sin((angle + nextAngle) / 2) * ((rInner + rOuter) / 2);
            const isCurrent = i === currentIdx;
            return (
              <g key={i} opacity={drawProgress}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={saffronGlow(0.35)} strokeWidth="1" />
                <text
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={isCurrent ? '34' : '26'}
                  fill={isCurrent ? SAFFRON : INK}
                >
                  {r.sym}
                </text>
              </g>
            );
          })}

          {/* center diya */}
          <circle
            cx={cx}
            cy={cy}
            r="40"
            fill={saffronGlow(0.15)}
            stroke={SAFFRON}
            strokeWidth="1.5"
          />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="36">
            🪔
          </text>
        </svg>
      </div>

      {/* text on the right */}
      <div style={{ flex: 1, paddingRight: 120, opacity: wheelOpacity }}>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 16,
            color: INK_DIM,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Free Kundli
        </div>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 52,
            fontWeight: 700,
            color: INK,
            marginTop: 8,
            lineHeight: 1.05,
          }}
        >
          Your birth chart,
          <br />
          drawn in seconds.
        </div>

        {/* today's rashi */}
        <div
          style={{
            marginTop: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            opacity: highlightOpacity,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${SAFFRON}, ${GOLD})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 30,
            }}
          >
            {RASHIS[currentIdx].sym}
          </div>
          <div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: INK_DIM }}>Today's rashi</div>
            <div
              style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, color: SAFFRON }}
            >
              {RASHIS[currentIdx].name} (Simha)
            </div>
          </div>
        </div>

        {/* live consultation */}
        <div
          style={{
            marginTop: 36,
            padding: '20px 24px',
            background: '#fff',
            borderRadius: 16,
            boxShadow: `0 8px 24px ${saffronGlow(0.12)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            maxWidth: 380,
          }}
        >
          <div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: INK_DIM }}>
              Live Vedic consultation
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 700, color: INK }}>
              from ₹{price}
              <span style={{ fontSize: 16, color: INK_DIM, fontWeight: 400 }}>/min</span>
            </div>
          </div>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#1a9e5a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            📞
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
