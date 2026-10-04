import { render, screen } from '@testing-library/react';
import { LayerReveal } from './LayerReveal';

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
});
