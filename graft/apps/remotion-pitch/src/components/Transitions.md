# apps\remotion-pitch\src\components\Transitions.tsx

- ZoomThroughOut · function · L21-L40 — ZoomThroughOut: React.FC<{ children: React.ReactNode; durFrames: number; fx?: number; fy?: number; }> = ({ children, durFrames, fx = 0.5, fy = 0.5 })
- ZoomThroughIn · function · L43-L62 — ZoomThroughIn: React.FC<{ children: React.ReactNode; durFrames: number; fx?: number; fy?: number; }> = ({ children, durFrames, fx = 0.5, fy = 0.5 })
- WhipPan · function · L66-L91 — WhipPan: React.FC<{ durFrames: number; dir?: 1 | -1 }> = ({ durFrames, dir = -1 })
- Shatter · function · L95-L147 — Shatter: React.FC<{ children: React.ReactNode; durFrames: number; shards?: number; }> = ({ children, durFrames, shards = 12 })
- CircleReveal · function · L152-L167 — CircleReveal: React.FC<{ children: React.ReactNode; durFrames: number; cx?: number; cy?: number; }> = ({ children, durFrames, cx = 0.5, cy = 0.5 })
- TransitionKind · type · L171-L171 — type TransitionKind = 'zoom-in' | 'zoom-out' | 'whip' | 'circle' | 'none';
- Scene · function · L172-L249 — Scene: React.FC<{ children: React.ReactNode; durationFrames: number; enter?: TransitionKind; exit?: TransitionKind; enterDur?: number; exitDur?: number; fx?: number; fy?: number; }> = ({ children, durationFrames, enter = 'none', exit = 'none', enterDur = 12, exitDur = 12, fx = 0.5, fy = 0.5, })
