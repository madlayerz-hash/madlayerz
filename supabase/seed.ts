import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const client = createClient(url, serviceKey);

const categories = [
  { slug: 'llaveros', name: 'Llaveros' },
  { slug: 'figuras-personajes', name: 'Figuras de Personajes' },
  { slug: 'figuras-decorativas', name: 'Figuras Decorativas' },
  { slug: 'maceteros', name: 'Maceteros' },
  { slug: 'juguetes', name: 'Juguetes' },
];

const products = [
  { slug: 'llavero-baby-yoda', name: 'Llavero Baby Yoda', description: 'Llavero divertido inspirado en el personaje favorito de todos.', price_clp: 3990, category: 'llaveros', image_url: '/products/llavero-baby-yoda.jpg', featured: true },
  { slug: 'llavero-mario', name: 'Llavero Mario Bros', description: 'Llavero clásico del fontanero más famoso.', price_clp: 3990, category: 'llaveros', image_url: '/products/llavero-mario.jpg', featured: false },
  { slug: 'llavero-pokebola', name: 'Llavero Pokébola', description: 'Llavero con diseño de Pokébola, dos colores.', price_clp: 3490, category: 'llaveros', image_url: '/products/llavero-pokebola.jpg', featured: false },
  { slug: 'figura-goku', name: 'Figura Goku SSJ', description: 'Figura articulada de Goku en modo Super Saiyajin.', price_clp: 15990, category: 'figuras-personajes', image_url: '/products/figura-goku.jpg', featured: true },
  { slug: 'figura-mando', name: 'Figura El Mandaloriano', description: 'Figura detallada del cazarrecompensas.', price_clp: 17990, category: 'figuras-personajes', image_url: '/products/figura-mando.jpg', featured: false },
  { slug: 'figura-link', name: 'Figura Link', description: 'Figura de Link con espada y escudo.', price_clp: 16990, category: 'figuras-personajes', image_url: '/products/figura-link.jpg', featured: false },
  { slug: 'figura-dragon', name: 'Figura Dragón', description: 'Figura decorativa articulada de dragón, se mueve.', price_clp: 12000, category: 'figuras-decorativas', image_url: '/products/figura-dragon.jpg', featured: true },
  { slug: 'figura-buho', name: 'Figura Búho Geométrico', description: 'Figura decorativa de búho estilo low-poly.', price_clp: 9990, category: 'figuras-decorativas', image_url: '/products/figura-buho.jpg', featured: false },
  { slug: 'macetero-geometrico', name: 'Macetero Geométrico', description: 'Macetero moderno de diseño geométrico para plantas pequeñas.', price_clp: 8500, category: 'maceteros', image_url: '/products/macetero-geometrico.jpg', featured: true },
  { slug: 'macetero-gato', name: 'Macetero Gato', description: 'Macetero con forma de gato, ideal para suculentas.', price_clp: 7990, category: 'maceteros', image_url: '/products/macetero-gato.jpg', featured: false },
  { slug: 'macetero-colgante', name: 'Macetero Colgante', description: 'Macetero colgante con cuerda incluida.', price_clp: 9500, category: 'maceteros', image_url: '/products/macetero-colgante.jpg', featured: false },
  { slug: 'juguete-trompo', name: 'Trompo Articulado', description: 'Trompo giratorio impreso en una sola pieza.', price_clp: 4990, category: 'juguetes', image_url: '/products/juguete-trompo.jpg', featured: false },
  { slug: 'juguete-pulpo', name: 'Pulpo Articulado', description: 'Pulpo flexible articulado, muy popular entre niños.', price_clp: 6990, category: 'juguetes', image_url: '/products/juguete-pulpo.jpg', featured: true },
  { slug: 'juguete-dado', name: 'Dado Gigante', description: 'Dado de gran tamaño para juegos de mesa.', price_clp: 5990, category: 'juguetes', image_url: '/products/juguete-dado.jpg', featured: false },
];

async function seed() {
  const { data: insertedCategories, error: categoryError } = await client
    .from('categories')
    .upsert(categories, { onConflict: 'slug' })
    .select('id, slug');

  if (categoryError) throw categoryError;

  const categoryIdBySlug = new Map(insertedCategories.map((c) => [c.slug, c.id]));

  const productRows = products.map((p) => ({
    slug: p.slug,
    name: p.name,
    description: p.description,
    price_clp: p.price_clp,
    category_id: categoryIdBySlug.get(p.category),
    image_url: p.image_url,
    featured: p.featured,
  }));

  const { error: productError } = await client.from('products').upsert(productRows, { onConflict: 'slug' });
  if (productError) throw productError;

  console.log(`Seeded ${categories.length} categories and ${products.length} products.`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
