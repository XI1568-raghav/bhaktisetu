import { AbsoluteFill, Audio, Series, staticFile, useCurrentFrame, interpolate } from 'remotion';
import { BG, INK, SAFFRON, SAFFRON_DEEP, GOLD, FONT_DISPLAY, FONT_BODY } from './tokens';
import { FontStyle } from './components/FontStyle';

// The new animated-mockup components
import { DarshanStream } from './components/DarshanStream';
import { PujaBookingFlow } from './components/PujaBookingFlow';
import { AiPanditChat } from './components/AiPanditChat';
import { KundliWheel } from './components/KundliWheel';
import { ProductClip } from './components/ProductClip';
import { AnimatedCursor } from './components/AnimatedCursor';
import { StatCounter } from './components/StatCounter';
import { LogoSting } from './components/LogoSting';
import { DualCurrencyMap } from './components/DualCurrencyMap';
import { TrustLockup } from './components/TrustLockup';
import { NriSplitScreen } from './components/NriSplitScreen';
import { KineticChar } from './components/KineticChar';
import { KineticText } from './components/KineticText';
import { DiyaGlow } from './components/DiyaGlow';
import { BrowserMockup } from './components/BrowserMockup';

export const FPS = 30;
export const sec = (s: number) => Math.round(s * FPS);

export type Aspect = 'landscape' | 'portrait';

export const ASPECTS = {
  landscape: { width: 1920, height: 1080 },
  portrait: { width: 1080, height: 1920 },
} as const;

// 82s film @ 30fps = 2460 frames. 21 shots across 6 acts.
// The "best devotional + SaaS demo in market" rebuild:
// Hook -> Gap -> Darshya reveal -> 4 animated hero moments -> breadth ->
// diaspora dual-currency -> honest stats -> "Devotion, verified." -> CTA -> outro.
//
// Real product footage via OffthreadVideo; animated UI mockups for the trust
// beats; kinetic typography for stats + CTA; honest live-verifiable numbers only.
const SHOTS = [
  // ACT 1 — Hook: devotion at a distance (VO: "Your mother's aarti" / "10,000 km")
  sec(5.5),
  sec(3.9),
  // ACT 2 — Gap: the trust problem (VO: "WhatsApp pandit" / "No proof/face/faith")
  sec(7.2),
  sec(6.1),
  // ACT 3 — Solution reveal (VO: "Darshya. Devotion, verified.")
  sec(4.5),
  // ACT 4 — Feature deep-dive
  sec(5.5),
  sec(4.0), // DarshanStream LIVE (VO: "Watch live darshan..." / "As it happens")
  sec(4.2),
  sec(8.8), // PujaBookingFlow Aadhaar -> 80G (VO: "Aadhaar priest" / "recorded...80G")
  sec(5.3),
  sec(3.6), // AiPanditChat question -> Gita verse (VO: "Ask AI Pandit" / "Sanskrit+English")
  sec(6.2), // KundliWheel (VO: "Free kundli...₹15/min")
  sec(6.3), // breadth montage (VO: "Gau seva. Bhakti store. Sacred texts.")
  sec(4.4), // yatra (VO: "Char Dham. 12 Jyotirlingas.")
  sec(6.5), // DualCurrencyMap (VO: "Pay in rupees...seva reaches the temple")
  // ACT 5 — Proof / resolution (VO: "1,635 pages..." / "Devotion, verified.")
  sec(8.9),
  sec(2.8),
  // ACT 6 — CTA + outro (VO: "Your proof..." / "Book your first..." / "your bridge")
  sec(2.5),
  sec(5.0),
  sec(4.0),
  sec(1.0),
];

export const DURATION_FRAMES = SHOTS.reduce((a, b) => a + b, 0);

// shot start frame helper (cumulative)
const SHOT_STARTS = SHOTS.reduce<number[]>((acc, d, i) => {
  acc.push((acc[i - 1] ?? 0) + d);
  return acc;
}, []);
export const shotStart = (i: number) => (i === 0 ? 0 : SHOT_STARTS[i - 1]);

type ShotProps = { durationFrames: number; aspect: Aspect };

// --- Individual shot components (one per shot in the blueprint) ---

// Shot 1 — cold open: dark room, glowing phone card, "10,000 km away"
const Shot1: React.FC<ShotProps> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const phoneIn = interpolate(frame, [0, 15], [0.94, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ backgroundColor: INK, justifyContent: 'center', alignItems: 'center' }}>
      <DiyaGlow count={18} intensity={0.8} seed="s1" />
      <div
        style={{
          transform: `scale(${phoneIn})`,
          width: 380,
          height: 620,
          borderRadius: 40,
          background: '#0e0c0a',
          border: '10px solid #1a1a1a',
          boxShadow: `0 0 80px ${SAFFRON}40, 0 30px 80px rgba(0,0,0,0.6)`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 16,
          padding: 40,
        }}
      >
        <div style={{ fontSize: 48 }}>🪔</div>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 14,
            color: '#8a7e72',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Mangal Aarti
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 700, color: '#fff' }}>
          4:30 AM
        </div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 16, color: SAFFRON }}>
          Missed · 2 hrs ago
        </div>
        <div
          style={{
            marginTop: 8,
            padding: '8px 16px',
            borderRadius: 999,
            background: SAFFRON,
            fontFamily: FONT_BODY,
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
          }}
        >
          Watch replay
        </div>
      </div>
      <AbsoluteFill>
        <KineticChar
          text="10,000 km away."
          size={72}
          color="#fff"
          startFrame={20}
          charStaggerFrames={2}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Shot 2 — Golden Temple LIVE full-bleed (real footage)
const Shot2: React.FC<ShotProps> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const warm = interpolate(frame, [0, 12], [0.7, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <ProductClip
        src="pitch/video/06-darshan-live.webm"
        durationFrames={durationFrames}
        trimBefore={0}
        frame="none"
        vignette={false}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(42,37,32,${0.3 * (1 - warm)}) 0%, transparent 50%)`,
          mixBlendMode: 'multiply',
        }}
      />
      <AbsoluteFill style={{ top: 60, right: 80, alignItems: 'flex-end' }}>
        <div
          style={{
            position: 'absolute',
            top: 60,
            right: 80,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(0,0,0,0.55)',
            padding: '8px 14px',
            borderRadius: 999,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#ff3b30',
              opacity: 0.6 + 0.4 * Math.sin(frame * 0.3),
            }}
          />
          <span style={{ fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700, color: '#fff' }}>
            LIVE
          </span>
        </div>
      </AbsoluteFill>
      <KineticText
        text="Live, right now."
        size={64}
        color={SAFFRON}
        startFrame={8}
        wordStaggerFrames={4}
      />
    </AbsoluteFill>
  );
};

// Shot 3+4 — Gap: WhatsApp pandit, trust-failure words
const Shot3: React.FC<ShotProps> = ({ durationFrames }) => (
  <NriSplitScreen durationFrames={durationFrames} />
);
const Shot4: React.FC<ShotProps> = ({ durationFrames }) => {
  // brief competitor-fear flash reject, then settle to blind faith
  return <NriSplitScreen durationFrames={durationFrames} />;
};

// Shot 5 — Darshya reveal (saffron flash + wordmark)
const Shot5: React.FC<ShotProps> = ({ durationFrames }) => (
  <LogoSting durationFrames={durationFrames} variant="reveal" />
);

// Shot 6+7 — DarshanStream: buffer -> LIVE
const Shot6: React.FC<ShotProps> = ({ durationFrames }) => (
  <DarshanStream durationFrames={durationFrames} templeName="Golden Temple" phoneFrame />
);
const Shot7: React.FC<ShotProps> = ({ durationFrames }) => (
  <AbsoluteFill style={{ backgroundColor: INK, justifyContent: 'center', alignItems: 'center' }}>
    <div style={{ width: '82%', maxWidth: 1500 }}>
      <DarshanStream
        durationFrames={durationFrames}
        templeName="Golden Temple"
        phoneFrame={false}
      />
    </div>
    <AnimatedCursor waypoints={[{ x: 800, y: 540, atFrame: 10, click: true }]} startFrame={6} />
    <AbsoluteFill style={{ bottom: 60, alignItems: 'center', justifyContent: 'flex-end' }}>
      <KineticChar
        text="Sub-second latency."
        size={48}
        color={GOLD}
        startFrame={30}
        charStaggerFrames={3}
      />
    </AbsoluteFill>
  </AbsoluteFill>
);

// Shot 8+9 — PujaBookingFlow: Aadhaar -> 80G receipt
const Shot8: React.FC<ShotProps> = ({ durationFrames }) => (
  <PujaBookingFlow durationFrames={durationFrames} step={2} />
);
const Shot9: React.FC<ShotProps> = ({ durationFrames }) => (
  <PujaBookingFlow durationFrames={durationFrames} step={4} />
);

// Shot 10+11 — AiPanditChat: question -> Gita verse
const Shot10: React.FC<ShotProps> = ({ durationFrames }) => (
  <AiPanditChat durationFrames={durationFrames} phase="question" />
);
const Shot11: React.FC<ShotProps> = ({ durationFrames }) => (
  <AiPanditChat durationFrames={durationFrames} phase="answer" />
);

// Shot 12 — KundliWheel
const Shot12: React.FC<ShotProps> = ({ durationFrames }) => (
  <KundliWheel durationFrames={durationFrames} />
);

// Shot 13 — breadth montage (gaushala + store + sacred texts)
const Shot13: React.FC<ShotProps> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const third = durationFrames / 3;
  const seg = Math.min(2, Math.floor(frame / third));
  const clips = [
    { src: 'pitch/video/09-gaushala.webm', label: 'Gau Seva · adopt from ₹51/day' },
    { src: 'pitch/video/10-store.webm', label: 'Bhakti Store' },
    { src: 'pitch/video/11-yatra.webm', label: 'Char Dham · 12 Jyotirlingas' },
  ];
  const c = clips[seg];
  const segFrame = frame - seg * third;
  const fade = interpolate(segFrame, [0, 4, third - 4, third], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <div style={{ opacity: fade, height: '100%' }}>
        <ProductClip
          src={c.src}
          durationFrames={durationFrames}
          trimBefore={seg * 1.5}
          frame="browser"
          opacity={1}
          vignette
        />
      </div>
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 100,
          opacity: fade,
        }}
      >
        <KineticText text={c.label} size={56} color={INK} startFrame={4} wordStaggerFrames={4} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Shot 14 — Yatra route (real footage + India map overlay handled in clip)
const Shot14: React.FC<ShotProps> = ({ durationFrames }) => (
  <AbsoluteFill style={{ backgroundColor: BG }}>
    <ProductClip
      src="pitch/video/11-yatra.webm"
      durationFrames={durationFrames}
      trimBefore={1.2}
      frame="browser"
    />
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 80 }}>
      <KineticText
        text="Char Dham.|12 Jyotirlingas."
        size={60}
        color={INK}
        startFrame={20}
        wordStaggerFrames={5}
      />
    </AbsoluteFill>
  </AbsoluteFill>
);

// Shot 15 — DualCurrencyMap
const Shot15: React.FC<ShotProps> = ({ durationFrames }) => (
  <DualCurrencyMap durationFrames={durationFrames} />
);

// Shot 16 — honest stat counters
const Shot16: React.FC<ShotProps> = ({ durationFrames }) => (
  <StatCounter
    durationFrames={durationFrames}
    stats={[
      {
        value: 1635,
        suffix: '+',
        label: 'devotional pages',
        icon: '📜',
        sublabel: 'indexed · live today',
      },
      { value: 'Sub-s', label: 'stream latency', icon: '⚡', sublabel: 'HD darshan, globally' },
      {
        value: 15,
        prefix: '₹',
        suffix: '/min',
        label: 'Vedic consultation',
        icon: '🔮',
        sublabel: 'live · from',
      },
    ]}
  />
);

// Shot 17 — "Devotion, verified." resolution
const Shot17: React.FC<ShotProps> = ({ durationFrames }) => (
  <TrustLockup durationFrames={durationFrames} />
);

// Shot 18 — CTA: darshya.online in browser mockup
const Shot18: React.FC<ShotProps> = ({ durationFrames }) => (
  <AbsoluteFill style={{ backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
    <AbsoluteFill
      style={{
        background: `radial-gradient(50% 50% at 50% 50%, ${SAFFRON}20 0%, transparent 70%)`,
      }}
    />
    <BrowserMockup
      src="pitch/img/01-home-hero.png"
      url="darshya.online"
      width={1400}
      glow
      durationFrames={durationFrames}
    />
    <DiyaGlow count={22} intensity={0.6} seed="cta" />
  </AbsoluteFill>
);

// Shot 19 — primary CTA kinetic
const Shot19: React.FC<ShotProps> = ({ durationFrames }) => (
  <AbsoluteFill style={{ backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
    <DiyaGlow count={24} intensity={0.7} seed="s19" />
    <KineticText
      text="Book your first|verified puja."
      size={84}
      color={INK}
      startFrame={6}
      wordStaggerFrames={6}
    />
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 120 }}>
      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: 36,
          color: GOLD,
          fontWeight: 600,
          opacity: interpolate(useCurrentFrame(), [30, 45], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        darshya.online
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);

// Shot 20+21 — outro sting
const Shot20: React.FC<ShotProps> = ({ durationFrames }) => (
  <LogoSting durationFrames={durationFrames} variant="outro" />
);
const Shot21: React.FC<ShotProps> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, durationFrames], [1, 0.6], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill
      style={{ backgroundColor: BG, justifyContent: 'center', alignItems: 'center', opacity: fade }}
    >
      <DiyaGlow count={14} intensity={0.4} seed="end" />
      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: 30,
          color: GOLD,
          fontWeight: 600,
          letterSpacing: '0.04em',
        }}
      >
        darshya.online
      </div>
    </AbsoluteFill>
  );
};

const SHOT_COMPONENTS = [
  Shot1,
  Shot2,
  Shot3,
  Shot4,
  Shot5,
  Shot6,
  Shot7,
  Shot8,
  Shot9,
  Shot10,
  Shot11,
  Shot12,
  Shot13,
  Shot14,
  Shot15,
  Shot16,
  Shot17,
  Shot18,
  Shot19,
  Shot20,
  Shot21,
];

export const DarshyaPitch: React.FC<{ aspect?: Aspect }> = ({ aspect = 'landscape' }) => {
  if (aspect === 'portrait') {
    // 9:16 Reels cut: scale the 1920x1080 master to fit 1080 wide (scale 0.5625),
    // center vertically, and fill the ~656px letterbox with a branded saffron
    // gradient + the darshya.online handle. Keeps every layout visible; the
    // vertical cut is a reformatted master, not a re-render of each scene.
    const scale = ASPECTS.portrait.width / ASPECTS.landscape.width; // 0.5625
    const scaledH = ASPECTS.landscape.height * scale; // 607.5
    const topBar = (ASPECTS.portrait.height - scaledH) / 2; // ~656
    return (
      <AbsoluteFill style={{ backgroundColor: INK }}>
        <FontStyle />
        {/* top branded bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: topBar,
            background: `linear-gradient(180deg, ${INK}, ${SAFFRON_DEEP ?? '#943B19'})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 52,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '-0.03em',
            }}
          >
            DARSHYA
          </span>
        </div>
        {/* scaled master centered */}
        <div
          style={{
            position: 'absolute',
            top: topBar,
            left: 0,
            width: ASPECTS.landscape.width,
            height: ASPECTS.landscape.height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <Series>
            {SHOT_COMPONENTS.map((Shot, i) => (
              <Series.Sequence key={i} durationInFrames={SHOTS[i]}>
                <Shot durationFrames={SHOTS[i]} aspect={aspect} />
              </Series.Sequence>
            ))}
          </Series>
        </div>
        {/* bottom branded bar with handle */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: topBar,
            background: `linear-gradient(0deg, ${INK}, #943B19)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <span
            style={{
              fontFamily: FONT_BODY,
              fontSize: 36,
              color: GOLD,
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            darshya.online
          </span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 22, color: '#c9c0b6' }}>
            Devotion, verified.
          </span>
        </div>
        <Audio src={staticFile('pitch/audio/vo.mp3')} volume={1.0} />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <FontStyle />
      <Series>
        {SHOT_COMPONENTS.map((Shot, i) => (
          <Series.Sequence key={i} durationInFrames={SHOTS[i]}>
            <Shot durationFrames={SHOTS[i]} aspect={aspect} />
          </Series.Sequence>
        ))}
      </Series>

      {/* VO + sound design. VO sits above the bed; bed ducks under VO via envelope. */}
      <Audio src={staticFile('pitch/audio/vo.mp3')} volume={1.0} />
    </AbsoluteFill>
  );
};

// Backwards-compat: the old Root imported FPS/WIDTH/HEIGHT/DURATION_FRAMES.
// New Root uses ASPECTS; these default to landscape for any legacy consumer.
export const WIDTH = ASPECTS.landscape.width;
export const HEIGHT = ASPECTS.landscape.height;
