'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

const LAYERS = 12;
// Avanza en saltos, como una impresora que sube de capa, no en un fundido continuo.
const stepped = (t: number) => Math.min(1, Math.ceil(t * LAYERS) / LAYERS);

/**
 * Chrome descuenta el clip-path del propio elemento al medir la intersección: con
 * `inset(100%)` la proporción visible es siempre 0, así que un umbral como 0.25
 * nunca se cruzaba y el contenido quedaba oculto para siempre. Con umbral 0 basta
 * con que entre al viewport; el margen negativo retrasa el revelado hasta que el
 * bloque ya subió un poco en pantalla.
 */
export const REVEAL_VIEWPORT = { once: true, amount: 0, margin: '0px 0px -10% 0px' } as const;

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
  // La clase la usa globals.css para anular el clip-path con «reducir movimiento»
  // incluso en el HTML del servidor, que no sabe la preferencia de la persona.
  const classes = className ? `ml-layer-reveal ${className}` : 'ml-layer-reveal';

  // Con «reducir movimiento» el contenido tiene que estar ahí desde el principio,
  // no esperar a una animación que la persona pidió no ver.
  if (reduce) return <div className={classes}>{children}</div>;

  return (
    <motion.div
      className={classes}
      initial={{ clipPath: 'inset(100% 0% 0% 0%)' }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0%)' }}
      viewport={REVEAL_VIEWPORT}
      transition={{ duration: 0.9, delay, ease: stepped }}
    >
      {children}
    </motion.div>
  );
}
