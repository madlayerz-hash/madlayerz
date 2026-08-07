'use client';

import Link from 'next/link';
import { useCartStore } from '@/lib/cart/cart-store';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const openDrawer = useCartStore((state) => state.openDrawer);
  const itemCount = useCartStore((state) => state.items.reduce((sum, i) => sum + i.quantity, 0));

  return (
    <header className="glass-surface sticky top-0 z-40 flex items-center justify-between px-6 py-4">
      <Link href="/" className="text-xl font-extrabold" style={{ color: 'var(--heading)' }}>
        MadLayerz
      </Link>
      <nav className="flex items-center gap-4">
        <Link href="/catalogo">Catálogo</Link>
        <Link href="/cotizacion">Cotización</Link>
        <ThemeToggle />
        <button aria-label="Carrito" onClick={openDrawer} className="relative">
          🛒
          {itemCount > 0 && (
            <span className="absolute -right-2 -top-2 rounded-full bg-brand px-1.5 text-xs text-white">
              {itemCount}
            </span>
          )}
        </button>
      </nav>
    </header>
  );
}
