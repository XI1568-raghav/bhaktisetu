import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import {
  BG,
  BG_SOFT,
  INK,
  INK_DIM,
  SAFFRON,
  SAFFRON_DEEP,
  SAFFRON_LIGHT,
  GOLD,
  saffronGlow,
  FONT_DISPLAY,
  FONT_BODY,
} from '../tokens';
import {
  RECEIPT_TITLE,
  RECEIPT_ISSUER,
  RECEIPT_STEP_LABEL,
  RECEIPT_SEAL,
  SEAL_SUBLINE,
  PRIEST_CARD_STAMP,
  PRIEST_CARD_TITLE,
  PRIEST_STEP_LABEL,
  PRIEST_KYC_SUBLINE,
} from '../claims';

type Props = {
  durationFrames: number;
  step?: 1 | 2 | 3 | 4; // 1=select puja, 2=aadhaar priest, 3=video proof, 4=80G receipt
};

// HERO MOMENT 2 — Verified Puja. A 4-step stepper animates left-to-right:
// (1) select puja card rises, (2) Aadhaar-verified badge stamps in, (3) video-proof
// progress bar fills + green check, (4) 80G receipt card slides up with saffron seal.
// The trust beat: "no video, no payout" + 80G. All TSX — animated, not a screenshot.
export const PujaBookingFlow: React.FC<Props> = ({ durationFrames, step = 2 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardRise = spring({
    frame: frame - 6,
    fps,
    config: { damping: 18, stiffness: 120, mass: 0.9 },
    from: 60,
    to: 0,
  });
  const cardOpacity = interpolate(frame, [6, 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // stepper highlight travels to `step`
  const stepScales = [1, 2, 3, 4].map((s) =>
    spring({
      frame: frame - (s === step ? 10 : 0),
      fps,
      config: { damping: 14, stiffness: 130 },
      from: 1,
      to: s === step ? 1.18 : 1,
    }),
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(50% 50% at 50% 45%, ${saffronGlow(0.1)} 0%, transparent 70%)`,
        }}
      />

      {/* stepper */}
      <div
        style={{ display: 'flex', gap: 0, alignItems: 'center', marginTop: 80, marginBottom: 30 }}
      >
        {[
          { n: 1, label: 'Select Puja' },
          { n: 2, label: PRIEST_STEP_LABEL },
          { n: 3, label: 'Video Proof' },
          { n: 4, label: RECEIPT_STEP_LABEL },
        ].map((s, i) => {
          const active = s.n <= step;
          const current = s.n === step;
          return (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  transform: `scale(${stepScales[i]})`,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: current ? SAFFRON : active ? SAFFRON_DEEP : '#e3ded5',
                    color: active ? '#fff' : INK_DIM,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 700,
                    fontSize: 18,
                    boxShadow: current ? `0 0 20px ${saffronGlow(0.5)}` : 'none',
                  }}
                >
                  {s.n}
                </div>
                <div
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 14,
                    fontWeight: current ? 700 : 500,
                    color: current ? SAFFRON : active ? INK : INK_DIM,
                  }}
                >
                  {s.label}
                </div>
              </div>
              {i < 3 && (
                <div
                  style={{
                    width: 80,
                    height: 2,
                    background: s.n < step ? SAFFRON : '#e3ded5',
                    margin: '0 12px',
                    marginBottom: 24,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* card stage */}
      <div
        style={{
          position: 'relative',
          width: 640,
          height: 420,
          transform: `translateY(${cardRise}px)`,
          opacity: cardOpacity,
        }}
      >
        {step === 1 && <SelectPujaCard />}
        {step === 2 && <AadhaarPriestCard frame={frame} fps={fps} />}
        {step === 3 && <VideoProofCard frame={frame} fps={fps} />}
        {step === 4 && <ReceiptCard frame={frame} fps={fps} />}
      </div>
    </AbsoluteFill>
  );
};

const CardFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: '#fff',
      borderRadius: 20,
      boxShadow: `0 20px 60px rgba(0,0,0,0.12), 0 4px 16px ${saffronGlow(0.12)}`,
      padding: '40px 48px',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    {children}
  </div>
);

const SelectPujaCard: React.FC = () => (
  <CardFrame>
    <div
      style={{
        fontFamily: FONT_BODY,
        fontSize: 14,
        color: INK_DIM,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}
    >
      Select Puja
    </div>
    <div
      style={{ fontFamily: FONT_DISPLAY, fontSize: 40, fontWeight: 700, color: INK, marginTop: 8 }}
    >
      Rudrabhishek
    </div>
    <div style={{ fontFamily: FONT_BODY, fontSize: 18, color: INK_DIM, marginTop: 4 }}>
      Kashi Vishwanath Temple · Varanasi
    </div>
    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'baseline', gap: 12 }}>
      <span style={{ fontFamily: FONT_DISPLAY, fontSize: 56, fontWeight: 700, color: SAFFRON }}>
        ₹2,100
      </span>
      <span style={{ fontFamily: FONT_BODY, fontSize: 16, color: INK_DIM }}>
        incl. prasad delivery
      </span>
    </div>
  </CardFrame>
);

const AadhaarPriestCard: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const stampScale = spring({
    frame: frame - 20,
    fps,
    config: { damping: 10, stiffness: 140, mass: 0.6 },
    from: 1.6,
    to: 1,
  });
  const stampOpacity = interpolate(frame, [20, 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const checkDraw = interpolate(frame, [24, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <CardFrame>
      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: 14,
          color: INK_DIM,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {PRIEST_CARD_TITLE}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 20 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${SAFFRON_LIGHT}, ${SAFFRON_DEEP})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT_DISPLAY,
            fontSize: 28,
            fontWeight: 700,
            color: '#fff',
          }}
        >
          PV
        </div>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 700, color: INK }}>
            Pandit Vivek Shukla
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 16, color: INK_DIM }}>
            12 yrs · Kashi Vidyapeeth
          </div>
        </div>
      </div>

      {/* verified badge */}
      <div
        style={{
          marginTop: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          opacity: stampOpacity,
          transform: `scale(${stampScale})`,
        }}
      >
        <div style={{ width: 120, height: 120, position: 'relative' }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="56"
              fill="none"
              stroke={SAFFRON}
              strokeWidth="3"
              opacity="0.3"
            />
            <circle
              cx="60"
              cy="60"
              r="48"
              fill={saffronGlow(0.12)}
              stroke={SAFFRON}
              strokeWidth="2"
            />
            <path
              d="M40 60 L54 74 L82 46"
              fill="none"
              stroke={SAFFRON}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="60"
              strokeDashoffset={60 * (1 - checkDraw)}
            />
          </svg>
        </div>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: SAFFRON }}>
            {PRIEST_CARD_STAMP}
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: INK_DIM }}>
            {PRIEST_KYC_SUBLINE}
          </div>
        </div>
      </div>
    </CardFrame>
  );
};

const VideoProofCard: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const progress = interpolate(frame, [10, 50], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const checkDraw = interpolate(frame, [52, 68], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const checkOpacity = interpolate(frame, [52, 56], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <CardFrame>
      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: 14,
          color: INK_DIM,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Mandatory Video Proof
      </div>
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 30,
          fontWeight: 700,
          color: INK,
          marginTop: 8,
        }}
      >
        Recording the ceremony
      </div>

      {/* faux video frame */}
      <div
        style={{
          marginTop: 24,
          height: 180,
          borderRadius: 12,
          background: `linear-gradient(135deg, ${SAFFRON_DEEP}, ${INK})`,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff3b30' }} />
          <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: '#fff', fontWeight: 700 }}>
            REC
          </span>
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: 'rgba(255,255,255,0.85)' }}>
          ॥ Om Namah Shivaya ॥
        </div>
      </div>

      {/* progress bar */}
      <div style={{ marginTop: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: FONT_BODY,
            fontSize: 14,
            color: INK_DIM,
            marginBottom: 8,
          }}
        >
          <span>Uploading proof</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: '#ece8e0', overflow: 'hidden' }}>
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${SAFFRON}, ${GOLD})`,
            }}
          />
        </div>
      </div>

      {/* delivered check */}
      <div
        style={{
          marginTop: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          opacity: checkOpacity,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path
            d="M5 12 L10 17 L19 7"
            fill="none"
            stroke="#1a9e5a"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="20"
            strokeDashoffset={20 * (1 - checkDraw)}
          />
        </svg>
        <span style={{ fontFamily: FONT_BODY, fontSize: 18, fontWeight: 700, color: '#1a9e5a' }}>
          Video proof · delivered to your phone
        </span>
      </div>
    </CardFrame>
  );
};

const ReceiptCard: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const sealScale = spring({
    frame: frame - 18,
    fps,
    config: { damping: 8, stiffness: 130, mass: 0.7 },
    from: 1.6,
    to: 1,
  });
  const sealOpacity = interpolate(frame, [18, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const sealRotate = interpolate(frame, [18, 30], [-18, -8], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <CardFrame>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, color: INK }}>
            {RECEIPT_TITLE}
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: INK_DIM, marginTop: 4 }}>
            {RECEIPT_ISSUER}
          </div>
        </div>
        {/* saffron seal */}
        <div
          style={{
            opacity: sealOpacity,
            transform: `scale(${sealScale}) rotate(${sealRotate}deg)`,
          }}
        >
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="44" fill="none" stroke={SAFFRON} strokeWidth="2" />
            <circle
              cx="48"
              cy="48"
              r="38"
              fill={saffronGlow(0.15)}
              stroke={SAFFRON}
              strokeWidth="1.5"
            />
            <text
              x="48"
              y="44"
              textAnchor="middle"
              fontFamily="Cabinet Grotesk, sans-serif"
              fontSize="13"
              fontWeight="700"
              fill={SAFFRON_DEEP}
            >
              {RECEIPT_SEAL}
            </text>
            <text
              x="48"
              y="60"
              textAnchor="middle"
              fontFamily="Satoshi, sans-serif"
              fontSize="8"
              fill={SAFFRON_DEEP}
            >
              {SEAL_SUBLINE}
            </text>
            <path
              d="M48 8 L48 16 M48 80 L48 88 M8 48 L16 48 M80 48 L88 48"
              stroke={SAFFRON}
              strokeWidth="1.5"
            />
          </svg>
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 32 }}>
        <div>
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 12,
              color: INK_DIM,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Amount
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 700, color: INK }}>
            ₹2,100
          </div>
        </div>
        <div>
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 12,
              color: INK_DIM,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Tax-deductible
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 700, color: SAFFRON }}>
            ₹2,100
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: INK_DIM }}>
            Issued to your PAN · auto-filed
          </div>
          <div
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 13,
              color: INK,
              marginTop: 4,
            }}
          >
            RCPT-DSY-2026-····7421
          </div>
        </div>
        {/* QR placeholder */}
        <div
          style={{
            width: 64,
            height: 64,
            background: INK,
            borderRadius: 8,
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 2,
            padding: 6,
          }}
        >
          {Array.from({ length: 25 }).map((_, i) => (
            <div
              key={i}
              style={{ background: (i * 7) % 3 === 0 ? '#fff' : 'transparent', borderRadius: 1 }}
            />
          ))}
        </div>
      </div>
    </CardFrame>
  );
};
