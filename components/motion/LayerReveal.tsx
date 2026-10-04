'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

const LAYERS = 12;
// Avanza en saltos, como una impresora que sube de capa, no en un fundido continuo.
const stepped = (t: number) => Math.min(1, Math.ceil(t * LAYERS) / LAYERS);

export function LayerReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ clipPath: 'inset(100% 0% 0% 0%)' }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0%)' }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.9, delay, ease: stepped }}
    >
      {children}
    </motion.div>
  );
}
