import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { SAFFRON, BG, INK, FONT_DISPLAY, FONT_BODY } from '../tokens';

// ACT 6 — Outro (75–80s)
// Fade to brand color. Logo lockup + trust microcopy.
export const OutroAct: React.FC<{ durationFrames: number }> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const t = frame / durationFrames;

  // Cross-fade BG -> SAFFRON
  const bgT = interpolate(t, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' });
  const logoOpacity = interpolate(t, [0.3, 0.6], [0, 1], { extrapolateRight: 'clamp' });
  const trustOpacity = interpolate(t, [0.55, 0.85], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${interpolateColor(BG, SAFFRON, bgT)} 0%, ${interpolateColor('#fff', SAFFRON, bgT)} 100%)`,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 200,
          fontWeight: 700,
          color: bgT > 0.5 ? '#fff' : SAFFRON,
          letterSpacing: '-0.04em',
          opacity: logoOpacity,
        }}
      >
        DARSHYA
      </div>
      <div
        style={{
          marginTop: 24,
          fontFamily: FONT_BODY,
          fontSize: 26,
          color: bgT > 0.5 ? '#fff' : INK,
          opacity: trustOpacity,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}
      >
        20 Verified Temples · 8 Role Portals · Live Today
      </div>
    </AbsoluteFill>
  );
};

function interpolateColor(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bch = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r}, ${g}, ${bch})`;
}

function parseHex(h: string): [number, number, number] {
  const s = h.replace('#', '');
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}
