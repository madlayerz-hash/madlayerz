import { LayerReveal } from '@/components/motion/LayerReveal';
import { PROCESS_STEPS } from './copy';

export function ProcessSteps() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: 'var(--heading)' }}>
        De un archivo a una pieza en tus manos.
      </h2>
      <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PROCESS_STEPS.map((step, index) => (
          <li key={step.title}>
            <LayerReveal delay={index * 0.15} className="h-full rounded-2xl border border-line bg-surface p-6">
              <p className="font-mono text-sm text-accent-text">{String(index + 1).padStart(2, '0')}</p>
              <h3 className="mt-6 text-lg font-medium" style={{ color: 'var(--heading)' }}>
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-muted">{step.body}</p>
            </LayerReveal>
          </li>
        ))}
      </ol>
    </section>
  );
}
