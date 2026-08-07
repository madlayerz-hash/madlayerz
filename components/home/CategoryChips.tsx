import Link from 'next/link';
import { ScrollReveal } from '@/components/motion/ScrollReveal';

const CATEGORIES = [
  { slug: 'llaveros', name: 'Llaveros' },
  { slug: 'figuras-personajes', name: 'Figuras de Personajes' },
  { slug: 'figuras-decorativas', name: 'Figuras Decorativas' },
  { slug: 'maceteros', name: 'Maceteros' },
  { slug: 'juguetes', name: 'Juguetes' },
];

export function CategoryChips() {
  return (
    <ScrollReveal>
      <section className="flex gap-3 overflow-x-auto px-6 py-6">
        {CATEGORIES.map((category) => (
          <Link
            key={category.slug}
            href={`/catalogo?category=${category.slug}`}
            className="glass-surface whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium"
          >
            {category.name}
          </Link>
        ))}
      </section>
    </ScrollReveal>
  );
}
