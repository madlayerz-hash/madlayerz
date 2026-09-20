import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Refreshes the Supabase access token on every request and writes the rotated
 * cookies onto the response.
 *
 * Without this, an expired access token is never renewed server-side: Server
 * Components (`/cuenta`, `/admin`) read a stale cookie, `auth.getUser()`
 * returns null, and a logged-in customer — or an admin — is treated as
 * anonymous (the admin panel answers 404 to its own owner).
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Never take the whole site down over a missing env var.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: request.headers } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  try {
    await supabase.auth.getUser();
  } catch {
    // A Supabase hiccup must not turn into a 500 for every page.
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals, static assets and image files.
    '/((?!_next/static|_next/image|favicon.ico|products/|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
