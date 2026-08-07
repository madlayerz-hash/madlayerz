import { notFound } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import { fetchProductBySlug, fetchProducts } from '@/lib/supabase/queries';
import { getRelatedProducts } from '@/lib/catalog/get-related-products';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { AddToCartButton } from '@/components/product/AddToCartButton';

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const client = createSupabaseClient();
  const product = await fetchProductBySlug(client, params.slug);

  if (!product) notFound();

  const allProducts = await fetchProducts(client);
  const related = getRelatedProducts(allProducts, product);

  return (
    <main className="px-6 py-8">
      <div className="glass-card flex flex-col gap-6 p-6 md:flex-row">
        <img src={product.imageUrl} alt={product.name} className="h-64 w-full rounded-xl object-cover md:w-1/2" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--heading)' }}>
            {product.name}
          </h1>
          <p className="mt-2 text-xl font-bold" style={{ color: 'var(--accent)' }}>
            ${product.priceClp.toLocaleString('es-CL')}
          </p>
          <AddToCartButton product={product} />
        </div>
      </div>
      <p className="mt-6 max-w-2xl">{product.description}</p>
      <RelatedProducts products={related} />
    </main>
  );
}
