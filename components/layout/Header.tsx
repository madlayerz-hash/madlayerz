'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCartStore } from '@/lib/cart/cart-store';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-client';
import type { Role } from '@/lib/auth/types';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from '@/components/brand/Logo';

// Íconos de trazo propio en vez de emoji: el emoji sale con los colores del sistema
// operativo (gris en Windows, a todo color en iOS) y no sigue el tema ni el acento.
const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function Header() {
  const openDrawer = useCartStore((state) => state.openDrawer);
  const itemCount = useCartStore((state) => state.items.reduce((sum, i) => sum + i.quantity, 0));
  const [role, setRole] = useState<Role | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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

  // En el menú del celular cada enlace necesita 44 px de alto para tocarlo con el dedo.
  const linkClass = 'py-3 text-sm text-muted transition-colors hover:text-[color:var(--heading)] md:py-0';
  // Tapping a link on a phone must also dismiss the panel it was tapped in.
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="ml-header sticky top-0 z-40 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6 sm:py-4">
      <Link
        href="/"
        className="ml-brand flex items-center gap-2 text-lg font-semibold tracking-tight"
        style={{ color: 'var(--heading)' }}
      >
        <Logo variant="mark" className="h-8 w-8 shrink-0" />
        MadLayerz
      </Link>

      <div className="flex items-center gap-2 md:order-last">
        <ThemeToggle />

        <button
          aria-label={`Carrito${itemCount > 0 ? ` (${itemCount} artículos)` : ''}`}
          onClick={openDrawer}
          className="relative flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:text-[color:var(--heading)]"
        >
          <svg {...iconProps}>
            <path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2" />
            <circle cx="9.5" cy="19" r="1.25" />
            <circle cx="17" cy="19" r="1.25" />
          </svg>
          {mounted && itemCount > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-accent px-1.5 font-mono text-xs font-semibold text-on-accent">
              {itemCount}
            </span>
          )}
        </button>

        {/* The nav used to be a single non-wrapping row: on a phone it pushed
            the whole page into horizontal scroll. Below md it collapses here. */}
        <button
          type="button"
          aria-label="Menú"
          aria-expanded={menuOpen}
          aria-controls="menu-principal"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-11 w-11 items-center justify-center rounded-full md:hidden"
        >
          {menuOpen ? (
            <svg {...iconProps}>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg {...iconProps}>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      <nav
        id="menu-principal"
        className={`${
          menuOpen ? 'flex' : 'hidden'
        } order-last w-full flex-col items-start gap-1 pb-2 md:order-none md:flex md:w-auto md:flex-row md:items-center md:gap-4 md:pb-0`}
      >
        <Link href="/catalogo" className={linkClass} onClick={closeMenu}>
          Catálogo
        </Link>
        <Link href="/cotizacion" className={linkClass} onClick={closeMenu}>
          Cotización
        </Link>
        {role === 'admin' && (
          <Link href="/admin/productos" className={linkClass} onClick={closeMenu}>
            Panel Admin
          </Link>
        )}
        {loggedIn ? (
          <>
            <Link href="/cuenta" className={linkClass} onClick={closeMenu}>
              Mi cuenta
            </Link>
            <button
              onClick={async () => {
                const client = createBrowserSupabaseClient();
                await client.auth.signOut();
                window.location.href = '/';
              }}
              className={`${linkClass} text-left`}
            >
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <Link href="/cuenta/login" className={linkClass} onClick={closeMenu}>
              Iniciar sesión
            </Link>
            <Link href="/cuenta/registro" className={linkClass} onClick={closeMenu}>
              Crear cuenta
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
