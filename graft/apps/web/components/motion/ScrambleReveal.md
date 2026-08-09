# apps\web\components\motion\ScrambleReveal.tsx

- Props · type · L24-L32 — type Props = { children: string; as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span'; className?: string; /** Per-char unlock stagger in ms. Default 35 (Apple-ish). */ stagger?: number; /** Total scramble duration per char before lock, in ms. */ duration?: number; };
- ScrambleReveal · function · L34-L114 — function ScrambleReveal({ children, as: Tag = 'h2', className, stagger = 35, duration = 600, }: Props): JSX.Element
- tick · function · L86-L99 — tick = (): void
