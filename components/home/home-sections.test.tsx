import { render, screen } from '@testing-library/react';
import { FeaturedBento } from './FeaturedBento';
import { CategoryTiles } from './CategoryTiles';
import { Marquee } from './Marquee';
import { Hero } from './Hero';
import { CATEGORIES } from './copy';
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

const product = (id: string, featured: boolean): Product => ({
  id,
  slug: `p-${id}`,
  name: `Pieza ${id}`,
  description: '',
  priceClp: 1000,
  categorySlug: 'juguetes',
  categoryName: 'Juguetes',
  imageUrl: '/products/x.jpg',
  featured,
});

describe('home', () => {
  it('no muestra destacados si no hay', () => {
    const { container } = render(<FeaturedBento products={[product('1', false)]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra sólo los destacados', () => {
    render(<FeaturedBento products={[product('1', true), product('2', false), product('3', true)]} />);
    expect(screen.getByText('Pieza 1')).toBeInTheDocument();
    expect(screen.getByText('Pieza 3')).toBeInTheDocument();
    expect(screen.queryByText('Pieza 2')).toBeNull();
  });

  it('enlaza cada categoría al catálogo filtrado', () => {
    render(<CategoryTiles />);
    CATEGORIES.forEach((category) => {
      expect(screen.getByRole('link', { name: new RegExp(category.name, 'i') })).toHaveAttribute(
        'href',
        `/catalogo?category=${category.slug}`
      );
    });
  });

  it('oculta la copia duplicada de la cinta a lectores de pantalla', () => {
    const { container } = render(<Marquee />);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
  });

  it('el hero tiene un único h1 y los dos llamados', () => {
    render(<Hero />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('link', { name: /ver catálogo/i })).toHaveAttribute('href', '/catalogo');
    expect(screen.getByRole('link', { name: /^cotizar$/i })).toHaveAttribute('href', '/cotizacion');
  });
});
