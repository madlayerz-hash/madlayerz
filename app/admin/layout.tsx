import { requireAdmin } from '@/lib/auth/require-admin';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <nav className="mb-6 flex gap-4 text-sm font-semibold">
        <a href="/admin/productos">Productos</a>
        <a href="/admin/categorias">Categorías</a>
        <a href="/admin/pedidos">Pedidos</a>
      </nav>
      {children}
    </div>
  );
}
