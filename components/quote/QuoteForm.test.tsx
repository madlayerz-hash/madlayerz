import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuoteForm } from './QuoteForm';

describe('QuoteForm', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'quote-1' }) });
  });

  it('shows a validation error when submitting an empty form', async () => {
    const user = userEvent.setup();
    render(<QuoteForm />);

    await user.click(screen.getByRole('button', { name: /enviar solicitud/i }));

    expect(await screen.findByText('El nombre es muy corto')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('submits to /api/quotes and shows a success message when valid', async () => {
    const user = userEvent.setup();
    render(<QuoteForm />);

    await user.type(screen.getByLabelText('Nombre'), 'Pablo Toro');
    await user.type(screen.getByLabelText('Email'), 'pablo@example.com');
    await user.type(screen.getByLabelText('Teléfono'), '+56912345678');
    await user.type(screen.getByLabelText('Descripción del proyecto'), 'Quiero 10 llaveros personalizados con mi logo');
    await user.type(screen.getByLabelText('Cantidad'), '10');

    await user.click(screen.getByRole('button', { name: /enviar solicitud/i }));

    expect(await screen.findByText(/¡Listo! Te contactaremos pronto/i)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('/api/quotes', expect.objectContaining({ method: 'POST' }));
  });
});
