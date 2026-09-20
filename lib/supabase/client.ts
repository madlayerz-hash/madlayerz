import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

/**
 * Anonymous, read-only client for public catalog data.
 *
 * It is cached and has auth persistence turned off: previously every call
 * created a new client, and on the client side that meant several GoTrue
 * instances fighting over the same storage key ("Multiple GoTrueClient
 * instances detected" in the console). Anything that needs a session must use
 * `createBrowserSupabaseClient` or `createServerSupabaseClient` instead.
 */
export function createSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  cachedClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  return cachedClient;
}
