import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import { SubscriptionConfirmation } from './subscription-confirmation';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SubscriptionConfirmation', () => {
  it('confirms the token from the URL', async () => {
    const confirm = vi.spyOn(api.subscriptions, 'confirm').mockResolvedValue();
    render(
      <MemoryRouter initialEntries={['/subscribe/confirm?token=abc123']}>
        <SubscriptionConfirmation />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Subscription confirmed' })).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledWith('abc123');
  });

  it('shows an error when the token is missing', async () => {
    const confirm = vi.spyOn(api.subscriptions, 'confirm').mockResolvedValue();
    render(
      <MemoryRouter initialEntries={['/subscribe/confirm']}>
        <SubscriptionConfirmation />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole('heading', { name: 'Confirmation link unavailable' })
    ).toBeInTheDocument();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('shows an error when confirmation fails', async () => {
    vi.spyOn(api.subscriptions, 'confirm').mockRejectedValue(new Error('expired'));
    render(
      <MemoryRouter initialEntries={['/subscribe/confirm?token=expired']}>
        <SubscriptionConfirmation />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole('heading', { name: 'Confirmation link unavailable' })
    ).toBeInTheDocument();
  });
});
