import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SAFFRON, saffronGlow } from '../tokens';

type Waypoint = { x: number; y: number; atFrame: number; click?: boolean };

type Props = {
  waypoints: Waypoint[]; // cursor moves between these; x/y in px from top-left
  startFrame?: number;
};

// Saffron glowing cursor dot that travels on a spring path between waypoints
// and emits a ripple ring on each `click` waypoint. Directs attention over real
// product footage without a hard pointer. Pure TSX, no asset.
export const AnimatedCursor: React.FC<Props> = ({ waypoints, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (waypoints.length === 0) return null;

  // figure out which segment we're in
  const rel = frame - startFrame;
  let seg = 0;
  for (let i = 1; i < waypoints.length; i++) {
    if (rel >= waypoints[i].atFrame) seg = i;
  }
  const from = waypoints[Math.max(0, seg - 0)];
  const to = waypoints[Math.min(seg + 1, waypoints.length - 1)];
  const segStart = from.atFrame;
  const segEnd = to.atFrame;
  const segLen = Math.max(1, segEnd - segStart);
  const segT = Math.max(0, Math.min(1, (rel - segStart) / segLen));

  // spring-eased position toward `to`
  const ease = spring({
    frame: Math.round(segT * 30),
    fps: 30,
    config: { damping: 18, stiffness: 90, mass: 0.8 },
    from: 0,
    to: 1,
  });
  const x = from.x + (to.x - from.x) * ease;
  const y = from.y + (to.y - from.y) * ease;

  // ripple on click waypoints — find the most recent click within 18 frames
  let clickAge = -1;
  for (const w of waypoints) {
    if (w.click) {
      const age = rel - w.atFrame;
      if (age >= 0 && age <= 18 && age > clickAge) clickAge = age;
    }
  }

  const clickScale =
    clickAge >= 0
      ? spring({
          frame: clickAge,
          fps,
          config: { damping: 12, stiffness: 110, mass: 0.6 },
          from: 1,
          to: 1.4,
        }) -
        (clickAge > 6
          ? spring({
              frame: clickAge - 6,
              fps,
              config: { damping: 12, stiffness: 110 },
              from: 0,
              to: 0.4,
            })
          : 0)
      : 1;

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
      {/* ripple ring */}
      {clickAge >= 0 && (
        <div
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: 60,
            height: 60,
            borderRadius: '50%',
            border: `2px solid ${saffronGlow(0.6)}`,
            transform: `translate(-50%, -50%) scale(${0.5 + clickAge * 0.04})`,
            opacity: Math.max(0, 0.6 - clickAge * 0.035),
          }}
        />
      )}
      {/* cursor dot */}
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: SAFFRON,
          transform: `translate(-50%, -50%) scale(${Math.max(0.7, clickScale)})`,
          boxShadow: `0 0 16px ${saffronGlow(0.9)}, 0 0 32px ${saffronGlow(0.5)}`,
        }}
      />
    </div>
  );
};
