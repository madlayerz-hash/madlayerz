import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CatalogFilters } from './CatalogFilters';

describe('CatalogFilters', () => {
  it('calls onFilterChange with the search text as the user types', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(<CatalogFilters onFilterChange={onFilterChange} />);

    await user.type(screen.getByPlaceholderText('Buscar productos...'), 'llavero');

    expect(onFilterChange).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'llavero' }));
  });

  it('calls onFilterChange with the selected category', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(<CatalogFilters onFilterChange={onFilterChange} />);

    await user.selectOptions(screen.getByLabelText('Categoría'), 'maceteros');

    expect(onFilterChange).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'maceteros' }));
  });
});
