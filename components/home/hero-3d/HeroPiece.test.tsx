import { render, screen } from '@testing-library/react';
import { HeroPiece } from './HeroPiece';

vi.mock('./render-env', () => ({
  readRenderEnv: () => ({ reducedMotion: true, webgl: false, coarsePointer: false, cores: 8 }),
  shouldRender3d: () => false,
}));

describe('HeroPiece', () => {
  it('muestra la foto y no monta el canvas cuando no corresponde 3D', () => {
    const { container } = render(<HeroPiece />);
    expect(screen.getByRole('img', { name: /frasco texturizado/i })).toBeInTheDocument();
    expect(container.querySelector('canvas')).toBeNull();
  });
});
