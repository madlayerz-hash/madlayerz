import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/require-admin';

const TABS = [
  { href: '/admin/productos', label: 'Productos' },
  { href: '/admin/categorias', label: 'Categorías' },
  { href: '/admin/pedidos', label: 'Pedidos' },
  { href: '/admin/cotizaciones', label: 'Cotizaciones' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <nav className="glass-surface mb-6 flex flex-wrap gap-2 rounded-2xl p-2 text-sm font-semibold">
        {TABS.map((tab) => (
          <Link key={tab.href} href={tab.href} className="rounded-full px-4 py-2 hover:bg-brand/10">
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
