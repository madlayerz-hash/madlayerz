import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/supabase/client', () => ({ createSupabaseClient: () => ({}) }));
vi.mock('@/lib/supabase/queries', () => ({
  fetchProducts: vi.fn().mockResolvedValue([
    { id: '1', slug: 'a', name: 'Llavero de Prueba', description: '', priceClp: 1000, categorySlug: 'llaveros', categoryName: 'Llaveros', imageUrl: '/x.jpg', featured: true },
  ]),
}));

import Page from './page';

describe('Home page', () => {
  it('renders the hero heading and a featured product', async () => {
    const ui = await Page();
    render(ui as React.ReactElement);

    expect(screen.getByRole('heading', { name: 'MadLayerz' })).toBeInTheDocument();
    expect(screen.getByText('Llavero de Prueba')).toBeInTheDocument();
  });
});
