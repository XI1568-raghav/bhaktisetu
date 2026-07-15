import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, interpolate } from 'remotion';
import { INK, INK_DIM, saffronGlow, FONT_BODY } from '../tokens';

type Props = {
  src: string; // staticFile path to webm, e.g. 'pitch/video/06-darshan-live.webm'
  durationFrames: number;
  trimBefore?: number; // seconds to skip into the clip
  frame?: 'browser' | 'phone' | 'none'; // bezel style
  url?: string; // browser chrome url
  opacity?: number; // for low-opacity context usage
  startMuted?: boolean; // webms are silent anyway; keep true
  vignette?: boolean;
};

// The workhorse for all real product footage. Wraps a WebM screen recording in a
// branded browser/phone bezel (or full-bleed) with a vignette + optional low
// opacity for context use. Uses OffthreadVideo (separate decoder thread,
// frame-accurate, lower memory than <Video>). Replaces FeatureScene's <Img>.
export const ProductClip: React.FC<Props> = ({
  src,
  durationFrames,
  trimBefore = 0,
  frame: frameStyle = 'browser',
  url = 'darshya.online',
  opacity = 1,
  startMuted = true,
  vignette = true,
}) => {
  const f = useCurrentFrame();
  // gentle drift so the screen feels alive, not frozen
  const drift = interpolate(f, [0, durationFrames], [-4, 4], {
    extrapolateRight: 'clamp',
  });

  const video = (
    <OffthreadVideo
      src={staticFile(src)}
      startFrom={Math.round(trimBefore * 25)} // 25fps source webms
      muted={startMuted}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
      }}
    />
  );

  if (frameStyle === 'none') {
    return (
      <AbsoluteFill style={{ opacity, overflow: 'hidden' }}>
        {video}
        {vignette && (
          <AbsoluteFill
            style={{
              background:
                'radial-gradient(60% 60% at 50% 50%, transparent 55%, rgba(0,0,0,0.35) 100%)',
              mixBlendMode: 'multiply',
            }}
          />
        )}
      </AbsoluteFill>
    );
  }

  if (frameStyle === 'phone') {
    // phone bezel — tall, rounded, centered
    return (
      <AbsoluteFill
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          opacity,
        }}
      >
        <div
          style={{
            width: 460,
            height: 980,
            borderRadius: 56,
            overflow: 'hidden',
            background: '#000',
            border: '12px solid #1a1a1a',
            boxShadow: `0 40px 100px rgba(0,0,0,0.55), 0 12px 40px ${saffronGlow(0.2)}`,
            transform: `translateY(${drift}px)`,
            position: 'relative',
          }}
        >
          {/* notch */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 160,
              height: 28,
              background: '#1a1a1a',
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              zIndex: 5,
            }}
          />
          {video}
          {vignette && (
            <AbsoluteFill
              style={{
                background:
                  'radial-gradient(60% 50% at 50% 50%, transparent 60%, rgba(0,0,0,0.3) 100%)',
                mixBlendMode: 'multiply',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      </AbsoluteFill>
    );
  }

  // browser bezel
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
      }}
    >
      <div
        style={{
          width: '78%',
          maxWidth: 1500,
          borderRadius: 16,
          overflow: 'hidden',
          background: '#fff',
          boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 8px 24px ${saffronGlow(0.25)}`,
          transform: `translateY(${drift}px)`,
        }}
      >
        <div
          style={{
            height: 38,
            background: '#ECEAE5',
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            gap: 7,
            borderBottom: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <Dot color="#FF5F57" />
          <Dot color="#FEBC2E" />
          <Dot color="#28C840" />
          <div
            style={{
              flex: 1,
              marginLeft: 10,
              height: 24,
              background: '#fff',
              borderRadius: 6,
              fontSize: 13,
              color: INK_DIM,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="10" width="14" height="10" rx="2" fill={INK_DIM} />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={INK_DIM} strokeWidth="2" />
            </svg>
            {url}
          </div>
        </div>
        <div style={{ position: 'relative', height: 760 }}>{video}</div>
      </div>
      {vignette && (
        <AbsoluteFill
          style={{
            background:
              'radial-gradient(55% 55% at 50% 50%, transparent 60%, rgba(0,0,0,0.3) 100%)',
            mixBlendMode: 'multiply',
            pointerEvents: 'none',
          }}
        />
      )}
    </AbsoluteFill>
  );
};

const Dot: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ width: 11, height: 11, borderRadius: '50%', background: color }} />
);
