export interface RenderEnv {
  reducedMotion: boolean;
  webgl: boolean;
  coarsePointer: boolean;
  cores: number | undefined;
}

/**
 * La pieza 3D es decoración: si hay cualquier duda sobre el equipo, se muestra
 * la foto. Un celular modesto calentándose en la home vende menos que una foto.
 */
export function shouldRender3d(env: RenderEnv): boolean {
  if (env.reducedMotion || !env.webgl) return false;
  if (env.coarsePointer && (env.cores ?? 0) <= 4) return false;
  return true;
}

export function readRenderEnv(): RenderEnv {
  const matches = (query: string) =>
    typeof window.matchMedia === 'function' && window.matchMedia(query).matches;

  let webgl = false;
  try {
    const canvas = document.createElement('canvas');
    webgl = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    webgl = false;
  }

  return {
    reducedMotion: matches('(prefers-reduced-motion: reduce)'),
    webgl,
    coarsePointer: matches('(pointer: coarse)'),
    cores: typeof navigator === 'undefined' ? undefined : navigator.hardwareConcurrency,
  };
}
