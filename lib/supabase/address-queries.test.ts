import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAddresses, createAddress, updateAddress, deleteAddress } from './queries';

function makeClient(overrides: Record<string, unknown> = {}): SupabaseClient {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn(async () => ({ data: [{ id: '1', user_id: 'u1', label: 'Casa', region: 'metropolitana', address: 'Av 123', is_default: true }], error: null })) })) })),
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(async () => ({ data: { id: '2' }, error: null })) })) })),
      update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
      delete: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
      ...overrides,
    })),
  } as unknown as SupabaseClient;
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
