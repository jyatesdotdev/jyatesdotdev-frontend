import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { SWRConfig } from 'swr';
import { Post } from './post';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the posts utility
vi.mock('../blog/posts', () => ({
  getPostBySlug: (slug: string) => {
    if (slug === 'hello-world') {
      return {
        default: () => <div data-testid="mdx-content">MDX Content</div>,
        metadata: {
          title: 'Hello World',
          publishedAt: '2024-04-14',
          summary: 'This is my first blog post.',
          tags: ['react', 'aws'],
        },
      };
    }
    return undefined;
  },
}));

// Mock the API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Post', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('renders post content and metadata', async () => {
    // Mock likes and comments responses
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/v1/likes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ slug: 'hello-world', likeCount: 5, userHasLiked: false }),
        });
      }
      if (url.includes('/api/v1/comments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MemoryRouter initialEntries={['/blog/hello-world']}>
          <Routes>
            <Route path="/blog/:slug" element={<Post />} />
          </Routes>
        </MemoryRouter>
      </SWRConfig>
    );

    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(screen.getByTestId('mdx-content')).toBeInTheDocument();
    
    // Check for likes section
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('toggles like', async () => {
    mockFetch.mockImplementation((url, init) => {
      if (url.includes('/api/v1/likes')) {
        if (init?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ slug: 'hello-world', likeCount: 6, userHasLiked: true }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ slug: 'hello-world', likeCount: 5, userHasLiked: false }),
        });
      }
      if (url.includes('/api/v1/comments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MemoryRouter initialEntries={['/blog/hello-world']}>
          <Routes>
            <Route path="/blog/:slug" element={<Post />} />
          </Routes>
        </MemoryRouter>
      </SWRConfig>
    );

    const likeButton = await screen.findByRole('button', { name: /5/ });
    fireEvent.click(likeButton);

    await waitFor(() => {
      expect(screen.getByText('6')).toBeInTheDocument();
    });
  });

  it('submits a comment', async () => {
    mockFetch.mockImplementation((url, init) => {
      if (url.includes('/api/v1/likes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ slug: 'hello-world', likeCount: 5, userHasLiked: false }),
        });
      }
      if (url.includes('/api/v1/comments')) {
        if (init?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ message: 'success', id: 'new-comment-id' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MemoryRouter initialEntries={['/blog/hello-world']}>
          <Routes>
            <Route path="/blog/:slug" element={<Post />} />
          </Routes>
        </MemoryRouter>
      </SWRConfig>
    );

    const nameInput = await screen.findByPlaceholderText('Name');
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Add a comment...'), { target: { value: 'Great post!' } });

    const submitButton = screen.getByText('Post Comment');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Comment posted!/i)).toBeInTheDocument();
    });
  });

  it('toggles comment like', async () => {
    const mockComment = {
      id: 'comment-1',
      slug: 'hello-world',
      authorName: 'John Doe',
      content: 'Great post!',
      createdAt: '2024-04-14T10:00:00Z',
      likeCount: 2,
      userHasLiked: false
    };

    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/v1/likes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ slug: 'hello-world', likeCount: 5, userHasLiked: false }),
        });
      }
      if (url.includes('/api/v1/comments')) {
        if (url.includes('/like')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              ...mockComment,
              likeCount: 3, 
              userHasLiked: true 
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([mockComment]),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MemoryRouter initialEntries={['/blog/hello-world']}>
          <Routes>
            <Route path="/blog/:slug" element={<Post />} />
          </Routes>
        </MemoryRouter>
      </SWRConfig>
    );

    const likeButton = await screen.findByRole('button', { name: /2/ });
    fireEvent.click(likeButton);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('renders not found for invalid slug', () => {
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MemoryRouter initialEntries={['/blog/invalid-slug']}>
          <Routes>
            <Route path="/blog/:slug" element={<Post />} />
          </Routes>
        </MemoryRouter>
      </SWRConfig>
    );

    expect(screen.getByText('Post not found')).toBeInTheDocument();
  });

  it('keeps the comment form available when interaction data fails to load', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    render(
      <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
        <MemoryRouter initialEntries={['/blog/hello-world']}>
          <Routes>
            <Route path="/blog/:slug" element={<Post />} />
          </Routes>
        </MemoryRouter>
      </SWRConfig>
    );

    expect(await screen.findByText('Likes unavailable.')).toBeInTheDocument();
    expect(await screen.findByText('Comments unavailable.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post Comment' })).toBeInTheDocument();
  });
});
