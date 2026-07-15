import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import {
  BG,
  INK,
  INK_DIM,
  SAFFRON,
  SAFFRON_DEEP,
  GOLD,
  saffronGlow,
  goldGlow,
  FONT_DISPLAY,
  FONT_BODY,
} from '../tokens';
import { KineticText } from './KineticText';

type Props = { durationFrames: number };

// The diaspora wedge beat made visual. A stylized map shows a payment line
// arcing from New Jersey (USD) to Varanasi (INR + temple), and a video-proof +
// prasad packet arcing back. Currency chips cycle INR · USD · GBP · AUD · CAD.
// This is the "smaller pond Darshya can be number one in" — pure SVG/TSX.
export const DualCurrencyMap: React.FC<Props> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // payment arc draws out
  const payDraw = interpolate(frame, [10, 45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // proof/prasad arc draws back (delayed)
  const backDraw = interpolate(frame, [40, 75], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // currency chip cycle
  const currencies = ['INR', 'USD', 'GBP', 'AUD', 'CAD'];
  const chipIdx = Math.floor(frame / 14) % currencies.length;
  const chipIn = spring({
    frame: frame % 14,
    fps,
    config: { damping: 14, stiffness: 130 },
    from: 30,
    to: 0,
  });

  // origin = New Jersey (left), dest = Varanasi (right)
  const W = 1400,
    H = 700;
  const o = { x: 180, y: 440 }; // NJ
  const d = { x: 1080, y: 300 }; // Varanasi

  return (
    <AbsoluteFill style={{ backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(50% 50% at 50% 50%, ${saffronGlow(0.1)} 0%, transparent 70%)`,
        }}
      />

      <div style={{ position: 'relative', width: W, height: H }}>
        {/* simplified landmass silhouettes */}
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* left continent (Americas) blob */}
          <path
            d="M 60 200 Q 120 120 220 160 Q 300 220 280 380 Q 260 520 180 560 Q 100 540 70 420 Z"
            fill={saffronGlow(0.08)}
            stroke={saffronGlow(0.2)}
            strokeWidth="1.5"
          />
          {/* right continent (India) blob */}
          <path
            d="M 980 180 Q 1100 140 1180 220 Q 1220 320 1170 400 Q 1100 460 1020 420 Q 960 360 980 260 Z"
            fill={saffronGlow(0.08)}
            stroke={saffronGlow(0.2)}
            strokeWidth="1.5"
          />

          {/* payment arc: NJ -> Varanasi */}
          <path
            id="payArc"
            d={`M ${o.x} ${o.y} Q ${(o.x + d.x) / 2} ${Math.min(o.y, d.y) - 160} ${d.x} ${d.y}`}
            fill="none"
            stroke={SAFFRON}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="1400"
            strokeDashoffset={1400 * (1 - payDraw)}
          />
          {/* moving payment dot */}
          {payDraw > 0.05 && (
            <circle r="7" fill={SAFFRON}>
              <animateMotion
                dur="3s"
                repeatCount="indefinite"
                keyPoints={String(payDraw)}
                keyTimes="0;1"
              >
                <mpath href="#payArc" />
              </animateMotion>
            </circle>
          )}

          {/* return arc: proof + prasad back */}
          <path
            id="backArc"
            d={`M ${d.x} ${d.y} Q ${(o.x + d.x) / 2} ${Math.max(o.y, d.y) + 120} ${o.x} ${o.y}`}
            fill="none"
            stroke={GOLD}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="6 8"
            strokeDashoffset={1400 * (1 - backDraw)}
          />

          {/* origin marker (NJ) */}
          <circle cx={o.x} cy={o.y} r="14" fill={SAFFRON} />
          <circle cx={o.x} cy={o.y} r="14" fill="none" stroke={saffronGlow(0.4)} strokeWidth="2">
            <animate attributeName="r" values="14;26;14" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
          </circle>
          {/* dest marker (Varanasi) */}
          <circle cx={d.x} cy={d.y} r="14" fill={GOLD} />
          <circle cx={d.x} cy={d.y} r="14" fill="none" stroke={goldGlow(0.4)} strokeWidth="2">
            <animate
              attributeName="r"
              values="14;26;14"
              dur="2s"
              repeatCount="indefinite"
              begin="1s"
            />
            <animate
              attributeName="opacity"
              values="0.6;0;0.6"
              dur="2s"
              repeatCount="indefinite"
              begin="1s"
            />
          </circle>
        </svg>

        {/* origin label */}
        <div
          style={{
            position: 'absolute',
            left: o.x - 60,
            top: o.y + 20,
            textAlign: 'center',
            width: 120,
          }}
        >
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: INK }}>
            New Jersey
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 16, color: SAFFRON, fontWeight: 600 }}>
            USD
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: INK_DIM, marginTop: 2 }}>
            you pay here
          </div>
        </div>
        {/* dest label */}
        <div
          style={{
            position: 'absolute',
            left: d.x - 60,
            top: d.y - 70,
            textAlign: 'center',
            width: 120,
          }}
        >
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: INK }}>
            Varanasi
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 16, color: GOLD, fontWeight: 600 }}>
            🛕 INR
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: INK_DIM, marginTop: 2 }}>
            seva reaches the temple
          </div>
        </div>

        {/* mid-label: proof reaches you */}
        {backDraw > 0.3 && (
          <div
            style={{
              position: 'absolute',
              left: (o.x + d.x) / 2 - 90,
              top: Math.max(o.y, d.y) + 80,
              opacity: interpolate(frame, [60, 75], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              textAlign: 'center',
              width: 180,
            }}
          >
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: GOLD }}>
              Video proof + prasad
            </div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: INK_DIM }}>
              arcs back to your phone
            </div>
          </div>
        )}
      </div>

      {/* currency chips cycling bottom-center */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: '50%',
          transform: `translateX(-50%) translateY(${chipIn}px)`,
          display: 'flex',
          gap: 12,
        }}
      >
        {currencies.map((c, i) => (
          <div
            key={c}
            style={{
              fontFamily: FONT_BODY,
              fontSize: 18,
              fontWeight: 700,
              padding: '8px 18px',
              borderRadius: 999,
              background: i === chipIdx ? SAFFRON : '#fff',
              color: i === chipIdx ? '#fff' : INK_DIM,
              border: `1px solid ${i === chipIdx ? SAFFRON : saffronGlow(0.2)}`,
              boxShadow: i === chipIdx ? `0 0 20px ${saffronGlow(0.5)}` : 'none',
              opacity: i === chipIdx ? 1 : 0.4,
            }}
          >
            {c}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
