import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RelatedProducts } from './RelatedProducts';
import type { Product } from '@/lib/catalog/types';

const products: Product[] = [
  { id: '1', slug: 'a', name: 'Llavero A', description: '', priceClp: 1000, categorySlug: 'llaveros', categoryName: 'Llaveros', imageUrl: '/a.jpg', featured: false },
  { id: '2', slug: 'b', name: 'Llavero B', description: '', priceClp: 1000, categorySlug: 'llaveros', categoryName: 'Llaveros', imageUrl: '/b.jpg', featured: false },
];

describe('RelatedProducts', () => {
  it('renders a heading and each product name', () => {
    render(<RelatedProducts products={products} />);

    expect(screen.getByRole('heading', { name: 'También te puede gustar' })).toBeInTheDocument();
    expect(screen.getByText('Llavero A')).toBeInTheDocument();
    expect(screen.getByText('Llavero B')).toBeInTheDocument();
  });

  it('renders nothing when there are no related products', () => {
    const { container } = render(<RelatedProducts products={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
