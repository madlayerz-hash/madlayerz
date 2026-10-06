import Link from 'next/link';
import { CATEGORIES } from './copy';

export function CategoryTiles() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: 'var(--heading)' }}>
        Categorías
      </h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {CATEGORIES.map((category) => (
          <Link
            key={category.slug}
            href={`/catalogo?category=${category.slug}`}
            className="group flex min-h-[120px] flex-col justify-between rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-[color:var(--accent)]"
          >
            <span className="text-lg font-medium tracking-tight" style={{ color: 'var(--heading)' }}>
              {category.name}
            </span>
            <span aria-hidden="true" className="font-mono text-sm text-muted transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
