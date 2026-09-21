'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Product } from '@/lib/catalog/types';
import { useCartStore } from '@/lib/cart/cart-store';
import { PLACEHOLDER_IMAGE, formatClp } from '@/lib/site';

export function ProductDetail({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);
  const openDrawer = useCartStore((state) => state.openDrawer);

  const variants = useMemo(() => product.variants ?? [], [product.variants]);
  const [variantName, setVariantName] = useState<string | undefined>(variants[0]?.name);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  const selectedVariant = variants.find((v) => v.name === variantName);

  // Choosing a colour swaps the photo, unless the shopper has picked a specific
  // gallery shot — then that stays put.
  const mainImage = activeImage ?? selectedVariant?.imageUrl ?? product.imageUrl ?? PLACEHOLDER_IMAGE;

  const gallery = useMemo(() => {
    const all = [
      product.imageUrl,
      ...variants.map((v) => v.imageUrl).filter((url): url is string => Boolean(url)),
      ...(product.images ?? []),
    ].filter(Boolean) as string[];

    return Array.from(new Set(all));
  }, [product.imageUrl, product.images, variants]);

  const specs: { label: string; value: string }[] = [
    product.material ? { label: 'Material', value: product.material } : null,
    product.dimensionsMm ? { label: 'Medidas', value: product.dimensionsMm } : null,
    typeof product.weightG === 'number' ? { label: 'Peso', value: `${product.weightG} g` } : null,
    product.productionDays ? { label: 'Tiempo de producción', value: product.productionDays } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  function handleAdd() {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      unitPriceClp: product.priceClp,
      imageUrl: selectedVariant?.imageUrl ?? product.imageUrl,
      ...(variantName ? { variantName } : {}),
    });
    openDrawer();
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <div className="glass-card relative aspect-square w-full overflow-hidden">
          <Image
            src={mainImage}
            alt={selectedVariant ? `${product.name} en ${selectedVariant.name}` : product.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            className="object-cover"
          />
        </div>

        {gallery.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {gallery.map((url) => {
              const isActive = url === mainImage;
              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveImage(url)}
                  aria-label={`Ver foto de ${product.name}`}
                  aria-current={isActive}
                  className={`relative h-16 w-16 overflow-hidden rounded-lg border-2 transition-opacity ${
                    isActive ? 'border-brand' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <Image src={url} alt="" fill sizes="64px" className="object-cover" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <p className="text-sm uppercase tracking-wide opacity-70">{product.categoryName}</p>
        <h1 className="mt-1 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
          {product.name}
        </h1>
        <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--accent-text)' }}>
          {formatClp(product.priceClp)}
        </p>

        <p className="mt-4 opacity-90">{product.description}</p>

        {variants.length > 0 && (
          <div className="mt-6">
            <p id="etiqueta-color" className="mb-2 text-sm font-semibold">
              Color: <span className="font-normal opacity-80">{variantName}</span>
            </p>
            <div role="radiogroup" aria-labelledby="etiqueta-color" className="flex flex-wrap gap-2">
              {variants.map((variant) => {
                const isSelected = variant.name === variantName;
                return (
                  <button
                    key={variant.name}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      setVariantName(variant.name);
                      // Let the colour drive the photo again.
                      setActiveImage(null);
                    }}
                    className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors ${
                      isSelected ? 'border-brand bg-brand/10 font-semibold' : 'border-current/25 hover:bg-brand/5'
                    }`}
                  >
                    {variant.colorHex && (
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 rounded-full border border-black/20"
                        style={{ background: variant.colorHex }}
                      />
                    )}
                    {variant.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          onClick={handleAdd}
          className="mt-6 w-full rounded-full bg-brand px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.02] sm:w-auto"
        >
          Agregar al carrito
        </button>

        {specs.length > 0 && (
          <dl className="mt-7 grid grid-cols-1 gap-x-6 gap-y-2 border-t border-current/10 pt-5 text-sm sm:grid-cols-2">
            {specs.map((spec) => (
              <div key={spec.label} className="flex justify-between gap-4 sm:flex-col sm:justify-start sm:gap-0">
                <dt className="opacity-60">{spec.label}</dt>
                <dd className="font-semibold">{spec.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {product.careNotes && <p className="mt-4 text-sm opacity-70">{product.careNotes}</p>}

        <p className="mt-5 text-sm opacity-70">
          ¿Lo quieres en otro color, tamaño o con un diseño propio?{' '}
          <Link href="/cotizacion" className="underline">
            Pide una cotización
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
