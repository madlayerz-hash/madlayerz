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
