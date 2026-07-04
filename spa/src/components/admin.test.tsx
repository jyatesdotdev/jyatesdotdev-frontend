import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { SWRConfig } from 'swr';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Admin } from './admin';
import { api, fetcher } from '../api';

vi.mock('../api', () => ({
  api: {
    admin: {
      getComments: (status: string) => `/api/v1/admin/comments?status=${status}`,
      updateStatus: vi.fn(),
      deleteComment: vi.fn(),
    },
  },
  fetcher: vi.fn(),
}));

const mockComment = {
  id: 'comment-1',
  slug: 'hello-world',
  authorName: 'John Doe',
  authorEmail: 'john@example.com',
  ipAddress: '127.0.0.1',
  content: 'Great post!',
  createdAt: '2024-04-14T10:00:00Z',
  status: 'pending',
};

function renderAdmin() {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    </SWRConfig>
  );
}

describe('Admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Admin Dashboard heading', () => {
    vi.mocked(fetcher).mockResolvedValue([]);
    renderAdmin();

    expect(screen.getByText(/admin dashboard/i)).toBeInTheDocument();
  });

  it('shows a dismissible error banner when a status update fails', async () => {
    vi.mocked(fetcher).mockResolvedValue([mockComment]);
    vi.mocked(api.admin.updateStatus).mockRejectedValue(new Error('boom'));

    renderAdmin();

    fireEvent.click(await screen.findByText('Approve'));

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('An error occurred while updating status.');

    fireEvent.click(screen.getByRole('button', { name: /dismiss error/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error banner when deleting a comment fails', async () => {
    vi.mocked(fetcher).mockResolvedValue([mockComment]);
    vi.mocked(api.admin.deleteComment).mockRejectedValue(new Error('boom'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderAdmin();

    fireEvent.click(await screen.findByText('Delete'));

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('An error occurred while deleting comment.');
  });

  it('does not show an error banner when a status update succeeds', async () => {
    vi.mocked(fetcher).mockResolvedValue([mockComment]);
    vi.mocked(api.admin.updateStatus).mockResolvedValue(undefined);

    renderAdmin();

    fireEvent.click(await screen.findByText('Approve'));

    await waitFor(() => {
      expect(api.admin.updateStatus).toHaveBeenCalledWith('comment-1', 'hello-world', 'approved');
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
