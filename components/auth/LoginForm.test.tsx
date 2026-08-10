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
