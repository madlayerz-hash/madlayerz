# MadLayerz — Customer Accounts & Admin Panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add customer authentication (order history, saved addresses) and an admin panel (product/category CRUD, order management) restricted to a single owner account, without breaking the existing guest checkout.

**Architecture:** Supabase Auth (email + password) via `@supabase/ssr` cookie-based sessions, readable from both Server and Client Components. A `profiles` table carries a `role` column (`'cliente' | 'admin'`) set exclusively by the owner via manual SQL — never in code or env vars. Order/quote creation moves from direct client-side INSERT to `SECURITY DEFINER` Postgres RPC functions so RLS can be tightened to owner-only reads without breaking guest checkout.

**Tech Stack:** Next.js 14 (App Router), `@supabase/ssr` (new dependency) + `@supabase/supabase-js` (existing), Zod, Vitest + Testing Library, Supabase Storage for product images.

## Global Constraints

- Guest checkout must keep working exactly as today — login is never required to purchase.
- A guest who later registers with the same email used at checkout must see those past guest orders in their order history (match by `user_id` OR `customer_email`).
- The admin identity lives only in the `profiles.role` column, set by the owner running one-off SQL in the Supabase SQL Editor — never in code, env vars, or version control.
- `/admin/*` routes and the "Panel Admin" header link are both gated server-side by `role = 'admin'` on every request — a hidden link is not access control.
- Language of all UI copy: Spanish (Chile), matching Fase 1.
- Visual style: reuse existing `.glass-card` / `.glass-surface` utilities and `bg-brand` buttons from Fase 1 — no new design system.
- Out of scope: SMS password reset, intermediate roles, order-status email notifications, exportable reports.

## File Structure

```
madlayerz/
  lib/
    supabase/
      server-client.ts          # Server Component / Route Handler Supabase client (cookies)
      browser-client.ts         # Client Component Supabase client
      queries.ts                 # MODIFY: RPC-based createOrder/createQuoteRequest, +address/order-history/admin queries
    auth/
      types.ts                   # Profile, Role types
      require-admin.ts           # Server-side admin guard, calls notFound() if not admin
    validation/
      auth-schema.ts             # login/signup Zod schemas
      address-schema.ts          # address Zod schema
      product-admin-schema.ts    # admin product form Zod schema
      category-admin-schema.ts   # admin category form Zod schema
  components/
    auth/
      LoginForm.tsx
      SignupForm.tsx
    account/
      OrderHistoryList.tsx
      AddressList.tsx
      AddressForm.tsx
    admin/
      AdminProductForm.tsx
      AdminProductTable.tsx
      AdminCategoryForm.tsx
      AdminCategoryTable.tsx
      AdminOrderTable.tsx
      AdminOrderDetail.tsx
  app/
    cuenta/
      login/page.tsx
      registro/page.tsx
      page.tsx                    # Mis pedidos + Mis direcciones
    admin/
      layout.tsx                  # calls requireAdmin()
      productos/page.tsx
      categorias/page.tsx
      pedidos/page.tsx
    api/
      admin/
        products/route.ts         # POST create, PATCH update, DELETE
        categories/route.ts       # POST create, PATCH update, DELETE
        orders/[id]/route.ts      # PATCH status update
      account/
        addresses/route.ts        # POST create, PATCH update, DELETE
  supabase/
    migrations/
      0004_profiles_and_trigger.sql
      0005_addresses.sql
      0006_orders_user_id_and_rls_rework.sql
      0007_storage_product_images.sql
```

---

### Task 1: Install `@supabase/ssr` and add cookie-based server/browser clients

**Files:**
- Modify: `package.json` (add dependency)
- Create: `lib/supabase/server-client.ts`
- Create: `lib/supabase/browser-client.ts`
- Test: `lib/supabase/browser-client.test.ts`

**Interfaces:**
- Produces: `createServerSupabaseClient(): Promise<SupabaseClient>` (reads/writes auth cookies via Next.js `cookies()` — for Server Components, Server Actions, Route Handlers), `createBrowserSupabaseClient(): SupabaseClient` (for Client Components). Consumed by every later task that needs an authenticated Supabase client.
- The existing `createSupabaseClient()` in `lib/supabase/client.ts` (Fase 1) stays unchanged and keeps being used for anonymous, unauthenticated reads (catalog, product detail) where no session is needed.

- [ ] **Step 1: Install the dependency**

```bash
npm install @supabase/ssr
```

- [ ] **Step 2: Write the failing test for the browser client factory**

Create `lib/supabase/browser-client.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createBrowserSupabaseClient } from './browser-client';

describe('createBrowserSupabaseClient', () => {
  it('returns a Supabase client instance', () => {
    const client = createBrowserSupabaseClient();
    expect(client).toBeTruthy();
    expect(typeof client.auth.getSession).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- browser-client`
Expected: FAIL — `./browser-client` doesn't exist.

- [ ] **Step 3: Implement the browser client**

Create `lib/supabase/browser-client.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

export function createBrowserSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createBrowserClient(url, anonKey);
}
```

- [ ] **Step 4: Implement the server client**

Create `lib/supabase/server-client.ts`:

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render — middleware refreshes the session instead.
        }
      },
    },
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- browser-client`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add cookie-based Supabase server and browser clients"
```

---

### Task 2: `profiles` table, signup trigger, and role-check helper

**Files:**
- Create: `supabase/migrations/0004_profiles_and_trigger.sql`
- Create: `lib/auth/types.ts`
- Create: `lib/auth/require-admin.ts`
- Test: `lib/auth/require-admin.test.ts`

**Interfaces:**
- Consumes: `createServerSupabaseClient` (Task 1).
- Produces: `Profile` type (`{ id, email, role }`), `requireAdmin(): Promise<Profile>` — throws by calling Next's `notFound()` if there's no session or the session's role isn't `'admin'`. Consumed by Task 8 (`/admin` layout) and every admin API route.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0004_profiles_and_trigger.sql`:

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'cliente' check (role in ('cliente', 'admin'))
);

alter table profiles enable row level security;

create policy "Users can read own profile" on profiles
  for select using (auth.uid() = id);

create policy "Admins can read all profiles" on profiles
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

> Run this in the Supabase SQL Editor once the code in this task is ready to ship (see Task 15's rollout checklist — all migrations 0004-0007 run together at the end).

- [ ] **Step 2: Define the Profile type**

Create `lib/auth/types.ts`:

```ts
export type Role = 'cliente' | 'admin';

export interface Profile {
  id: string;
  email: string;
  role: Role;
}
```

- [ ] **Step 3: Write the failing test for requireAdmin**

Create `lib/auth/require-admin.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockNotFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({ notFound: mockNotFound }));

const mockGetUser = vi.fn();
const mockSingle = vi.fn();
vi.mock('@/lib/supabase/server-client', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: () => ({ select: () => ({ eq: () => ({ single: mockSingle }) }) }),
  })),
}));

import { requireAdmin } from './require-admin';

describe('requireAdmin', () => {
  beforeEach(() => {
    mockNotFound.mockClear();
    mockGetUser.mockReset();
    mockSingle.mockReset();
  });

  it('calls notFound when there is no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('calls notFound when the profile role is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com' } } });
    mockSingle.mockResolvedValue({ data: { id: 'u1', email: 'a@b.com', role: 'cliente' }, error: null });
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('returns the profile when the role is admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com' } } });
    mockSingle.mockResolvedValue({ data: { id: 'u1', email: 'a@b.com', role: 'admin' }, error: null });
    const profile = await requireAdmin();
    expect(profile.role).toBe('admin');
    expect(mockNotFound).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- require-admin`
Expected: FAIL — `./require-admin` doesn't exist.

- [ ] **Step 5: Implement requireAdmin**

Create `lib/auth/require-admin.ts`:

```ts
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import type { Profile } from './types';

export async function requireAdmin(): Promise<Profile> {
  const client = await createServerSupabaseClient();
  const { data: userData } = await client.auth.getUser();

  if (!userData.user) {
    notFound();
  }

  const { data: profile } = await client
    .from('profiles')
    .select('id, email, role')
    .eq('id', userData.user!.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    notFound();
  }

  return profile as Profile;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- require-admin`
Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add profiles table, signup trigger, and requireAdmin guard"
```

---

### Task 3: `addresses` table and CRUD queries

**Files:**
- Create: `supabase/migrations/0005_addresses.sql`
- Create: `lib/validation/address-schema.ts`
- Test: `lib/validation/address-schema.test.ts`
- Modify: `lib/supabase/queries.ts` (add address functions)
- Test: `lib/supabase/address-queries.test.ts`

**Interfaces:**
- Consumes: `Region` type (Task 4 of Fase 1, `lib/shipping/shipping-cost.ts`).
- Produces: `Address` type, `addressSchema` (Zod), `fetchAddresses(client, userId): Promise<Address[]>`, `createAddress(client, input): Promise<string>`, `updateAddress(client, id, input): Promise<void>`, `deleteAddress(client, id): Promise<void>`. Consumed by Task 9 (`/cuenta` page) and Task 10 (checkout saved-address picker).

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0005_addresses.sql`:

```sql
create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  region text not null,
  address text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table addresses enable row level security;

create policy "Users manage their own addresses" on addresses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 2: Write the failing test for the address schema**

Create `lib/validation/address-schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { addressSchema } from './address-schema';

describe('addressSchema', () => {
  it('accepts a valid address', () => {
    const result = addressSchema.safeParse({
      label: 'Casa',
      region: 'metropolitana',
      address: 'Av. Siempre Viva 123',
      isDefault: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty label', () => {
    const result = addressSchema.safeParse({
      label: '',
      region: 'metropolitana',
      address: 'Av. Siempre Viva 123',
      isDefault: false,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an address that is too short', () => {
    const result = addressSchema.safeParse({
      label: 'Casa',
      region: 'metropolitana',
      address: 'ab',
      isDefault: false,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid region', () => {
    const result = addressSchema.safeParse({
      label: 'Casa',
      region: 'not-a-region',
      address: 'Av. Siempre Viva 123',
      isDefault: false,
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- address-schema`
Expected: FAIL — `./address-schema` doesn't exist.

- [ ] **Step 4: Implement the address schema**

Create `lib/validation/address-schema.ts`:

```ts
import { z } from 'zod';

export const addressSchema = z.object({
  label: z.string().min(1, 'Ponle un nombre a esta dirección'),
  region: z.enum(['metropolitana', 'valparaiso', 'biobio', 'araucania', 'los-lagos', 'otra']),
  address: z.string().min(5, 'La dirección es muy corta'),
  isDefault: z.boolean(),
});

export type AddressInput = z.infer<typeof addressSchema>;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- address-schema`
Expected: PASS (4 tests)

- [ ] **Step 6: Write the failing test for the address queries**

Create `lib/supabase/address-queries.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { fetchAddresses, createAddress, updateAddress, deleteAddress } from './queries';

function makeClient(overrides: Record<string, unknown> = {}) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn(async () => ({ data: [{ id: '1', user_id: 'u1', label: 'Casa', region: 'metropolitana', address: 'Av 123', is_default: true }], error: null })) })) })),
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(async () => ({ data: { id: '2' }, error: null })) })) })),
      update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
      delete: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
      ...overrides,
    })),
  } as any;
}

describe('address queries', () => {
  it('fetches addresses for a user, mapped to camelCase', async () => {
    const client = makeClient();
    const addresses = await fetchAddresses(client, 'u1');
    expect(addresses).toEqual([
      { id: '1', userId: 'u1', label: 'Casa', region: 'metropolitana', address: 'Av 123', isDefault: true },
    ]);
  });

  it('creates an address and returns its id', async () => {
    const client = makeClient();
    const id = await createAddress(client, {
      userId: 'u1',
      label: 'Casa',
      region: 'metropolitana',
      address: 'Av 123',
      isDefault: true,
    });
    expect(id).toBe('2');
  });

  it('updates an address', async () => {
    const client = makeClient();
    await expect(
      updateAddress(client, '1', { label: 'Oficina', region: 'valparaiso', address: 'Av 456', isDefault: false })
    ).resolves.toBeUndefined();
  });

  it('deletes an address', async () => {
    const client = makeClient();
    await expect(deleteAddress(client, '1')).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- address-queries`
Expected: FAIL — the functions don't exist in `queries.ts` yet.

- [ ] **Step 8: Add address functions to queries.ts**

Modify `lib/supabase/queries.ts` — add at the end of the file:

```ts
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

  return (data ?? []).map((row: any) => ({
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
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- address-queries`
Expected: PASS (4 tests)

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add addresses table, schema, and CRUD queries"
```

---

### Task 4: `orders.user_id`, RLS rework, and SECURITY DEFINER RPC functions

**Files:**
- Create: `supabase/migrations/0006_orders_user_id_and_rls_rework.sql`

**Interfaces:**
- Produces: Postgres RPC functions `create_order(input jsonb) returns uuid` and `create_quote_request(input jsonb) returns uuid`, callable via `client.rpc('create_order', { input: {...} })`. Consumed by Task 5.

> No automated test — this is a schema/RLS-only migration. Verification is manual (Task 15's checklist) after all migrations run.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0006_orders_user_id_and_rls_rework.sql`:

```sql
alter table orders add column user_id uuid references auth.users(id);

-- Replace the Fase-1 public-read policies (from 0002/0003) with owner/admin-only reads.
drop policy if exists "Public can read orders" on orders;
drop policy if exists "Public can read order items" on order_items;
drop policy if exists "Public can read quote requests" on quote_requests;
drop policy if exists "Public can create orders" on orders;
drop policy if exists "Public can create order items" on order_items;
drop policy if exists "Public can create quote requests" on quote_requests;

create policy "Owners and admins can read orders" on orders
  for select using (
    auth.uid() = user_id
    or customer_email = (auth.jwt() ->> 'email')
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can update orders" on orders
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Owners and admins can read order items" on order_items
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
      and (
        auth.uid() = o.user_id
        or o.customer_email = (auth.jwt() ->> 'email')
        or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
      )
    )
  );

create policy "Admins can read quote requests" on quote_requests
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can update quote requests" on quote_requests
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Product/category writes: admin-only (SELECT stays public from Fase 1's 0002 policy).
create policy "Admins can insert products" on products
  for insert with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can update products" on products
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can delete products" on products
  for delete using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can insert categories" on categories
  for insert with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can update categories" on categories
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can delete categories" on categories
  for delete using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- SECURITY DEFINER creation functions: bypass the now-restricted SELECT/INSERT
-- policies internally, expose only the new row's id to the caller (anon or authed).
create function create_order(input jsonb)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_order_id uuid;
  item jsonb;
begin
  insert into orders (
    customer_name, customer_email, customer_phone, delivery_method, region, address,
    shipping_cost_clp, payment_method, status, subtotal_clp, total_clp, user_id
  ) values (
    input->>'customerName',
    input->>'customerEmail',
    input->>'customerPhone',
    input->>'deliveryMethod',
    input->>'region',
    input->>'address',
    (input->>'shippingCostClp')::int,
    input->>'paymentMethod',
    'pendiente_pago',
    (input->>'subtotalClp')::int,
    (input->>'subtotalClp')::int + (input->>'shippingCostClp')::int,
    auth.uid()
  ) returning id into new_order_id;

  for item in select jsonb_array_elements(input->'items')
  loop
    insert into order_items (order_id, product_id, quantity, unit_price_clp)
    values (new_order_id, (item->>'productId')::uuid, (item->>'quantity')::int, (item->>'unitPriceClp')::int);
  end loop;

  return new_order_id;
end;
$$;

create function create_quote_request(input jsonb)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_quote_id uuid;
begin
  insert into quote_requests (name, email, phone, description, quantity, budget_clp, reference_image_url, status)
  values (
    input->>'name',
    input->>'email',
    input->>'phone',
    input->>'description',
    (input->>'quantity')::int,
    nullif(input->>'budgetClp', '')::int,
    input->>'referenceImageUrl',
    'nueva'
  ) returning id into new_quote_id;

  return new_quote_id;
end;
$$;
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add orders.user_id, tighten RLS, add order/quote creation RPC functions"
```

---

### Task 5: Switch order/quote creation to the RPC functions, add order-history query

**Files:**
- Modify: `lib/supabase/queries.ts`
- Test: `lib/supabase/queries.test.ts` (new file, tests the RPC-calling versions)

**Interfaces:**
- Consumes: `create_order` / `create_quote_request` RPC functions (Task 4).
- Produces: `createOrder(client, input): Promise<string>` (same signature as Fase 1 — internals change to call `.rpc()` instead of `.insert()`), `createQuoteRequest(client, input): Promise<string>` (same), `fetchOrdersForUser(client, userId, email): Promise<OrderSummary[]>`. Consumed by Task 8 (`/cuenta` page — unchanged API routes from Fase 1 keep working with no frontend changes).

- [ ] **Step 1: Write the failing test for the RPC-based createOrder**

Create `lib/supabase/queries.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { createOrder, createQuoteRequest, fetchOrdersForUser } from './queries';

describe('createOrder (RPC-based)', () => {
  it('calls the create_order RPC with the input and returns the id', async () => {
    const rpc = vi.fn(async () => ({ data: 'order-123', error: null }));
    const client = { rpc } as any;

    const id = await createOrder(client, {
      customerName: 'Pablo',
      customerEmail: 'pablo@example.com',
      customerPhone: '+56912345678',
      deliveryMethod: 'retiro',
      shippingCostClp: 0,
      paymentMethod: 'flow',
      subtotalClp: 3990,
      items: [{ productId: 'p1', quantity: 1, unitPriceClp: 3990 }],
    });

    expect(rpc).toHaveBeenCalledWith('create_order', {
      input: expect.objectContaining({ customerName: 'Pablo', subtotalClp: 3990 }),
    });
    expect(id).toBe('order-123');
  });
});

describe('createQuoteRequest (RPC-based)', () => {
  it('calls the create_quote_request RPC and returns the id', async () => {
    const rpc = vi.fn(async () => ({ data: 'quote-123', error: null }));
    const client = { rpc } as any;

    const id = await createQuoteRequest(client, {
      name: 'Pablo',
      email: 'pablo@example.com',
      phone: '+56912345678',
      description: 'Quiero 10 llaveros personalizados',
      quantity: 10,
    });

    expect(rpc).toHaveBeenCalledWith('create_quote_request', {
      input: expect.objectContaining({ name: 'Pablo', quantity: 10 }),
    });
    expect(id).toBe('quote-123');
  });
});

describe('fetchOrdersForUser', () => {
  it('queries orders matching user_id or customer_email, newest first', async () => {
    const order = vi.fn(async () => ({
      data: [{ id: 'o1', created_at: '2026-01-01', status: 'pendiente_pago', total_clp: 3990 }],
      error: null,
    }));
    const or = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ or }));
    const from = vi.fn(() => ({ select }));
    const client = { from } as any;

    const orders = await fetchOrdersForUser(client, 'u1', 'pablo@example.com');

    expect(from).toHaveBeenCalledWith('orders');
    expect(or).toHaveBeenCalledWith('user_id.eq.u1,customer_email.eq.pablo@example.com');
    expect(orders).toEqual([{ id: 'o1', createdAt: '2026-01-01', status: 'pendiente_pago', totalClp: 3990 }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- queries.test`
Expected: FAIL — `createOrder`/`createQuoteRequest` still use `.insert()`, and `fetchOrdersForUser` doesn't exist.

- [ ] **Step 3: Replace createOrder and createQuoteRequest with RPC calls**

Modify `lib/supabase/queries.ts` — replace the entire `createOrder` function body with:

```ts
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
```

And replace the entire `createQuoteRequest` function body with:

```ts
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
```

- [ ] **Step 4: Add fetchOrdersForUser**

Add to `lib/supabase/queries.ts`:

```ts
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

  return (data ?? []).map((row: any) => ({
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    totalClp: row.total_clp,
  }));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- queries.test`
Expected: PASS (3 tests)

- [ ] **Step 6: Run the full suite to check nothing in the Fase 1 checkout/quote flow broke**

Run: `npm test`
Expected: PASS — `app/api/orders/route.ts` and `app/api/quotes/route.ts` call `createOrder`/`createQuoteRequest` with the same signatures, so they need no changes.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: switch order/quote creation to RPC calls, add order-history query"
```

---

### Task 6: Login and signup pages

**Files:**
- Create: `lib/validation/auth-schema.ts`
- Test: `lib/validation/auth-schema.test.ts`
- Create: `components/auth/LoginForm.tsx`
- Create: `components/auth/SignupForm.tsx`
- Test: `components/auth/LoginForm.test.tsx`
- Create: `app/cuenta/login/page.tsx`
- Create: `app/cuenta/registro/page.tsx`

**Interfaces:**
- Consumes: `createBrowserSupabaseClient` (Task 1).
- Produces: `loginSchema`, `signupSchema` (Zod), `<LoginForm />`, `<SignupForm />` (self-contained, no props). Consumed by Task 7 (Header — links to these routes).

- [ ] **Step 1: Write the failing test for the auth schemas**

Create `lib/validation/auth-schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { loginSchema, signupSchema } from './auth-schema';

describe('loginSchema', () => {
  it('accepts a valid email and password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'secret123' }).success).toBe(true);
  });

  it('rejects a short password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '123' }).success).toBe(false);
  });
});

describe('signupSchema', () => {
  it('accepts a valid signup', () => {
    expect(
      signupSchema.safeParse({ name: 'Pablo Toro', email: 'a@b.com', password: 'secret123' }).success
    ).toBe(true);
  });

  it('rejects a name that is too short', () => {
    expect(
      signupSchema.safeParse({ name: 'P', email: 'a@b.com', password: 'secret123' }).success
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- auth-schema`
Expected: FAIL — `./auth-schema` doesn't exist.

- [ ] **Step 3: Implement the auth schemas**

Create `lib/validation/auth-schema.ts`:

```ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: z.string().min(2, 'El nombre es muy corto'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export type SignupInput = z.infer<typeof signupSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- auth-schema`
Expected: PASS (4 tests)

- [ ] **Step 5: Write the failing test for LoginForm**

Create `components/auth/LoginForm.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockSignIn = vi.fn();
const mockPush = vi.fn();

vi.mock('@/lib/supabase/browser-client', () => ({
  createBrowserSupabaseClient: () => ({ auth: { signInWithPassword: mockSignIn } }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockPush.mockReset();
  });

  it('shows a validation error for an invalid email', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Contraseña'), 'secret123');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(await screen.findByText('Email inválido')).toBeInTheDocument();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('signs in and redirects to /cuenta on success', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'pablo@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'secret123');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(mockSignIn).toHaveBeenCalledWith({ email: 'pablo@example.com', password: 'secret123' });
    await vi.waitFor(() => expect(mockPush).toHaveBeenCalledWith('/cuenta'));
  });

  it('shows the server error message when sign-in fails', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'pablo@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- LoginForm`
Expected: FAIL — `./LoginForm` doesn't exist.

- [ ] **Step 7: Implement LoginForm**

Create `components/auth/LoginForm.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginSchema } from '@/lib/validation/auth-schema';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-client';

export function LoginForm() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    const client = createBrowserSupabaseClient();
    const { error } = await client.auth.signInWithPassword(result.data);

    if (error) {
      setServerError(error.message);
      return;
    }

    router.push('/cuenta');
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card flex flex-col gap-4 p-6">
      <h2 className="text-lg font-bold">Iniciar sesión</h2>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
      </div>
      <div>
        <label htmlFor="password">Contraseña</label>
        <input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
      </div>
      {serverError && <p className="text-sm text-red-500">{serverError}</p>}
      <button type="submit" className="rounded-full bg-brand py-3 font-semibold text-white">
        Iniciar sesión
      </button>
    </form>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- LoginForm`
Expected: PASS (3 tests)

- [ ] **Step 9: Implement SignupForm (no separate test — mirrors LoginForm's pattern, covered by Task 15's full-suite pass)**

Create `components/auth/SignupForm.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signupSchema } from '@/lib/validation/auth-schema';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-client';

export function SignupForm() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const result = signupSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    const client = createBrowserSupabaseClient();
    const { error } = await client.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: { data: { name: result.data.name } },
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="glass-card p-6 text-center">
        ¡Listo! Revisa tu email para confirmar tu cuenta antes de iniciar sesión.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card flex flex-col gap-4 p-6">
      <h2 className="text-lg font-bold">Crear cuenta</h2>
      <div>
        <label htmlFor="name">Nombre</label>
        <input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
      </div>
      <div>
        <label htmlFor="password">Contraseña</label>
        <input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
      </div>
      {serverError && <p className="text-sm text-red-500">{serverError}</p>}
      <button type="submit" className="rounded-full bg-brand py-3 font-semibold text-white">
        Crear cuenta
      </button>
    </form>
  );
}
```

- [ ] **Step 10: Create the login and signup pages**

Create `app/cuenta/login/page.tsx`:

```tsx
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <LoginForm />
    </main>
  );
}
```

Create `app/cuenta/registro/page.tsx`:

```tsx
import { SignupForm } from '@/components/auth/SignupForm';

export default function RegistroPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <SignupForm />
    </main>
  );
}
```

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add login and signup pages"
```

---

### Task 7: Header auth state (login/mi cuenta/panel admin)

**Files:**
- Modify: `components/layout/Header.tsx`
- Test: `components/layout/Header.test.tsx`

**Interfaces:**
- Consumes: `createBrowserSupabaseClient` (Task 1).
- Produces: `<Header />` now reads the current session client-side and conditionally renders auth links. No prop or exported-signature changes — still self-contained, still consumed by `app/layout.tsx` unchanged.

- [ ] **Step 1: Write the failing test**

Create `components/layout/Header.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockGetSession = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/lib/supabase/browser-client', () => ({
  createBrowserSupabaseClient: () => ({
    auth: { getSession: mockGetSession, onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) },
    from: () => ({ select: () => ({ eq: () => ({ single: mockSingle }) }) }),
  }),
}));

import { Header } from './Header';

describe('Header auth state', () => {
  it('shows "Iniciar sesión" when logged out', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<Header />);
    expect(await screen.findByText('Iniciar sesión')).toBeInTheDocument();
    expect(screen.queryByText('Panel Admin')).not.toBeInTheDocument();
  });

  it('shows "Mi cuenta" but not "Panel Admin" for a customer session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1', email: 'a@b.com' } } } });
    mockSingle.mockResolvedValue({ data: { id: 'u1', email: 'a@b.com', role: 'cliente' }, error: null });
    render(<Header />);
    expect(await screen.findByText('Mi cuenta')).toBeInTheDocument();
    expect(screen.queryByText('Panel Admin')).not.toBeInTheDocument();
  });

  it('shows "Panel Admin" for an admin session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1', email: 'a@b.com' } } } });
    mockSingle.mockResolvedValue({ data: { id: 'u1', email: 'a@b.com', role: 'admin' }, error: null });
    render(<Header />);
    expect(await screen.findByText('Panel Admin')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- Header`
Expected: FAIL — Header doesn't read session state yet.

- [ ] **Step 3: Update Header to read session and role**

Modify `components/layout/Header.tsx` — replace the full file with:

```tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCartStore } from '@/lib/cart/cart-store';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-client';
import type { Role } from '@/lib/auth/types';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const openDrawer = useCartStore((state) => state.openDrawer);
  const itemCount = useCartStore((state) => state.items.reduce((sum, i) => sum + i.quantity, 0));
  const [role, setRole] = useState<Role | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const client = createBrowserSupabaseClient();

    async function loadSession() {
      try {
        const { data } = await client.auth.getSession();
        const user = data.session?.user;
        setLoggedIn(!!user);

        if (user) {
          const { data: profile } = await client.from('profiles').select('id, email, role').eq('id', user.id).single();
          setRole((profile?.role as Role) ?? null);
        } else {
          setRole(null);
        }
      } catch {
        setLoggedIn(false);
        setRole(null);
      }
    }

    loadSession();

    const { data: subscription } = client.auth.onAuthStateChange(() => loadSession());
    return () => subscription.subscription.unsubscribe();
  }, []);

  return (
    <header className="glass-surface sticky top-0 z-40 flex items-center justify-between px-6 py-4">
      <Link href="/" className="text-xl font-extrabold" style={{ color: 'var(--heading)' }}>
        MadLayerz
      </Link>
      <nav className="flex items-center gap-4">
        <Link href="/catalogo">Catálogo</Link>
        <Link href="/cotizacion">Cotización</Link>
        {role === 'admin' && <Link href="/admin/productos">Panel Admin</Link>}
        {loggedIn ? <Link href="/cuenta">Mi cuenta</Link> : <Link href="/cuenta/login">Iniciar sesión</Link>}
        <ThemeToggle />
        <button aria-label="Carrito" onClick={openDrawer} className="relative">
          🛒
          {itemCount > 0 && (
            <span className="absolute -right-2 -top-2 rounded-full bg-brand px-1.5 text-xs text-white">
              {itemCount}
            </span>
          )}
        </button>
      </nav>
    </header>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- Header`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the full suite — confirm CartDrawer.test.tsx (which renders Header without mocking browser-client) still passes with the try/catch already in place above**

Run: `npm test`
Expected: PASS — `CartDrawer.test.tsx` doesn't mock `browser-client`, so `getSession` will throw/reject in that test; the try/catch in Step 3's implementation already handles this by falling back to logged-out state.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: show auth-aware links in Header (login/mi cuenta/panel admin)"
```

---

### Task 8: `/cuenta` page — order history and saved addresses

**Files:**
- Create: `components/account/OrderHistoryList.tsx`
- Create: `components/account/AddressList.tsx`
- Create: `components/account/AddressForm.tsx`
- Test: `components/account/AddressForm.test.tsx`
- Create: `app/api/account/addresses/route.ts`
- Create: `app/cuenta/page.tsx`

**Interfaces:**
- Consumes: `fetchOrdersForUser`, `fetchAddresses`, `createAddress`, `updateAddress`, `deleteAddress` (Tasks 3, 5), `createServerSupabaseClient` (Task 1), `addressSchema` (Task 3).
- Produces: `<OrderHistoryList orders={OrderSummary[]} />`, `<AddressList addresses={Address[]} onChange={() => void} />`, `<AddressForm onSaved={() => void} />`. Consumed by Task 10 (checkout reuses `AddressForm`'s validation pattern, not the component itself).

- [ ] **Step 1: Write the failing test for AddressForm**

Create `components/account/AddressForm.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddressForm } from './AddressForm';

describe('AddressForm', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'addr-1' }) });
  });

  it('shows a validation error when the address is too short', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<AddressForm onSaved={onSaved} />);

    await user.type(screen.getByLabelText('Nombre de la dirección'), 'Casa');
    await user.type(screen.getByLabelText('Dirección'), 'ab');
    await user.click(screen.getByRole('button', { name: /guardar dirección/i }));

    expect(await screen.findByText('La dirección es muy corta')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('submits a valid address and calls onSaved', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<AddressForm onSaved={onSaved} />);

    await user.type(screen.getByLabelText('Nombre de la dirección'), 'Casa');
    await user.type(screen.getByLabelText('Dirección'), 'Av. Siempre Viva 123');
    await user.click(screen.getByRole('button', { name: /guardar dirección/i }));

    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith('/api/account/addresses', expect.objectContaining({ method: 'POST' }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- AddressForm`
Expected: FAIL — `./AddressForm` doesn't exist.

- [ ] **Step 3: Implement AddressForm**

Create `components/account/AddressForm.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { addressSchema } from '@/lib/validation/address-schema';

const REGIONS = [
  { value: 'metropolitana', label: 'Región Metropolitana' },
  { value: 'valparaiso', label: 'Valparaíso' },
  { value: 'biobio', label: 'Biobío' },
  { value: 'araucania', label: 'Araucanía' },
  { value: 'los-lagos', label: 'Los Lagos' },
  { value: 'otra', label: 'Otra región' },
];

export function AddressForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({ label: '', region: 'metropolitana', address: '', isDefault: false });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = addressSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    await fetch('/api/account/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
    });

    setForm({ label: '', region: 'metropolitana', address: '', isDefault: false });
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card flex flex-col gap-4 p-6">
      <h3 className="font-bold">Nueva dirección</h3>
      <div>
        <label htmlFor="label">Nombre de la dirección</label>
        <input id="label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.label && <p className="text-sm text-red-500">{errors.label}</p>}
      </div>
      <div>
        <label htmlFor="region">Región</label>
        <select id="region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="rounded-full bg-transparent px-3 py-2">
          {REGIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="address">Dirección</label>
        <input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
        Usar como predeterminada
      </label>
      <button type="submit" className="rounded-full bg-brand py-3 font-semibold text-white">
        Guardar dirección
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- AddressForm`
Expected: PASS (2 tests)

- [ ] **Step 5: Implement AddressList and OrderHistoryList**

Create `components/account/AddressList.tsx`:

```tsx
'use client';

import type { Address } from '@/lib/supabase/queries';

const REGION_LABELS: Record<string, string> = {
  metropolitana: 'Región Metropolitana',
  valparaiso: 'Valparaíso',
  biobio: 'Biobío',
  araucania: 'Araucanía',
  'los-lagos': 'Los Lagos',
  otra: 'Otra región',
};

export function AddressList({ addresses, onChange }: { addresses: Address[]; onChange: () => void }) {
  async function handleDelete(id: string) {
    await fetch(`/api/account/addresses?id=${id}`, { method: 'DELETE' });
    onChange();
  }

  if (addresses.length === 0) {
    return <p>Aún no tienes direcciones guardadas.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {addresses.map((addr) => (
        <li key={addr.id} className="glass-surface flex items-center justify-between rounded-2xl p-4">
          <div>
            <p className="font-semibold">
              {addr.label} {addr.isDefault && <span className="text-xs opacity-70">(predeterminada)</span>}
            </p>
            <p className="text-sm opacity-80">{REGION_LABELS[addr.region]} — {addr.address}</p>
          </div>
          <button onClick={() => handleDelete(addr.id)} className="text-sm text-red-500">
            Eliminar
          </button>
        </li>
      ))}
    </ul>
  );
}
```

Create `components/account/OrderHistoryList.tsx`:

```tsx
import type { OrderSummary } from '@/lib/supabase/queries';

export function OrderHistoryList({ orders }: { orders: OrderSummary[] }) {
  if (orders.length === 0) {
    return <p>Aún no tienes pedidos.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {orders.map((order) => (
        <li key={order.id} className="glass-surface flex items-center justify-between rounded-2xl p-4">
          <div>
            <p className="font-semibold">Pedido {order.id.slice(0, 8)}</p>
            <p className="text-sm opacity-80">{new Date(order.createdAt).toLocaleDateString('es-CL')} — {order.status}</p>
          </div>
          <p className="font-bold">${order.totalClp.toLocaleString('es-CL')}</p>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 6: Implement the addresses API route**

Create `app/api/account/addresses/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { createAddress, deleteAddress } from '@/lib/supabase/queries';
import { addressSchema } from '@/lib/validation/address-schema';

export async function POST(request: Request) {
  const client = await createServerSupabaseClient();
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json();
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  const id = await createAddress(client, { userId: userData.user.id, ...parsed.data });
  return NextResponse.json({ id });
}

export async function DELETE(request: Request) {
  const client = await createServerSupabaseClient();
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 });

  await deleteAddress(client, id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 7: Implement the /cuenta page (Server Component, fetches then renders client children)**

Create `app/cuenta/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { fetchOrdersForUser, fetchAddresses } from '@/lib/supabase/queries';
import { OrderHistoryList } from '@/components/account/OrderHistoryList';
import { AddressList } from '@/components/account/AddressList';
import { AddressForm } from '@/components/account/AddressForm';

export default async function CuentaPage() {
  const client = await createServerSupabaseClient();
  const { data: userData } = await client.auth.getUser();

  if (!userData.user) redirect('/cuenta/login');

  const [orders, addresses] = await Promise.all([
    fetchOrdersForUser(client, userData.user.id, userData.user.email ?? ''),
    fetchAddresses(client, userData.user.id),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
        Mi cuenta
      </h1>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold">Mis pedidos</h2>
        <OrderHistoryList orders={orders} />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Mis direcciones</h2>
        <AddressList addresses={addresses} onChange={() => {}} />
        <div className="mt-4">
          <AddressForm onSaved={() => {}} />
        </div>
      </section>
    </main>
  );
}
```

> Note for the implementer: `onChange`/`onSaved` are no-ops here because this page is a Server Component — `AddressList` and `AddressForm` re-fetch via the API route but the page itself won't re-render without a client-side refresh. This is acceptable for this phase (the user sees the updated list after a manual page reload); a live-refresh version would need to convert this page's data-fetching into a Client Component with `router.refresh()`, which is a reasonable follow-up but out of scope here per the plan's spec.

- [ ] **Step 8: Run the full suite**

Run: `npm test`
Expected: All tests pass, including the new ones from this task.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add /cuenta page with order history and address management"
```

---

### Task 9: Checkout pre-fill and saved-address picker for logged-in customers

**Files:**
- Modify: `components/checkout/ShippingStep.tsx`
- Modify: `components/checkout/DeliveryStep.tsx`
- Modify: `app/checkout/page.tsx`
- Test: `components/checkout/DeliveryStep.test.tsx` (extend with a saved-addresses case)

**Interfaces:**
- Consumes: `createBrowserSupabaseClient` (Task 1), `fetchAddresses` (Task 3).
- Produces: `<ShippingStep onContinue={fn} initialValues?={{ name, email }} />`, `<DeliveryStep onContinue={fn} savedAddresses?={Address[]} />` — both gain an optional prop, backward compatible with their Fase 1 signatures (guest flow passes nothing, behaves identically).

- [ ] **Step 1: Write the failing test for DeliveryStep's saved-address picker**

Modify `components/checkout/DeliveryStep.test.tsx` — add a new test:

```tsx
it('lets the user pick a saved address instead of typing one', async () => {
  const user = userEvent.setup();
  const onContinue = vi.fn();
  const savedAddresses = [
    { id: 'a1', userId: 'u1', label: 'Casa', region: 'valparaiso', address: 'Calle Falsa 456', isDefault: true },
  ];

  render(<DeliveryStep onContinue={onContinue} savedAddresses={savedAddresses} />);

  await user.click(screen.getByLabelText('Despacho a domicilio'));
  await user.click(screen.getByRole('button', { name: /usar esta dirección/i }));

  expect(onContinue).toHaveBeenCalledWith(
    { method: 'domicilio', region: 'valparaiso', address: 'Calle Falsa 456' },
    4500
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- DeliveryStep`
Expected: FAIL — `savedAddresses` prop and the "Usar esta dirección" button don't exist yet.

- [ ] **Step 3: Update DeliveryStep**

Modify `components/checkout/DeliveryStep.tsx` — replace the full file with:

```tsx
'use client';

import { useState } from 'react';
import { calculateShippingCost, type Region } from '@/lib/shipping/shipping-cost';
import type { DeliveryInput } from '@/lib/validation/checkout-schema';
import type { Address } from '@/lib/supabase/queries';

const REGIONS: { value: Region; label: string }[] = [
  { value: 'metropolitana', label: 'Región Metropolitana' },
  { value: 'valparaiso', label: 'Valparaíso' },
  { value: 'biobio', label: 'Biobío' },
  { value: 'araucania', label: 'Araucanía' },
  { value: 'los-lagos', label: 'Los Lagos' },
  { value: 'otra', label: 'Otra región' },
];

export function DeliveryStep({
  onContinue,
  savedAddresses = [],
}: {
  onContinue: (data: DeliveryInput, cost: number) => void;
  savedAddresses?: Address[];
}) {
  const [method, setMethod] = useState<'domicilio' | 'retiro'>('domicilio');
  const [region, setRegion] = useState<Region>('metropolitana');
  const [address, setAddress] = useState('');
  const [useManualEntry, setUseManualEntry] = useState(savedAddresses.length === 0);

  const cost = method === 'retiro' ? 0 : calculateShippingCost('domicilio', region);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (method === 'retiro') {
      onContinue({ method: 'retiro' }, 0);
    } else {
      onContinue({ method: 'domicilio', region, address }, cost);
    }
  }

  function useSavedAddress(saved: Address) {
    const savedCost = calculateShippingCost('domicilio', saved.region as Region);
    onContinue({ method: 'domicilio', region: saved.region as Region, address: saved.address }, savedCost);
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card flex flex-col gap-4 p-6">
      <h2 className="text-lg font-bold">Método de entrega</h2>

      <label className="flex items-center gap-2">
        <input
          type="radio"
          name="delivery"
          checked={method === 'domicilio'}
          onChange={() => setMethod('domicilio')}
        />
        Despacho a domicilio
      </label>

      {method === 'domicilio' && !useManualEntry && savedAddresses.length > 0 && (
        <div className="flex flex-col gap-3 pl-6">
          {savedAddresses.map((saved) => (
            <div key={saved.id} className="glass-surface flex items-center justify-between rounded-xl p-3">
              <div>
                <p className="font-semibold">{saved.label}</p>
                <p className="text-sm opacity-80">{saved.address}</p>
              </div>
              <button type="button" onClick={() => useSavedAddress(saved)} className="rounded-full bg-brand px-3 py-1 text-sm text-white">
                Usar esta dirección
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setUseManualEntry(true)} className="text-left text-sm underline">
            Usar otra dirección
          </button>
        </div>
      )}

      {method === 'domicilio' && useManualEntry && (
        <div className="flex flex-col gap-3 pl-6">
          <label htmlFor="region">Región</label>
          <select id="region" value={region} onChange={(e) => setRegion(e.target.value as Region)} className="rounded-full bg-transparent px-3 py-2">
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <label htmlFor="address">Dirección</label>
          <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-full bg-transparent px-4 py-2" />
        </div>
      )}

      <label className="flex items-center gap-2">
        <input
          type="radio"
          name="delivery"
          checked={method === 'retiro'}
          onChange={() => setMethod('retiro')}
        />
        Retiro en punto físico
      </label>

      <p className="font-bold">Costo de envío: <span>${cost.toLocaleString('es-CL')}</span></p>

      {(method === 'retiro' || useManualEntry) && (
        <button type="submit" className="rounded-full bg-brand py-3 font-semibold text-white">
          Continuar
        </button>
      )}
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- DeliveryStep`
Expected: PASS (3 tests — the 2 original Fase 1 tests plus the new one)

- [ ] **Step 5: Update ShippingStep to accept optional pre-filled values**

Modify `components/checkout/ShippingStep.tsx` — change the function signature and initial state:

```tsx
export function ShippingStep({
  onContinue,
  initialValues,
}: {
  onContinue: (data: ShippingInfoInput) => void;
  initialValues?: { name: string; email: string };
}) {
  const [form, setForm] = useState({ name: initialValues?.name ?? '', email: initialValues?.email ?? '', phone: '' });
```

(the rest of the component is unchanged — only the function signature and the `useState` initializer change).

- [ ] **Step 6: Wire session + saved addresses into the checkout page**

Modify `app/checkout/page.tsx` — replace the full file with:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/lib/cart/cart-store';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-client';
import { fetchAddresses, type Address } from '@/lib/supabase/queries';
import type { ShippingInfoInput, DeliveryInput, PaymentMethodInput } from '@/lib/validation/checkout-schema';
import { ShippingStep } from '@/components/checkout/ShippingStep';
import { DeliveryStep } from '@/components/checkout/DeliveryStep';
import { PaymentStep } from '@/components/checkout/PaymentStep';
import { ConfirmationScreen } from '@/components/checkout/ConfirmationScreen';

type Step = 'shipping' | 'delivery' | 'payment' | 'done';

export default function CheckoutPage() {
  const [step, setStep] = useState<Step>('shipping');
  const [shipping, setShipping] = useState<ShippingInfoInput | null>(null);
  const [delivery, setDelivery] = useState<{ data: DeliveryInput; cost: number } | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<{ name: string; email: string } | undefined>();
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);

  const items = useCartStore((state) => state.items);
  const subtotalClp = useCartStore((state) => state.subtotalClp());
  const clear = useCartStore((state) => state.clear);

  useEffect(() => {
    const client = createBrowserSupabaseClient();

    async function loadSessionData() {
      try {
        const { data } = await client.auth.getSession();
        const user = data.session?.user;
        if (!user) return;

        setInitialValues({ name: (user.user_metadata?.name as string) ?? '', email: user.email ?? '' });
        const addresses = await fetchAddresses(client, user.id);
        setSavedAddresses(addresses);
      } catch {
        // No session — guest checkout proceeds with empty defaults, unchanged from Fase 1.
      }
    }

    loadSessionData();
  }, []);

  async function handlePaymentConfirm(paymentMethod: PaymentMethodInput) {
    if (!shipping || !delivery) return;

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: shipping.name,
        customerEmail: shipping.email,
        customerPhone: shipping.phone,
        deliveryMethod: delivery.data.method,
        region: delivery.data.method === 'domicilio' ? delivery.data.region : undefined,
        address: delivery.data.method === 'domicilio' ? delivery.data.address : undefined,
        shippingCostClp: delivery.cost,
        paymentMethod,
        subtotalClp,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPriceClp: i.unitPriceClp })),
      }),
    });

    const result = await response.json();
    setOrderId(result.orderId);
    clear();
    setStep('done');
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
        Checkout
      </h1>

      {step === 'shipping' && (
        <ShippingStep initialValues={initialValues} onContinue={(data) => { setShipping(data); setStep('delivery'); }} />
      )}
      {step === 'delivery' && (
        <DeliveryStep savedAddresses={savedAddresses} onContinue={(data, cost) => { setDelivery({ data, cost }); setStep('payment'); }} />
      )}
      {step === 'payment' && <PaymentStep onConfirm={handlePaymentConfirm} />}
      {step === 'done' && orderId && <ConfirmationScreen orderId={orderId} />}
    </main>
  );
}
```

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: PASS — the guest-flow assertions in the original checkout tests still hold since `initialValues`/`savedAddresses` default to empty/undefined.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: pre-fill checkout and offer saved addresses for logged-in customers"
```

---

### Task 10: Admin layout guard and category CRUD

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `lib/validation/category-admin-schema.ts`
- Test: `lib/validation/category-admin-schema.test.ts`
- Create: `components/admin/AdminCategoryForm.tsx`
- Create: `components/admin/AdminCategoryTable.tsx`
- Create: `app/api/admin/categories/route.ts`
- Create: `app/admin/categorias/page.tsx`

**Interfaces:**
- Consumes: `requireAdmin` (Task 2), `createServerSupabaseClient` (Task 1).
- Produces: `categoryAdminSchema` (Zod), `<AdminCategoryForm onSaved={fn} />`, `<AdminCategoryTable categories={CategoryRow[]} onChange={fn} />`. Consumed by Task 12 (product form's category selector reuses the same category row shape).

- [ ] **Step 1: Implement the admin layout guard**

Create `app/admin/layout.tsx`:

```tsx
import { requireAdmin } from '@/lib/auth/require-admin';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <nav className="mb-6 flex gap-4 text-sm font-semibold">
        <a href="/admin/productos">Productos</a>
        <a href="/admin/categorias">Categorías</a>
        <a href="/admin/pedidos">Pedidos</a>
      </nav>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Write the failing test for the category schema**

Create `lib/validation/category-admin-schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { categoryAdminSchema } from './category-admin-schema';

describe('categoryAdminSchema', () => {
  it('accepts a valid category', () => {
    expect(categoryAdminSchema.safeParse({ slug: 'llaveros', name: 'Llaveros' }).success).toBe(true);
  });

  it('rejects a slug with spaces or uppercase', () => {
    expect(categoryAdminSchema.safeParse({ slug: 'Mi Categoria', name: 'Mi Categoria' }).success).toBe(false);
  });

  it('rejects an empty name', () => {
    expect(categoryAdminSchema.safeParse({ slug: 'llaveros', name: '' }).success).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- category-admin-schema`
Expected: FAIL — `./category-admin-schema` doesn't exist.

- [ ] **Step 4: Implement the category schema**

Create `lib/validation/category-admin-schema.ts`:

```ts
import { z } from 'zod';

export const categoryAdminSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'El slug solo puede tener minúsculas, números y guiones'),
  name: z.string().min(2, 'El nombre es muy corto'),
});

export type CategoryAdminInput = z.infer<typeof categoryAdminSchema>;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- category-admin-schema`
Expected: PASS (3 tests)

- [ ] **Step 6: Implement AdminCategoryForm and AdminCategoryTable**

Create `components/admin/AdminCategoryForm.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { categoryAdminSchema } from '@/lib/validation/category-admin-schema';

export function AdminCategoryForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({ slug: '', name: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = categoryAdminSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
    });

    setForm({ slug: '', name: '' });
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card flex flex-col gap-4 p-6">
      <h3 className="font-bold">Nueva categoría</h3>
      <div>
        <label htmlFor="name">Nombre</label>
        <input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="slug">Slug (sin espacios, minúsculas)</label>
        <input id="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.slug && <p className="text-sm text-red-500">{errors.slug}</p>}
      </div>
      <button type="submit" className="rounded-full bg-brand py-3 font-semibold text-white">
        Crear categoría
      </button>
    </form>
  );
}
```

Create `components/admin/AdminCategoryTable.tsx`:

```tsx
'use client';

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
}

export function AdminCategoryTable({ categories, onChange }: { categories: CategoryRow[]; onChange: () => void }) {
  async function handleDelete(id: string) {
    const response = await fetch(`/api/admin/categories?id=${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const body = await response.json();
      alert(body.error ?? 'No se pudo eliminar la categoría.');
      return;
    }
    onChange();
  }

  return (
    <table className="w-full text-left">
      <thead>
        <tr>
          <th className="pb-2">Nombre</th>
          <th className="pb-2">Slug</th>
          <th className="pb-2"></th>
        </tr>
      </thead>
      <tbody>
        {categories.map((cat) => (
          <tr key={cat.id} className="border-t border-white/10">
            <td className="py-2">{cat.name}</td>
            <td className="py-2">{cat.slug}</td>
            <td className="py-2 text-right">
              <button onClick={() => handleDelete(cat.id)} className="text-sm text-red-500">
                Eliminar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 7: Implement the categories admin API route**

Create `app/api/admin/categories/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/require-admin';
import { categoryAdminSchema } from '@/lib/validation/category-admin-schema';

export async function POST(request: Request) {
  await requireAdmin();
  const client = await createServerSupabaseClient();

  const body = await request.json();
  const parsed = categoryAdminSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  const { error } = await client.from('categories').insert(parsed.data);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  await requireAdmin();
  const client = await createServerSupabaseClient();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 });

  const { count } = await client.from('products').select('id', { count: 'exact', head: true }).eq('category_id', id);
  if (count && count > 0) {
    return NextResponse.json({ error: 'No se puede eliminar: hay productos en esta categoría.' }, { status: 400 });
  }

  const { error } = await client.from('categories').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 8: Implement the categorias admin page**

Create `app/admin/categorias/page.tsx`:

```tsx
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { AdminCategoryForm } from '@/components/admin/AdminCategoryForm';
import { AdminCategoryTable } from '@/components/admin/AdminCategoryTable';

export default async function AdminCategoriasPage() {
  const client = await createServerSupabaseClient();
  const { data: categories } = await client.from('categories').select('id, slug, name').order('name');

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
        Categorías
      </h1>
      <AdminCategoryTable categories={categories ?? []} onChange={() => {}} />
      <div className="mt-6">
        <AdminCategoryForm onSaved={() => {}} />
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add admin layout guard and category CRUD"
```

---

### Task 11: Product image upload to Supabase Storage

**Files:**
- Create: `supabase/migrations/0007_storage_product_images.sql`
- Create: `lib/supabase/storage.ts`
- Test: `lib/supabase/storage.test.ts`

**Interfaces:**
- Consumes: `SupabaseClient` (browser-side, from Task 1).
- Produces: `uploadProductImage(client, file): Promise<string>` — uploads to the `product-images` bucket and returns the public URL. Consumed by Task 12 (`AdminProductForm`).

> No automated test for the storage bucket/policies themselves — Storage policies are verified manually (Task 14's checklist). The `uploadProductImage` helper function does get a unit test.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0007_storage_product_images.sql`:

```sql
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true);

create policy "Public can view product images" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "Admins can upload product images" on storage.objects
  for insert with check (
    bucket_id = 'product-images'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can delete product images" on storage.objects
  for delete using (
    bucket_id = 'product-images'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
```

- [ ] **Step 2: Write the failing test for uploadProductImage**

Create `lib/supabase/storage.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { uploadProductImage } from './storage';

describe('uploadProductImage', () => {
  it('uploads the file to the product-images bucket and returns the public URL', async () => {
    const upload = vi.fn(async () => ({ data: { path: 'llavero-nuevo-123.png' }, error: null }));
    const getPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://x.supabase.co/storage/v1/object/public/product-images/llavero-nuevo-123.png' } }));
    const client = { storage: { from: vi.fn(() => ({ upload, getPublicUrl })) } } as any;

    const file = new File(['fake-image-bytes'], 'llavero-nuevo.png', { type: 'image/png' });
    const url = await uploadProductImage(client, file);

    expect(client.storage.from).toHaveBeenCalledWith('product-images');
    expect(upload).toHaveBeenCalledWith(expect.stringMatching(/llavero-nuevo/), file, { upsert: false });
    expect(url).toBe('https://x.supabase.co/storage/v1/object/public/product-images/llavero-nuevo-123.png');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- storage`
Expected: FAIL — `./storage` doesn't exist.

- [ ] **Step 4: Implement uploadProductImage**

Create `lib/supabase/storage.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export async function uploadProductImage(client: SupabaseClient, file: File): Promise<string> {
  const path = `${Date.now()}-${file.name}`;

  const { error } = await client.storage.from('product-images').upload(path, file, { upsert: false });
  if (error) throw error;

  const { data } = client.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- storage`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add product image upload to Supabase Storage"
```

---

### Task 12: Product CRUD admin page

**Files:**
- Create: `lib/validation/product-admin-schema.ts`
- Test: `lib/validation/product-admin-schema.test.ts`
- Create: `components/admin/AdminProductForm.tsx`
- Create: `components/admin/AdminProductTable.tsx`
- Create: `app/api/admin/products/route.ts`
- Create: `app/admin/productos/page.tsx`

**Interfaces:**
- Consumes: `requireAdmin` (Task 2), `uploadProductImage` (Task 11), `createBrowserSupabaseClient` (Task 1), category rows (same shape as Task 10).
- Produces: `productAdminSchema` (Zod), `<AdminProductForm categories={CategoryOption[]} onSaved={fn} />`, `<AdminProductTable products={ProductRow[]} onChange={fn} />`.

- [ ] **Step 1: Write the failing test for the product schema**

Create `lib/validation/product-admin-schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { productAdminSchema } from './product-admin-schema';

describe('productAdminSchema', () => {
  it('accepts a valid product', () => {
    const result = productAdminSchema.safeParse({
      name: 'Llavero Nuevo',
      description: 'Un llavero recién agregado desde el panel admin.',
      priceClp: 4990,
      categoryId: 'cat-1',
      featured: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a price of 0 or less', () => {
    const result = productAdminSchema.safeParse({
      name: 'Llavero Nuevo',
      description: 'Un llavero recién agregado desde el panel admin.',
      priceClp: 0,
      categoryId: 'cat-1',
      featured: false,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a name that is too short', () => {
    const result = productAdminSchema.safeParse({
      name: 'A',
      description: 'Un llavero recién agregado desde el panel admin.',
      priceClp: 4990,
      categoryId: 'cat-1',
      featured: false,
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- product-admin-schema`
Expected: FAIL — `./product-admin-schema` doesn't exist.

- [ ] **Step 3: Implement the product schema**

Create `lib/validation/product-admin-schema.ts`:

```ts
import { z } from 'zod';

export const productAdminSchema = z.object({
  name: z.string().min(2, 'El nombre es muy corto'),
  description: z.string().min(10, 'Cuéntanos más sobre el producto'),
  priceClp: z.number().int().positive('El precio debe ser mayor a 0'),
  categoryId: z.string().min(1, 'Elige una categoría'),
  featured: z.boolean(),
});

export type ProductAdminInput = z.infer<typeof productAdminSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- product-admin-schema`
Expected: PASS (3 tests)

- [ ] **Step 5: Implement AdminProductForm**

Create `components/admin/AdminProductForm.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { productAdminSchema } from '@/lib/validation/product-admin-schema';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-client';
import { uploadProductImage } from '@/lib/supabase/storage';

interface CategoryOption {
  id: string;
  name: string;
}

export function AdminProductForm({ categories, onSaved }: { categories: CategoryOption[]; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    priceClp: '',
    categoryId: categories[0]?.id ?? '',
    featured: false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = productAdminSchema.safeParse({
      name: form.name,
      description: form.description,
      priceClp: Number(form.priceClp),
      categoryId: form.categoryId,
      featured: form.featured,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    let imageUrl: string | undefined;
    if (file) {
      const client = createBrowserSupabaseClient();
      imageUrl = await uploadProductImage(client, file);
    }

    await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...result.data, imageUrl }),
    });

    setSubmitting(false);
    setForm({ name: '', description: '', priceClp: '', categoryId: categories[0]?.id ?? '', featured: false });
    setFile(null);
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card flex flex-col gap-4 p-6">
      <h3 className="font-bold">Nuevo producto</h3>
      <div>
        <label htmlFor="name">Nombre</label>
        <input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="description">Descripción</label>
        <textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-2xl bg-transparent px-4 py-2" />
        {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
      </div>
      <div>
        <label htmlFor="priceClp">Precio (CLP)</label>
        <input id="priceClp" type="number" value={form.priceClp} onChange={(e) => setForm({ ...form, priceClp: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.priceClp && <p className="text-sm text-red-500">{errors.priceClp}</p>}
      </div>
      <div>
        <label htmlFor="categoryId">Categoría</label>
        <select id="categoryId" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="rounded-full bg-transparent px-3 py-2">
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {errors.categoryId && <p className="text-sm text-red-500">{errors.categoryId}</p>}
      </div>
      <div>
        <label htmlFor="image">Imagen</label>
        <input id="image" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full" />
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
        Destacado
      </label>
      <button type="submit" disabled={submitting} className="rounded-full bg-brand py-3 font-semibold text-white disabled:opacity-50">
        {submitting ? 'Guardando...' : 'Crear producto'}
      </button>
    </form>
  );
}
```

- [ ] **Step 6: Implement AdminProductTable**

Create `components/admin/AdminProductTable.tsx`:

```tsx
'use client';

interface ProductRow {
  id: string;
  name: string;
  price_clp: number;
  featured: boolean;
}

export function AdminProductTable({ products, onChange }: { products: ProductRow[]; onChange: () => void }) {
  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
    await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE' });
    onChange();
  }

  return (
    <table className="w-full text-left">
      <thead>
        <tr>
          <th className="pb-2">Nombre</th>
          <th className="pb-2">Precio</th>
          <th className="pb-2">Destacado</th>
          <th className="pb-2"></th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => (
          <tr key={p.id} className="border-t border-white/10">
            <td className="py-2">{p.name}</td>
            <td className="py-2">${p.price_clp.toLocaleString('es-CL')}</td>
            <td className="py-2">{p.featured ? 'Sí' : 'No'}</td>
            <td className="py-2 text-right">
              <button onClick={() => handleDelete(p.id)} className="text-sm text-red-500">
                Eliminar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 7: Implement the products admin API route**

Create `app/api/admin/products/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/require-admin';
import { productAdminSchema } from '@/lib/validation/product-admin-schema';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function POST(request: Request) {
  await requireAdmin();
  const client = await createServerSupabaseClient();

  const body = await request.json();
  const parsed = productAdminSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  const { error } = await client.from('products').insert({
    slug: `${slugify(parsed.data.name)}-${Date.now()}`,
    name: parsed.data.name,
    description: parsed.data.description,
    price_clp: parsed.data.priceClp,
    category_id: parsed.data.categoryId,
    image_url: body.imageUrl ?? '/products/placeholder.svg',
    featured: parsed.data.featured,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  await requireAdmin();
  const client = await createServerSupabaseClient();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 });

  const { error } = await client.from('products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 8: Implement the productos admin page**

Create `app/admin/productos/page.tsx`:

```tsx
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { AdminProductForm } from '@/components/admin/AdminProductForm';
import { AdminProductTable } from '@/components/admin/AdminProductTable';

export default async function AdminProductosPage() {
  const client = await createServerSupabaseClient();
  const [{ data: products }, { data: categories }] = await Promise.all([
    client.from('products').select('id, name, price_clp, featured').order('name'),
    client.from('categories').select('id, name').order('name'),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
        Productos
      </h1>
      <AdminProductTable products={products ?? []} onChange={() => {}} />
      <div className="mt-6">
        <AdminProductForm categories={categories ?? []} onSaved={() => {}} />
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add admin product CRUD with image upload"
```

---

### Task 13: Admin order management (view all, change status)

**Files:**
- Create: `components/admin/AdminOrderTable.tsx`
- Create: `components/admin/AdminOrderDetail.tsx`
- Test: `components/admin/AdminOrderDetail.test.tsx`
- Create: `app/api/admin/orders/[id]/route.ts`
- Create: `app/admin/pedidos/page.tsx`

**Interfaces:**
- Consumes: `requireAdmin` (Task 2), `createServerSupabaseClient` (Task 1).
- Produces: `<AdminOrderTable orders={OrderRow[]} />`, `<AdminOrderDetail order={OrderDetail} onStatusChanged={fn} />`.

- [ ] **Step 1: Write the failing test for AdminOrderDetail's status update**

Create `components/admin/AdminOrderDetail.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminOrderDetail } from './AdminOrderDetail';

const order = {
  id: 'order-1',
  customerName: 'Pablo Toro',
  customerEmail: 'pablo@example.com',
  status: 'pendiente_pago',
  totalClp: 7490,
  region: 'metropolitana',
  address: 'Av. Siempre Viva 123',
};

describe('AdminOrderDetail', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  });

  it('shows the customer and order details', () => {
    render(<AdminOrderDetail order={order} onStatusChanged={vi.fn()} />);
    expect(screen.getByText('Pablo Toro')).toBeInTheDocument();
    expect(screen.getByText(/7\.490/)).toBeInTheDocument();
  });

  it('updates the status via the API when changed', async () => {
    const user = userEvent.setup();
    const onStatusChanged = vi.fn();
    render(<AdminOrderDetail order={order} onStatusChanged={onStatusChanged} />);

    await user.selectOptions(screen.getByLabelText('Estado'), 'pagado');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/orders/order-1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'pagado' }) })
    );
    await vi.waitFor(() => expect(onStatusChanged).toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- AdminOrderDetail`
Expected: FAIL — `./AdminOrderDetail` doesn't exist.

- [ ] **Step 3: Implement AdminOrderDetail**

Create `components/admin/AdminOrderDetail.tsx`:

```tsx
'use client';

interface OrderDetail {
  id: string;
  customerName: string;
  customerEmail: string;
  status: string;
  totalClp: number;
  region: string | null;
  address: string | null;
}

const STATUSES = ['pendiente_pago', 'pagado', 'enviado', 'entregado', 'cancelado'];

export function AdminOrderDetail({ order, onStatusChanged }: { order: OrderDetail; onStatusChanged: () => void }) {
  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    await fetch(`/api/admin/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: e.target.value }),
    });
    onStatusChanged();
  }

  return (
    <div className="glass-card flex flex-col gap-2 p-6">
      <p className="font-bold">{order.customerName}</p>
      <p className="text-sm opacity-80">{order.customerEmail}</p>
      {order.address && <p className="text-sm opacity-80">{order.address}</p>}
      <p className="font-bold">${order.totalClp.toLocaleString('es-CL')}</p>
      <label htmlFor="status">Estado</label>
      <select id="status" defaultValue={order.status} onChange={handleStatusChange} className="rounded-full bg-transparent px-3 py-2">
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- AdminOrderDetail`
Expected: PASS (2 tests)

- [ ] **Step 5: Implement AdminOrderTable**

Create `components/admin/AdminOrderTable.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { AdminOrderDetail } from './AdminOrderDetail';

interface OrderRow {
  id: string;
  customerName: string;
  customerEmail: string;
  status: string;
  totalClp: number;
  region: string | null;
  address: string | null;
}

export function AdminOrderTable({ orders }: { orders: OrderRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {orders.map((order) => (
        <div key={order.id}>
          <button
            onClick={() => setOpenId(openId === order.id ? null : order.id)}
            className="glass-surface flex w-full items-center justify-between rounded-2xl p-4 text-left"
          >
            <span>{order.customerName} — {order.id.slice(0, 8)}</span>
            <span>{order.status}</span>
          </button>
          {openId === order.id && (
            <div className="mt-2">
              <AdminOrderDetail order={order} onStatusChanged={() => {}} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Implement the order status update API route**

Create `app/api/admin/orders/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/require-admin';

const VALID_STATUSES = ['pendiente_pago', 'pagado', 'enviado', 'entregado', 'cancelado'];

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  await requireAdmin();
  const client = await createServerSupabaseClient();

  const body = await request.json();
  if (!VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
  }

  const { error } = await client.from('orders').update({ status: body.status }).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 7: Implement the pedidos admin page**

Create `app/admin/pedidos/page.tsx`:

```tsx
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { AdminOrderTable } from '@/components/admin/AdminOrderTable';

export default async function AdminPedidosPage() {
  const client = await createServerSupabaseClient();
  const { data: orders } = await client
    .from('orders')
    .select('id, customer_name, customer_email, status, total_clp, region, address')
    .order('created_at', { ascending: false });

  const rows = (orders ?? []).map((o: any) => ({
    id: o.id,
    customerName: o.customer_name,
    customerEmail: o.customer_email,
    status: o.status,
    totalClp: o.total_clp,
    region: o.region,
    address: o.address,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
        Pedidos
      </h1>
      <AdminOrderTable orders={rows} />
    </div>
  );
}
```

- [ ] **Step 8: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add admin order management with status updates"
```

---

### Task 14: Manual verification and rollout

**Files:** none (verification task, no source files)

- [ ] **Step 1: Run the full automated suite one more time**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: compiles, type-checks, and lints clean (matching the standard already established in Fase 1 — fix any `react/no-unescaped-entities` or similar lint errors the same way Fase 1's `PaymentStep.tsx` fix did, if any appear).

- [ ] **Step 3: Run migrations 0004-0007 in order in the Supabase SQL Editor**

Run `0004_profiles_and_trigger.sql`, then `0005_addresses.sql`, then `0006_orders_user_id_and_rls_rework.sql`, then `0007_storage_product_images.sql`, each in its own Run.

- [ ] **Step 4: Register the owner account and grant admin**

Sign up at `/cuenta/registro` with the owner's real email, confirm the email, then in the Supabase SQL Editor run:

```sql
update profiles set role = 'admin' where email = '<owner email>';
```

- [ ] **Step 5: Manual smoke test checklist**

1. Log in as the owner — confirm "Panel Admin" appears in the header.
2. `/admin/productos` — create a product with an uploaded image, confirm it appears in `/catalogo`.
3. `/admin/categorias` — try deleting a category that has products; confirm it's blocked with a clear message.
4. `/admin/pedidos` — open an order, change its status, confirm it persists on reload.
5. Log out, register a second, non-admin test account — confirm `/admin/productos` returns a 404, and no "Panel Admin" link appears.
6. As a guest (logged out), complete a checkout — confirm it still works exactly as before.
7. Register a customer account using the same email used in step 6's guest checkout — confirm that guest order now appears under "Mis pedidos".
8. Add a saved address as a logged-in customer, then start a new checkout — confirm the saved address appears as a one-click option in the delivery step.

- [ ] **Step 6: Push to deploy**

```bash
git push origin master
```

Vercel auto-deploys; confirm the smoke test checklist (Step 5) also passes against the live `madlayerz.cl` deployment, not just locally.
