# apps\remotion-pitch\src\components\KineticChar.tsx

- Props · type · L4-L13 — type Props = { text: string; // single line; `|` forces a line break size?: number; color?: string; weight?: number; startFrame?: number; // delay before first char reveal charStaggerFrames?: number; // delay between chars (1-2 for fast, 3-4 slower) align?: 'center' | 'left'; lineHeight?: number; };
- KineticChar · function · L19-L106 — KineticChar: React.FC<Props> = ({ text, size = 84, color = '#fff', weight = 700, startFrame = 0, charStaggerFrames = 2, align = 'center', lineHeight = 1.05, })
