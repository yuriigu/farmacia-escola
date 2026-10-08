import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTheme } from 'next-themes';
import { ThemeToggle } from '@/components/shared/theme-toggle';

vi.mock('next-themes', () => ({
  useTheme: vi.fn(),
}));

describe('ThemeToggle', () => {
  const setTheme = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      setTheme,
    } as ReturnType<typeof useTheme>);
  });

  it('shows the light-theme state and switches to dark mode', () => {
    render(<ThemeToggle />);

    const toggle = screen.getByRole('button', { name: 'Alternar entre tema claro e escuro' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggle);

    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('switches a dark theme back to light mode', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'dark',
      setTheme,
    } as ReturnType<typeof useTheme>);

    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Alternar entre tema claro e escuro' }));

    expect(setTheme).toHaveBeenCalledWith('light');
  });
});
