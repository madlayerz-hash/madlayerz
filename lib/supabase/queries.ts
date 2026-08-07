import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '@/lib/catalog/types';
import { mapRowToProduct, type ProductRow } from './mappers';

const PRODUCT_SELECT = 'id, slug, name, description, price_clp, image_url, featured, categories ( slug, name )';

export async function fetchProducts(client: SupabaseClient): Promise<Product[]> {
  const { data, error } = await client.from('products').select(PRODUCT_SELECT);
  if (error) throw error;
  return (data as unknown as ProductRow[]).map(mapRowToProduct);
}

export async function fetchProductBySlug(client: SupabaseClient, slug: string): Promise<Product | null> {
  const { data, error } = await client.from('products').select(PRODUCT_SELECT).eq('slug', slug).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapRowToProduct(data as unknown as ProductRow);
}

export interface CreateOrderInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryMethod: 'domicilio' | 'retiro';
  region?: string;
  address?: string;
  shippingCostClp: number;
  paymentMethod: 'flow' | 'mercadopago';
  subtotalClp: number;
  items: { productId: string; quantity: number; unitPriceClp: number }[];
}

export async function createOrder(client: SupabaseClient, input: CreateOrderInput): Promise<string> {
  const totalClp = input.subtotalClp + input.shippingCostClp;

  const { data: order, error: orderError } = await client
    .from('orders')
    .insert({
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
      delivery_method: input.deliveryMethod,
      region: input.region ?? null,
      address: input.address ?? null,
      shipping_cost_clp: input.shippingCostClp,
      payment_method: input.paymentMethod,
      status: 'pendiente_pago',
      subtotal_clp: input.subtotalClp,
      total_clp: totalClp,
    })
    .select('id')
    .single();

  if (orderError) throw orderError;

  const { error: itemsError } = await client.from('order_items').insert(
    input.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price_clp: item.unitPriceClp,
    }))
  );

  if (itemsError) throw itemsError;

  return order.id as string;
}

export interface CreateQuoteRequestInput {
  name: string;
  email: string;
  phone: string;
  description: string;
  quantity: number;
  budgetClp?: number;
  referenceImageUrl?: string;
}

export async function createQuoteRequest(client: SupabaseClient, input: CreateQuoteRequestInput): Promise<string> {
  const { data, error } = await client
    .from('quote_requests')
    .insert({
      name: input.name,
      email: input.email,
      phone: input.phone,
      description: input.description,
      quantity: input.quantity,
      budget_clp: input.budgetClp ?? null,
      reference_image_url: input.referenceImageUrl ?? null,
      status: 'nueva',
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}
