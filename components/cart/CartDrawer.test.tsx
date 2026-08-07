import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCartStore } from '@/lib/cart/cart-store';
import { Header } from '@/components/layout/Header';
import { CartDrawer } from '@/components/cart/CartDrawer';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('CartDrawer', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  it('opens when the cart icon in the header is clicked, and shows items', async () => {
    const user = userEvent.setup();
    useCartStore.getState().addItem({
      productId: '1',
      slug: 'llavero-baby',
      name: 'Llavero Baby Yoda',
      unitPriceClp: 3990,
      imageUrl: '/img/1.jpg',
    });

    render(
      <>
        <Header />
        <CartDrawer />
      </>
    );

    await user.click(screen.getByRole('button', { name: /carrito/i }));

    expect(screen.getByText('Llavero Baby Yoda')).toBeInTheDocument();
  });
});
