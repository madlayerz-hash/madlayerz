# MadLayerz — Customer Accounts & Admin Panel — Design

**Status:** Approved, ready for implementation planning.

## Goal

Add customer authentication (order history, saved addresses) and an admin panel (product/category CRUD, order management), restricted to a single owner account, without breaking the existing guest checkout flow from Fase 1.

## Context

Fase 1 shipped a fully guest-only storefront (no accounts, no admin panel — those were explicitly out of scope). This design adds both, layered on top of the existing Next.js + Supabase architecture. It also fixes a real security gap discovered during Fase 1 QA: the `orders` table currently allows public read access to every customer's name, email, phone, and address via the anon key. This design tightens that as part of the same change, since the new `orders.user_id` column and RLS rework touch the same policies anyway.

## Global Constraints

- Customer checkout remains guest-accessible — login is never required to purchase.
- A guest who later registers with the same email used at checkout must see those past guest orders in their order history (matched by email, not just `user_id`).
- The admin identity must never be stored in application code, environment variables, or version control. It lives exclusively as a `role` value in the Supabase `profiles` table, set by the owner running a one-off SQL statement in the Supabase SQL Editor.
- The "Panel Admin" link and the `/admin/*` routes must both be gated server-side by the authenticated user's role — never client-side-only (a hidden link is not access control).
- Out of scope for this phase: SMS-based password reset, intermediate roles (e.g. "editor"), order-status email notifications, exportable reports.

## Data Model

New/changed tables (SQL migrations, run manually by the owner in Supabase SQL Editor, same pattern as `0001`-`0003`):

### `profiles`
- `id uuid primary key references auth.users(id) on delete cascade`
- `email text not null`
- `role text not null default 'cliente' check (role in ('cliente', 'admin'))`
- Created automatically for every new signup via a Postgres trigger on `auth.users` insert (`handle_new_user()` function + trigger) — the app never writes to this table directly except via that trigger, and the owner's own `UPDATE profiles SET role = 'admin' WHERE email = '...'` run once by hand.

### `addresses`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `label text not null` (e.g. "Casa", "Oficina")
- `region text not null` (same `Region` enum as checkout: `metropolitana | valparaiso | biobio | araucania | los-lagos | otra`)
- `address text not null`
- `is_default boolean not null default false`
- `created_at timestamptz not null default now()`

### `orders` (altered)
- Add `user_id uuid references auth.users(id)` — nullable; set when the buyer is logged in at checkout time, left `null` for guest purchases.

### RLS rework (replaces the `0002`/`0003` public-read policies on `orders`, `order_items`, `quote_requests`)
- `orders` SELECT: `auth.uid() = user_id OR customer_email = auth.jwt() ->> 'email' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')` — a customer sees their own orders (by id or matching email), the admin sees all.
- `orders` UPDATE: admin-only (`role = 'admin'`) — needed for the admin order-status changes.
- `order_items` SELECT: same shape, joined through `orders`.
- `quote_requests` SELECT/UPDATE: admin-only (quotes have no customer-facing view in this phase).
- `products`/`categories` INSERT/UPDATE/DELETE: admin-only. SELECT stays public (unchanged from Fase 1).
- `addresses`: full CRUD restricted to `auth.uid() = user_id`.
- `profiles`: SELECT restricted to `auth.uid() = id` (a user can read their own profile to check their own role) or admin.

### Order/quote creation moves to `SECURITY DEFINER` RPC functions
Direct `INSERT ... RETURNING` from the browser (the current Fase 1 approach) can't satisfy "guest can create but not read others' orders" under the tightened SELECT policy above — a guest has no `auth.uid()` and no session to match `customer_email` against. Two Postgres functions, both `security definer`, replace the client-side insert-then-select in `lib/supabase/queries.ts`:

- `create_order(input jsonb) returns uuid` — inserts the order + order_items rows (setting `user_id` from `auth.uid()` if present, else `null`), returns just the new order's id. Runs with elevated privilege internally but only ever exposes the id back to the caller, so RLS on `orders` never has to allow anonymous SELECT.
- `create_quote_request(input jsonb) returns uuid` — same pattern for quote requests.

The `app/api/orders/route.ts` and `app/api/quotes/route.ts` routes call `client.rpc('create_order', {...})` instead of the current `createOrder()` insert path; response shape (`{ orderId }` / `{ id }`) is unchanged, so the checkout and quote-form frontend code needs no changes.

## Authentication

- Supabase Auth, email + password (already a project dependency — no new package).
- `/cuenta/registro` — signup form (name, email, password). Supabase sends a confirmation email (standard behavior).
- `/cuenta/login` — login form, also used by the admin (there is no separate admin login screen).
- Password reset via Supabase's standard "forgot password" email flow.
- Session persisted via Supabase's cookie-based auth helpers for Next.js App Router (`@supabase/ssr`), so both Server Components (admin route guards, order history fetch) and Client Components (Header auth state) can read the session.
- Header (`components/layout/Header.tsx`): shows "Iniciar sesión" when logged out, "Mi cuenta" when logged in as a customer, and additionally "Panel Admin" only when `profiles.role === 'admin'` for the current session.

## Customer-Facing Pages

- **`/cuenta`** — two sections:
  - **Mis pedidos**: list of the customer's orders (matched by `user_id` OR `customer_email`), each showing date, items, total, and status.
  - **Mis direcciones**: add/edit/delete saved addresses, mark one as default.
- **Checkout changes** (`components/checkout/ShippingStep.tsx`, `DeliveryStep.tsx`, `app/checkout/page.tsx`): if a session exists, `ShippingStep` pre-fills name/email from the profile, and `DeliveryStep` offers the customer's saved addresses as one-click selections (with "usar otra dirección" to fall back to the existing manual-entry form). Guest flow (no session) is pixel-identical to Fase 1 — no regression.

## Admin Panel (`/admin`)

Every `/admin/*` route is a Server Component that checks `profiles.role === 'admin'` for the current session on every request and calls `notFound()` (404, not a redirect — doesn't reveal the route exists to non-admins) if the check fails.

- **`/admin/productos`** — table of all products with search. Create/edit form: name, description, price, category (select), image (file upload → Supabase Storage), featured (toggle). Delete with a confirmation step.
- **`/admin/categorias`** — list of categories with create/edit/delete (name + slug). Deleting a category that still has products assigned is blocked with a clear error message (no orphaned products).
- **`/admin/pedidos`** — all orders across all customers, filterable by status. Opening an order shows full detail (items, customer, address) and a status selector (`pendiente_pago → pagado → enviado → entregado`, or `cancelado`), which calls an admin-only update.

### Image upload
- New public Supabase Storage bucket `product-images`.
- Storage policies: `INSERT`/`DELETE` restricted to `role = 'admin'`; `SELECT` (read) public, same as today's static `/products/*.svg` placeholders — this replaces those placeholders over time as the owner uploads real photos through the admin panel, product by product.

## Testing

Same approach as Fase 1: Vitest + Testing Library.

- Pure logic gets unit tests: permission checks (`isAdmin(profile)`), the "which orders belong to this user" matching logic, address form validation (Zod schema).
- Critical forms get component tests: login, signup, add-address, product create/edit form (mocking Supabase calls the same way `QuoteForm.test.tsx` and `CartDrawer.test.tsx` already do).
- No new test infrastructure needed — reuses the existing `vitest.config.ts` / `vitest.setup.ts`.

## Rollout

1. Three new SQL migrations (`profiles` + signup trigger, `addresses`, `orders.user_id` + the full RLS rework described above + the two `SECURITY DEFINER` functions) — owner runs them manually in the Supabase SQL Editor, same as `0001`-`0003`.
2. New Storage bucket + policies — owner creates via the Supabase dashboard (Storage tab) or a fourth migration if it turns out to be scriptable via SQL.
3. Code ships the same way as Fase 1: commit → push to GitHub (`madlayerz-hash` account) → Vercel auto-deploys.
4. After deploy, the owner: registers a normal customer account with their real email, then runs `UPDATE profiles SET role = 'admin' WHERE email = '<owner email>';` once in the SQL Editor, then verifies the "Panel Admin" link appears and the panel works.
