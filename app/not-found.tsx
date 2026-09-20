import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-20 text-center">
      <p className="text-5xl font-extrabold" style={{ color: 'var(--accent)' }}>
        404
      </p>
      <h1 className="text-2xl font-bold" style={{ color: 'var(--heading)' }}>
        No encontramos esta página
      </h1>
      <p className="opacity-80">
        Puede que el producto ya no esté disponible o que el enlace esté mal escrito.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Link href="/catalogo" className="rounded-full bg-brand px-6 py-3 font-semibold text-white">
          Ver catálogo
        </Link>
        <Link href="/cotizacion" className="rounded-full border border-current px-6 py-3 font-semibold">
          Pedir cotización
        </Link>
      </div>
    </main>
  );
}
