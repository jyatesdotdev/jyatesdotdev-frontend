import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import { SubscriptionForm } from './subscription-form';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SubscriptionForm', () => {
  it('submits an email and explicit topic preferences', async () => {
    const create = vi.spyOn(api.subscriptions, 'create').mockResolvedValue();
    const user = userEvent.setup();
    render(<SubscriptionForm defaultTopics={['blog']} />);

    await user.type(screen.getByLabelText('Email address'), 'reader@example.com');
    await user.click(screen.getByLabelText('Projects'));
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        email: 'reader@example.com',
        topics: ['blog', 'projects'],
        website: '',
      })
    );
    expect(await screen.findByText(/Confirmation email sent/)).toBeInTheDocument();
  });

  it('requires at least one selected topic', async () => {
    const create = vi.spyOn(api.subscriptions, 'create').mockResolvedValue();
    const user = userEvent.setup();
    render(<SubscriptionForm defaultTopics={['blog']} />);

    await user.click(screen.getByLabelText('Blog posts'));
    await user.type(screen.getByLabelText('Email address'), 'reader@example.com');
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));

    expect(screen.getByText('Select at least one update type.')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('shows API errors without clearing the address', async () => {
    vi.spyOn(api.subscriptions, 'create').mockRejectedValue(new Error('Try again later.'));
    const user = userEvent.setup();
    render(<SubscriptionForm defaultTopics={['projects']} />);

    const email = screen.getByLabelText('Email address');
    await user.type(email, 'reader@example.com');
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));

    expect(await screen.findByText('Try again later.')).toBeInTheDocument();
    expect(email).toHaveValue('reader@example.com');
  });
});
