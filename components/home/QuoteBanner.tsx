import Link from 'next/link';
import { ScrollReveal } from '@/components/motion/ScrollReveal';

export function QuoteBanner() {
  return (
    <ScrollReveal>
      <section className="glass-card mx-6 my-12 flex flex-col items-center gap-4 p-8 text-center">
        <h2 className="text-xl font-bold" style={{ color: 'var(--heading)' }}>
          ¿Tienes una idea personalizada?
        </h2>
        <p>Cuéntanos qué necesitas y te enviamos una cotización a medida.</p>
        <Link
          href="/cotizacion"
          className="rounded-full bg-brand px-6 py-3 font-semibold text-white transition-transform hover:scale-105"
        >
          Pedir cotización
        </Link>
      </section>
    </ScrollReveal>
  );
}
