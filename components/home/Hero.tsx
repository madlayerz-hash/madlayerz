'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="flex flex-col items-center gap-6 px-6 py-16 text-center">
      <motion.svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        initial="hidden"
        animate="visible"
      >
        <motion.rect
          x="20" y="100" width="80" height="6" rx="3" fill="var(--accent)"
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6 }}
        />
        <motion.path
          d="M30 90 L30 40 L60 20 L90 40 L90 90"
          stroke="var(--accent)"
          strokeWidth="4"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        />
      </motion.svg>
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
