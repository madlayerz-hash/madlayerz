'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { readRenderEnv, shouldRender3d } from './render-env';

// Three.js pesa: se baja recién cuando la página ya está pintada, y nunca en el servidor.
const PrintCanvas = dynamic(() => import('./PrintCanvas').then((m) => m.PrintCanvas), {
  ssr: false,
  loading: () => null,
});

const STATIC_SRC = '/products/frasco-texturizado-1.jpg';

export function HeroPiece() {
  const [use3d, setUse3d] = useState(false);
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    setUse3d(shouldRender3d(readRenderEnv()));
  }, []);

  return (
    <div className="absolute inset-0">
      <Image
        src={STATIC_SRC}
        alt="Frasco texturizado impreso en 3D"
        fill
        sizes="(max-width: 768px) 90vw, 520px"
        className={`rounded-3xl object-cover transition-opacity duration-700 ${ready ? 'opacity-0' : 'opacity-100'}`}
      />
      {use3d && <PrintCanvas onReady={markReady} />}
    </div>
  );
}
