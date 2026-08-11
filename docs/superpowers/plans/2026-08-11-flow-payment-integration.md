# Flow Payment Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the simulated checkout payment step with a real Flow payment integration: redirect the user to Flow to pay, verify the result server-side, and update the order status accordingly.

**Architecture:** The checkout creates the order as today (`status='pendiente_pago'`), then calls a new server route that creates a Flow payment and redirects the browser to Flow. Flow calls a webhook route when the payment resolves; that route re-verifies the payment status directly against Flow's API (never trusting the webhook payload) and updates `orders.status` using a Supabase service-role client. A new `/checkout/resultado` page polls order status and shows success/failure/pending UI, clearing the cart only on confirmed payment.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (`@supabase/supabase-js`), Zustand (cart store), Vitest + Testing Library, Node's built-in `crypto` for HMAC signing.

## Global Constraints

- Only **Flow** is integrated now; Mercado Pago stays selectable-looking but disabled ("Próximamente") in the UI.
- Redirect flow only (no embedded iframe/modal for Flow's payment form).
- The cart is cleared **only** when `orders.status` becomes `'pagado'`, never at order creation.
- Target Flow's **sandbox** environment first (`FLOW_API_URL=https://sandbox.flow.cl/api`); production URL is `https://www.flow.cl/api`, swapped later via env vars only.
- `orders.status` is written **only** from server code using the Supabase service-role client (`SUPABASE_SERVICE_ROLE_KEY`) — never from the browser, never trusting client-supplied status.
- The webhook must never trust data from the incoming request beyond the Flow `token`; the authoritative payment status always comes from a fresh `payment/getStatus` call to Flow signed with `FLOW_SECRET_KEY`.
- The webhook always responds `200` (Flow retries on non-200), even when the order can't be resolved or is still pending.
- DB columns already exist in production (`orders.flow_token`, `orders.flow_order_number`, `orders.paid_at`, unique partial index `orders_flow_token_idx`) per `supabase/migrations/0009_flow_payments.sql` — no further migration needed in this plan.
- Follow existing repo conventions: business logic lives in small `lib/` functions with unit tests (mocked Supabase client / mocked `fetch`); Next.js `route.ts` files stay thin wiring and are not unit-tested individually (matches the existing `app/api/*/route.ts` files, none of which have `.test.ts` siblings).

---

### Task 1: Service-role Supabase client helper

**Files:**
- Create: `lib/supabase/service-client.ts`
- Test: `lib/supabase/service-client.test.ts`

**Interfaces:**
- Consumes: `@supabase/supabase-js`'s `createClient`; env vars `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Produces: `createServiceSupabaseClient(): SupabaseClient` — used by Tasks 5, 6, 7's callers (the route handlers in Tasks 8, 9, 10).

- [ ] **Step 1: Write the failing test**

```typescript
// lib/supabase/service-client.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const createClientMock = vi.fn(() => ({ mocked: true }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

describe('createServiceSupabaseClient', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    createClientMock.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-secret';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('creates a Supabase client with the service-role key', async () => {
    const { createServiceSupabaseClient } = await import('./service-client');
    createServiceSupabaseClient();

    expect(createClientMock).toHaveBeenCalledWith('https://example.supabase.co', 'service-role-secret');
  });

  it('throws when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const { createServiceSupabaseClient } = await import('./service-client');

    expect(() => createServiceSupabaseClient()).toThrow(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    );
  });

  it('throws when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { createServiceSupabaseClient } = await import('./service-client');

    expect(() => createServiceSupabaseClient()).toThrow(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/supabase/service-client.test.ts`
Expected: FAIL — `Cannot find module './service-client'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/supabase/service-client.ts
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

export function createServiceSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceKey);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/supabase/service-client.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/service-client.ts lib/supabase/service-client.test.ts
git commit -m "feat: add Supabase service-role client for server-only payment writes"
```

---

### Task 2: Flow HMAC signature (pure function)

**Files:**
- Create: `lib/payments/flow-signature.ts`
- Test: `lib/payments/flow-signature.test.ts`

**Interfaces:**
- Consumes: Node's built-in `crypto`.
- Produces: `signFlowParams(params: Record<string, string | number>, secretKey: string): string` — used by Task 4's `flow-client.ts`.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/payments/flow-signature.test.ts
import { describe, it, expect } from 'vitest';
import { signFlowParams } from './flow-signature';

describe('signFlowParams', () => {
  it('sorts params alphabetically, excludes any "s" param, and HMAC-SHA256s the concatenation', () => {
    const signature = signFlowParams(
      { apiKey: '123', commerceOrder: 'ORDER1', amount: 1000 },
      'testsecret'
    );

    expect(signature).toBe('a4cf973b44995f6d96dadb83eba31e8bcb46950d3dc467955d9639d760073a9e'.slice(0, 64));
  });

  it('produces the same signature regardless of input key order', () => {
    const a = signFlowParams({ apiKey: '123', commerceOrder: 'ORDER1', amount: 1000 }, 'testsecret');
    const b = signFlowParams({ commerceOrder: 'ORDER1', amount: 1000, apiKey: '123' }, 'testsecret');

    expect(a).toBe(b);
  });

  it('ignores an existing "s" key so re-signing a response is safe', () => {
    const withoutS = signFlowParams({ apiKey: '123', amount: 1000 }, 'testsecret');
    const withS = signFlowParams({ apiKey: '123', amount: 1000, s: 'ignored' }, 'testsecret');

    expect(withS).toBe(withoutS);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/payments/flow-signature.test.ts`
Expected: FAIL — `Cannot find module './flow-signature'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/payments/flow-signature.ts
import crypto from 'crypto';

export function signFlowParams(params: Record<string, string | number>, secretKey: string): string {
  const keys = Object.keys(params)
    .filter((key) => key !== 's')
    .sort();

  const toSign = keys.map((key) => `${key}${params[key]}`).join('');

  return crypto.createHmac('sha256', secretKey).update(toSign).digest('hex');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/payments/flow-signature.test.ts`
Expected: PASS (3 tests) — the fixture signature was computed with this exact algorithm ahead of time (`amount1000apiKey123commerceOrderORDER1` HMAC-SHA256 with key `testsecret`), so it must match on the first correct implementation.

- [ ] **Step 5: Commit**

```bash
git add lib/payments/flow-signature.ts lib/payments/flow-signature.test.ts
git commit -m "feat: add Flow request-signing helper"
```

---

### Task 3: Flow status mapping (pure function)

**Files:**
- Create: `lib/payments/flow-status-mapping.ts`
- Test: `lib/payments/flow-status-mapping.test.ts`

**Interfaces:**
- Consumes: nothing external.
- Produces: `mapFlowStatusToOrderStatus(flowStatus: number): 'pagado' | 'cancelado' | null` — used by Task 6's `process-flow-webhook.ts`. `null` means "still pending, don't touch the order".

- [ ] **Step 1: Write the failing test**

```typescript
// lib/payments/flow-status-mapping.test.ts
import { describe, it, expect } from 'vitest';
import { mapFlowStatusToOrderStatus } from './flow-status-mapping';

describe('mapFlowStatusToOrderStatus', () => {
  it('maps Flow status 2 (paid) to pagado', () => {
    expect(mapFlowStatusToOrderStatus(2)).toBe('pagado');
  });

  it('maps Flow status 3 (rejected) to cancelado', () => {
    expect(mapFlowStatusToOrderStatus(3)).toBe('cancelado');
  });

  it('maps Flow status 4 (cancelled) to cancelado', () => {
    expect(mapFlowStatusToOrderStatus(4)).toBe('cancelado');
  });

  it('maps Flow status 1 (pending) to null', () => {
    expect(mapFlowStatusToOrderStatus(1)).toBeNull();
  });

  it('maps an unknown status to null', () => {
    expect(mapFlowStatusToOrderStatus(99)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/payments/flow-status-mapping.test.ts`
Expected: FAIL — `Cannot find module './flow-status-mapping'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/payments/flow-status-mapping.ts
export type OrderPaymentOutcome = 'pagado' | 'cancelado' | null;

export function mapFlowStatusToOrderStatus(flowStatus: number): OrderPaymentOutcome {
  if (flowStatus === 2) return 'pagado';
  if (flowStatus === 3 || flowStatus === 4) return 'cancelado';
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/payments/flow-status-mapping.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/payments/flow-status-mapping.ts lib/payments/flow-status-mapping.test.ts
git commit -m "feat: add Flow status to order status mapping"
```

---

### Task 4: Flow API client (network wrapper)

**Files:**
- Create: `lib/payments/flow-client.ts`
- Test: `lib/payments/flow-client.test.ts`

**Interfaces:**
- Consumes: `signFlowParams` from Task 2 (`lib/payments/flow-signature.ts`); global `fetch`.
- Produces:
  - `interface FlowConfig { apiUrl: string; apiKey: string; secretKey: string }` — used by Tasks 5, 6 and the route handlers in Tasks 8, 9.
  - `createFlowPayment(config: FlowConfig, input: { commerceOrder: string; subject: string; amount: number; email: string; urlConfirmation: string; urlReturn: string }): Promise<{ url: string; token: string; flowOrder: number }>` — used by Task 5.
  - `getFlowPaymentStatus(config: FlowConfig, token: string): Promise<{ status: number; commerceOrder: string }>` — used by Task 6.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/payments/flow-client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFlowPayment, getFlowPaymentStatus, type FlowConfig } from './flow-client';

const config: FlowConfig = { apiUrl: 'https://sandbox.flow.cl/api', apiKey: 'key123', secretKey: 'secret123' };

describe('createFlowPayment', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('POSTs signed, form-encoded params to payment/create and returns the parsed result', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://sandbox.flow.cl/app/web/pay.php', token: 'tok-abc', flowOrder: 555 }),
    });

    const result = await createFlowPayment(config, {
      commerceOrder: 'order-1',
      subject: 'Pedido MadLayerz #order-1',
      amount: 10000,
      email: 'cliente@example.com',
      urlConfirmation: 'https://madlayerz.cl/api/payments/flow/webhook',
      urlReturn: 'https://madlayerz.cl/checkout/resultado?orderId=order-1',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://sandbox.flow.cl/api/payment/create',
      expect.objectContaining({ method: 'POST' })
    );
    const [, requestInit] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const sentBody = requestInit.body as URLSearchParams;
    expect(sentBody.get('apiKey')).toBe('key123');
    expect(sentBody.get('commerceOrder')).toBe('order-1');
    expect(sentBody.get('s')).toBeTruthy();

    expect(result).toEqual({ url: 'https://sandbox.flow.cl/app/web/pay.php', token: 'tok-abc', flowOrder: 555 });
  });

  it('throws when Flow responds with a non-ok status', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 401 });

    await expect(
      createFlowPayment(config, {
        commerceOrder: 'order-1',
        subject: 'Pedido',
        amount: 1000,
        email: 'a@b.com',
        urlConfirmation: 'https://x/webhook',
        urlReturn: 'https://x/resultado',
      })
    ).rejects.toThrow('Flow payment/create failed with status 401');
  });
});

describe('getFlowPaymentStatus', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('GETs payment/getStatus with a signed query string', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 2, commerceOrder: 'order-1' }),
    });

    const result = await getFlowPaymentStatus(config, 'tok-abc');

    const [calledUrl] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(calledUrl).toContain('https://sandbox.flow.cl/api/payment/getStatus?');
    expect(calledUrl).toContain('token=tok-abc');
    expect(result).toEqual({ status: 2, commerceOrder: 'order-1' });
  });

  it('throws when Flow responds with a non-ok status', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 500 });

    await expect(getFlowPaymentStatus(config, 'tok-abc')).rejects.toThrow(
      'Flow payment/getStatus failed with status 500'
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/payments/flow-client.test.ts`
Expected: FAIL — `Cannot find module './flow-client'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/payments/flow-client.ts
import { signFlowParams } from './flow-signature';

export interface FlowConfig {
  apiUrl: string;
  apiKey: string;
  secretKey: string;
}

export interface CreateFlowPaymentInput {
  commerceOrder: string;
  subject: string;
  amount: number;
  email: string;
  urlConfirmation: string;
  urlReturn: string;
}

export interface CreateFlowPaymentResult {
  url: string;
  token: string;
  flowOrder: number;
}

export interface FlowPaymentStatus {
  status: number;
  commerceOrder: string;
}

function toStringParams(params: Record<string, string | number>): Record<string, string> {
  return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)]));
}

export async function createFlowPayment(
  config: FlowConfig,
  input: CreateFlowPaymentInput
): Promise<CreateFlowPaymentResult> {
  const params: Record<string, string | number> = {
    apiKey: config.apiKey,
    commerceOrder: input.commerceOrder,
    subject: input.subject,
    currency: 'CLP',
    amount: input.amount,
    email: input.email,
    urlConfirmation: input.urlConfirmation,
    urlReturn: input.urlReturn,
  };
  const signature = signFlowParams(params, config.secretKey);
  const body = new URLSearchParams({ ...toStringParams(params), s: signature });

  const response = await fetch(`${config.apiUrl}/payment/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new Error(`Flow payment/create failed with status ${response.status}`);
  }

  return (await response.json()) as CreateFlowPaymentResult;
}

export async function getFlowPaymentStatus(config: FlowConfig, token: string): Promise<FlowPaymentStatus> {
  const params: Record<string, string | number> = { apiKey: config.apiKey, token };
  const signature = signFlowParams(params, config.secretKey);
  const query = new URLSearchParams({ ...toStringParams(params), s: signature });

  const response = await fetch(`${config.apiUrl}/payment/getStatus?${query.toString()}`);

  if (!response.ok) {
    throw new Error(`Flow payment/getStatus failed with status ${response.status}`);
  }

  return (await response.json()) as FlowPaymentStatus;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/payments/flow-client.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/payments/flow-client.ts lib/payments/flow-client.test.ts
git commit -m "feat: add Flow payment/create and payment/getStatus API client"
```

---

### Task 5: Create-flow-payment business logic

**Files:**
- Create: `lib/payments/create-flow-payment.ts`
- Test: `lib/payments/create-flow-payment.test.ts`

**Interfaces:**
- Consumes: `createFlowPayment`, `FlowConfig` from Task 4 (`lib/payments/flow-client.ts`); a `SupabaseClient`-shaped object (`.from('orders')...`).
- Produces: `createFlowPaymentForOrder(client: SupabaseClient, flowConfig: FlowConfig, siteUrl: string, orderId: string): Promise<{ url: string }>` — used by Task 8's route handler. The returned `url` already has `?token=` appended, ready for `window.location.href`.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/payments/create-flow-payment.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as flowClient from './flow-client';
import { createFlowPaymentForOrder } from './create-flow-payment';

const flowConfig = { apiUrl: 'https://sandbox.flow.cl/api', apiKey: 'key', secretKey: 'secret' };
const siteUrl = 'https://madlayerz.cl';

function buildClient(order: Record<string, unknown> | null) {
  const maybeSingle = vi.fn(async () => ({ data: order, error: null }));
  const eqForUpdate = vi.fn(async () => ({ error: null }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const update = vi.fn(() => ({ eq: eqForUpdate }));
  const from = vi.fn(() => ({ select, update }));
  return { client: { from } as unknown as SupabaseClient, from, update, eqForUpdate };
}

describe('createFlowPaymentForOrder', () => {
  beforeEach(() => {
    vi.spyOn(flowClient, 'createFlowPayment').mockResolvedValue({
      url: 'https://sandbox.flow.cl/app/web/pay.php',
      token: 'tok-abc',
      flowOrder: 555,
    });
  });

  it('creates a Flow payment for a payable order and returns the redirect URL with token', async () => {
    const { client, update, eqForUpdate } = buildClient({
      id: 'order-1',
      status: 'pendiente_pago',
      total_clp: 10000,
      customer_email: 'cliente@example.com',
      flow_token: null,
    });

    const result = await createFlowPaymentForOrder(client, flowConfig, siteUrl, 'order-1');

    expect(flowClient.createFlowPayment).toHaveBeenCalledWith(
      flowConfig,
      expect.objectContaining({
        commerceOrder: 'order-1',
        amount: 10000,
        email: 'cliente@example.com',
        urlConfirmation: 'https://madlayerz.cl/api/payments/flow/webhook',
        urlReturn: 'https://madlayerz.cl/checkout/resultado?orderId=order-1',
      })
    );
    expect(update).toHaveBeenCalledWith({ flow_token: 'tok-abc', flow_order_number: 555 });
    expect(eqForUpdate).toHaveBeenCalledWith('id', 'order-1');
    expect(result).toEqual({ url: 'https://sandbox.flow.cl/app/web/pay.php?token=tok-abc' });
  });

  it('rejects when the order does not exist', async () => {
    const { client } = buildClient(null);

    await expect(createFlowPaymentForOrder(client, flowConfig, siteUrl, 'missing')).rejects.toThrow(
      'Order not found'
    );
  });

  it('rejects when the order is not in pendiente_pago', async () => {
    const { client } = buildClient({ id: 'order-1', status: 'pagado', total_clp: 10000, customer_email: 'a@b.com', flow_token: null });

    await expect(createFlowPaymentForOrder(client, flowConfig, siteUrl, 'order-1')).rejects.toThrow(
      'Order is not payable'
    );
  });

  it('rejects when the order already has a Flow payment in progress', async () => {
    const { client } = buildClient({
      id: 'order-1',
      status: 'pendiente_pago',
      total_clp: 10000,
      customer_email: 'a@b.com',
      flow_token: 'existing-token',
    });

    await expect(createFlowPaymentForOrder(client, flowConfig, siteUrl, 'order-1')).rejects.toThrow(
      'Order already has a payment in progress'
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/payments/create-flow-payment.test.ts`
Expected: FAIL — `Cannot find module './create-flow-payment'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/payments/create-flow-payment.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { createFlowPayment, type FlowConfig } from './flow-client';

interface OrderRow {
  id: string;
  status: string;
  total_clp: number;
  customer_email: string;
  flow_token: string | null;
}

export async function createFlowPaymentForOrder(
  client: SupabaseClient,
  flowConfig: FlowConfig,
  siteUrl: string,
  orderId: string
): Promise<{ url: string }> {
  const { data, error } = await client
    .from('orders')
    .select('id, status, total_clp, customer_email, flow_token')
    .eq('id', orderId)
    .maybeSingle();

  if (error) throw error;
  const order = data as OrderRow | null;
  if (!order) throw new Error('Order not found');
  if (order.status !== 'pendiente_pago') throw new Error('Order is not payable');
  if (order.flow_token) throw new Error('Order already has a payment in progress');

  const payment = await createFlowPayment(flowConfig, {
    commerceOrder: order.id,
    subject: `Pedido MadLayerz #${order.id}`,
    amount: order.total_clp,
    email: order.customer_email,
    urlConfirmation: `${siteUrl}/api/payments/flow/webhook`,
    urlReturn: `${siteUrl}/checkout/resultado?orderId=${order.id}`,
  });

  const { error: updateError } = await client
    .from('orders')
    .update({ flow_token: payment.token, flow_order_number: payment.flowOrder })
    .eq('id', orderId);

  if (updateError) throw updateError;

  return { url: `${payment.url}?token=${payment.token}` };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/payments/create-flow-payment.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/payments/create-flow-payment.ts lib/payments/create-flow-payment.test.ts
git commit -m "feat: add order validation and Flow payment creation business logic"
```

---

### Task 6: Process-flow-webhook business logic

**Files:**
- Create: `lib/payments/process-flow-webhook.ts`
- Test: `lib/payments/process-flow-webhook.test.ts`

**Interfaces:**
- Consumes: `getFlowPaymentStatus`, `FlowConfig` from Task 4; `mapFlowStatusToOrderStatus` from Task 3; a `SupabaseClient`-shaped object.
- Produces: `processFlowWebhook(client: SupabaseClient, flowConfig: FlowConfig, token: string): Promise<void>` — used by Task 9's route handler.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/payments/process-flow-webhook.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as flowClient from './flow-client';
import { processFlowWebhook } from './process-flow-webhook';

const flowConfig = { apiUrl: 'https://sandbox.flow.cl/api', apiKey: 'key', secretKey: 'secret' };

function buildClient(order: Record<string, unknown> | null) {
  const maybeSingle = vi.fn(async () => ({ data: order, error: null }));
  const eqForSelect = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq: eqForSelect }));
  const eqForUpdate = vi.fn(async () => ({ error: null }));
  const update = vi.fn(() => ({ eq: eqForUpdate }));
  const from = vi.fn(() => ({ select, update }));
  return { client: { from } as unknown as SupabaseClient, eqForSelect, update, eqForUpdate };
}

describe('processFlowWebhook', () => {
  beforeEach(() => {
    vi.spyOn(flowClient, 'getFlowPaymentStatus');
  });

  it('does nothing when no order matches the token', async () => {
    const { client, update } = buildClient(null);

    await processFlowWebhook(client, flowConfig, 'unknown-token');

    expect(flowClient.getFlowPaymentStatus).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('does nothing when the order is already pagado (idempotent)', async () => {
    const { client, update } = buildClient({ id: 'order-1', status: 'pagado' });

    await processFlowWebhook(client, flowConfig, 'tok-abc');

    expect(flowClient.getFlowPaymentStatus).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('marks the order pagado and stamps paid_at when Flow reports status 2', async () => {
    (flowClient.getFlowPaymentStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 2,
      commerceOrder: 'order-1',
    });
    const { client, update, eqForUpdate } = buildClient({ id: 'order-1', status: 'pendiente_pago' });

    await processFlowWebhook(client, flowConfig, 'tok-abc');

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pagado', paid_at: expect.any(String) })
    );
    expect(eqForUpdate).toHaveBeenCalledWith('id', 'order-1');
  });

  it('marks the order cancelado when Flow reports status 3', async () => {
    (flowClient.getFlowPaymentStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 3,
      commerceOrder: 'order-1',
    });
    const { client, update } = buildClient({ id: 'order-1', status: 'pendiente_pago' });

    await processFlowWebhook(client, flowConfig, 'tok-abc');

    expect(update).toHaveBeenCalledWith({ status: 'cancelado' });
  });

  it('does not update the order when Flow reports status 1 (still pending)', async () => {
    (flowClient.getFlowPaymentStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 1,
      commerceOrder: 'order-1',
    });
    const { client, update } = buildClient({ id: 'order-1', status: 'pendiente_pago' });

    await processFlowWebhook(client, flowConfig, 'tok-abc');

    expect(update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/payments/process-flow-webhook.test.ts`
Expected: FAIL — `Cannot find module './process-flow-webhook'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/payments/process-flow-webhook.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { getFlowPaymentStatus, type FlowConfig } from './flow-client';
import { mapFlowStatusToOrderStatus } from './flow-status-mapping';

interface OrderRow {
  id: string;
  status: string;
}

export async function processFlowWebhook(
  client: SupabaseClient,
  flowConfig: FlowConfig,
  token: string
): Promise<void> {
  const { data, error } = await client.from('orders').select('id, status').eq('flow_token', token).maybeSingle();
  if (error) throw error;

  const order = data as OrderRow | null;
  if (!order) return;
  if (order.status === 'pagado') return;

  const flowStatus = await getFlowPaymentStatus(flowConfig, token);
  const outcome = mapFlowStatusToOrderStatus(flowStatus.status);
  if (!outcome) return;

  const update: Record<string, unknown> = { status: outcome };
  if (outcome === 'pagado') update.paid_at = new Date().toISOString();

  const { error: updateError } = await client.from('orders').update(update).eq('id', order.id);
  if (updateError) throw updateError;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/payments/process-flow-webhook.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/payments/process-flow-webhook.ts lib/payments/process-flow-webhook.test.ts
git commit -m "feat: verify Flow payment status server-side and sync order status"
```

---

### Task 7: `fetchOrderStatus` query

**Files:**
- Modify: `lib/supabase/queries.ts`
- Modify: `lib/supabase/queries.test.ts`

**Interfaces:**
- Consumes: a `SupabaseClient`-shaped object (existing pattern in this file).
- Produces: `fetchOrderStatus(client: SupabaseClient, orderId: string): Promise<{ status: string; totalClp: number } | null>` — used by Task 10's route handler.

- [ ] **Step 1: Write the failing test**

Add to `lib/supabase/queries.test.ts` (below the existing `fetchOrdersForUser` describe block):

```typescript
describe('fetchOrderStatus', () => {
  it('returns the order status and total when found', async () => {
    const maybeSingle = vi.fn(async () => ({ data: { status: 'pagado', total_clp: 10000 }, error: null }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const client = { from } as unknown as SupabaseClient;

    const result = await fetchOrderStatus(client, 'order-1');

    expect(from).toHaveBeenCalledWith('orders');
    expect(eq).toHaveBeenCalledWith('id', 'order-1');
    expect(result).toEqual({ status: 'pagado', totalClp: 10000 });
  });

  it('returns null when the order does not exist', async () => {
    const maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const client = { from } as unknown as SupabaseClient;

    const result = await fetchOrderStatus(client, 'missing');

    expect(result).toBeNull();
  });
});
```

Update the top import line to include the new function:

```typescript
import { createOrder, createQuoteRequest, fetchOrdersForUser, fetchOrderStatus } from './queries';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/supabase/queries.test.ts`
Expected: FAIL — `fetchOrderStatus is not exported from './queries'`

- [ ] **Step 3: Write minimal implementation**

Add to the end of `lib/supabase/queries.ts`:

```typescript
export interface OrderStatus {
  status: string;
  totalClp: number;
}

export async function fetchOrderStatus(client: SupabaseClient, orderId: string): Promise<OrderStatus | null> {
  const { data, error } = await client.from('orders').select('status, total_clp').eq('id', orderId).maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return { status: (data as { status: string; total_clp: number }).status, totalClp: (data as { status: string; total_clp: number }).total_clp };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/supabase/queries.test.ts`
Expected: PASS (all tests in the file, including the 2 new ones)

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/queries.ts lib/supabase/queries.test.ts
git commit -m "feat: add fetchOrderStatus query for checkout result polling"
```

---

### Task 8: `POST /api/payments/flow/create` route

**Files:**
- Create: `app/api/payments/flow/create/route.ts`

**Interfaces:**
- Consumes: `createServiceSupabaseClient` (Task 1), `createFlowPaymentForOrder` (Task 5); env vars `FLOW_API_URL`, `FLOW_API_KEY`, `FLOW_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`.
- Produces: HTTP `POST /api/payments/flow/create` — body `{ orderId: string }`, response `{ url: string }` or `{ error: string }` with status 500. Called by Task 12's checkout page.

This route is a thin wrapper with no independent unit test, matching the existing convention in this codebase (`app/api/orders/route.ts`, `app/api/quotes/route.ts` etc. have no `.test.ts` — the logic they call is what's unit-tested, in Task 5).

- [ ] **Step 1: Write the implementation**

```typescript
// app/api/payments/flow/create/route.ts
import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service-client';
import { createFlowPaymentForOrder } from '@/lib/payments/create-flow-payment';
import type { FlowConfig } from '@/lib/payments/flow-client';

function getFlowConfig(): FlowConfig {
  const apiUrl = process.env.FLOW_API_URL;
  const apiKey = process.env.FLOW_API_KEY;
  const secretKey = process.env.FLOW_SECRET_KEY;

  if (!apiUrl || !apiKey || !secretKey) {
    throw new Error('Missing FLOW_API_URL, FLOW_API_KEY or FLOW_SECRET_KEY');
  }

  return { apiUrl, apiKey, secretKey };
}

export async function POST(request: Request) {
  const { orderId } = (await request.json()) as { orderId: string };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SITE_URL' }, { status: 500 });
  }

  try {
    const client = createServiceSupabaseClient();
    const result = await createFlowPaymentForOrder(client, getFlowConfig(), siteUrl, orderId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify the project still type-checks and builds**

Run: `npm run build`
Expected: build succeeds (route compiles; it will fail at runtime without `FLOW_*` env vars, which is expected until sandbox credentials are configured later)

- [ ] **Step 3: Commit**

```bash
git add app/api/payments/flow/create/route.ts
git commit -m "feat: add POST /api/payments/flow/create route"
```

---

### Task 9: `POST /api/payments/flow/webhook` route

**Files:**
- Create: `app/api/payments/flow/webhook/route.ts`

**Interfaces:**
- Consumes: `createServiceSupabaseClient` (Task 1), `processFlowWebhook` (Task 6); env vars `FLOW_API_URL`, `FLOW_API_KEY`, `FLOW_SECRET_KEY`.
- Produces: HTTP `POST /api/payments/flow/webhook` — called by Flow's servers with form-encoded `token`. Always responds `200 { ok: true }`.

Thin wrapper, no independent unit test — same convention as Task 8; `processFlowWebhook` carries the tested logic.

- [ ] **Step 1: Write the implementation**

```typescript
// app/api/payments/flow/webhook/route.ts
import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service-client';
import { processFlowWebhook } from '@/lib/payments/process-flow-webhook';
import type { FlowConfig } from '@/lib/payments/flow-client';

function getFlowConfig(): FlowConfig {
  const apiUrl = process.env.FLOW_API_URL;
  const apiKey = process.env.FLOW_API_KEY;
  const secretKey = process.env.FLOW_SECRET_KEY;

  if (!apiUrl || !apiKey || !secretKey) {
    throw new Error('Missing FLOW_API_URL, FLOW_API_KEY or FLOW_SECRET_KEY');
  }

  return { apiUrl, apiKey, secretKey };
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const token = formData.get('token');

  if (typeof token === 'string' && token.length > 0) {
    try {
      const client = createServiceSupabaseClient();
      await processFlowWebhook(client, getFlowConfig(), token);
    } catch (error) {
      console.error('Flow webhook processing failed', error);
    }
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify the project still type-checks and builds**

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 3: Commit**

```bash
git add app/api/payments/flow/webhook/route.ts
git commit -m "feat: add Flow payment confirmation webhook route"
```

---

### Task 10: `GET /api/orders/[id]/status` route

**Files:**
- Create: `app/api/orders/[id]/status/route.ts`

**Interfaces:**
- Consumes: `createServiceSupabaseClient` (Task 1), `fetchOrderStatus` (Task 7).
- Produces: HTTP `GET /api/orders/:id/status` — response `{ status: string; totalClp: number }` or `404 { error: string }`. Polled by Task 13's `/checkout/resultado` page.

Thin wrapper, no independent unit test — `fetchOrderStatus` carries the tested logic.

- [ ] **Step 1: Write the implementation**

```typescript
// app/api/orders/[id]/status/route.ts
import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service-client';
import { fetchOrderStatus } from '@/lib/supabase/queries';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const client = createServiceSupabaseClient();
  const order = await fetchOrderStatus(client, params.id);

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json(order);
}
```

- [ ] **Step 2: Verify the project still type-checks and builds**

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 3: Commit**

```bash
git add "app/api/orders/[id]/status/route.ts"
git commit -m "feat: add order status endpoint for checkout result polling"
```

---

### Task 11: Disable Mercado Pago in `PaymentStep`

**Files:**
- Modify: `components/checkout/PaymentStep.tsx`
- Create: `components/checkout/PaymentStep.test.tsx`

**Interfaces:**
- Consumes: `PaymentMethodInput` from `@/lib/validation/checkout-schema` (unchanged).
- Produces: same `PaymentStep({ onConfirm }: { onConfirm: (method: PaymentMethodInput) => void })` signature — no change for Task 12's caller.

- [ ] **Step 1: Write the failing test**

```typescript
// components/checkout/PaymentStep.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentStep } from './PaymentStep';

describe('PaymentStep', () => {
  it('disables the Mercado Pago option', () => {
    render(<PaymentStep onConfirm={vi.fn()} />);

    expect(screen.getByRole('radio', { name: /mercado pago/i })).toBeDisabled();
  });

  it('does not show the simulated-payment disclaimer', () => {
    render(<PaymentStep onConfirm={vi.fn()} />);

    expect(screen.queryByText(/el pago aún no se procesa realmente/i)).not.toBeInTheDocument();
  });

  it('confirms with flow when the button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<PaymentStep onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: /confirmar pedido/i }));

    expect(onConfirm).toHaveBeenCalledWith('flow');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- components/checkout/PaymentStep.test.tsx`
Expected: FAIL — Mercado Pago radio is not disabled, and the disclaimer text is still present

- [ ] **Step 3: Write minimal implementation**

```typescript
// components/checkout/PaymentStep.tsx
'use client';

import { useState } from 'react';
import type { PaymentMethodInput } from '@/lib/validation/checkout-schema';

export function PaymentStep({ onConfirm }: { onConfirm: (method: PaymentMethodInput) => void }) {
  const [method, setMethod] = useState<PaymentMethodInput>('flow');

  return (
    <div className="glass-card flex flex-col gap-4 p-6">
      <h2 className="text-lg font-bold">Método de pago</h2>

      <label className="flex items-center gap-2">
        <input type="radio" name="payment" checked={method === 'flow'} onChange={() => setMethod('flow')} />
        Flow
      </label>
      <label className="flex items-center gap-2 opacity-50">
        <input type="radio" name="payment" disabled aria-label="Mercado Pago (Próximamente)" />
        Mercado Pago (Próximamente)
      </label>

      <button onClick={() => onConfirm(method)} className="rounded-full bg-brand py-3 font-semibold text-white">
        Confirmar pedido
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- components/checkout/PaymentStep.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add components/checkout/PaymentStep.tsx components/checkout/PaymentStep.test.tsx
git commit -m "feat: disable Mercado Pago option in checkout until it's integrated"
```

---

### Task 12: Wire real payment redirect into the checkout page

**Files:**
- Modify: `app/checkout/page.tsx`

**Interfaces:**
- Consumes: existing `POST /api/orders` (unchanged); new `POST /api/payments/flow/create` (Task 8).
- Produces: on success, navigates the browser to Flow via `window.location.href`; no longer sets an in-page `'done'` step (replaced by the `/checkout/resultado` page from Task 13). Cart is **not** cleared here anymore.

- [ ] **Step 1: Update the checkout page**

Replace the full contents of `app/checkout/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/lib/cart/cart-store';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-client';
import { fetchAddresses, type Address } from '@/lib/supabase/queries';
import type { ShippingInfoInput, DeliveryInput, PaymentMethodInput } from '@/lib/validation/checkout-schema';
import { ShippingStep } from '@/components/checkout/ShippingStep';
import { DeliveryStep } from '@/components/checkout/DeliveryStep';
import { PaymentStep } from '@/components/checkout/PaymentStep';

type Step = 'shipping' | 'delivery' | 'payment';

export default function CheckoutPage() {
  const [step, setStep] = useState<Step>('shipping');
  const [shipping, setShipping] = useState<ShippingInfoInput | null>(null);
  const [delivery, setDelivery] = useState<{ data: DeliveryInput; cost: number } | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialValues, setInitialValues] = useState<{ name: string; email: string } | undefined>();
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);

  const items = useCartStore((state) => state.items);
  const subtotalClp = useCartStore((state) => state.subtotalClp());

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
    setPaymentError(null);
    setIsSubmitting(true);

    try {
      const orderResponse = await fetch('/api/orders', {
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
      const orderResult = await orderResponse.json();

      if (!orderResponse.ok || !orderResult.orderId) {
        setPaymentError('No pudimos crear tu pedido. Intenta de nuevo.');
        return;
      }

      const paymentResponse = await fetch('/api/payments/flow/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderResult.orderId }),
      });
      const paymentResult = await paymentResponse.json();

      if (!paymentResponse.ok || !paymentResult.url) {
        setPaymentError('No pudimos iniciar el pago con Flow. Intenta de nuevo.');
        return;
      }

      window.location.href = paymentResult.url;
    } finally {
      setIsSubmitting(false);
    }
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
      {step === 'payment' && (
        <div className="flex flex-col gap-3">
          <PaymentStep onConfirm={handlePaymentConfirm} />
          {isSubmitting && <p className="text-sm opacity-70">Redirigiendo a Flow...</p>}
          {paymentError && <p className="text-sm text-red-500">{paymentError}</p>}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Run the full test suite to check for regressions**

Run: `npm test`
Expected: PASS — no existing test imports `ConfirmationScreen` from this page or asserts a `'done'` step (confirmed: no `app/checkout/page.test.tsx` exists yet), so no test needs updating here.

- [ ] **Step 3: Commit**

```bash
git add app/checkout/page.tsx
git commit -m "feat: redirect to Flow for real payment instead of simulating success"
```

---

### Task 13: `/checkout/resultado` page (poll + show outcome)

**Files:**
- Create: `app/checkout/resultado/page.tsx`
- Create: `app/checkout/resultado/page.test.tsx`

**Interfaces:**
- Consumes: `GET /api/orders/[id]/status` (Task 10); `useCartStore` (`clear`) from `@/lib/cart/cart-store`; `ConfirmationScreen` from `@/components/checkout/ConfirmationScreen` (unchanged, still takes `{ orderId }`).
- Produces: page rendered at `/checkout/resultado?orderId=...`, the `urlReturn` target configured in Task 5.

- [ ] **Step 1: Write the failing test**

```typescript
// app/checkout/resultado/page.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CheckoutResultPage from './page';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams('orderId=order-1'),
}));

const clearMock = vi.fn();
vi.mock('@/lib/cart/cart-store', () => ({
  useCartStore: (selector: (state: { clear: () => void }) => unknown) => selector({ clear: clearMock }),
}));

describe('CheckoutResultPage', () => {
  beforeEach(() => {
    clearMock.mockClear();
    pushMock.mockClear();
  });

  it('shows the success confirmation and clears the cart when the order is pagado', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'pagado', totalClp: 10000 }) });

    render(<CheckoutResultPage />);

    expect(await screen.findByText(/¡pedido recibido!/i)).toBeInTheDocument();
    expect(clearMock).toHaveBeenCalled();
  });

  it('shows a failure message and a retry link when the order is cancelado', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'cancelado', totalClp: 10000 }) });

    render(<CheckoutResultPage />);

    expect(await screen.findByText(/el pago no se pudo completar/i)).toBeInTheDocument();
    expect(clearMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- app/checkout/resultado/page.test.tsx`
Expected: FAIL — `Cannot find module './page'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// app/checkout/resultado/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCartStore } from '@/lib/cart/cart-store';
import { ConfirmationScreen } from '@/components/checkout/ConfirmationScreen';

type PollState = 'checking' | 'pagado' | 'cancelado' | 'timeout';

const MAX_ATTEMPTS = 8;
const POLL_INTERVAL_MS = 2000;

function CheckoutResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');
  const clearCart = useCartStore((state) => state.clear);
  const [state, setState] = useState<PollState>('checking');

  useEffect(() => {
    if (!orderId) return;
    let attempts = 0;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll() {
      attempts += 1;
      const response = await fetch(`/api/orders/${orderId}/status`);
      if (cancelled || !response.ok) return;
      const result = await response.json();
      if (cancelled) return;

      if (result.status === 'pagado') {
        clearCart();
        setState('pagado');
        return;
      }
      if (result.status === 'cancelado') {
        setState('cancelado');
        return;
      }
      if (attempts >= MAX_ATTEMPTS) {
        setState('timeout');
        return;
      }
      timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [orderId, clearCart]);

  if (!orderId) {
    return <p>Pedido no encontrado.</p>;
  }

  if (state === 'checking') {
    return <p>Confirmando tu pago...</p>;
  }

  if (state === 'pagado') {
    return <ConfirmationScreen orderId={orderId} />;
  }

  if (state === 'cancelado') {
    return (
      <div className="glass-card flex flex-col items-center gap-3 p-8 text-center">
        <h2 className="text-xl font-bold">El pago no se pudo completar</h2>
        <button
          onClick={() => router.push('/checkout')}
          className="rounded-full bg-brand py-3 px-6 font-semibold text-white"
        >
          Volver a intentar
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card flex flex-col items-center gap-3 p-8 text-center">
      <h2 className="text-xl font-bold">Estamos confirmando tu pago</h2>
      <p className="max-w-md text-sm opacity-80">Te avisaremos por email apenas se confirme.</p>
    </div>
  );
}

export default function CheckoutResultPage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-8">
      <Suspense fallback={<p>Cargando...</p>}>
        <CheckoutResultContent />
      </Suspense>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- app/checkout/resultado/page.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS (all tests, including Tasks 1–13)

- [ ] **Step 6: Commit**

```bash
git add app/checkout/resultado/page.tsx app/checkout/resultado/page.test.tsx
git commit -m "feat: add checkout result page that polls payment status"
```

---

### Task 14: Document new environment variables

**Files:**
- Modify: `.env.local.example`

**Interfaces:**
- Consumes: nothing (documentation only).
- Produces: documents `FLOW_API_KEY`, `FLOW_SECRET_KEY`, `FLOW_API_URL`, `NEXT_PUBLIC_SITE_URL` for local dev and as the checklist for what to add in Vercel.

- [ ] **Step 1: Update `.env.local.example`**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
QUOTE_NOTIFICATION_EMAIL=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
FLOW_API_URL=https://sandbox.flow.cl/api
FLOW_API_KEY=
FLOW_SECRET_KEY=
```

- [ ] **Step 2: Commit**

```bash
git add .env.local.example
git commit -m "docs: document Flow and site-URL environment variables"
```

- [ ] **Step 3: Verify the full suite and production build one more time**

Run: `npm test && npm run build`
Expected: both succeed

At this point the code is ready for sandbox testing. The user needs to:
1. Create a Flow sandbox account and get `FLOW_API_KEY` / `FLOW_SECRET_KEY`.
2. Add `FLOW_API_URL`, `FLOW_API_KEY`, `FLOW_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL` to Vercel's Preview/Production environment variables (never commit them).
3. Confirm `SUPABASE_SERVICE_ROLE_KEY` is already present in Vercel (it's referenced in existing docs but should be double-checked).
4. Do a manual end-to-end sandbox purchase once deployed, then repeat with real Flow production credentials before going fully live.
