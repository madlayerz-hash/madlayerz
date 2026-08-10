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
