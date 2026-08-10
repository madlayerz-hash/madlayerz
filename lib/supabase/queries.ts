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
  const { data, error } = await client.rpc('create_order', {
    input: {
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      deliveryMethod: input.deliveryMethod,
      region: input.region ?? null,
      address: input.address ?? null,
      shippingCostClp: input.shippingCostClp,
      paymentMethod: input.paymentMethod,
      subtotalClp: input.subtotalClp,
      items: input.items,
    },
  });

  if (error) throw error;
  return data as string;
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
  const { data, error } = await client.rpc('create_quote_request', {
    input: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      description: input.description,
      quantity: input.quantity,
      budgetClp: input.budgetClp ?? null,
      referenceImageUrl: input.referenceImageUrl ?? null,
    },
  });

  if (error) throw error;
  return data as string;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  region: string;
  address: string;
  isDefault: boolean;
}

export async function fetchAddresses(client: SupabaseClient, userId: string): Promise<Address[]> {
  const { data, error } = await client
    .from('addresses')
    .select('id, user_id, label, region, address, is_default')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: { id: string; user_id: string; label: string; region: string; address: string; is_default: boolean }) => ({
    id: row.id,
    userId: row.user_id,
    label: row.label,
    region: row.region,
    address: row.address,
    isDefault: row.is_default,
  }));
}

export interface CreateAddressInput {
  userId: string;
  label: string;
  region: string;
  address: string;
  isDefault: boolean;
}

export async function createAddress(client: SupabaseClient, input: CreateAddressInput): Promise<string> {
  const { data, error } = await client
    .from('addresses')
    .insert({
      user_id: input.userId,
      label: input.label,
      region: input.region,
      address: input.address,
      is_default: input.isDefault,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

export interface UpdateAddressInput {
  label: string;
  region: string;
  address: string;
  isDefault: boolean;
}

export async function updateAddress(client: SupabaseClient, id: string, input: UpdateAddressInput): Promise<void> {
  const { error } = await client
    .from('addresses')
    .update({ label: input.label, region: input.region, address: input.address, is_default: input.isDefault })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteAddress(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('addresses').delete().eq('id', id);
  if (error) throw error;
}

export interface OrderSummary {
  id: string;
  createdAt: string;
  status: string;
  totalClp: number;
}

export async function fetchOrdersForUser(client: SupabaseClient, userId: string, email: string): Promise<OrderSummary[]> {
  const { data, error } = await client
    .from('orders')
    .select('id, created_at, status, total_clp')
    .or(`user_id.eq.${userId},customer_email.eq.${email}`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: { id: string; created_at: string; status: string; total_clp: number }) => ({
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    totalClp: row.total_clp,
  }));
}
