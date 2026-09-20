/**
 * Carga el catálogo real de MadLayerz (fotos de enero 2026) en Supabase.
 *
 *   npx tsx supabase/seed-catalog.ts
 *
 * Es idempotente: hace upsert por `slug`, así que se puede correr varias veces.
 * NO borra nada — los productos de demo antiguos (Sonic, Macetero Nike, etc.)
 * se eliminan desde /admin/productos cuando quieras.
 *
 * PRECIOS: los valores de abajo son una propuesta basada en lo que cobra la
 * competencia chilena, no un cálculo de tus costos. Revísalos antes de publicar.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const client = createClient(url, serviceKey);

const categories = [
  { slug: 'llaveros', name: 'Llaveros' },
  { slug: 'figuras-personajes', name: 'Figuras de Personajes' },
  { slug: 'figuras-decorativas', name: 'Figuras Decorativas' },
  { slug: 'maceteros', name: 'Maceteros' },
  { slug: 'juguetes', name: 'Juguetes' },
  { slug: 'hogar', name: 'Hogar y Organización' },
];

interface SeedVariant {
  name: string;
  colorHex?: string;
  imageUrl?: string;
}

interface SeedProduct {
  slug: string;
  name: string;
  description: string;
  priceClp: number;
  category: string;
  imageUrl: string;
  images?: string[];
  featured: boolean;
  material?: string;
  dimensionsMm?: string;
  weightG?: number;
  productionDays?: string;
  careNotes?: string;
  variants?: SeedVariant[];
}

const products: SeedProduct[] = [
  {
    slug: 'llavero-calavera-glow',
    name: 'Llavero Calavera Fosforescente',
    description:
      'Calavera con cresta impresa en PLA fosforescente: se carga con la luz del día y brilla en la oscuridad durante varias horas. Viene con argolla metálica lista para usar.',
    priceClp: 3500,
    category: 'llaveros',
    imageUrl: '/products/llavero-calavera-glow-1.jpg',
    images: ['/products/llavero-calavera-glow-2.jpg'],
    featured: true,
    material: 'PLA fosforescente',
    dimensionsMm: '45 × 25 × 22 mm',
    weightG: 8,
    productionDays: '3 a 5 días hábiles',
    careNotes:
      'Déjalo unos minutos bajo una luz para que brille más fuerte. Evita el agua caliente y la exposición prolongada al sol.',
  },
  {
    slug: 'calavera-arcoiris',
    name: 'Calavera Arcoíris',
    description:
      'Calavera anatómica de tamaño mediano, pintada a mano en degradado rojo, amarillo y verde con acabado escarchado. Cada pieza queda distinta: el degradado se aplica a mano, así que no hay dos iguales.',
    priceClp: 24900,
    category: 'figuras-decorativas',
    imageUrl: '/products/calavera-arcoiris-1.jpg',
    images: ['/products/calavera-arcoiris-2.jpg', '/products/calavera-arcoiris-3.jpg'],
    featured: true,
    material: 'PLA con pintura acrílica y purpurina',
    dimensionsMm: '130 × 95 × 100 mm aprox.',
    weightG: 180,
    productionDays: '7 a 10 días hábiles (incluye el pintado a mano)',
    careNotes: 'Sólo limpieza en seco con un paño suave: la pintura no resiste agua caliente ni solventes.',
  },
  {
    slug: 'busto-rostro-envuelto',
    name: 'Busto Rostro Envuelto',
    description:
      'Escultura de un rostro envuelto en cintas en espiral, impresa en una sola pieza. Se ve distinta desde cada ángulo, así que funciona bien sobre un escritorio o una repisa donde se pueda mirar de cerca.',
    priceClp: 12900,
    category: 'figuras-decorativas',
    imageUrl: '/products/busto-rostro-1.jpg',
    images: ['/products/busto-rostro-bicolor.jpg'],
    featured: true,
    material: 'PLA',
    dimensionsMm: '150 × 85 × 85 mm aprox.',
    weightG: 120,
    productionDays: '5 a 7 días hábiles',
    careNotes: 'Límpiala con un paño seco. No la dejes al sol directo ni dentro de un auto cerrado.',
    variants: [
      { name: 'Negro', colorHex: '#1C1C1C', imageUrl: '/products/busto-rostro-negro.jpg' },
      { name: 'Verde', colorHex: '#2FB63F', imageUrl: '/products/busto-rostro-verde.jpg' },
      { name: 'Verde y negro', colorHex: '#2FB63F', imageUrl: '/products/busto-rostro-bicolor.jpg' },
    ],
  },
  {
    slug: 'dama-clasica',
    name: 'Figura Dama Clásica',
    description:
      'Figura femenina de estilo clásico, con el vestido y el peinado trabajados en detalle. Mide poco más de un palmo, así que cabe en cualquier repisa.',
    priceClp: 8900,
    category: 'figuras-decorativas',
    imageUrl: '/products/dama-clasica-rosado.jpg',
    featured: false,
    material: 'PLA',
    dimensionsMm: '115 × 40 × 35 mm aprox.',
    weightG: 55,
    productionDays: '4 a 6 días hábiles',
    variants: [
      { name: 'Rosado', colorHex: '#F5849B', imageUrl: '/products/dama-clasica-rosado.jpg' },
      { name: 'Verde', colorHex: '#3AA93A', imageUrl: '/products/dama-clasica-verde.jpg' },
    ],
  },
  {
    slug: 'maceta-flores',
    name: 'Maceta con Flores',
    description:
      'Maceta con tres flores impresas en rojo, azul y amarillo sobre tallos verdes. No se riega, no se marchita y no necesita luz: es un ramo que dura. Las flores salen del tallo, así que puedes cambiarlas de posición.',
    priceClp: 11900,
    category: 'maceteros',
    imageUrl: '/products/maceta-flores-1.jpg',
    featured: true,
    material: 'PLA',
    dimensionsMm: 'Maceta 70 mm de alto · conjunto armado 160 mm',
    weightG: 95,
    productionDays: '5 a 7 días hábiles',
  },
  {
    slug: 'hipopotamo-marmol',
    name: 'Hipopótamo Mármol',
    description:
      'Hipopótamo en miniatura impreso en filamento con efecto mármol: el moteado gris viene en el material, no está pintado, así que no se despinta nunca. Del porte de una moneda de cien.',
    priceClp: 3900,
    category: 'figuras-decorativas',
    imageUrl: '/products/hipopotamo-marmol-1.jpg',
    featured: false,
    material: 'PLA efecto mármol',
    dimensionsMm: '38 × 22 × 18 mm',
    weightG: 9,
    productionDays: '3 a 5 días hábiles',
  },
  {
    slug: 'caja-regalo-decorativa',
    name: 'Caja de Regalo Decorativa',
    description:
      'Caja con cinta y moño impresos en rojo sobre blanco. Se abre y guarda algo pequeño adentro, así que sirve igual como envoltorio reutilizable o como adorno de repisa.',
    priceClp: 9900,
    category: 'hogar',
    imageUrl: '/products/caja-regalo-1.jpg',
    featured: false,
    material: 'PLA',
    dimensionsMm: '95 × 95 × 110 mm',
    weightG: 110,
    productionDays: '5 a 7 días hábiles',
  },
  {
    slug: 'ocarina-6-agujeros',
    name: 'Ocarina de 6 Agujeros',
    description:
      'Ocarina funcional de seis agujeros, afinada y lista para tocar. Se toca igual que una de cerámica, pero no se quiebra si se cae. Acabado metalizado morado.',
    priceClp: 9900,
    category: 'juguetes',
    imageUrl: '/products/ocarina-1.jpg',
    featured: true,
    material: 'PLA metalizado',
    dimensionsMm: '95 × 65 × 40 mm',
    weightG: 60,
    productionDays: '4 a 6 días hábiles',
    careNotes: 'Enjuágala con agua fría después de tocarla y déjala secar al aire. Nunca con agua caliente.',
  },
  {
    slug: 'frasco-texturizado',
    name: 'Frasco Texturizado con Tapa',
    description:
      'Frasco con tapa a rosca y textura de diamante en todo el cuerpo, que de paso le da agarre. Para clips, audífonos, semillas o lo que sea. La rosca es impresa: no lleva ninguna pieza extra.',
    priceClp: 8900,
    category: 'hogar',
    imageUrl: '/products/frasco-texturizado-1.jpg',
    images: ['/products/frasco-texturizado-2.jpg'],
    featured: false,
    material: 'PLA',
    dimensionsMm: '80 mm de alto × 70 mm de diámetro',
    weightG: 85,
    productionDays: '4 a 6 días hábiles',
    careNotes: 'No es hermético ni apto para alimentos ni para lavavajillas.',
  },
  {
    slug: 'figura-articulada-mascota',
    name: 'Figura Articulada Mascota',
    description:
      'Figura articulada impresa en varios colores y armada a mano. Los brazos, las piernas y la cabeza se mueven, así que se puede posar de distintas maneras.',
    priceClp: 14900,
    category: 'juguetes',
    imageUrl: '/products/figura-articulada-1.jpg',
    featured: false,
    material: 'PLA multicolor',
    dimensionsMm: '140 mm de alto aprox.',
    weightG: 90,
    productionDays: '7 a 10 días hábiles',
  },
];

async function seed() {
  const { data: insertedCategories, error: categoryError } = await client
    .from('categories')
    .upsert(categories, { onConflict: 'slug' })
    .select('id, slug');

  if (categoryError) throw categoryError;

  const categoryIdBySlug = new Map(insertedCategories.map((c) => [c.slug, c.id]));

  const productRows = products.map((p) => {
    const categoryId = categoryIdBySlug.get(p.category);
    if (!categoryId) throw new Error(`Categoría desconocida: ${p.category}`);

    return {
      slug: p.slug,
      name: p.name,
      description: p.description,
      price_clp: p.priceClp,
      category_id: categoryId,
      image_url: p.imageUrl,
      images: p.images ?? [],
      featured: p.featured,
      material: p.material ?? null,
      dimensions_mm: p.dimensionsMm ?? null,
      weight_g: p.weightG ?? null,
      production_days: p.productionDays ?? null,
      care_notes: p.careNotes ?? null,
    };
  });

  const { data: savedProducts, error: productError } = await client
    .from('products')
    .upsert(productRows, { onConflict: 'slug' })
    .select('id, slug');

  if (productError) throw productError;

  const productIdBySlug = new Map(savedProducts.map((p) => [p.slug, p.id]));

  // Las variantes se reemplazan en bloque para que el script quede idempotente
  // aunque cambien los colores de un producto.
  let variantCount = 0;

  for (const product of products) {
    const productId = productIdBySlug.get(product.slug);
    if (!productId) continue;

    const { error: deleteError } = await client.from('product_variants').delete().eq('product_id', productId);
    if (deleteError) throw deleteError;

    if (!product.variants?.length) continue;

    const { error: variantError } = await client.from('product_variants').insert(
      product.variants.map((variant, index) => ({
        product_id: productId,
        name: variant.name,
        color_hex: variant.colorHex ?? null,
        image_url: variant.imageUrl ?? null,
        sort_order: index,
      }))
    );

    if (variantError) throw variantError;
    variantCount += product.variants.length;
  }

  console.log(
    `Listo: ${categories.length} categorías, ${products.length} productos y ${variantCount} variantes de color.`
  );
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
