import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, afterEach } from 'vitest';
import { ToolsMenu } from './tools-menu';
import { ThemeProvider } from '../theme-provider';

afterEach(() => {
  window.localStorage.clear();
});

function renderToolsMenu() {
  return render(
    <MemoryRouter>
      <ThemeProvider defaultTheme="dark">
        <ToolsMenu />
      </ThemeProvider>
    </MemoryRouter>
  );
}

async function openTerminal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /tools/i }));
  await user.click(screen.getByRole('menuitem', { name: /terminal/i }));
}

describe('ToolsMenu', () => {
  it('shows the dropdown with the terminal entry', async () => {
    renderToolsMenu();
    const user = userEvent.setup();

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /tools/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /terminal/i })).toBeInTheDocument();
  });

  it('opens the terminal in a window and closes the menu', async () => {
    renderToolsMenu();
    const user = userEvent.setup();

    await openTerminal(user);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /jsh/i })).toBeInTheDocument();
    expect(screen.getByTestId('terminal')).toHaveTextContent('welcome to jyates.dev');
    expect(screen.getByLabelText('Terminal input')).toHaveFocus();
  });

  it('refocuses the input from the mobile keyboard control', async () => {
    renderToolsMenu();
    const user = userEvent.setup();

    await openTerminal(user);
    const input = screen.getByLabelText('Terminal input');
    input.blur();
    expect(input).not.toHaveFocus();

    await user.click(screen.getByRole('button', { name: /open device keyboard/i }));
    expect(input).toHaveFocus();
  });

  it('runs commands typed into the terminal', async () => {
    renderToolsMenu();
    const user = userEvent.setup();

    await openTerminal(user);
    await user.type(screen.getByLabelText('Terminal input'), 'whoami{Enter}');
    expect(screen.getByTestId('terminal')).toHaveTextContent('guest');
  });

  it('recalls previous commands with the up arrow', async () => {
    renderToolsMenu();
    const user = userEvent.setup();

    await openTerminal(user);
    const input = screen.getByLabelText('Terminal input');
    await user.type(input, 'echo first{Enter}');
    await user.type(input, '{ArrowUp}');
    expect(input).toHaveValue('echo first');
  });

  it('persists command history across terminal sessions', async () => {
    renderToolsMenu();
    const user = userEvent.setup();

    await openTerminal(user);
    await user.type(screen.getByLabelText('Terminal input'), 'echo persisted{Enter}');
    await user.click(screen.getByRole('button', { name: /close window/i }));
    await openTerminal(user);
    const input = screen.getByLabelText('Terminal input');
    await user.type(input, '{ArrowUp}');
    expect(input).toHaveValue('echo persisted');
  });

  it('expands the previous command with !!', async () => {
    renderToolsMenu();
    const user = userEvent.setup();

    await openTerminal(user);
    const input = screen.getByLabelText('Terminal input');
    await user.type(input, 'echo repeated{Enter}');
    await user.type(input, '!!{Enter}');
    expect(screen.getAllByText('repeated', { exact: true })).toHaveLength(2);
  });

  it('supports reverse search, cancel, and clear shortcuts', async () => {
    renderToolsMenu();
    const user = userEvent.setup();

    await openTerminal(user);
    const input = screen.getByLabelText('Terminal input');
    await user.type(input, 'echo searchable{Enter}');
    await user.type(input, 'search');
    await user.keyboard('{Control>}r{/Control}');
    expect(input).toHaveValue('echo searchable');
    await user.keyboard('{Control>}c{/Control}');
    expect(input).toHaveValue('');
    expect(screen.getByTestId('terminal')).toHaveTextContent('^C');
    await user.keyboard('{Control>}l{/Control}');
    expect(screen.getByTestId('terminal')).not.toHaveTextContent('welcome to jyates.dev');
  });

  it('closes the window via the close button', async () => {
    renderToolsMenu();
    const user = userEvent.setup();

    await openTerminal(user);
    await user.click(screen.getByRole('button', { name: /close window/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the window when the terminal receives exit', async () => {
    renderToolsMenu();
    const user = userEvent.setup();

    await openTerminal(user);
    await user.type(screen.getByLabelText('Terminal input'), 'exit{Enter}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('persists touched files across terminal sessions', async () => {
    renderToolsMenu();
    const user = userEvent.setup();

    await openTerminal(user);
    await user.type(screen.getByLabelText('Terminal input'), 'echo hi > notes.txt{Enter}');
    await user.click(screen.getByRole('button', { name: /close window/i }));

    await openTerminal(user);
    await user.type(screen.getByLabelText('Terminal input'), 'cat notes.txt{Enter}');
    expect(screen.getByTestId('terminal')).toHaveTextContent('hi');
  });

  it('supports creating and using directories', async () => {
    renderToolsMenu();
    const user = userEvent.setup();

    await openTerminal(user);
    const input = screen.getByLabelText('Terminal input');
    await user.type(input, 'mkdir docs{Enter}');
    await user.type(input, 'echo hello > docs/note.txt{Enter}');
    await user.type(input, 'ls docs{Enter}');
    expect(screen.getByTestId('terminal')).toHaveTextContent('note.txt');
    await user.type(input, 'cat docs/note.txt{Enter}');
    expect(screen.getByTestId('terminal')).toHaveTextContent('hello');
  });

  it('keeps on-call lab state across commands', async () => {
    renderToolsMenu();
    const user = userEvent.setup();

    await openTerminal(user);
    const input = screen.getByLabelText('Terminal input');
    await user.type(input, 'oncall start{Enter}');
    await user.type(input, 'oncall resolve retry-storm{Enter}');
    expect(screen.getByTestId('terminal')).toHaveTextContent('INC-2026-0710 RESOLVED');
    expect(screen.getByTestId('terminal')).toHaveTextContent('Incident score: 100/100');
  });

  it('keeps terminal history when the window is shaded and unshaded', async () => {
    renderToolsMenu();
    const user = userEvent.setup();

    await openTerminal(user);
    await user.type(screen.getByLabelText('Terminal input'), 'echo remembered{Enter}');
    await user.click(screen.getByRole('button', { name: /shade window/i }));
    await user.click(screen.getByRole('button', { name: /shade window/i }));
    expect(screen.getByTestId('terminal')).toHaveTextContent('remembered');
  });

  it('closes the window on Escape', async () => {
    renderToolsMenu();
    const user = userEvent.setup();

    await openTerminal(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
