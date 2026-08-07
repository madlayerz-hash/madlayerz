import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeliveryStep } from './DeliveryStep';

describe('DeliveryStep', () => {
  it('shows the shipping cost for the selected region when domicilio is chosen', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();

    render(<DeliveryStep onContinue={onContinue} />);

    await user.click(screen.getByLabelText('Despacho a domicilio'));
    await user.selectOptions(screen.getByLabelText('Región'), 'metropolitana');

    expect(screen.getByText('$3.500')).toBeInTheDocument();
  });

  it('shows no shipping cost when retiro is chosen', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();

    render(<DeliveryStep onContinue={onContinue} />);

    await user.click(screen.getByLabelText('Retiro en punto físico'));

    expect(screen.getByText('$0')).toBeInTheDocument();
  });
});
