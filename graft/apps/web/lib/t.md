# apps\web\lib\t.ts

- Messages · type · L3-L3 — type Messages = typeof en;
- Namespace · type · L4-L4 — type Namespace = keyof Messages;
- Translator · type · L6-L8 — type Translator<N extends Namespace> = ((key: keyof Messages[N]) => string) & { raw: (key: keyof Messages[N]) => unknown; };
- build · function · L10-L18 — function build<N extends Namespace>(ns: N): Translator<N>
- getTranslations · function · L20-L22 — function getTranslations<N extends Namespace>(ns: N): Promise<Translator<N>>
- useTranslations · function · L24-L26 — function useTranslations<N extends Namespace>(ns: N): Translator<N>
- t · function · L28-L30 — function t<N extends Namespace>(ns: N): Translator<N>
