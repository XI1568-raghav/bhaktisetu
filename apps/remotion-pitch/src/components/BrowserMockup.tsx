import { Img, staticFile, useCurrentFrame, interpolate } from 'remotion';
import { INK, INK_DIM, saffronGlow } from '../tokens';

type Props = {
  src: string;
  url?: string;
  width?: number; // 1920 default; downscale for "device on background"
  glow?: boolean;
  durationFrames: number;
};

// Browser chrome wrapper for "device mockup on glowing background" payoff shots.
// Subtle drift + glow pulse over the scene.
export const BrowserMockup: React.FC<Props> = ({
  src,
  url = 'darshya.online',
  width = 1500,
  glow = true,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const t = frame / durationFrames;
  const drift = interpolate(t, [0, 1], [-6, 6]);
  const glowOpacity = glow ? 0.45 + Math.sin(t * Math.PI) * 0.2 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* glow halo */}
      {glow && (
        <div
          style={{
            position: 'absolute',
            width: width + 320,
            height: (width / 1920) * 1080 + 320,
            background: `radial-gradient(50% 50% at 50% 50%, ${saffronGlow(
              0.55,
            )} 0%, ${saffronGlow(0)} 70%)`,
            opacity: glowOpacity,
            filter: 'blur(40px)',
          }}
        />
      )}
      <div
        style={{
          width,
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: `0 30px 80px rgba(0,0,0,0.45), 0 8px 24px ${saffronGlow(0.25)}`,
          background: '#fff',
          transform: `translateY(${drift}px)`,
        }}
      >
        {/* chrome bar */}
        <div
          style={{
            height: 40,
            background: '#ECEAE5',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: 8,
            borderBottom: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <div style={dot('#FF5F57')} />
          <div style={dot('#FEBC2E')} />
          <div style={dot('#28C840')} />
          <div
            style={{
              flex: 1,
              marginLeft: 12,
              height: 26,
              background: '#fff',
              borderRadius: 6,
              fontSize: 14,
              color: INK_DIM,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <rect x="5" y="10" width="14" height="10" rx="2" fill={INK_DIM} />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={INK_DIM} strokeWidth="2" fill="none" />
            </svg>
            {url}
          </div>
        </div>
        <Img src={staticFile(src)} style={{ width: '100%', display: 'block' }} />
      </div>
    </div>
  );
};

const dot = (c: string): React.CSSProperties => ({
  width: 13,
  height: 13,
  borderRadius: '50%',
  background: c,
});
