'use client';

import { useId } from 'react';
import { LOGO_NOZZLE, LOGO_OBJECT, LOGO_TIP, LOGO_VIEWBOX } from './logo-paths';

/**
 * - `hero`: al cargar, el cabezal baja, la pieza se imprime capa por capa de
 *   abajo hacia arriba y la punta se ilumina; después queda un ciclo suave en el
 *   que la boquilla "extruye" y una franja de luz recorre las capas.
 * - `mark`: estático; al pasar el mouse sobre el enlace `.ml-brand` que lo
 *   contiene, se vuelve a imprimir.
 * - `static`: sin animación.
 *
 * Todo el movimiento vive en globals.css y se apaga con prefers-reduced-motion.
 */
export type LogoVariant = 'hero' | 'mark' | 'static';

export function Logo({
  variant = 'static',
  className = '',
  title,
}: {
  variant?: LogoVariant;
  className?: string;
  /** Si se pasa, el logo se anuncia como imagen; si no, es decorativo. */
  title?: string;
}) {
  // Los ids de los clipPath tienen que ser únicos: el logo aparece dos veces en
  // la home (header y hero). Se quitan los ":" que genera useId para que la
  // referencia url(#...) no dependa de cómo cada navegador los escape.
  const uid = useId().replace(/:/g, '');
  const printId = `ml-print-${uid}`;
  const scanId = `ml-scan-${uid}`;

  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
      className={`ml-logo ml-logo--${variant} ${className}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        {/* Se desplaza hacia arriba en 9 saltos de ~55 unidades: exactamente la
            separación entre capas del dibujo, así cada salto "imprime" una. */}
        <clipPath id={printId}>
          <rect className="ml-logo__print" x="200" y="400" width="624" height="500" />
        </clipPath>
        {/* Franja de una capa de alto que sube recorriendo la pieza. */}
        <clipPath id={scanId}>
          <rect className="ml-logo__scan" x="200" y="885" width="624" height="46" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${printId})`}>
        <path className="ml-logo__object" d={LOGO_OBJECT} fillRule="evenodd" />
      </g>

      {variant === 'hero' && (
        <path className="ml-logo__glow" d={LOGO_OBJECT} fillRule="evenodd" clipPath={`url(#${scanId})`} />
      )}

      <g className="ml-logo__head">
        <path d={LOGO_NOZZLE} fillRule="evenodd" />
        <path className="ml-logo__tip" d={LOGO_TIP} />
      </g>
    </svg>
  );
}
