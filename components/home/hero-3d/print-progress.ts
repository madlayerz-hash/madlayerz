export interface PrintTiming {
  durationMs: number;
  layers: number;
  height: number;
}

/**
 * Altura del plano de corte en cada instante. Sube de a una capa entera, como
 * una impresora real, en vez de deslizarse: el salto es lo que se lee como
 * «imprimiendo».
 */
export function clipHeightAt(elapsedMs: number, { durationMs, layers, height }: PrintTiming): number {
  if (elapsedMs <= 0) return 0;
  // Un poco por encima del tope: con el plano justo en la tapa, la cara superior parpadea.
  if (elapsedMs >= durationMs) return height * 1.02;
  const layer = Math.floor((elapsedMs / durationMs) * layers) + 1;
  return (Math.min(layer, layers) / layers) * height;
}
