import en from './i18n/en.json';

type Messages = typeof en;
type Namespace = keyof Messages;

type Translator<N extends Namespace> = ((key: keyof Messages[N]) => string) & {
  raw: (key: keyof Messages[N]) => unknown;
};

function build<N extends Namespace>(ns: N): Translator<N> {
  const dict = en[ns] as Record<string, string>;
  const fn = ((key: keyof Messages[N]) => {
    const v = dict[key as string];
    return typeof v === 'string' ? v : (key as string);
  }) as Translator<N>;
  fn.raw = (key) => dict[key as string];
  return fn;
}

export function getTranslations<N extends Namespace>(ns: N): Promise<Translator<N>> {
  return Promise.resolve(build(ns));
}

export function useTranslations<N extends Namespace>(ns: N): Translator<N> {
  return build(ns);
}

export function t<N extends Namespace>(ns: N): Translator<N> {
  return build(ns);
}
