import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { createOrder } from '@/lib/supabase/queries';
import { orderRequestSchema } from '@/lib/validation/order-schema';
import {
  priceOrder,
  UnknownProductError,
  UnknownVariantError,
  type CatalogEntry,
} from '@/lib/orders/price-order';
import { calculateShippingCost, type Region } from '@/lib/shipping/shipping-cost';

export async function POST(request: Request) {
  const parsed = orderRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }

  const input = parsed.data;
  const client = await createServerSupabaseClient();

  try {
    // Re-price server-side. Totals from the browser are never trusted.
    const { data: rows, error } = await client
      .from('products')
      .select('id, name, price_clp, product_variants ( name )')
      .in('id', input.items.map((item) => item.productId));

    if (error) throw error;

    // Tipos explícitos: sin ellos el Map depende de que TypeScript infiera una
    // tupla a partir del resultado de Supabase, y eso no es confiable.
    const catalog = new Map<string, CatalogEntry>(
      (rows ?? []).map(
        (row: {
          id: string;
          name: string;
          price_clp: number;
          product_variants?: { name: string }[] | null;
        }): [string, CatalogEntry] => [
          row.id,
          {
            name: row.name,
            priceClp: row.price_clp,
            variantNames: (row.product_variants ?? []).map((v) => v.name),
          },
        ]
      )
    );

    const { items, subtotalClp } = priceOrder(input.items, catalog);
    const shippingCostClp = calculateShippingCost(input.deliveryMethod, input.region as Region | undefined);

    const orderId = await createOrder(client, {
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      deliveryMethod: input.deliveryMethod,
      region: input.region,
      address: input.address,
      shippingCostClp,
      paymentMethod: input.paymentMethod,
      subtotalClp,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPriceClp: item.unitPriceClp,
        variantName: item.variantName,
      })),
    });

    // Aquí no se manda ningún correo: el pedido todavía no está pagado. El aviso
    // al cliente y a MadLayerz sale al confirmarse el pago
    // (`lib/email/paid-order-notification.ts`). Antes salía en este punto, así
    // que quien abandonaba el checkout recibía igual una «confirmación».

    return NextResponse.json({ orderId, subtotalClp, shippingCostClp, totalClp: subtotalClp + shippingCostClp });
  } catch (error) {
    if (error instanceof UnknownProductError) {
      return NextResponse.json(
        { error: 'Uno de los productos de tu carrito ya no está disponible.' },
        { status: 409 }
      );
    }

    if (error instanceof UnknownVariantError) {
      return NextResponse.json(
        { error: 'Uno de los colores de tu carrito ya no está disponible.' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
