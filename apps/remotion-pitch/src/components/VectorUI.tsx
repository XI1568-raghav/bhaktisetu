// Vector UI mockups — simplified Darshya screens rebuilt as 2.5D vector assets.
// NO screenshots, NO WebMs. Every screen is composed from Primitives so it can
// animate (build-up, skeleton morph, chart-from-zero) and be directed by the cursor.
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  staticFile,
} from 'remotion';
import { RECEIPT_FEATURE, RECEIPT_STAT } from '../claims';
import {
  VOID,
  VOID_2,
  VOID_3,
  WHITE,
  LINE,
  LINE_BRIGHT,
  SAFFRON,
  SAFFRON_LIGHT,
  SAFFRON_DEEP,
  GOLD,
  saffronGlow,
  goldGlow,
  FONT_DISPLAY,
  FONT_BODY,
} from '../tokens';
import { GlassPanel, Skeleton, Toggle, ChartFromZero, LoadingBar, Badge } from './Primitives';

// ---------- Darshya home (vector) ----------
export const VectorHome: React.FC<{ width: number; height: number }> = ({ width, height }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        width,
        height,
        background: `linear-gradient(160deg, ${VOID} 0%, ${VOID_2} 60%, ${SAFFRON_DEEP}44 100%)`,
        padding: width * 0.04,
        display: 'flex',
        flexDirection: 'column',
        gap: width * 0.02,
      }}
    >
      {/* top nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${SAFFRON}, ${GOLD})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
            }}
          >
            🪔
          </div>
          <span
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              color: WHITE,
              fontSize: width * 0.022,
              letterSpacing: '-0.02em',
            }}
          >
            Darshya
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {['Temples', 'Pujas', 'Darshan'].map((n) => (
            <span
              key={n}
              style={{
                fontFamily: FONT_BODY,
                color: 'rgba(255,255,255,0.6)',
                fontSize: width * 0.014,
              }}
            >
              {n}
            </span>
          ))}
        </div>
      </div>
      {/* hero */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: width * 0.015,
        }}
      >
        <span
          style={{
            fontFamily: FONT_BODY,
            color: SAFFRON,
            fontSize: width * 0.014,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Live now · Golden Temple
        </span>
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            color: WHITE,
            fontSize: width * 0.05,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
          }}
        >
          Your bridge to
          <br />
          sacred traditions.
        </span>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <div
            style={{
              padding: '12px 24px',
              borderRadius: 12,
              background: `linear-gradient(90deg, ${SAFFRON}, ${GOLD})`,
              color: '#fff',
              fontFamily: FONT_BODY,
              fontWeight: 700,
              fontSize: width * 0.016,
              boxShadow: `0 8px 24px ${saffronGlow(0.4)}`,
            }}
          >
            Book a Puja
          </div>
          <div
            style={{
              padding: '12px 24px',
              borderRadius: 12,
              border: `1px solid ${LINE_BRIGHT}`,
              color: WHITE,
              fontFamily: FONT_BODY,
              fontWeight: 600,
              fontSize: width * 0.016,
            }}
          >
            Watch Darshan
          </div>
        </div>
      </div>
      {/* trust row */}
      <div style={{ display: 'flex', gap: width * 0.03 }}>
        {['Aadhaar Priests', 'HD Live Streams', RECEIPT_FEATURE].map((t) => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: SAFFRON,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                color: '#fff',
              }}
            >
              ✓
            </div>
            <span
              style={{
                fontFamily: FONT_BODY,
                color: 'rgba(255,255,255,0.7)',
                fontSize: width * 0.011,
              }}
            >
              {t}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- Puja booking card (vector) ----------
export const VectorPujaCard: React.FC<{ width: number; startFrame?: number }> = ({
  width,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 14, stiffness: 110 },
    from: 60,
    to: 0,
  });
  const op = interpolate(frame - startFrame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <GlassPanel
      width={width}
      height={width * 1.3}
      radius={20}
      opacity={0.85}
      style={{ transform: `translateY(${appear}px)`, opacity: op, overflow: 'hidden' }}
    >
      <div
        style={{
          padding: width * 0.06,
          display: 'flex',
          flexDirection: 'column',
          gap: width * 0.04,
          height: '100%',
        }}
      >
        {/* image block */}
        <div
          style={{
            height: width * 0.4,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${SAFFRON_DEEP}, ${VOID_3})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: width * 0.08,
          }}
        >
          🪔
        </div>
        <div>
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              color: WHITE,
              fontSize: width * 0.05,
              letterSpacing: '-0.02em',
            }}
          >
            Rudrabhishek
          </div>
          <div
            style={{
              fontFamily: FONT_BODY,
              color: 'rgba(255,255,255,0.5)',
              fontSize: width * 0.03,
              marginTop: 4,
            }}
          >
            Kashi Vishwanath
          </div>
        </div>
        {/* verified badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: SAFFRON,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color: '#fff',
            }}
          >
            ✓
          </div>
          <span
            style={{
              fontFamily: FONT_BODY,
              color: SAFFRON,
              fontSize: width * 0.028,
              fontWeight: 600,
            }}
          >
            Aadhaar-verified priest
          </span>
        </div>
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              color: WHITE,
              fontSize: width * 0.07,
            }}
          >
            ₹2,100
          </span>
          <div
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              background: `linear-gradient(90deg, ${SAFFRON}, ${GOLD})`,
              color: '#fff',
              fontFamily: FONT_BODY,
              fontWeight: 700,
              fontSize: width * 0.032,
            }}
          >
            Book
          </div>
        </div>
      </div>
    </GlassPanel>
  );
};

// ---------- AI Pandit chat (vector) — the "magic" feature ----------
export const VectorAiChat: React.FC<{ width: number; height: number; startFrame?: number }> = ({
  width,
  height,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const question = 'Why do we light a diya?';
  const qShown = Math.min(question.length, Math.floor((frame - startFrame) * 0.6));
  const caret = Math.floor(frame / 18) % 2 === 0;
  // answer appears after question completes
  const ansStart = startFrame + question.length / 0.6 + 8;
  const ansLocal = frame - ansStart;
  const sanskrit = 'कर्मण्येवाधिकारस्ते';
  const sShown = Math.max(0, Math.min(sanskrit.length, Math.floor(ansLocal * 0.8)));
  const engOpacity = interpolate(
    ansLocal,
    [sanskrit.length / 0.8 + 4, sanskrit.length / 0.8 + 14],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <div
      style={{
        width,
        height,
        background: `linear-gradient(180deg, ${VOID}, ${VOID_2})`,
        padding: width * 0.05,
        display: 'flex',
        flexDirection: 'column',
        gap: width * 0.04,
      }}
    >
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${SAFFRON}, ${GOLD})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            boxShadow: `0 0 24px ${saffronGlow(0.5)}`,
          }}
        >
          🪔
        </div>
        <div>
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              color: WHITE,
              fontSize: width * 0.028,
            }}
          >
            AI Pandit
          </div>
          <div style={{ fontFamily: FONT_BODY, color: GOLD, fontSize: width * 0.018 }}>
            Gita · Upanishads
          </div>
        </div>
      </div>
      {/* question bubble */}
      <div
        style={{
          alignSelf: 'flex-end',
          maxWidth: '70%',
          background: SAFFRON,
          padding: '12px 18px',
          borderRadius: '16px 16px 4px 16px',
          fontFamily: FONT_BODY,
          fontSize: width * 0.024,
          color: '#fff',
        }}
      >
        {question.slice(0, Math.max(0, qShown))}
        {caret && qShown < question.length && <span style={{ color: '#fff' }}>|</span>}
      </div>
      {/* answer bubble */}
      {ansLocal >= 0 && (
        <div
          style={{
            alignSelf: 'flex-start',
            maxWidth: '85%',
            background: VOID_3,
            border: `1px solid ${LINE_BRIGHT}`,
            padding: '16px 20px',
            borderRadius: '4px 16px 16px 16px',
          }}
        >
          {/* glowing AI border */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '4px 16px 16px 16px',
              padding: 2,
              background: `linear-gradient(135deg, ${SAFFRON}, ${GOLD}, transparent)`,
              opacity: engOpacity > 0 ? 0.6 : 0.3,
              filter: 'blur(4px)',
            }}
          />
          <div
            style={{
              fontFamily: 'Noto Sans Devanagari, Cabinet Grotesk',
              fontWeight: 700,
              color: WHITE,
              fontSize: width * 0.032,
              lineHeight: 1.3,
            }}
          >
            {sanskrit.slice(0, sShown)}
            {!sShown && sShown < sanskrit.length && caret && (
              <span style={{ color: SAFFRON }}>|</span>
            )}
          </div>
          <div
            style={{
              fontFamily: FONT_BODY,
              color: 'rgba(255,255,255,0.6)',
              fontSize: width * 0.022,
              marginTop: 10,
              opacity: engOpacity,
            }}
          >
            You have a right to action alone, never to its fruits.
          </div>
          <div
            style={{
              fontFamily: FONT_BODY,
              color: SAFFRON,
              fontSize: width * 0.018,
              marginTop: 6,
              fontWeight: 600,
              opacity: engOpacity,
            }}
          >
            — Gita 2.47
          </div>
        </div>
      )}
    </div>
  );
};

// ---------- Darshan stream (vector) — the "connecting -> LIVE" moment ----------
export const VectorDarshan: React.FC<{ width: number; height: number; liveStart: number }> = ({
  width,
  height,
  liveStart,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const live = frame >= liveStart;
  const spin = frame * 18;
  const liveBadge = spring({
    frame: frame - liveStart,
    fps,
    config: { damping: 12, stiffness: 130 },
    from: 0.6,
    to: 1,
  });
  const pulse = 0.6 + 0.4 * Math.sin(frame * 0.3);
  return (
    <div
      style={{
        width,
        height,
        background: live ? `linear-gradient(160deg, ${SAFFRON_DEEP}, ${VOID})` : VOID,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {!live && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: `4px solid ${saffronGlow(0.2)}`,
              borderTopColor: SAFFRON,
              transform: `rotate(${spin}deg)`,
            }}
          />
          <span
            style={{
              fontFamily: FONT_BODY,
              color: 'rgba(255,255,255,0.6)',
              fontSize: width * 0.022,
            }}
          >
            Connecting to Golden Temple…
          </span>
        </div>
      )}
      {live && (
        <>
          {/* faux temple glow */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(60% 50% at 50% 60%, ${goldGlow(0.4)} 0%, transparent 60%)`,
            }}
          />
          <div style={{ fontSize: width * 0.12 }}>🛕</div>
          {/* LIVE badge */}
          <div
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(0,0,0,0.5)',
              padding: '6px 12px',
              borderRadius: 999,
              transform: `scale(${liveBadge})`,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#ff3b30',
                opacity: pulse,
                boxShadow: '0 0 8px #ff3b30',
              }}
            />
            <span
              style={{
                fontFamily: FONT_BODY,
                fontWeight: 700,
                color: '#fff',
                fontSize: width * 0.018,
                letterSpacing: '0.08em',
              }}
            >
              LIVE
            </span>
          </div>
        </>
      )}
    </div>
  );
};

// ---------- Astrology / kundli (vector) ----------
export const VectorKundli: React.FC<{ width: number; height: number; startFrame?: number }> = ({
  width,
  height,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rot = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 200, stiffness: 60 },
    from: 0,
    to: 360,
  });
  const cx = width * 0.3,
    cy = height * 0.5,
    r = width * 0.18;
  const rashi = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  return (
    <div
      style={{
        width,
        height,
        background: `linear-gradient(135deg, ${VOID}, ${VOID_2})`,
        padding: width * 0.04,
        display: 'flex',
        alignItems: 'center',
        gap: width * 0.04,
      }}
    >
      <svg
        width={width * 0.4}
        height={width * 0.4}
        viewBox={`0 0 ${width * 0.4} ${width * 0.4}`}
        style={{ transform: `rotate(${rot}deg)`, transformOrigin: 'center' }}
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={saffronGlow(0.5)} strokeWidth="2" />
        <circle cx={cx} cy={cy} r={r * 0.6} fill="none" stroke={LINE_BRIGHT} strokeWidth="1.5" />
        {rashi.map((s, i) => {
          const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
          const tx = cx + Math.cos(a) * r * 0.8,
            ty = cy + Math.sin(a) * r * 0.8;
          return (
            <text
              key={i}
              x={tx}
              y={ty}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={width * 0.018}
              fill={i === 4 ? SAFFRON : 'rgba(255,255,255,0.7)'}
            >
              {s}
            </text>
          );
        })}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={width * 0.03}>
          🪔
        </text>
      </svg>
      <div>
        <div
          style={{
            fontFamily: FONT_BODY,
            color: 'rgba(255,255,255,0.5)',
            fontSize: width * 0.016,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Free Kundli
        </div>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            color: WHITE,
            fontSize: width * 0.035,
            marginTop: 6,
            lineHeight: 1.1,
          }}
        >
          Your chart,
          <br />
          in seconds.
        </div>
        <div
          style={{
            marginTop: 16,
            fontFamily: FONT_BODY,
            color: SAFFRON,
            fontSize: width * 0.022,
            fontWeight: 600,
          }}
        >
          Live consultations ₹15/min
        </div>
      </div>
    </div>
  );
};

// ---------- Analytics dashboard (vector) — for the "magic feature" scene ----------
export const VectorDashboard: React.FC<{ width: number; height: number; startFrame?: number }> = ({
  width,
  height,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const loaded = frame - startFrame > 20;
  return (
    <div
      style={{
        width,
        height,
        background: `linear-gradient(135deg, ${VOID}, ${VOID_2})`,
        padding: width * 0.03,
        display: 'flex',
        flexDirection: 'column',
        gap: width * 0.02,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            color: WHITE,
            fontSize: width * 0.022,
          }}
        >
          Devotion analytics
        </span>
        <Badge label="Live" startFrame={startFrame + 4} size={width * 0.012} />
      </div>
      {/* stat cards */}
      <div style={{ display: 'flex', gap: width * 0.015 }}>
        {['1,635', '₹15/min', RECEIPT_STAT].map((s, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              padding: width * 0.02,
              background: VOID_3,
              borderRadius: 12,
              border: `1px solid ${LINE}`,
            }}
          >
            {loaded ? (
              <>
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 700,
                    color: SAFFRON,
                    fontSize: width * 0.03,
                  }}
                >
                  {s}
                </div>
                <div
                  style={{
                    fontFamily: FONT_BODY,
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: width * 0.012,
                    marginTop: 4,
                  }}
                >
                  {['pages', 'astrology', 'receipts'][i]}
                </div>
              </>
            ) : (
              <Skeleton width={width * 0.1} height={width * 0.03} />
            )}
          </div>
        ))}
      </div>
      {/* chart */}
      <div
        style={{
          flex: 1,
          padding: width * 0.025,
          background: VOID_3,
          borderRadius: 12,
          border: `1px solid ${LINE}`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            fontFamily: FONT_BODY,
            color: 'rgba(255,255,255,0.6)',
            fontSize: width * 0.014,
            marginBottom: 8,
          }}
        >
          Weekly darshan viewers
        </div>
        {loaded ? (
          <ChartFromZero
            width={'100%' as unknown as number}
            height={height * 0.4}
            startFrame={startFrame + 24}
            bars={8}
          />
        ) : (
          <Skeleton width={'100%' as unknown as number} height={height * 0.4} />
        )}
      </div>
    </div>
  );
};
