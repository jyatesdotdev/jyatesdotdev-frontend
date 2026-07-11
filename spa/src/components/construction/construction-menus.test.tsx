import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ConstructionMenus } from './construction-menus';

describe('ConstructionMenus', () => {
  it('renders a menu for each planned section', () => {
    render(<ConstructionMenus />);

    expect(screen.getByRole('button', { name: 'games' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'lab' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'research' })).toBeInTheDocument();
  });

  it.each(['games', 'lab', 'research'])('opens the animated placeholder for %s', async (section) => {
    const user = userEvent.setup();
    render(<ConstructionMenus />);

    await user.click(screen.getByRole('button', { name: section }));
    expect(screen.getByRole('menu', { name: `${section} menu` })).toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: 'under construction' }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: `${section} / under construction` })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /construction worker swinging a hammer/i })
    ).toBeInTheDocument();
    expect(screen.getByText(`${section.toUpperCase()}.EXE / STATUS 503`)).toBeInTheDocument();
    expect(screen.getByTestId('construction-hammer')).toHaveClass('construction-hammer');
  });

  it('keeps only one section menu open', async () => {
    const user = userEvent.setup();
    render(<ConstructionMenus />);

    await user.click(screen.getByRole('button', { name: 'games' }));
    expect(screen.getByRole('menu', { name: 'games menu' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'research' }));
    expect(screen.queryByRole('menu', { name: 'games menu' })).not.toBeInTheDocument();
    expect(screen.getByRole('menu', { name: 'research menu' })).toBeInTheDocument();
  });

  it('keeps existing section windows open when another is launched', async () => {
    const user = userEvent.setup();
    render(<ConstructionMenus />);

    await user.click(screen.getByRole('button', { name: 'games' }));
    await user.click(screen.getByRole('menuitem', { name: 'under construction' }));
    await user.click(screen.getByRole('button', { name: 'lab' }));
    await user.click(screen.getByRole('menuitem', { name: 'under construction' }));

    expect(screen.getByRole('dialog', { name: 'games / under construction' })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'lab / under construction' })).toBeInTheDocument();
  });
});
