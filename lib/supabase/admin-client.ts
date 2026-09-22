import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente con la service-role key: se salta RLS.
 *
 * Sólo para rutas de servidor que no tienen sesión de usuario y necesitan leer
 * o actualizar un pedido — la creación del cobro (compra como invitado) y la
 * notificación de Mercado Pago. Nunca importar desde un componente cliente.
 */
export function createAdminSupabaseClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('createAdminSupabaseClient no puede usarse en el navegador.');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno de Vercel.');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
