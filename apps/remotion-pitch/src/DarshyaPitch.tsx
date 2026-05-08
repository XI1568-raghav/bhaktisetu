import { AbsoluteFill, Audio, Series, staticFile } from 'remotion';
import { HookAct } from './components/HookAct';
import { GapAct } from './components/GapAct';
import { SolutionRevealAct } from './components/SolutionRevealAct';
import { FeatureScene } from './components/FeatureScene';
import { PayoffAct } from './components/PayoffAct';
import { OutroAct } from './components/OutroAct';
import { BG } from './tokens';

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
const sec = (s: number) => Math.round(s * FPS);

// Apple-grade 6-act narrative.
// Total: 80s — VO is 74s, last ~6s lets the outro breathe under sound design.
//
// Act 1 — Hook (0-5)             5s
// Act 2 — Gap / Problem (5-19)   14s
// Act 3 — Solution Reveal (19-31) 12s
// Act 4 — Feature deep-dive (31-67) 36s
// Act 5 — Payoff / CTA (67-75)   8s
// Act 6 — Outro (75-80)          5s
const ACTS = {
  hook: sec(5),
  gap: sec(14),
  solution: sec(12),
  feature: [
    { src: 'pitch/img/04-pujas-grid.png', cap: 'Book any puja. Any deity.', dur: sec(4),
      callout: { x: 1300, y: 380, text: '24/7 booking', side: 'left' as const } },
    { src: 'pitch/img/05-puja-detail.png', cap: 'Sankalp · Video proof · 80G', dur: sec(5),
      callout: { x: 920, y: 460, text: 'Mandatory video proof', side: 'right' as const } },
    { src: 'pitch/img/06-darshan.png', cap: 'Live darshan. Sub-second latency.', dur: sec(5),
      callout: { x: 1100, y: 280, text: 'AWS IVS · LIVE', side: 'right' as const } },
    { src: 'pitch/img/07-panchang.png', cap: 'Daily panchang. Daily habit.', dur: sec(4) },
    { src: 'pitch/img/12-ai-chat-input.png', cap: 'AI panditji · 1500 tok/s on Groq.', dur: sec(5),
      callout: { x: 760, y: 360, text: 'Llama 3 · Hindi + Sanskrit', side: 'right' as const } },
    { src: 'pitch/img/09-gaushala.png', cap: 'Gaushala adoption · 80G receipts.', dur: sec(4) },
    { src: 'pitch/img/11-yatra.png', cap: 'Pilgrimage planning. End-to-end.', dur: sec(4) },
    { src: 'pitch/img/10-store.png', cap: 'Devotional commerce. Built-in.', dur: sec(5) },
  ],
  payoff: sec(8),
  outro: sec(5),
};

export const DURATION_FRAMES =
  ACTS.hook +
  ACTS.gap +
  ACTS.solution +
  ACTS.feature.reduce((a, b) => a + b.dur, 0) +
  ACTS.payoff +
  ACTS.outro;

export const DarshyaPitch: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <Series>
        {/* Act 1 — Hook */}
        <Series.Sequence durationInFrames={ACTS.hook}>
          <HookAct durationFrames={ACTS.hook} />
        </Series.Sequence>

        {/* Act 2 — Gap / Problem */}
        <Series.Sequence durationInFrames={ACTS.gap}>
          <GapAct durationFrames={ACTS.gap} />
        </Series.Sequence>

        {/* Act 3 — Solution Reveal */}
        <Series.Sequence durationInFrames={ACTS.solution}>
          <SolutionRevealAct durationFrames={ACTS.solution} />
        </Series.Sequence>

        {/* Act 4 — Feature deep-dive (8 scenes) */}
        {ACTS.feature.map((f, i) => (
          <Series.Sequence key={i} durationInFrames={f.dur}>
            <FeatureScene
              src={f.src}
              caption={f.cap}
              durationFrames={f.dur}
              zoomFrom={i % 2 === 0 ? 1.04 : 1.10}
              zoomTo={i % 2 === 0 ? 1.12 : 1.04}
              callout={'callout' in f ? f.callout : undefined}
              focusBlur={i % 3 === 0}
            />
          </Series.Sequence>
        ))}

        {/* Act 5 — Payoff */}
        <Series.Sequence durationInFrames={ACTS.payoff}>
          <PayoffAct durationFrames={ACTS.payoff} />
        </Series.Sequence>

        {/* Act 6 — Outro */}
        <Series.Sequence durationInFrames={ACTS.outro}>
          <OutroAct durationFrames={ACTS.outro} />
        </Series.Sequence>
      </Series>

      {/* VO starts ~1s in to let Hook title settle */}
      <Audio src={staticFile('pitch/audio/vo.mp3')} volume={1.0} startFrom={0} />
    </AbsoluteFill>
  );
};
