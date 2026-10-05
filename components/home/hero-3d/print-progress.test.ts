import { clipHeightAt } from './print-progress';

const timing = { durationMs: 2000, layers: 10, height: 3 };

describe('clipHeightAt', () => {
  it('parte vacía', () => {
    expect(clipHeightAt(0, timing)).toBe(0);
    expect(clipHeightAt(-50, timing)).toBe(0);
  });

  it('termina por encima de la pieza para no recortar la tapa', () => {
    expect(clipHeightAt(2000, timing)).toBeGreaterThan(3);
    expect(clipHeightAt(99999, timing)).toBeGreaterThan(3);
  });

  it('avanza en saltos de una capa', () => {
    const layer = timing.height / timing.layers;
    [1, 150, 399, 1000, 1999].forEach((ms) => {
      const y = clipHeightAt(ms, timing);
      expect(Math.abs(y / layer - Math.round(y / layer))).toBeLessThan(1e-9);
    });
  });

  it('nunca baja', () => {
    let previous = 0;
    for (let ms = 0; ms <= 2000; ms += 37) {
      const y = clipHeightAt(ms, timing);
      expect(y).toBeGreaterThanOrEqual(previous);
      previous = y;
    }
  });
});
