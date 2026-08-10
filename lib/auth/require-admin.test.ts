import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockNotFound, mockGetUser, mockSingle } = vi.hoisted(() => ({
  mockNotFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  mockGetUser: vi.fn(),
  mockSingle: vi.fn(),
}));

vi.mock('next/navigation', () => ({ notFound: mockNotFound }));

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
