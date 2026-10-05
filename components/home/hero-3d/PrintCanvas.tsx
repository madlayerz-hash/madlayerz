'use client';

import { useEffect, useRef } from 'react';
import { createPrintScene, type SceneHandle } from './scene';

export function PrintCanvas({ onReady }: { onReady: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    let handle: SceneHandle | null = null;
    try {
      handle = createPrintScene(canvas, { onFirstFrame: onReady });
    } catch {
      // Si WebGL falla al crear el contexto, queda la foto: no hay nada que avisar.
      return;
    }
    return () => handle?.dispose();
  }, [onReady]);

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
