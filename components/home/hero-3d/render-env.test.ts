import { shouldRender3d, type RenderEnv } from './render-env';

const desktop: RenderEnv = { reducedMotion: false, webgl: true, coarsePointer: false, cores: 8 };

describe('shouldRender3d', () => {
  it('muestra 3D en un escritorio normal', () => {
    expect(shouldRender3d(desktop)).toBe(true);
  });

  it('respeta reducir movimiento', () => {
    expect(shouldRender3d({ ...desktop, reducedMotion: true })).toBe(false);
  });

  it('cae a imagen sin WebGL', () => {
    expect(shouldRender3d({ ...desktop, webgl: false })).toBe(false);
  });

  it('cae a imagen en un celular de 4 núcleos o menos', () => {
    expect(shouldRender3d({ ...desktop, coarsePointer: true, cores: 4 })).toBe(false);
  });

  it('muestra 3D en un celular potente', () => {
    expect(shouldRender3d({ ...desktop, coarsePointer: true, cores: 8 })).toBe(true);
  });

  it('trata núcleos desconocidos en celular como equipo modesto', () => {
    expect(shouldRender3d({ ...desktop, coarsePointer: true, cores: undefined })).toBe(false);
  });
});
