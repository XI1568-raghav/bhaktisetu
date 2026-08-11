# apps\remotion-pitch\src\components\AnimatedCursor.tsx

- Waypoint · type · L4-L4 — type Waypoint = { x: number; y: number; atFrame: number; click?: boolean };
- Props · type · L6-L9 — type Props = { waypoints: Waypoint[]; // cursor moves between these; x/y in px from top-left startFrame?: number; };
- AnimatedCursor · function · L14-L107 — AnimatedCursor: React.FC<Props> = ({ waypoints, startFrame = 0 })
