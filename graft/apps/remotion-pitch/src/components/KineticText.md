# apps\remotion-pitch\src\components\KineticText.tsx

- Props · type · L4-L12 — type Props = { text: string; // single line or `|` for forced break size?: number; color?: string; weight?: number; startFrame?: number; // delay before first word reveal wordStaggerFrames?: number; // delay between words align?: 'center' | 'left'; };
- KineticText · function · L16-L90 — KineticText: React.FC<Props> = ({ text, size = 84, color = '#fff', weight = 700, startFrame = 0, wordStaggerFrames = 4, align = 'center', })
