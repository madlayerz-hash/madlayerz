'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCartStore } from '@/lib/cart/cart-store';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-client';
import type { Role } from '@/lib/auth/types';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const openDrawer = useCartStore((state) => state.openDrawer);
  const itemCount = useCartStore((state) => state.items.reduce((sum, i) => sum + i.quantity, 0));
  const [role, setRole] = useState<Role | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const client = createBrowserSupabaseClient();

    async function loadSession() {
      try {
        const { data } = await client.auth.getSession();
        const user = data.session?.user;
        setLoggedIn(!!user);

        if (user) {
          const { data: profile } = await client.from('profiles').select('id, email, role').eq('id', user.id).single();
          setRole((profile?.role as Role) ?? null);
        } else {
          setRole(null);
        }
      } catch {
        setLoggedIn(false);
        setRole(null);
      }
    }

    loadSession();

    const { data: subscription } = client.auth.onAuthStateChange(() => loadSession());
    return () => subscription.subscription.unsubscribe();
  }, []);

  return (
    <header className="glass-surface sticky top-0 z-40 flex items-center justify-between px-6 py-4">
      <Link href="/" className="text-xl font-extrabold" style={{ color: 'var(--heading)' }}>
        MadLayerz
      </Link>
      <nav className="flex items-center gap-4">
        <Link href="/catalogo">Catálogo</Link>
        <Link href="/cotizacion">Cotización</Link>
        {role === 'admin' && <Link href="/admin/productos">Panel Admin</Link>}
        {loggedIn ? (
          <Link href="/cuenta">Mi cuenta</Link>
        ) : (
          <>
            <Link href="/cuenta/login">Iniciar sesión</Link>
            <Link href="/cuenta/registro">Crear cuenta</Link>
          </>
        )}
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
