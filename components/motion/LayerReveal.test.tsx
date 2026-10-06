import { render, screen } from '@testing-library/react';
import { useReducedMotion } from 'framer-motion';
import { LayerReveal, REVEAL_VIEWPORT } from './LayerReveal';

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: vi.fn(() => false) };
});

beforeAll(() => {
  // jsdom no trae IntersectionObserver y framer-motion lo usa para whileInView.
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

describe('LayerReveal', () => {
  it('renderiza su contenido', () => {
    render(
      <LayerReveal className="x">
        <p>Hola capa</p>
      </LayerReveal>
    );
    expect(screen.getByText('Hola capa')).toBeInTheDocument();
  });

  it('parte oculto con clip-path cuando hay movimiento', () => {
    render(
      <LayerReveal className="x">
        <p>Oculto</p>
      </LayerReveal>
    );
    expect(screen.getByText('Oculto').parentElement?.style.clipPath).toContain('inset(100%');
  });

  it('con «reducir movimiento» se muestra sin clip-path', () => {
    vi.mocked(useReducedMotion).mockReturnValueOnce(true);
    render(
      <LayerReveal className="x">
        <p>Quieto</p>
      </LayerReveal>
    );
    const wrapper = screen.getByText('Quieto').parentElement;
    expect(wrapper?.className).toContain('x');
    expect(wrapper?.style.clipPath).toBe('');
  });

  it('se revela apenas entra al viewport (umbral 0)', () => {
    // Chrome mide la intersección con el clip-path del propio elemento: con un
    // umbral mayor que 0 el revelado nunca se disparaba.
    expect(REVEAL_VIEWPORT.amount).toBe(0);
  });
});
