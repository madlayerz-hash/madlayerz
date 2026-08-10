import { describe, it, expect } from 'vitest';
import { createBrowserSupabaseClient } from './browser-client';

describe('createBrowserSupabaseClient', () => {
  it('returns a Supabase client instance', () => {
    const client = createBrowserSupabaseClient();
    expect(client).toBeTruthy();
    expect(typeof client.auth.getSession).toBe('function');
  });
});
