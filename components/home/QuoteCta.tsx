import Link from 'next/link';
import { LayerReveal } from '@/components/motion/LayerReveal';

export function QuoteCta() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <LayerReveal className="rounded-3xl border border-[color:var(--accent)] bg-surface p-10 sm:p-16">
        <h2 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl" style={{ color: 'var(--heading)' }}>
          ¿Tienes una idea? Te la imprimimos.
        </h2>
        <p className="mt-4 max-w-lg text-muted">Cuéntanos qué necesitas y te enviamos una cotización a medida.</p>
        <Link
          href="/cotizacion"
          className="mt-8 inline-block rounded-full bg-accent px-6 py-3 font-medium text-on-accent transition-transform active:scale-[0.98]"
        >
          Pedir cotización
        </Link>
      </LayerReveal>
    </section>
  );
}
