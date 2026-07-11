import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ToolWindow } from './tool-window';

function WindowHarness() {
  const [firstOpen, setFirstOpen] = useState(true);
  const [secondOpen, setSecondOpen] = useState(true);

  return (
    <>
      {firstOpen && (
        <ToolWindow title="first window" onClose={() => setFirstOpen(false)}>
          <button>focus first</button>
        </ToolWindow>
      )}
      {secondOpen && (
        <ToolWindow title="second window" onClose={() => setSecondOpen(false)}>
          <button>focus second</button>
        </ToolWindow>
      )}
    </>
  );
}

function zIndex(element: HTMLElement) {
  return Number(element.style.zIndex);
}

describe('ToolWindow stacking', () => {
  it('raises the focused window and closes only the foreground window on Escape', async () => {
    const user = userEvent.setup();
    render(<WindowHarness />);

    const first = screen.getByRole('dialog', { name: 'first window' });
    const second = screen.getByRole('dialog', { name: 'second window' });
    expect(zIndex(second)).toBeGreaterThan(zIndex(first));
    expect(Number.parseFloat(second.style.top)).toBeGreaterThan(Number.parseFloat(first.style.top));

    await user.click(screen.getByRole('button', { name: 'focus first' }));
    expect(zIndex(first)).toBeGreaterThan(zIndex(second));

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'first window' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'second window' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
