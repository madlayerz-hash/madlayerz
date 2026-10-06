import Link from 'next/link';
import type { ReactNode } from 'react';

export function Hero({ art }: { art?: ReactNode }) {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-12 md:grid-cols-[1.1fr_1fr] md:pt-24">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">Taller de impresión 3D · Chile</p>
        {/* Los tamaños están medidos para que «Piezas que nacen» entre en una línea en
            cada ancho de columna: el título va en dos líneas, no en tres. */}
        <h1
          className="mt-5 text-[min(2.5rem,10.5vw)] font-semibold leading-[0.95] tracking-tight sm:text-6xl md:text-[2.625rem] lg:text-[3.625rem] xl:text-[4.125rem]"
          style={{ color: 'var(--heading)' }}
        >
          <span className="block">Piezas que nacen</span>{' '}
          <span className="block text-accent-text">capa por capa.</span>
        </h1>
        <p className="mt-6 max-w-md text-lg text-muted">
          Llaveros, figuras, maceteros y juguetes impresos en 3D. Elige una pieza del catálogo o pide una a medida.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/catalogo"
            className="rounded-full bg-accent px-6 py-3 font-medium text-on-accent transition-transform active:scale-[0.98]"
          >
            Ver catálogo
          </Link>
          <Link
            href="/cotizacion"
            className="rounded-full border border-line px-6 py-3 font-medium transition-colors hover:border-[color:var(--accent)]"
          >
            Cotizar
          </Link>
        </div>
      </div>
      <div className="relative aspect-square w-full max-w-[520px] justify-self-center">{art}</div>
    </section>
  );
}
