import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

export function Hero() {
  return (
    <section className="flex flex-col items-center gap-6 px-6 py-16 text-center">
      <div style={{ color: 'var(--heading)' }}>
        <Logo variant="hero" className="h-36 w-36 sm:h-44 sm:w-44" />
      </div>
      <h1 className="text-3xl font-extrabold" style={{ color: 'var(--heading)' }}>
        MadLayerz
      </h1>
      <p className="max-w-md">
        Llaveros, figuras, maceteros y juguetes impresos en 3D con dedicación. Encuentra tu pieza
        favorita o pide una a medida.
      </p>
      <Link
        href="/catalogo"
        className="rounded-full bg-brand px-6 py-3 font-semibold text-white transition-transform hover:scale-105"
      >
        Ver catálogo
      </Link>
    </section>
  );
}
