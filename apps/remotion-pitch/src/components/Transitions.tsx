// Seamless, kinetic transitions — the high-class cuts that make the reel feel
// 10x. No cross-dissolves. Per the Master Creative Prompt:
//  - Zoom-through: zoom endlessly into a button until it becomes the next scene
//  - Whip pan: fast horizontal blur sweep
//  - Match cut: one shape morphs into the next
//  - Shatter: the hook word breaks apart to reveal the logo
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  random,
} from 'remotion';
import { SAFFRON, GOLD, saffronGlow, VOID } from '../tokens';

// ---------- Zoom-through ----------
// The out-bound end of scene A zooms INTO a focal point (fx, fy) until it fills
// the frame; scene B can then start from that fill. Use as a wrapper that scales
// its children up + fades as it exits over `durFrames`.
export const ZoomThroughOut: React.FC<{
  children: React.ReactNode;
  durFrames: number;
  fx?: number;
  fy?: number;
}> = ({ children, durFrames, fx = 0.5, fy = 0.5 }) => {
  const frame = useCurrentFrame();
  const t = frame / durFrames;
  const scale = interpolate(t, [0, 1], [1, 4], { extrapolateRight: 'clamp' });
  const opacity = interpolate(t, [0, 0.6, 1], [1, 1, 0], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ opacity }}>
      <AbsoluteFill
        style={{ transform: `scale(${scale})`, transformOrigin: `${fx * 100}% ${fy * 100}%` }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- Zoom-through in (scene B entering from a zoomed fill) ----------
export const ZoomThroughIn: React.FC<{
  children: React.ReactNode;
  durFrames: number;
  fx?: number;
  fy?: number;
}> = ({ children, durFrames, fx = 0.5, fy = 0.5 }) => {
  const frame = useCurrentFrame();
  const t = frame / durFrames;
  const scale = interpolate(t, [0, 1], [4, 1], { extrapolateRight: 'clamp' });
  const opacity = interpolate(t, [0, 0.2, 1], [0, 1, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ opacity }}>
      <AbsoluteFill
        style={{ transform: `scale(${scale})`, transformOrigin: `${fx * 100}% ${fy * 100}%` }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- Whip pan ----------
// Fast horizontal sweep with motion blur. dir: -1 (right->left) or 1 (left->right).
export const WhipPan: React.FC<{ durFrames: number; dir?: 1 | -1 }> = ({ durFrames, dir = -1 }) => {
  const frame = useCurrentFrame();
  const t = frame / durFrames;
  // saffron streak sweeps across + blurs
  const x = interpolate(t, [0, 1], [dir === -1 ? 100 : -100, dir === -1 ? -100 : 100]);
  const opacity = interpolate(t, [0, 0.4, 0.6, 1], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ opacity, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: `${x}%`,
          width: '120%',
          height: '100%',
          background: `linear-gradient(90deg, transparent, ${SAFFRON}, ${GOLD}, transparent)`,
          filter: 'blur(30px)',
          transform: 'skewX(-12deg)',
        }}
      />
    </AbsoluteFill>
  );
};

// ---------- Shatter (hook word -> logo) ----------
// The problem word breaks into shards that fly outward, revealing the logo.
export const Shatter: React.FC<{
  children: React.ReactNode;
  durFrames: number;
  shards?: number;
}> = ({ children, durFrames, shards = 12 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / durFrames;
  return (
    <AbsoluteFill>
      {/* the word, fading as shards take over */}
      <AbsoluteFill
        style={{ opacity: interpolate(t, [0, 0.3], [1, 0], { extrapolateRight: 'clamp' }) }}
      >
        {children}
      </AbsoluteFill>
      {/* shards flying out */}
      {Array.from({ length: shards }).map((_, i) => {
        const angle = (i / shards) * Math.PI * 2 + random(`shard-${i}`) * 0.5;
        const dist = spring({
          frame: frame - durFrames * 0.3,
          fps,
          config: { damping: 200, stiffness: 40 },
          from: 0,
          to: 800 + random(`d-${i}`) * 600,
        });
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        const rot = random(`r-${i}`) * 720;
        const op = interpolate(t, [0.3, 0.7, 1], [0, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 60 + random(`w-${i}`) * 80,
              height: 8,
              background: i % 2 ? SAFFRON : GOLD,
              transform: `translate(${x}px, ${y}px) rotate(${rot}deg)`,
              opacity: op,
              filter: 'blur(2px)',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- Match-cut circle morph ----------
// A circular element (e.g. profile pic / diya) at end of scene A becomes a
// larger circle that opens to reveal scene B. Use at the start of scene B:
export const CircleReveal: React.FC<{
  children: React.ReactNode;
  durFrames: number;
  cx?: number;
  cy?: number;
}> = ({ children, durFrames, cx = 0.5, cy = 0.5 }) => {
  const frame = useCurrentFrame();
  const t = frame / durFrames;
  // clip-path circle grows from 0 to 150% radius
  const r = interpolate(t, [0, 1], [0, 150], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ clipPath: `circle(${r}% at ${cx * 100}% ${cy * 100}%)` }}>
      {children}
    </AbsoluteFill>
  );
};

// ---------- Scene wrapper: handles enter/exit with a chosen transition ----------
// `enter`/`exit` are transition components applied at the start/end of the scene.
type TransitionKind = 'zoom-in' | 'zoom-out' | 'whip' | 'circle' | 'none';
export const Scene: React.FC<{
  children: React.ReactNode;
  durationFrames: number;
  enter?: TransitionKind;
  exit?: TransitionKind;
  enterDur?: number;
  exitDur?: number;
  fx?: number;
  fy?: number;
}> = ({
  children,
  durationFrames,
  enter = 'none',
  exit = 'none',
  enterDur = 12,
  exitDur = 12,
  fx = 0.5,
  fy = 0.5,
}) => {
  const frame = useCurrentFrame();
  const exitStart = durationFrames - exitDur;

  return (
    <AbsoluteFill>
      {/* enter transition overlay */}
      {enter !== 'none' && frame < enterDur && (
        <>
          {enter === 'zoom-in' && (
            <ZoomThroughIn durFrames={enterDur} fx={fx} fy={fy}>
              <div />
            </ZoomThroughIn>
          )}
          {enter === 'whip' && <WhipPan durFrames={enterDur} />}
          {enter === 'circle' && (
            <CircleReveal durFrames={enterDur} cx={fx} cy={fy}>
              <div />
            </CircleReveal>
          )}
        </>
      )}

      {/* main content with enter/exit transforms */}
      <AbsoluteFill
        style={{
          // slight zoom-in settle on enter, zoom-out on exit for continuity
          transform: `scale(${
            frame < enterDur
              ? interpolate(frame, [0, enterDur], [1.08, 1], { extrapolateRight: 'clamp' })
              : frame > exitStart
                ? interpolate(
                    frame,
                    [exitStart, durationFrames],
                    [1, exit === 'zoom-out' ? 1.12 : 1],
                    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
                  )
                : 1
          })`,
          opacity:
            frame < 4 ? interpolate(frame, [0, 4], [0, 1], { extrapolateRight: 'clamp' }) : 1,
        }}
      >
        {children}
      </AbsoluteFill>

      {/* exit transition */}
      {exit !== 'none' && frame >= exitStart && (
        <>
          {exit === 'zoom-out' && (
            <ZoomThroughOut durFrames={exitDur} fx={fx} fy={fy}>
              <div />
            </ZoomThroughOut>
          )}
          {exit === 'whip' && <WhipPan durFrames={exitDur} dir={1} />}
        </>
      )}
    </AbsoluteFill>
  );
};
