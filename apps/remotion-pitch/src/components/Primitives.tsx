// Pure-vector UI primitives for the SaaS demo reel. No screenshots, no WebMs.
// Every element is a simplified, oversized 2.5D vector asset with soft shadows,
// rounded corners, and glassmorphism — per the Master Creative Prompt.
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  random,
} from 'remotion';
import {
  VOID,
  VOID_2,
  VOID_3,
  WHITE,
  LINE,
  LINE_BRIGHT,
  SAFFRON,
  GOLD,
  saffronGlow,
  goldGlow,
  MESH,
  FONT_DISPLAY,
  FONT_BODY,
  EASE_OUT_EXPO,
} from '../tokens';

// ---------- Mesh gradient background ----------
// Fluid moving mesh of brand-colored radial blobs over the deep dark base.
// Separates sections. Deterministic via random(seed).
export const MeshGradient: React.FC<{ seed?: string; intensity?: number; slow?: boolean }> = ({
  seed = 'mesh',
  intensity = 1,
  slow = false,
}) => {
  const frame = useCurrentFrame();
  const blobs = [
    { c: MESH.saffron, x: 20, y: 30, r: 50 },
    { c: MESH.gold, x: 75, y: 25, r: 45 },
    { c: MESH.magenta, x: 50, y: 80, r: 55 },
    { c: MESH.saffron, x: 85, y: 70, r: 40 },
  ];
  const drift = slow ? 0.02 : 0.05;
  return (
    <AbsoluteFill style={{ backgroundColor: VOID, overflow: 'hidden' }}>
      {blobs.map((b, i) => {
        const px = b.x + Math.sin(frame * drift + i * 1.7) * 12;
        const py = b.y + Math.cos(frame * drift + i * 2.1) * 10;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${px}%`,
              top: `${py}%`,
              width: `${b.r * 4}%`,
              height: `${b.r * 4}%`,
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, ${b.c} 0%, ${MESH.void} 70%)`,
              filter: 'blur(60px)',
              opacity: 0.6 * intensity,
            }}
          />
        );
      })}
      {/* subtle grain/vignette */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(80% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.5) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};

// ---------- Glassmorphism panel ----------
// Frosted-glass card: semi-transparent dark fill, backdrop blur, hairline border,
// soft drop shadow. The universal container for UI mockups.
export const GlassPanel: React.FC<{
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  radius?: number;
  opacity?: number;
  style?: React.CSSProperties;
}> = ({ children, width = 'auto', height = 'auto', radius = 24, opacity = 0.72, style }) => {
  return (
    <div
      style={{
        width,
        height,
        background: `rgba(30, 30, 40, ${opacity})`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${LINE_BRIGHT}`,
        borderRadius: radius,
        boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ---------- Oversized stylized cursor ----------
// Glowing saffron cursor dot + arrow that guides the eye. Moves on a spring
// path between waypoints; click = scale pulse + ripple. Directs every transition.
export const Cursor: React.FC<{
  x: number;
  y: number;
  clickFrame?: number; // frame at which a click happens (pulse)
  size?: number;
  visible?: boolean;
}> = ({ x, y, clickFrame, size = 38, visible = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let clickScale = 1;
  let ripple = 0;
  if (clickFrame !== undefined) {
    const d = frame - clickFrame;
    if (d >= 0 && d <= 16) {
      clickScale = 1 + Math.sin((d / 16) * Math.PI) * 0.35;
      ripple = Math.max(0, 1 - d / 16);
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        zIndex: 50,
      }}
    >
      {/* ripple */}
      {ripple > 0 && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: size * 2.5,
            height: size * 2.5,
            transform: `translate(-50%, -50%) scale(${1 + (1 - ripple) * 1.5})`,
            borderRadius: '50%',
            border: `2px solid ${saffronGlow(0.6 * ripple)}`,
          }}
        />
      )}
      {/* glow */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: size * 2,
          height: size * 2,
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, ${saffronGlow(0.5)} 0%, transparent 70%)`,
          filter: 'blur(8px)',
        }}
      />
      {/* cursor arrow (SVG) — white with saffron outline */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        style={{
          transform: `scale(${clickScale})`,
          filter: `drop-shadow(0 0 8px ${saffronGlow(0.9)})`,
        }}
      >
        <path
          d="M5 3 L5 18 L9 14 L12 21 L14 20 L11 13 L17 13 Z"
          fill={WHITE}
          stroke={SAFFRON}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

// ---------- Device frames ----------
// Simplified phone + laptop bezels to host the vector UI. No real screenshots.

export const PhoneFrame: React.FC<{
  children: React.ReactNode;
  width?: number;
  glow?: boolean;
}> = ({ children, width = 420, glow = true }) => (
  <div
    style={{
      position: 'relative',
      width,
      height: width * 2.16,
      borderRadius: width * 0.14,
      background: '#000',
      border: `${width * 0.025}px solid #1c1c22`,
      boxShadow: glow
        ? `0 40px 100px rgba(0,0,0,0.6), 0 0 60px ${saffronGlow(0.25)}`
        : '0 40px 100px rgba(0,0,0,0.6)',
      overflow: 'hidden',
    }}
  >
    {/* notch */}
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: width * 0.34,
        height: width * 0.06,
        background: '#1c1c22',
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
        zIndex: 10,
      }}
    />
    {children}
  </div>
);

export const LaptopFrame: React.FC<{
  children: React.ReactNode;
  width?: number;
  glow?: boolean;
}> = ({ children, width = 1200, glow = true }) => (
  <div style={{ position: 'relative', width }}>
    <div
      style={{
        width,
        height: width * 0.6,
        borderRadius: 18,
        background: '#000',
        border: '10px solid #1c1c22',
        boxShadow: glow
          ? `0 50px 120px rgba(0,0,0,0.6), 0 0 80px ${saffronGlow(0.2)}`
          : '0 50px 120px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* camera dot */}
      <div
        style={{
          position: 'absolute',
          top: 6,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#333',
          zIndex: 10,
        }}
      />
      {children}
    </div>
    {/* base */}
    <div
      style={{
        width: width * 1.1,
        height: 14,
        margin: '0 auto',
        background: 'linear-gradient(180deg, #2a2a30, #15151d)',
        borderRadius: '0 0 10px 10px',
        marginLeft: -width * 0.05,
        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
      }}
    />
    <div
      style={{
        width: width * 0.2,
        height: 6,
        margin: '0 auto',
        background: '#0d0d12',
        borderRadius: '0 0 8px 8px',
      }}
    />
  </div>
);

// ---------- Kinetic typography (masked reveal) ----------
// Text reveals from an invisible line via clip-path, scales up dynamically,
// or cascades word-by-word. Synced to a beat frame.
export const KineticType: React.FC<{
  text: string;
  size?: number;
  color?: string;
  startFrame?: number;
  variant?: 'mask' | 'scale' | 'cascade';
  weight?: number;
  align?: 'center' | 'left';
  glow?: boolean;
}> = ({
  text,
  size = 96,
  color = WHITE,
  startFrame = 0,
  variant = 'mask',
  weight = 700,
  align = 'center',
  glow = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - startFrame;

  if (variant === 'cascade') {
    const words = text.split(' ');
    return (
      <div
        style={{
          display: 'flex',
          gap: '0.25em',
          flexWrap: 'wrap',
          justifyContent: align === 'center' ? 'center' : 'flex-start',
          fontFamily: FONT_DISPLAY,
          fontSize: size,
          fontWeight: weight,
          color,
          letterSpacing: '-0.03em',
          lineHeight: 1.05,
        }}
      >
        {words.map((w, i) => {
          const ws = startFrame + i * 3;
          const wl = frame - ws;
          const y = spring({
            frame: wl,
            fps,
            config: { damping: 13, stiffness: 120, mass: 0.7 },
            from: 60,
            to: 0,
          });
          const op = interpolate(wl, [0, 6], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                transform: `translateY(${y}px)`,
                opacity: op,
                textShadow: glow ? `0 0 40px ${saffronGlow(0.4)}` : 'none',
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    );
  }

  if (variant === 'scale') {
    const s = spring({
      frame: local,
      fps,
      config: { damping: 14, stiffness: 110, mass: 0.9 },
      from: 0.6,
      to: 1,
    });
    const op = interpolate(local, [0, 8], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return (
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: size,
          fontWeight: weight,
          color,
          letterSpacing: '-0.03em',
          transform: `scale(${s})`,
          opacity: op,
          textShadow: glow ? `0 0 50px ${saffronGlow(0.5)}` : 'none',
          textAlign: align === 'center' ? 'center' : 'left',
        }}
      >
        {text}
      </div>
    );
  }

  // mask: reveal from invisible line (clip-path inset shrinks top->0)
  const reveal = interpolate(local, [0, 14], [100, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const op = interpolate(local, [0, 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div style={{ overflow: 'hidden', opacity: op }}>
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: size,
          fontWeight: weight,
          color,
          letterSpacing: '-0.03em',
          clipPath: `inset(${reveal}% 0 0 0)`,
          transform: `translateY(${reveal * 0.3}px)`,
          textShadow: glow ? `0 0 50px ${saffronGlow(0.5)}` : 'none',
          textAlign: align === 'center' ? 'center' : 'left',
        }}
      >
        {text}
      </div>
    </div>
  );
};

// ---------- Skeleton loader -> content morph ----------
// Gray shimmer bars that morph into real content. The "UI building itself" beat.
export const Skeleton: React.FC<{
  width: number;
  height: number;
  radius?: number;
  shimmer?: boolean;
}> = ({ width, height, radius = 8, shimmer = true }) => {
  const frame = useCurrentFrame();
  const sh = shimmer ? 0.5 + 0.5 * Math.sin(frame * 0.15) : 1;
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: `linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,${0.1 * sh}), rgba(255,255,255,0.04))`,
      }}
    />
  );
};

// ---------- UI toggle switch ----------
export const Toggle: React.FC<{ on: boolean; size?: number; clickFrame?: number }> = ({
  on,
  size = 56,
  clickFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({
    frame: frame - (clickFrame ?? 0),
    fps,
    config: { damping: 12, stiffness: 140 },
    from: on ? 0 : 1,
    to: on ? 1 : 0,
  });
  const knobX = interpolate(t, [0, 1], [size * 0.16, size * 0.6]);
  return (
    <div
      style={{
        width: size,
        height: size * 0.56,
        borderRadius: size * 0.28,
        background: on ? `linear-gradient(90deg, ${SAFFRON}, ${GOLD})` : 'rgba(255,255,255,0.1)',
        position: 'relative',
        boxShadow: on ? `0 0 20px ${saffronGlow(0.5)}` : 'none',
        transition: 'background 0.2s',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: size * 0.08,
          left: knobX,
          width: size * 0.4,
          height: size * 0.4,
          borderRadius: '50%',
          background: WHITE,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  );
};

// ---------- Chart that animates from zero to peak ----------
export const ChartFromZero: React.FC<{
  width: number;
  height: number;
  startFrame?: number;
  color?: string;
  bars?: number;
}> = ({ width, height, startFrame = 0, color = SAFFRON, bars = 7 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const heights = Array.from({ length: bars }).map((_, i) => {
    const peak = 0.3 + (((i * 37) % 70) / 100) * 0.65;
    const s = spring({
      frame: frame - startFrame - i * 3,
      fps,
      config: { damping: 14, stiffness: 100 },
      from: 0,
      to: peak,
    });
    return s;
  });
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: width * 0.02, width, height }}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: h * height,
            borderRadius: '4px 4px 0 0',
            background: `linear-gradient(180deg, ${color}, ${goldGlow(0.6)})`,
            boxShadow: `0 0 16px ${saffronGlow(0.4 * h)}`,
          }}
        />
      ))}
    </div>
  );
};

// ---------- Animated loading bar (fills to 100% then chime) ----------
export const LoadingBar: React.FC<{
  width: number;
  startFrame?: number;
  fillFrames?: number;
  color?: string;
}> = ({ width, startFrame = 0, fillFrames = 24, color = SAFFRON }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - startFrame, [0, fillFrames], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        width,
        height: 10,
        borderRadius: 5,
        background: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${p}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${color}, ${GOLD})`,
          borderRadius: 5,
          boxShadow: `0 0 16px ${saffronGlow(0.6)}`,
        }}
      />
    </div>
  );
};

// ---------- Badge / notification pop ----------
export const Badge: React.FC<{
  label: string;
  color?: string;
  startFrame?: number;
  size?: number;
}> = ({ label, color = SAFFRON, startFrame = 0, size = 22 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 10, stiffness: 140, mass: 0.6 },
    from: 0,
    to: 1,
  });
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 14px',
        borderRadius: 999,
        background: `${color}22`,
        border: `1px solid ${color}`,
        color,
        fontFamily: FONT_BODY,
        fontSize: size,
        fontWeight: 600,
        transform: `scale(${s})`,
        boxShadow: `0 0 20px ${saffronGlow(0.4)}`,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px ${color}`,
        }}
      />
      {label}
    </div>
  );
};
