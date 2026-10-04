import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCard } from './ProductCard';
import { useCartStore } from '@/lib/cart/cart-store';
import type { Product } from '@/lib/catalog/types';

beforeAll(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

const base: Product = {
  id: 'p1',
  slug: 'ocarina',
  name: 'Ocarina de 6 Agujeros',
  description: '',
  priceClp: 9900,
  categorySlug: 'juguetes',
  categoryName: 'Juguetes',
  imageUrl: '/products/ocarina-1.jpg',
  featured: true,
};

describe('ProductCard', () => {
  beforeEach(() => useCartStore.setState({ items: [] }));

  it('agrega al carrito un producto sin colores', async () => {
    render(<ProductCard product={base} />);
    await userEvent.click(screen.getByRole('button', { name: /agregar al carrito/i }));
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('manda a la ficha cuando hay colores', () => {
    render(<ProductCard product={{ ...base, variants: [{ name: 'Verde', colorHex: '#0f0' }] }} />);
    expect(screen.getByRole('link', { name: /elegir color/i })).toHaveAttribute('href', '/producto/ocarina');
    expect(screen.queryByRole('button', { name: /agregar al carrito/i })).toBeNull();
  });

  it('muestra el precio en pesos', () => {
    render(<ProductCard product={base} />);
    expect(screen.getByText(/9\.900/)).toBeInTheDocument();
  });
});
