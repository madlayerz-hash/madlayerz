import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import { fetchProductBySlug, fetchProducts } from '@/lib/supabase/queries';
import { getRelatedProducts } from '@/lib/catalog/get-related-products';
import { PLACEHOLDER_IMAGE, SITE_NAME, SITE_URL } from '@/lib/site';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { ProductDetail } from '@/components/product/ProductDetail';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const product = await fetchProductBySlug(createSupabaseClient(), params.slug);
    if (!product) return { title: 'Producto no encontrado' };

    return {
      title: product.name,
      description: product.description.slice(0, 160),
      alternates: { canonical: `/producto/${product.slug}` },
      openGraph: {
        type: 'website',
        title: `${product.name} — ${SITE_NAME}`,
        description: product.description.slice(0, 160),
        url: `${SITE_URL}/producto/${product.slug}`,
        images: [{ url: product.imageUrl || PLACEHOLDER_IMAGE }],
      },
    };
  } catch {
    return {};
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const client = createSupabaseClient();
  const product = await fetchProductBySlug(client, params.slug);

  if (!product) notFound();

  const allProducts = await fetchProducts(client).catch(() => []);
  const related = getRelatedProducts(allProducts, product);

  const absolute = (url: string) => (url.startsWith('http') ? url : `${SITE_URL}${url}`);

  // Rich result for Google Shopping / product snippets.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: [product.imageUrl || PLACEHOLDER_IMAGE, ...(product.images ?? [])].map(absolute),
    category: product.categoryName,
    material: product.material,
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/producto/${product.slug}`,
      priceCurrency: 'CLP',
      price: product.priceClp,
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Migas de pan" className="mb-4 text-sm opacity-75">
        <Link href="/">Inicio</Link> <span aria-hidden="true">/</span>{' '}
        <Link href="/catalogo">Catálogo</Link> <span aria-hidden="true">/</span>{' '}
        <span>{product.name}</span>
      </nav>

      <ProductDetail product={product} />

      <RelatedProducts products={related} />
    </main>
  );
}
