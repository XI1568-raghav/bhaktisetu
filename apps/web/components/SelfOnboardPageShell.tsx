import { ReactNode } from 'react';

interface SelfOnboardPageShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  benefits: { title: string; body: string }[];
  formCard: ReactNode;
}

export default function SelfOnboardPageShell(props: SelfOnboardPageShellProps) {
  return (
    <div
      className="min-h-[calc(100vh-3.5rem)]"
      style={{ background: 'var(--color-bg, #f5f3ef)' }}
    >
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8 text-center">
        <p
          className="text-xs font-medium uppercase tracking-widest mb-3"
          style={{ color: 'var(--color-primary, #ea580c)' }}
        >
          {props.eyebrow}
        </p>
        <h1
          className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight leading-[1.15] max-w-3xl mx-auto"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text, #1f1b18)' }}
        >
          {props.title}
        </h1>
        <p
          className="mt-4 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto"
          style={{ color: 'var(--color-text-muted, #6b6258)' }}
        >
          {props.subtitle}
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {props.benefits.map((b) => (
            <div
              key={b.title}
              className="rounded-xl p-4"
              style={{
                background: 'var(--color-surface, #fff)',
                border: '1px solid var(--color-border, #e7dfd2)',
              }}
            >
              <p
                className="text-sm font-semibold mb-1"
                style={{ color: 'var(--color-text, #1f1b18)' }}
              >
                {b.title}
              </p>
              <p
                className="text-xs leading-relaxed"
                style={{ color: 'var(--color-text-muted, #6b6258)' }}
              >
                {b.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{
            background: 'var(--color-surface, #fff)',
            border: '1px solid var(--color-border, #e7dfd2)',
            boxShadow: '0 6px 24px rgba(0,0,0,0.04)',
          }}
        >
          {props.formCard}
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div
          className="rounded-xl p-5"
          style={{
            background: 'var(--color-surface, #fff)',
            border: '1px solid var(--color-border, #e7dfd2)',
          }}
        >
          <p
            className="text-sm font-semibold mb-2"
            style={{ color: 'var(--color-text, #1f1b18)' }}
          >
            What happens next
          </p>
          <ol
            className="text-xs space-y-1.5 list-decimal list-inside"
            style={{ color: 'var(--color-text-muted, #6b6258)' }}
          >
            <li>Our partnerships team reviews your application within 48 hours.</li>
            <li>If we are a good fit, we email you a short verification call link.</li>
            <li>Once verified, your profile goes live on Darshya and you start receiving devotees.</li>
          </ol>
        </div>
      </section>
    </div>
  );
}
