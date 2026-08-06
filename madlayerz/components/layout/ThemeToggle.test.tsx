import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  it('toggles the document theme class when clicked', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole('button', { name: /cambiar tema/i });
    const initialIsDark = document.documentElement.classList.contains('dark');

    await user.click(button);

    expect(document.documentElement.classList.contains('dark')).toBe(!initialIsDark);
  });
});
