// Darshya — 10/10 animated SaaS product demo reel.
// Pure vector UI (no screenshots, no WebMs), 4K 60fps, future-bass music bed
// with every visual hit beat-synced to beatmap.json. Per the Master Creative
// Prompt: dark base #0D0D12 + glowing saffron brand, glassmorphism panels,
// oversized cursor, kinetic typography (masked/cascade/scale), zoom-through /
// whip-pan / shatter transitions, 3-5 words/screen, rapid pacing.
//
// 5 scenes:
//   1. Hook (0-10s)    — problem word types out, cursor clicks, shatter -> logo
//   2. Core Value (10-25s) — "Meet Darshya" + 3 UI cards + sync button + chime
//   3. Magic (25-45s)  — zoom into AI Pandit chat, glowing border, skeletons->data
//   4. Speed (45-60s)  — rapid montage: darshan LIVE, kundli, dashboard, toggles
//   5. CTA (60-75s)    — pull back to full ecosystem, "Devotion. Verified.", logo
import {
  AbsoluteFill,
  Audio,
  Series,
  Sequence,
  staticFile,
  useCurrentFrame,
  interpolate,
} from 'remotion';
import { RECEIPT_STAT } from './claims';
import {
  VOID,
  WHITE,
  SAFFRON,
  GOLD,
  saffronGlow,
  goldGlow,
  FONT_DISPLAY,
  FONT_BODY,
} from './tokens';
import { FontStyle } from './components/FontStyle';
import {
  MeshGradient,
  GlassPanel,
  Cursor,
  PhoneFrame,
  LaptopFrame,
  KineticType,
  Skeleton,
  Toggle,
  ChartFromZero,
  LoadingBar,
  Badge,
} from './components/Primitives';
import {
  VectorHome,
  VectorPujaCard,
  VectorAiChat,
  VectorDarshan,
  VectorKundli,
  VectorDashboard,
} from './components/VectorUI';
import { Scene, Shatter, ZoomThroughOut, CircleReveal, WhipPan } from './components/Transitions';
import {
  MUSIC_FPS,
  BEAT_SEC,
  KICKS,
  SNARES,
  STABS,
  kick,
  snare,
  stab,
  hitPulse,
  appearOn,
} from './beat';

export const FPS = MUSIC_FPS; // 60
const sec = (s: number) => Math.round(s * FPS);

export type Aspect = 'landscape' | 'portrait' | 'hd';
export const ASPECTS = {
  landscape: { width: 3840, height: 2160 }, // 4K UHD (master spec)
  hd: { width: 1920, height: 1080 }, // 1080p60 (fast master, same 60fps smoothness)
  portrait: { width: 1080, height: 1920 }, // 9:16 Reels
} as const;

// Scene durations (75s total), locked to the music structure:
//   buildup 0-15s, drop 15-60s, outro 60-75s
const SCENES = {
  hook: sec(10), // 0-10s   (buildup)
  core: sec(15), // 10-25s  (drop start)
  magic: sec(20), // 25-45s  (drop)
  speed: sec(15), // 45-60s  (drop)
  cta: sec(15), // 60-75s  (outro)
};
export const DURATION_FRAMES = SCENES.hook + SCENES.core + SCENES.magic + SCENES.speed + SCENES.cta; // 4500

// absolute frame offsets of each scene start (for beat-sync anchoring)
const S = {
  hook: 0,
  core: SCENES.hook,
  magic: SCENES.hook + SCENES.core,
  speed: SCENES.hook + SCENES.core + SCENES.magic,
  cta: SCENES.hook + SCENES.core + SCENES.magic + SCENES.speed,
};

// ---------- SCENE 1: Hook ----------
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const local = frame - S.hook;
  // word types out over ~2s, holds, then cursor clicks at ~7s, shatter -> logo
  const word = 'Devotion is broken.';
  const typed = Math.min(word.length, Math.floor(local * 0.18));
  const cursorClickFrame = S.hook + 7 * FPS; // 7s
  const shatterStart = S.hook + 7.2 * FPS;
  const showLogo = local >= 7.5 * FPS;
  const cursorPulse = hitPulse(frame, KICKS, 12);

  return (
    <AbsoluteFill style={{ backgroundColor: VOID }}>
      <FontStyle />
      <MeshGradient seed="hook" intensity={0.3} slow />

      {/* typed problem word */}
      {!showLogo && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 200,
              color: WHITE,
              letterSpacing: '-0.04em',
              textShadow: `0 0 60px ${saffronGlow(0.5)}`,
            }}
          >
            {word.slice(0, Math.max(0, typed))}
            {Math.floor(local / 12) % 2 === 0 && typed < word.length && (
              <span style={{ color: SAFFRON }}>|</span>
            )}
          </div>
        </AbsoluteFill>
      )}

      {/* cursor clicks the word */}
      {!showLogo && local < 7.5 * FPS && (
        <Cursor
          x={2820 + Math.sin(local * 0.1) * 8}
          y={1080}
          clickFrame={cursorClickFrame}
          size={50}
        />
      )}

      {/* shatter -> logo reveal */}
      {local >= 7.2 * FPS && local < 9 * FPS && (
        <Shatter durFrames={sec(1.8)}>
          <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 200, color: WHITE }}>
              Devotion is broken.
            </div>
          </AbsoluteFill>
        </Shatter>
      )}

      {/* logo reveal on the drop (frame 900 = 15s, but we reveal at ~8s as beat builds) */}
      {showLogo && (
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            gap: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              transform: `scale(${appearOn(local, 8 * FPS)})`,
            }}
          >
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: 28,
                background: `linear-gradient(135deg, ${SAFFRON}, ${GOLD})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 56,
                boxShadow: `0 0 80px ${saffronGlow(0.7)}`,
              }}
            >
              🪔
            </div>
            <div
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 180,
                color: WHITE,
                letterSpacing: '-0.04em',
                textShadow: `0 0 60px ${saffronGlow(0.5)}`,
              }}
            >
              Darshya
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ---------- SCENE 2: Core Value ----------
const CoreScene: React.FC = () => {
  const frame = useCurrentFrame();
  const local = frame - S.core;
  const syncClick = S.core + 6 * FPS;
  const chimeFrame = S.core + 7 * FPS; // loading bar completes -> chime
  return (
    <AbsoluteFill style={{ backgroundColor: VOID }}>
      <MeshGradient seed="core" intensity={0.5} />

      {/* "Meet Darshya" kinetic */}
      <AbsoluteFill
        style={{ top: 180, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 120 }}
      >
        <KineticType text="Meet Darshya." size={170} startFrame={S.core} variant="mask" />
      </AbsoluteFill>

      {/* three overlapping UI cards slide in from different directions */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 60, alignItems: 'center' }}>
          {/* card 1 from left */}
          <div
            style={{
              transform: `translateX(${interpolate(local, [10, 30], [-800, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})`,
            }}
          >
            <VectorPujaCard width={480} startFrame={S.core + 12} />
          </div>
          {/* card 2 center (hero) */}
          <div
            style={{
              transform: `translateY(${interpolate(local, [14, 34], [600, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})`,
            }}
          >
            <GlassPanel width={560} height={360} opacity={0.9} style={{ overflow: 'hidden' }}>
              <VectorDarshan width={560} height={360} liveStart={S.core + 18} />
            </GlassPanel>
          </div>
          {/* card 3 from right */}
          <div
            style={{
              transform: `translateX(${interpolate(local, [18, 38], [800, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})`,
            }}
          >
            <GlassPanel width={420} height={420} opacity={0.9} style={{ overflow: 'hidden' }}>
              <VectorKundli width={420} height={420} startFrame={S.core + 20} />
            </GlassPanel>
          </div>
        </div>
      </AbsoluteFill>

      {/* sync button + loading bar + chime */}
      <AbsoluteFill
        style={{
          bottom: 200,
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 120,
        }}
      >
        {local < 6 * FPS && (
          <div
            style={{
              padding: '20px 48px',
              borderRadius: 16,
              background: `linear-gradient(90deg, ${SAFFRON}, ${GOLD})`,
              color: '#fff',
              fontFamily: FONT_BODY,
              fontWeight: 700,
              fontSize: 36,
              boxShadow: `0 12px 40px ${saffronGlow(0.5)}`,
            }}
          >
            Sync
          </div>
        )}
        {local >= 6 * FPS && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <LoadingBar width={600} startFrame={syncClick} fillFrames={FPS} />
            <div
              style={{
                fontFamily: FONT_BODY,
                color: SAFFRON,
                fontSize: 28,
                fontWeight: 600,
                opacity: appearOn(frame, chimeFrame),
              }}
            >
              Verified ✓
            </div>
          </div>
        )}
      </AbsoluteFill>

      {/* cursor clicks Sync */}
      {local < 7 * FPS && (
        <Cursor x={1920 + Math.sin(local * 0.1) * 6} y={1880} clickFrame={syncClick} size={48} />
      )}
    </AbsoluteFill>
  );
};

// ---------- SCENE 3: Magic Feature ----------
const MagicScene: React.FC = () => {
  const frame = useCurrentFrame();
  const local = frame - S.magic;
  return (
    <AbsoluteFill style={{ backgroundColor: VOID }}>
      <MeshGradient seed="magic" intensity={0.6} />

      {/* zoom into the AI chat panel */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          transform: `scale(${interpolate(local, [0, 20], [1.15, 1], { extrapolateRight: 'clamp' })})`,
        }}
      >
        <GlassPanel
          width={1400}
          height={900}
          opacity={0.85}
          style={{ overflow: 'hidden', position: 'relative' }}
        >
          {/* glowing AI border */}
          <div
            style={{
              position: 'absolute',
              inset: -2,
              borderRadius: 26,
              padding: 3,
              background: `linear-gradient(135deg, ${SAFFRON}, ${GOLD}, ${SAFFRON})`,
              opacity: 0.5 + 0.3 * Math.sin(frame * 0.1),
              filter: 'blur(6px)',
              zIndex: -1,
            }}
          />
          <VectorAiChat width={1400} height={900} startFrame={S.magic + 6} />
        </GlassPanel>
      </AbsoluteFill>

      {/* "Insights. Instantly." kinetic — hits on a stab */}
      <AbsoluteFill
        style={{
          bottom: 200,
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 100,
        }}
      >
        <KineticType
          text="Wisdom. Instantly."
          size={120}
          startFrame={S.magic + 18}
          variant="cascade"
        />
      </AbsoluteFill>

      {/* cursor */}
      <Cursor x={2100} y={900} size={48} visible={local < 16 * FPS} />
    </AbsoluteFill>
  );
};

// ---------- SCENE 4: Speed / Workflow (rapid montage) ----------
const SpeedScene: React.FC = () => {
  const frame = useCurrentFrame();
  const local = frame - S.speed;
  const sub = Math.floor(local / (3 * FPS)); // 5 cuts over 15s
  const subLocal = local - sub * 3 * FPS;

  return (
    <AbsoluteFill style={{ backgroundColor: VOID }}>
      <MeshGradient seed="speed" intensity={0.7} />

      {/* rapid cuts — each synced to a kick */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        {sub === 0 && (
          <GlassPanel width={1200} height={700} style={{ overflow: 'hidden' }}>
            <VectorDarshan width={1200} height={700} liveStart={S.speed + 8} />
          </GlassPanel>
        )}
        {sub === 1 && (
          <GlassPanel width={1200} height={700} style={{ overflow: 'hidden' }}>
            <VectorKundli width={1200} height={700} startFrame={S.speed + 3 * FPS + 4} />
          </GlassPanel>
        )}
        {sub === 2 && (
          <GlassPanel width={1200} height={700} style={{ overflow: 'hidden' }}>
            <VectorDashboard width={1200} height={700} startFrame={S.speed + 6 * FPS} />
          </GlassPanel>
        )}
        {sub === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 60, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 80 }}>
              {['Aadhaar', 'Video proof', RECEIPT_STAT].map((t, i) => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <Toggle
                    on={subLocal > i * 20 + 10}
                    clickFrame={S.speed + 9 * FPS + i * 20 + 10}
                    size={80}
                  />
                  <span
                    style={{ fontFamily: FONT_BODY, color: WHITE, fontSize: 32, fontWeight: 600 }}
                  >
                    {t}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {sub === 4 && (
          <div style={{ display: 'flex', gap: 40 }}>
            {['✓', '✓', '✓', '✓'].map((c, i) => (
              <div
                key={i}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${SAFFRON}, ${GOLD})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 48,
                  color: '#fff',
                  transform: `scale(${appearOn(local, S.speed + 12 * FPS + i * 8 - S.speed)})`,
                  boxShadow: `0 0 40px ${saffronGlow(0.6)}`,
                }}
              >
                {c}
              </div>
            ))}
          </div>
        )}
      </AbsoluteFill>

      {/* kinetic label per cut */}
      <AbsoluteFill style={{ bottom: 180, justifyContent: 'flex-end', alignItems: 'center' }}>
        {['Live darshan.', 'Free kundli.', 'Real insights.', 'Trust, on.', 'All verified.'][
          sub
        ] && (
          <KineticType
            key={sub}
            text={
              ['Live darshan.', 'Free kundli.', 'Real insights.', 'Trust, on.', 'All verified.'][
                sub
              ]
            }
            size={110}
            startFrame={S.speed + sub * 3 * FPS + 4}
            variant="mask"
          />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- SCENE 5: Climax + CTA ----------
const CtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const local = frame - S.cta;
  return (
    <AbsoluteFill style={{ backgroundColor: VOID }}>
      <MeshGradient seed="cta" intensity={0.8} />

      {/* pull back: full ecosystem UI blurs out */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          opacity: interpolate(local, [0, 4 * FPS], [1, 0.15], { extrapolateRight: 'clamp' }),
          filter: `blur(${interpolate(local, [0, 4 * FPS], [0, 12], { extrapolateRight: 'clamp' })}px)`,
          transform: `scale(${interpolate(local, [0, 5 * FPS], [1, 0.85], { extrapolateRight: 'clamp' })})`,
        }}
      >
        <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
          <GlassPanel width={500} height={700} style={{ overflow: 'hidden' }} opacity={0.6}>
            <VectorHome width={500} height={700} />
          </GlassPanel>
          <GlassPanel width={800} height={560} style={{ overflow: 'hidden' }} opacity={0.6}>
            <VectorDashboard width={800} height={560} startFrame={S.cta} />
          </GlassPanel>
          <GlassPanel width={460} height={640} style={{ overflow: 'hidden' }} opacity={0.6}>
            <VectorPujaCard width={460} startFrame={S.cta + 4} />
          </GlassPanel>
        </div>
      </AbsoluteFill>

      {/* massive "Devotion. Verified." takes center */}
      <AbsoluteFill
        style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 60 }}
      >
        <KineticType text="Devotion." size={260} startFrame={S.cta + 4 * FPS} variant="scale" />
        <KineticType
          text="Verified."
          size={260}
          startFrame={S.cta + 4.5 * FPS}
          variant="scale"
          color={SAFFRON}
        />

        {/* logo + URL + Start button */}
        <div
          style={{
            marginTop: 80,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 40,
            opacity: appearOn(frame, S.cta + 7 * FPS),
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                background: `linear-gradient(135deg, ${SAFFRON}, ${GOLD})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
              }}
            >
              🪔
            </div>
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 56, color: WHITE }}>
              Darshya
            </span>
          </div>
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 36,
              color: GOLD,
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            darshya.online
          </div>
          <div
            style={{
              padding: '20px 56px',
              borderRadius: 16,
              background: `linear-gradient(90deg, ${SAFFRON}, ${GOLD})`,
              color: '#fff',
              fontFamily: FONT_BODY,
              fontWeight: 700,
              fontSize: 36,
              boxShadow: `0 12px 40px ${saffronGlow(0.6)}`,
            }}
          >
            Book your first puja
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- Root composition ----------
// All scenes are authored at 4K (3840x2160) coordinate space. For the HD and
// portrait aspects, the 4K content is scaled to fit the smaller frame so every
// hardcoded coordinate stays correct — no per-aspect repositioning needed.
export const DarshyaDemo: React.FC<{ aspect?: Aspect }> = ({ aspect = 'landscape' }) => {
  const W = 3840,
    H = 2160; // the design space
  const target = ASPECTS[aspect === 'landscape' ? 'landscape' : aspect];
  const scale = aspect === 'landscape' ? 1 : target.width / W;
  const scaledH = H * scale;
  const topBar = (target.height - scaledH) / 2;

  const content = (
    <AbsoluteFill style={{ backgroundColor: VOID }}>
      <FontStyle />
      <Series>
        <Series.Sequence durationInFrames={SCENES.hook}>
          <HookScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.core}>
          <CoreScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.magic}>
          <MagicScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.speed}>
          <SpeedScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.cta}>
          <CtaScene />
        </Series.Sequence>
      </Series>

      {/* music bed — the synthesized future-bass track */}
      <Audio src={staticFile('pitch/audio/music.wav')} volume={1.0} />

      {/* SFX stems — layered on exact frames, synced to the beat map.
          whoosh on scene transitions, click on cursor clicks, chime on the
          magic feature, pop on badges/checkmarks. */}
      {/* whoosh at each scene boundary */}
      <Sequence from={S.core - 8} durationInFrames={30}>
        <Audio src={staticFile('pitch/audio/sfx-whoosh.wav')} volume={0.6} />
      </Sequence>
      <Sequence from={S.magic - 8} durationInFrames={30}>
        <Audio src={staticFile('pitch/audio/sfx-whoosh.wav')} volume={0.6} />
      </Sequence>
      <Sequence from={S.speed - 8} durationInFrames={30}>
        <Audio src={staticFile('pitch/audio/sfx-whoosh.wav')} volume={0.6} />
      </Sequence>
      <Sequence from={S.cta - 8} durationInFrames={30}>
        <Audio src={staticFile('pitch/audio/sfx-whoosh.wav')} volume={0.6} />
      </Sequence>

      {/* click on the hook cursor click (7s) and sync button (16s) */}
      <Sequence from={S.hook + 7 * FPS} durationInFrames={12}>
        <Audio src={staticFile('pitch/audio/sfx-click.wav')} volume={0.5} />
      </Sequence>
      <Sequence from={S.core + 6 * FPS} durationInFrames={12}>
        <Audio src={staticFile('pitch/audio/sfx-click.wav')} volume={0.5} />
      </Sequence>

      {/* chime when the AI magic answer completes (~36s) and the sync verifies */}
      <Sequence from={S.magic + 12 * FPS} durationInFrames={60}>
        <Audio src={staticFile('pitch/audio/sfx-chime.wav')} volume={0.5} />
      </Sequence>
      <Sequence from={S.core + 7 * FPS} durationInFrames={60}>
        <Audio src={staticFile('pitch/audio/sfx-chime.wav')} volume={0.4} />
      </Sequence>

      {/* pops on the speed-scene checkmarks (every 8 frames from 12s into speed) */}
      {[0, 8, 16, 24].map((off, i) => (
        <Sequence key={i} from={S.speed + 12 * FPS + off} durationInFrames={12}>
          <Audio src={staticFile('pitch/audio/sfx-pop.wav')} volume={0.45} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );

  // landscape (4K): render at full design size, no scaling
  if (aspect === 'landscape') return content;

  // hd / portrait: scale the 4K design to fit the target width, center vertically
  return (
    <AbsoluteFill style={{ backgroundColor: VOID }}>
      <div
        style={{
          position: 'absolute',
          top: topBar,
          left: 0,
          width: W,
          height: H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {content}
      </div>
    </AbsoluteFill>
  );
};
