import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { Navbar } from './nav';
import { ThemeProvider } from './theme-provider';

describe('Navbar', () => {
  it('renders all navigation links', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <Navbar />
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /blog/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /career/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /projects/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /library/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /contact/i })).toBeInTheDocument();
  });

  it('toggles the theme when the toggle button is clicked', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider defaultTheme="light">
          <Navbar />
        </ThemeProvider>
      </MemoryRouter>
    );

    const toggleButton = screen.getByRole('button', { name: /toggle theme/i });
    const user = userEvent.setup();

    // Initial check (should be light theme)
    expect(document.documentElement.classList.contains('light')).toBe(true);
    
    // Toggle to dark
    await user.click(toggleButton);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    
    // Toggle back to light
    await user.click(toggleButton);
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });
});
